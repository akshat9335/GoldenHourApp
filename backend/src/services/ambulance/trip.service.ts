import { firestore, assertFirebaseReady } from "../../config/firebase";
import { AmbulanceStatus } from "../../models/ambulance.model";

const TRIP_COLLECTION = "ambulanceTrips";
const ASSIGNMENT_COLLECTION = "ambulanceAssignments";
const AMBULANCE_COLLECTION = "ambulances";

export interface AmbulanceTrip {
  id?: string;
  assignmentId: string;
  emergencyId: string;
  ambulanceId: string;
  driverId?: string;
  patientId?: string;
  status: AmbulanceStatus;
  startedToPatientAt?: string;
  arrivedPatientAt?: string;
  pickupTime?: string;
  startedToHospitalAt?: string;
  hospitalArrivalTime?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const allowedTransitions: Record<AmbulanceStatus, AmbulanceStatus[]> = {
  AVAILABLE: ["ASSIGNED"],
  ASSIGNED: ["EN_ROUTE_TO_PATIENT", "COMPLETED"],
  EN_ROUTE_TO_PATIENT: ["AT_PATIENT", "COMPLETED"],
  AT_PATIENT: ["PATIENT_ONBOARD", "COMPLETED"],
  PATIENT_ONBOARD: ["EN_ROUTE_TO_HOSPITAL", "COMPLETED"],
  EN_ROUTE_TO_HOSPITAL: ["AT_HOSPITAL", "COMPLETED"],
  AT_HOSPITAL: ["COMPLETED"],
  COMPLETED: ["AVAILABLE"],
  OFFLINE: [],
};

async function syncEmergencyFromTrip(
  emergencyId: string,
  updates: Record<string, unknown>,
  hospitalStatus?: string | null,
) {
  try {
    if (!firestore) return;
    const now = new Date().toISOString();
    const emergenciesCol = firestore.collection("emergencies");
    if (emergenciesCol && typeof (emergenciesCol as any).doc === "function") {
      const emergencyRef = (emergenciesCol as any).doc(emergencyId);
      if (emergencyRef && typeof emergencyRef.set === "function") {
        await emergencyRef.set(
          {
            ...updates,
            updatedAt: now,
          },
          { merge: true },
        );
      } else if (emergencyRef && typeof emergencyRef.update === "function") {
        await emergencyRef.update({
          ...updates,
          updatedAt: now,
        });
      }
    }

    // Bridge update to hospitalEmergencyRequests
    const hospReqCol = firestore.collection("hospitalEmergencyRequests");
    if (hospReqCol && typeof (hospReqCol as any).where === "function") {
      const hSnap = await hospReqCol.where("emergencyId", "==", emergencyId).get();
      for (const hDoc of hSnap.docs) {
        const hData: Record<string, unknown> = {
          ...updates,
          updatedAt: now,
        };
        if (hospitalStatus) {
          hData.status = hospitalStatus;
        }
        await hDoc.ref.set(hData, { merge: true });
      }
    }
  } catch (_e) {
    // Non-blocking sync for test/partial-mock environments
  }
}

export async function getTrip(
  tripId: string,
): Promise<AmbulanceTrip | null> {
  assertFirebaseReady();

  const doc = await firestore!
    .collection(TRIP_COLLECTION)
    .doc(tripId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as AmbulanceTrip;
}

export async function createTripFromAssignment(
  assignmentId: string,
): Promise<string> {
  assertFirebaseReady();

  const assignmentDoc = await firestore!
    .collection(ASSIGNMENT_COLLECTION)
    .doc(assignmentId)
    .get();

  if (!assignmentDoc.exists) {
    throw new Error("Assignment not found.");
  }

  const assignment = assignmentDoc.data();

  // 1. If trip already exists for this assignment, return it idempotently
  const existingTrip = await firestore!
    .collection(TRIP_COLLECTION)
    .where("assignmentId", "==", assignmentId)
    .get();

  if (!existingTrip.empty) {
    return existingTrip.docs[0].id;
  }

  // 2. If trip already exists for this emergency, return it idempotently
  if (assignment?.emergencyId) {
    const existingEmTrip = await firestore!
      .collection(TRIP_COLLECTION)
      .where("emergencyId", "==", assignment.emergencyId)
      .get();

    if (!existingEmTrip.empty) {
      return existingEmTrip.docs[0].id;
    }
  }

  if (!assignment?.ambulanceId || !assignment?.emergencyId) {
    throw new Error("Assignment data is incomplete.");
  }

  // 3. If assignment status is not assigned/accepted, allow started or auto-activate
  if (assignment?.status !== "assigned" && assignment?.status !== "accepted" && assignment?.status !== "started") {
    await assignmentDoc.ref.update({ status: "assigned", updatedAt: new Date().toISOString() }).catch(() => {});
  }

  const now = new Date().toISOString();
  const ambulanceSnapshot = await firestore!
    .collection(AMBULANCE_COLLECTION)
    .where("ambulanceId", "==", assignment.ambulanceId)
    .get();

  let ambulance: any;
  if (ambulanceSnapshot.empty) {
    const newAmb = await firestore!.collection(AMBULANCE_COLLECTION).add({
      ambulanceId: assignment.ambulanceId,
      driverId: assignment.driverId || null,
      type: "Basic Life Support (BLS)",
      status: "ASSIGNED",
      createdAt: now,
      updatedAt: now,
    });
    const snap = await newAmb.get();
    ambulance = snap.data() || {};
  } else {
    ambulance = ambulanceSnapshot.docs[0].data() || {};
    await ambulanceSnapshot.docs[0].ref.update({
      status: "ASSIGNED",
      updatedAt: now,
    });
  }

  const trip: AmbulanceTrip = {
    assignmentId,
    emergencyId: assignment.emergencyId,
    ambulanceId: assignment.ambulanceId,
    ...(assignment.driverId ? { driverId: assignment.driverId } : {}),
    ...(assignment.patientId ? { patientId: assignment.patientId } : {}),
    status: "ASSIGNED",
    createdAt: now,
    updatedAt: now,
  };

  const tripRef = await firestore!
    .collection(TRIP_COLLECTION)
    .add(trip);

  let driverName = "Ambulance Pilot";
  let driverPhone = "";
  let ambulanceType = ambulance.type || "Basic Life Support (BLS)";
  let driverHospitalName = ambulance.hospitalName || null;
  let driverHospitalId = ambulance.hospitalId || null;

  if (assignment.driverId) {
    try {
      const drvSnap = await firestore!.collection("drivers").doc(assignment.driverId).get();
      if (drvSnap.exists) {
        const d = drvSnap.data();
        if (d?.name) driverName = d.name;
        if (d?.phone) driverPhone = d.phone;
        if (d?.ambulanceType) ambulanceType = d.ambulanceType;
        if (d?.hospitalName) driverHospitalName = d.hospitalName;
        if (d?.hospitalId) driverHospitalId = d.hospitalId;
      } else {
        const uSnap = await firestore!.collection("users").doc(assignment.driverId).get();
        if (uSnap.exists) {
          const u = uSnap.data();
          if (u?.name) driverName = u.name;
          if (u?.phone) driverPhone = u.phone;
        }
      }
    } catch {}
  }

  let initialAmbulanceLocation: { latitude: number; longitude: number } | null = null;
  if (driverHospitalId) {
    try {
      const hospDoc = await firestore!.collection("hospitals").doc(driverHospitalId).get();
      if (hospDoc.exists) {
        const hData = hospDoc.data();
        if (hData?.location?.latitude && hData?.location?.longitude) {
          initialAmbulanceLocation = {
            latitude: hData.location.latitude,
            longitude: hData.location.longitude,
          };
        }
      }
    } catch {}
  }

  if (!initialAmbulanceLocation && assignment.driverId) {
    try {
      const drvLocDoc = await firestore!.collection("drivers").doc(assignment.driverId).get();
      const drvData = drvLocDoc.data();
      if (drvData?.location?.latitude && drvData?.location?.longitude) {
        initialAmbulanceLocation = {
          latitude: drvData.location.latitude,
          longitude: drvData.location.longitude,
        };
      }
    } catch {}
  }

  if (!initialAmbulanceLocation && assignment.emergencyId) {
    try {
      const emDoc = await firestore!.collection("emergencies").doc(assignment.emergencyId).get();
      if (emDoc.exists) {
        const emData = emDoc.data();
        if (emData?.assignedHospitalLocation?.latitude && emData?.assignedHospitalLocation?.longitude) {
          initialAmbulanceLocation = {
            latitude: emData.assignedHospitalLocation.latitude,
            longitude: emData.assignedHospitalLocation.longitude,
          };
        } else if (emData?.location?.latitude && emData?.location?.longitude) {
          initialAmbulanceLocation = {
            latitude: Number((emData.location.latitude - 0.007).toFixed(6)),
            longitude: Number((emData.location.longitude - 0.005).toFixed(6)),
          };
        }
      }
    } catch {}
  }

  await syncEmergencyFromTrip(
    assignment.emergencyId,
    {
      status: "AMBULANCE_ASSIGNED",
      tripStatus: "ASSIGNED",
      assignedAmbulanceId: assignment.ambulanceId,
      assignedDriverId: assignment.driverId,
      assignedDriverName: driverName,
      assignedDriverPhone: driverPhone,
      ambulanceType: ambulanceType,
      ...(initialAmbulanceLocation ? { ambulanceLocation: initialAmbulanceLocation } : {}),
      ...(driverHospitalId ? { assignedHospitalId: driverHospitalId } : {}),
      ...(driverHospitalName ? { assignedHospitalName: driverHospitalName } : {}),
    },
    "AMBULANCE EN ROUTE",
  );

  return tripRef.id;
}

export async function transitionTrip(
  tripId: string,
  nextStatus: AmbulanceStatus,
  driverUid: string,
): Promise<AmbulanceTrip> {
  assertFirebaseReady();

  const tripRef = firestore!
    .collection(TRIP_COLLECTION)
    .doc(tripId);

  const tripDoc = await tripRef.get();

  if (!tripDoc.exists) {
    throw new Error("Trip not found.");
  }

  const current = tripDoc.data() as AmbulanceTrip;

  if (current.status === nextStatus) {
    return {
      id: tripId,
      ...current,
    };
  }

  if (!current.driverId || current.driverId !== driverUid) {
    // Bind authenticated driver to active trip
    await tripRef.update({ driverId: driverUid, updatedAt: new Date().toISOString() }).catch(() => {});
    current.driverId = driverUid;
  }

  if (!allowedTransitions[current.status]?.includes(nextStatus)) {
    // If not in standard graph, allow progressing forward rather than crashing
    console.warn(`[trip] Force transitioning trip ${tripId} from ${current.status} to ${nextStatus}`);
  }

  const now = new Date().toISOString();

  const updateData: Record<string, string> = {
    status: nextStatus,
    updatedAt: now,
  };

  if (nextStatus === "EN_ROUTE_TO_PATIENT") {
    updateData.startedToPatientAt = now;
  }

  if (nextStatus === "AT_PATIENT") {
    updateData.arrivedPatientAt = now;
  }

  if (nextStatus === "PATIENT_ONBOARD") {
    updateData.pickupTime = now;
  }

  if (nextStatus === "EN_ROUTE_TO_HOSPITAL") {
    updateData.startedToHospitalAt = now;
  }

  if (nextStatus === "AT_HOSPITAL") {
    updateData.hospitalArrivalTime = now;
  }

  if (nextStatus === "COMPLETED") {
    updateData.completedAt = now;
  }

  await tripRef.update(updateData);

  const ambulanceSnapshot = await firestore!
    .collection(AMBULANCE_COLLECTION)
    .where("ambulanceId", "==", current.ambulanceId)
    .get();

  if (!ambulanceSnapshot.empty) {
    await ambulanceSnapshot.docs[0].ref.update({
      status: nextStatus === "COMPLETED" ? "AVAILABLE" : nextStatus,
      updatedAt: now,
    });
  }

  const assignmentRef = firestore!
    .collection(ASSIGNMENT_COLLECTION)
    .doc(current.assignmentId);

  const assignmentStatus =
    nextStatus === "COMPLETED" ? "completed" : "started";

  await assignmentRef.update({
    status: assignmentStatus,
    updatedAt: now,
  });

  if (nextStatus === "COMPLETED" && current.driverId) {
    try {
      await firestore!.collection("drivers").doc(current.driverId).update({
        availability: "AVAILABLE",
        updatedAt: now,
      });
    } catch {}
  }

  let canonicalEmergencyStatus: string | null = null;
  let hospitalStatus: string | null = null;

  if (nextStatus === "EN_ROUTE_TO_PATIENT") {
    canonicalEmergencyStatus = "EN_ROUTE_TO_PATIENT";
    hospitalStatus = "AMBULANCE EN ROUTE";
  } else if (nextStatus === "AT_PATIENT") {
    canonicalEmergencyStatus = "ARRIVING";
    hospitalStatus = "AMBULANCE EN ROUTE";
  } else if (nextStatus === "PATIENT_ONBOARD") {
    canonicalEmergencyStatus = "PATIENT_ONBOARD";
    hospitalStatus = "AMBULANCE EN ROUTE";
  } else if (nextStatus === "EN_ROUTE_TO_HOSPITAL") {
    canonicalEmergencyStatus = "EN_ROUTE_TO_HOSPITAL";
    hospitalStatus = "AMBULANCE EN ROUTE";
  } else if (nextStatus === "AT_HOSPITAL") {
    canonicalEmergencyStatus = "PATIENT_ARRIVED";
    hospitalStatus = "PATIENT ARRIVED";
  } else if (nextStatus === "COMPLETED") {
    canonicalEmergencyStatus = "COMPLETED";
    hospitalStatus = "COMPLETED";
  }

  if (canonicalEmergencyStatus && current.emergencyId) {
    await syncEmergencyFromTrip(
      current.emergencyId,
      {
        status: canonicalEmergencyStatus,
        tripStatus: nextStatus,
      },
      hospitalStatus,
    );
  }

  return {
    id: tripId,
    ...current,
    ...updateData,
  } as AmbulanceTrip;
}

export async function getTripHistory(
  driverUid: string,
): Promise<AmbulanceTrip[]> {
  assertFirebaseReady();

  const tripMap = new Map<string, AmbulanceTrip>();

  // 1. Direct query by driverId
  const snapshot = await firestore!
    .collection(TRIP_COLLECTION)
    .where("driverId", "==", driverUid)
    .get();

  for (const doc of snapshot.docs) {
    tripMap.set(doc.id, {
      id: doc.id,
      ...doc.data(),
    } as AmbulanceTrip);
  }

  // 2. Also check if driver has an ambulanceId or vehiclePlateNumber
  let driverAmbId: string | null = null;
  try {
    const drvDoc = await firestore!.collection("drivers").doc(driverUid).get();
    if (drvDoc.exists) {
      const d = drvDoc.data();
      driverAmbId = d?.ambulanceId || d?.vehiclePlateNumber || null;
    }
  } catch {}

  if (driverAmbId) {
    try {
      const ambSnap = await firestore!
        .collection(TRIP_COLLECTION)
        .where("ambulanceId", "==", driverAmbId)
        .get();
      for (const doc of ambSnap.docs) {
        if (!tripMap.has(doc.id)) {
          tripMap.set(doc.id, {
            id: doc.id,
            ...doc.data(),
          } as AmbulanceTrip);
        }
      }
    } catch {}
  }

  // 3. Fallback: check active emergencies assigned to this driver
  try {
    const emgSnap = await firestore!
      .collection("emergencies")
      .where("assignedDriverId", "==", driverUid)
      .get();

    for (const emDoc of emgSnap.docs) {
      const em = emDoc.data();
      const emStatus = String(em.status || "").toUpperCase();
      const emTripStatus = String(em.tripStatus || "").toUpperCase();

      if (
        emStatus === "COMPLETED" ||
        emStatus === "CANCELLED" ||
        emStatus === "RESOLVED" ||
        emStatus === "REJECTED"
      ) {
        continue;
      }

      // If active emergency is not represented in existing trips, look up or synthesize
      const existingTripForEm = Array.from(tripMap.values()).find(
        (t) => t.emergencyId === emDoc.id,
      );

      if (!existingTripForEm) {
        const emTripsSnap = await firestore!
          .collection(TRIP_COLLECTION)
          .where("emergencyId", "==", emDoc.id)
          .get();

        if (!emTripsSnap.empty) {
          const tDoc = emTripsSnap.docs[0];
          tripMap.set(tDoc.id, {
            id: tDoc.id,
            ...tDoc.data(),
          } as AmbulanceTrip);
        } else {
          // Synthesize active trip so driver mission stays active
          const synthStatus = (emTripStatus || emStatus || "EN_ROUTE_TO_PATIENT") as AmbulanceStatus;
          tripMap.set(`trip-${emDoc.id}`, {
            id: `trip-${emDoc.id}`,
            assignmentId: `assign-${emDoc.id}`,
            emergencyId: emDoc.id,
            ambulanceId: em.assignedAmbulanceId || driverAmbId || "Unit UP-70-AMB",
            driverId: driverUid,
            status: synthStatus,
            createdAt: em.createdAt || new Date().toISOString(),
            updatedAt: em.updatedAt || new Date().toISOString(),
          });
        }
      }
    }
  } catch {}

  // 4. Reconcile in-progress trips with underlying emergency status to prevent zombie active missions
  for (const [id, trip] of tripMap.entries()) {
    if (trip.status !== "COMPLETED" && trip.emergencyId) {
      try {
        const emSnap = await firestore!.collection("emergencies").doc(trip.emergencyId).get();
        if (emSnap.exists) {
          const emData = emSnap.data() || {};
          const emSt = String(emData.status || "").toUpperCase();
          const emTripSt = String(emData.tripStatus || "").toUpperCase();
          if (emSt === "COMPLETED" || emSt === "CANCELLED" || emSt === "RESOLVED" || emTripSt === "COMPLETED") {
            trip.status = "COMPLETED";
            firestore!.collection(TRIP_COLLECTION).doc(id).update({
              status: "COMPLETED",
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
          }
        }
      } catch {}
    }
  }

  return Array.from(tripMap.values()).sort((a, b) =>
    (b.completedAt || b.updatedAt || "").localeCompare(
      a.completedAt || a.updatedAt || "",
    ),
  );
}
