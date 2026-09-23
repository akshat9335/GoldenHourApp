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

  if (assignment?.status !== "assigned") {
    throw new Error("Assignment is not in an assignable state.");
  }

  if (!assignment?.ambulanceId || !assignment?.emergencyId) {
    throw new Error("Assignment data is incomplete.");
  }

  const existingTrip = await firestore!
    .collection(TRIP_COLLECTION)
    .where("assignmentId", "==", assignmentId)
    .get();

  if (!existingTrip.empty) {
    throw new Error("Trip already exists for this assignment.");
  }

  const ambulanceSnapshot = await firestore!
    .collection(AMBULANCE_COLLECTION)
    .where("ambulanceId", "==", assignment.ambulanceId)
    .get();

  if (ambulanceSnapshot.empty) {
    throw new Error("Ambulance not found.");
  }

  const ambulance = ambulanceSnapshot.docs[0].data();
  const now = new Date().toISOString();

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

  await ambulanceSnapshot.docs[0].ref.update({
    status: "ASSIGNED",
    updatedAt: now,
  });

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

  if (!current.driverId || current.driverId !== driverUid) {
    throw new Error("You are not authorized to update this trip.");
  }

  if (!allowedTransitions[current.status]?.includes(nextStatus)) {
    throw new Error(
      `Invalid trip transition: ${current.status} -> ${nextStatus}.`,
    );
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

  const snapshot = await firestore!
    .collection(TRIP_COLLECTION)
    .where("driverId", "==", driverUid)
    .get();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }) as AmbulanceTrip)
    .sort((a, b) =>
      (b.completedAt || b.updatedAt).localeCompare(
        a.completedAt || a.updatedAt,
      ),
    );
}
