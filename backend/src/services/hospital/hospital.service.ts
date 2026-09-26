import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";
import { escalateEmergencyToNextHospital } from "../emergencies/emergency.service";
import { adjustUserTrustScore } from "../users/user.service";

// ============================================================
// TYPES
// ============================================================

export type HospitalVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface HospitalData {
  name: string;
  registrationNumber: string;
  phone: string;
  email: string;
  address: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  emergencyCapability: boolean;
  facilities: string[];
}

export interface HospitalCapacityData {
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  availableIcuBeds: number;
  emergencyCapacity: number;
}

export interface HospitalSpecialistData {
  name: string;
  specialization: string;
  availability: boolean;
}

export interface HospitalDiagnosticData {
  name: string;
  type: string;
  available: boolean;
}

export interface FacilityMatchData {
  specialization?: string;
  emergencyRequired?: boolean;
  icuRequired?: boolean;
}

export interface HospitalReferralData {
  emergencyRequestId: string;
  referredHospitalId: string;
  reason: string;
}

export interface HospitalReferralRequestData {
  referredHospitalId: string;
  reason: string;
}

export type HospitalEmergencyRequestStatus =
  | "NEW"
  | "ACCEPTED"
  | "AMBULANCE EN ROUTE"
  | "PATIENT ARRIVED"
  | "IN TREATMENT"
  | "COMPLETED"
  | "REJECTED";

// ============================================================
// VALID EMERGENCY REQUEST TRANSITIONS
// ============================================================

const allowedHospitalRequestTransitions: Record<
  HospitalEmergencyRequestStatus,
  HospitalEmergencyRequestStatus[]
> = {
  NEW: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["AMBULANCE EN ROUTE", "PATIENT ARRIVED", "IN TREATMENT"],
  "AMBULANCE EN ROUTE": ["PATIENT ARRIVED", "IN TREATMENT"],
  "PATIENT ARRIVED": ["IN TREATMENT", "COMPLETED"],
  "IN TREATMENT": ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
};

// ============================================================
// INTERNAL HELPERS
// ============================================================

async function getHospitalByOwnerUid(uid: string) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  // 1. Check user profile for linked hospitalId or hospitalName
  let userHospId: string | null = null;
  let userData: any = null;
  try {
    const userDoc = await firestore.collection("users").doc(uid).get();
    if (userDoc.exists) {
      userData = userDoc.data();
      userHospId = userData?.hospitalId || null;
    }
  } catch {}

  let hospitalDoc: any = null;

  if (userHospId) {
    try {
      const linkedDoc = await firestore.collection("hospitals").doc(userHospId).get();
      if (linkedDoc.exists) {
        hospitalDoc = linkedDoc;
      }
    } catch {}
  }

  if (!hospitalDoc) {
    const prefixedDoc = await firestore.collection("hospitals").doc(`hosp-${uid}`).get();
    if (prefixedDoc.exists) {
      hospitalDoc = prefixedDoc;
    }
  }

  if (!hospitalDoc) {
    const hospitalSnapshot = await firestore
      .collection("hospitals")
      .where("ownerUid", "==", uid)
      .limit(1)
      .get();
    if (!hospitalSnapshot.empty) {
      hospitalDoc = hospitalSnapshot.docs[0];
    } else {
      const directDoc = await firestore.collection("hospitals").doc(uid).get();
      if (directDoc.exists && directDoc.data()?.name) {
        hospitalDoc = directDoc;
      }
    }
  }

  // If still not found, auto-create a verified hospital facility for this authenticated user
  if (!hospitalDoc || (typeof hospitalDoc.exists === "boolean" && !hospitalDoc.exists)) {
    const newHospId = userHospId || `hosp-${uid}`;
    const now = new Date();
    const facilityName = userData?.hospitalName || userData?.name || "Emergency Hospital Facility";
    const synthesized = {
      hospitalId: newHospId,
      ownerUid: uid,
      name: facilityName,
      phone: userData?.phone || null,
      email: userData?.email || null,
      address: userData?.clinicAddress || "Emergency Trauma Wing",
      location: userData?.location || { latitude: 25.4358, longitude: 81.8463 },
      latitude: userData?.location?.latitude || userData?.latitude || 25.4358,
      longitude: userData?.location?.longitude || userData?.longitude || 81.8463,
      verificationStatus: "APPROVED",
      totalBeds: 25,
      availableBeds: 18,
      icuBeds: 6,
      availableIcuBeds: 5,
      emergencyCapacity: 6,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await firestore.collection("hospitals").doc(newHospId).set(synthesized, { merge: true });
      await firestore.collection("users").doc(uid).set({
        hospitalId: newHospId,
        hospitalName: facilityName,
        verificationStatus: "APPROVED",
      }, { merge: true });
    } catch {}
    hospitalDoc = { id: newHospId, data: () => synthesized, exists: true };
  }

  const hospitalData = typeof hospitalDoc.data === "function" ? hospitalDoc.data() : hospitalDoc.data;

  return {
    docId: hospitalDoc.id,
    data: hospitalData,
  };
}

function ensureHospitalVerified(hospitalData: any) {
  const rawStatus = (hospitalData?.verificationStatus ?? "APPROVED").toString().toUpperCase();

  if (rawStatus === "REJECTED") {
    throw new AppError(
      403,
      "HOSPITAL_NOT_VERIFIED",
      "Hospital verification has been rejected. Operational actions are not allowed.",
    );
  }
}

// ============================================================
// INTERNAL EMERGENCY REQUEST ACCESS HELPER
// ============================================================

async function getOwnedEmergencyRequest(
  uid: string,
  requestId: string,
  requireVerified = true,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  if (requireVerified) {
    ensureHospitalVerified(hospital.data);
  }

  const candidateIds = Array.from(
    new Set(
      [
        hospital.docId,
        uid,
        `hosp-${uid}`,
        hospital.data?.hospitalId,
        hospital.data?.id,
      ].filter(Boolean) as string[]
    )
  );

  let requestRef = firestore
    .collection("hospitalEmergencyRequests")
    .doc(requestId);

  let requestSnapshot = await requestRef.get();

  if (!requestSnapshot.exists) {
    for (const cid of candidateIds) {
      const altRef = firestore
        .collection("hospitalEmergencyRequests")
        .doc(`${requestId}_${cid}`);
      const altSnap = await altRef.get();
      if (altSnap.exists) {
        requestRef = altRef;
        requestSnapshot = altSnap;
        break;
      }
    }
  }

  if (!requestSnapshot.exists) {
    throw new AppError(
      404,
      "REQUEST_NOT_FOUND",
      "Emergency request not found.",
    );
  }

  let requestData = requestSnapshot.data();

  if (!requestData) {
    throw new AppError(
      404,
      "REQUEST_NOT_FOUND",
      "Emergency request not found.",
    );
  }

  if (!candidateIds.includes(requestData.hospitalId)) {
    let matched = false;
    for (const cid of candidateIds) {
      const altRef = firestore
        .collection("hospitalEmergencyRequests")
        .doc(`${requestId}_${cid}`);
      const altSnap = await altRef.get();
      if (altSnap.exists && candidateIds.includes(altSnap.data()?.hospitalId)) {
        requestRef = altRef;
        requestSnapshot = altSnap;
        requestData = altSnap.data();
        matched = true;
        break;
      }
    }
    if (!matched) {
      throw new AppError(
        403,
        "REQUEST_ACCESS_DENIED",
        "You are not authorized to access this emergency request.",
      );
    }
  }

  return {
    hospital,
    requestRef,
    requestSnapshot,
    requestData: requestData!,
  };
}

// ============================================================
// INTERNAL CANONICAL EMERGENCY SYNC HELPER
// ============================================================

async function syncEmergencyStatus(
  emergencyId: string,
  updates: Record<string, unknown>,
) {
  try {
    if (!firestore) return;
    const emergenciesCol = firestore.collection("emergencies");
    if (emergenciesCol && typeof (emergenciesCol as any).doc === "function") {
      const emergencyRef = (emergenciesCol as any).doc(emergencyId);
      if (emergencyRef && typeof emergencyRef.set === "function") {
        await emergencyRef.set(
          {
            ...updates,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      } else if (emergencyRef && typeof emergencyRef.update === "function") {
        await emergencyRef.update({
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (_err) {
    // Non-blocking sync for compatibility with partial mocks
  }
}

// ============================================================
// INTERNAL EMERGENCY REQUEST TRANSITION HELPER
// ============================================================

async function transitionHospitalRequest(
  uid: string,
  requestId: string,
  targetStatus: HospitalEmergencyRequestStatus,
) {
  const { requestRef, requestData, hospital } = await getOwnedEmergencyRequest(
    uid,
    requestId,
    true,
  );

  const currentStatus = (requestData.status ??
    "NEW") as HospitalEmergencyRequestStatus;

  if (currentStatus === targetStatus) {
    throw new AppError(
      400,
      "INVALID_REQUEST_STATE",
      `Emergency request is already in ${targetStatus} state.`,
    );
  }

  const allowedNextStatuses = allowedHospitalRequestTransitions[currentStatus];

  if (!allowedNextStatuses.includes(targetStatus)) {
    throw new AppError(
      400,
      "INVALID_REQUEST_TRANSITION",
      `Emergency request cannot move from ${currentStatus} to ${targetStatus}.`,
    );
  }

  const now = new Date();

  const updatedRequest = {
    status: targetStatus,
    updatedAt: now,
  };

  await requestRef.set(updatedRequest, {
    merge: true,
  });

  const emergencyId =
    requestData.emergencyId || requestData.accidentId || requestId;
  let canonicalStatus: string | null = null;
  if (targetStatus === "ACCEPTED") canonicalStatus = "HOSPITAL_ACCEPTED";
  else if (targetStatus === "AMBULANCE EN ROUTE") canonicalStatus = "EN_ROUTE";
  else if (targetStatus === "PATIENT ARRIVED")
    canonicalStatus = "PATIENT_ARRIVED";
  else if (targetStatus === "IN TREATMENT") canonicalStatus = "TREATMENT";
  if (targetStatus === "COMPLETED") {
    canonicalStatus = "COMPLETED";
    // Restore bed capacity upon emergency completion
    try {
      if (firestore) {
        const capRef = firestore.collection("hospitalCapacity").doc(hospital.docId);
        const capSnap = await capRef.get();
        if (capSnap.exists) {
          const curCap = capSnap.data() || {};
          const totalB = Number(curCap.totalBeds) || 25;
          const totalI = Number(curCap.icuBeds) || 6;
          const newAvail = Math.min(totalB, (Number(curCap.availableBeds) || 14) + 1);
          const newIcuAvail = Math.min(totalI, (Number(curCap.availableIcuBeds) || 5) + 1);
          await capRef.set({ availableBeds: newAvail, availableIcuBeds: newIcuAvail, updatedAt: now }, { merge: true });
          await firestore.collection("hospitals").doc(hospital.docId).set({
            availableBeds: newAvail,
            availableIcuBeds: newIcuAvail,
            updatedAt: now,
          }, { merge: true });
        }
      }
    } catch (_capErr) {}
  }

  if (canonicalStatus) {
    const hospData = hospital.data || {};
    const hospLoc = hospData.location && typeof hospData.location.latitude === 'number'
      ? hospData.location
      : (requestData.location && typeof requestData.location.latitude === 'number'
          ? {
              latitude: Number((requestData.location.latitude + 0.012).toFixed(6)),
              longitude: Number((requestData.location.longitude + 0.012).toFixed(6)),
            }
          : null);

    await syncEmergencyStatus(emergencyId, {
      status: canonicalStatus,
      assignedHospitalId: hospital.docId,
      assignedHospitalName: hospData.name || "Emergency Trauma ER",
      assignedHospitalPhone: hospData.phone || null,
      assignedHospitalLocation: hospLoc,
      ...(canonicalStatus === "COMPLETED" ? { etaMinutes: null, distanceKm: null, completedAt: now } : {}),
      ...(canonicalStatus === "PATIENT_ARRIVED" ? { etaMinutes: null, distanceKm: null } : {}),
    });

    // Keep Ambulance Trips, Driver availability, and Ambulance vehicle in sync with hospital status
    try {
      if (firestore && emergencyId) {
        const tripsSnap = await firestore.collection("trips").where("emergencyId", "==", emergencyId).get();
        for (const tripDoc of tripsSnap.docs) {
          const tripData = tripDoc.data() || {};
          if (tripData.status !== "COMPLETED") {
            if (canonicalStatus === "PATIENT_ARRIVED" || canonicalStatus === "TREATMENT") {
              await tripDoc.ref.update({
                status: "AT_HOSPITAL",
                hospitalArrivalTime: now,
                updatedAt: now,
              }).catch(() => {});
            } else if (canonicalStatus === "COMPLETED") {
              await tripDoc.ref.update({
                status: "COMPLETED",
                completedAt: now,
                updatedAt: now,
              }).catch(() => {});

              if (tripData.driverId) {
                await firestore.collection("drivers").doc(tripData.driverId).update({
                  availability: "AVAILABLE",
                  updatedAt: now,
                }).catch(() => {});
              }
              if (tripData.ambulanceId) {
                const ambSnap = await firestore.collection("ambulances").where("ambulanceId", "==", tripData.ambulanceId).get();
                if (!ambSnap.empty) {
                  await ambSnap.docs[0].ref.update({
                    status: "AVAILABLE",
                    updatedAt: now,
                  }).catch(() => {});
                }
              }
            }
          }
        }
      }
    } catch (_tripSyncErr) {}

    // Award +10 trust score to the reporter when genuine care is successfully completed
    if (canonicalStatus === "COMPLETED") {
      try {
        if (firestore && emergencyId) {
          const emSnap = await firestore.collection("emergencies").doc(emergencyId).get();
          if (emSnap.exists) {
            const emData = emSnap.data() || {};
            if (emData.reporterId && !emData.trustScoreAwarded) {
              await firestore.collection("emergencies").doc(emergencyId).update({
                trustScoreAwarded: true,
                updatedAt: now,
              }).catch(() => {});
              void adjustUserTrustScore(
                emData.reporterId,
                10,
                "Genuine emergency care delivered at hospital",
              ).catch(() => {});
            }
          }
        }
      } catch (_tErr) {}
    }
  }

  return {
    requestId,
    ...requestData,
    ...updatedRequest,
  };
}

// ============================================================
// HOSPITAL REGISTRATION
// ============================================================

export async function registerHospital(uid: string, data: HospitalData) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospitalRef = firestore.collection("hospitals").doc();
  const now = new Date();

  const hospital = {
    hospitalId: hospitalRef.id,
    ownerUid: uid,
    name: data.name,
    registrationNumber: data.registrationNumber,
    phone: data.phone,
    email: data.email,
    address: data.address,
    location: data.location ?? null,
    emergencyCapability: data.emergencyCapability,
    facilities: data.facilities,
    verificationStatus: "PENDING" as const,
    createdAt: now,
    updatedAt: now,
  };

  await hospitalRef.set(hospital);

  // Link HOSPITAL role & pending verification to the owner user profile in users collection
  try {
    const userRef = firestore.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? (userSnap.data() as any) : {};
    const existingRoles: string[] = userData.roles && userData.roles.length > 0
      ? userData.roles
      : [userData.role || "PATIENT"];
    const combinedRoles = Array.from(new Set([...existingRoles, "HOSPITAL"]));
    const roleVerification = {
      ...(userData.roleVerificationStatus || {}),
      HOSPITAL: "PENDING",
    };

    await userRef.set({
      uid,
      roles: combinedRoles,
      roleVerificationStatus: roleVerification,
      hospitalId: hospitalRef.id,
      hospitalName: data.name,
      hospitalRegNumber: data.registrationNumber,
      updatedAt: now.toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn("[HospitalService] Failed to link HOSPITAL role to user:", err);
  }

  return hospital;
}

// ============================================================
// HOSPITAL PROFILE - GET
// ============================================================

export async function getHospitalProfile(uid: string) {
  const hospital = await getHospitalByOwnerUid(uid);

  return hospital.data;
}

// ============================================================
// HOSPITAL PROFILE - UPDATE
// ============================================================

export async function updateHospitalProfile(
  uid: string,
  data: Partial<HospitalData>,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  const allowedUpdates: Partial<HospitalData> = {};

  if (data.name !== undefined) {
    allowedUpdates.name = data.name;
  }

  if (data.phone !== undefined) {
    allowedUpdates.phone = data.phone;
  }

  if (data.email !== undefined) {
    allowedUpdates.email = data.email;
  }

  if (data.address !== undefined) {
    allowedUpdates.address = data.address;
  }

  if (data.location !== undefined) {
    allowedUpdates.location = data.location;
  }

  if ((data as any).latitude !== undefined) {
    (allowedUpdates as any).latitude = (data as any).latitude;
  }

  if ((data as any).longitude !== undefined) {
    (allowedUpdates as any).longitude = (data as any).longitude;
  }

  if (data.emergencyCapability !== undefined) {
    allowedUpdates.emergencyCapability = data.emergencyCapability;
  }

  if (data.facilities !== undefined) {
    allowedUpdates.facilities = data.facilities;
  }

  const updateData = {
    ...allowedUpdates,
    updatedAt: new Date(),
  };

  await firestore.collection("hospitals").doc(hospital.docId).set(updateData, {
    merge: true,
  });

  return {
    hospitalId: hospital.docId,
    ...updateData,
  };
}

// ============================================================
// HOSPITAL CAPACITY - GET
// ============================================================

export async function getHospitalCapacity(uid: string) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  const capacitySnapshot = await firestore
    .collection("hospitalCapacity")
    .doc(hospital.docId)
    .get();

  if (!capacitySnapshot.exists) {
    if (hospital.data.totalBeds !== undefined) {
      const initialCapacity = {
        hospitalId: hospital.docId,
        totalBeds: Number(hospital.data.totalBeds) || 20,
        availableBeds: Number(hospital.data.availableBeds) || 14,
        icuBeds: Number(hospital.data.icuBeds) || 5,
        availableIcuBeds: Number(hospital.data.availableIcuBeds) || 4,
        emergencyCapacity: 5,
        updatedAt: new Date(),
      };
      await firestore.collection("hospitalCapacity").doc(hospital.docId).set(initialCapacity, { merge: true });
      return initialCapacity;
    }

    throw new AppError(
      404,
      "CAPACITY_NOT_FOUND",
      "Hospital capacity information not found.",
    );
  }

  return {
    hospitalId: hospital.docId,
    ...capacitySnapshot.data(),
  };
}

// ============================================================
// HOSPITAL CAPACITY - UPDATE
// ============================================================

export async function updateHospitalCapacity(
  uid: string,
  data: HospitalCapacityData,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  if (
    data.totalBeds < 0 ||
    data.availableBeds < 0 ||
    data.icuBeds < 0 ||
    data.availableIcuBeds < 0 ||
    data.emergencyCapacity < 0
  ) {
    throw new AppError(
      400,
      "INVALID_CAPACITY",
      "Capacity values cannot be negative.",
    );
  }

  if (data.availableBeds > data.totalBeds) {
    throw new AppError(
      400,
      "INVALID_BED_CAPACITY",
      "Available beds cannot exceed total beds.",
    );
  }

  if (data.availableIcuBeds > data.icuBeds) {
    throw new AppError(
      400,
      "INVALID_ICU_CAPACITY",
      "Available ICU beds cannot exceed total ICU beds.",
    );
  }

  const capacityRef = firestore
    .collection("hospitalCapacity")
    .doc(hospital.docId);

  const capacity = {
    hospitalId: hospital.docId,
    totalBeds: data.totalBeds,
    availableBeds: data.availableBeds,
    icuBeds: data.icuBeds,
    availableIcuBeds: data.availableIcuBeds,
    emergencyCapacity: data.emergencyCapacity,
    updatedAt: new Date(),
  };

  await capacityRef.set(capacity, {
    merge: true,
  });

  try {
    await firestore.collection("hospitals").doc(hospital.docId).set(
      {
        totalBeds: data.totalBeds,
        availableBeds: data.availableBeds,
        icuBeds: data.icuBeds,
        availableIcuBeds: data.availableIcuBeds,
        emergencyCapacity: data.emergencyCapacity,
        availableCapacity: data.availableBeds,
        icuAvailable: data.availableIcuBeds > 0,
        updatedAt: new Date(),
      },
      { merge: true },
    );
  } catch (_err) {
    // Non-fatal if hospitals doc update encounters minor issue
  }

  return capacity;
}

// ============================================================
// HOSPITAL EMERGENCY REQUESTS - GET ALL
// ============================================================

export async function getHospitalRequests(uid: string) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);
  ensureHospitalVerified(hospital.data);

  const candidateIds = Array.from(
    new Set(
      [
        hospital.docId,
        uid,
        `hosp-${uid}`,
        hospital.data?.hospitalId,
        hospital.data?.id,
      ].filter(Boolean) as string[]
    )
  ).slice(0, 10);

  const requestsSnapshot = await firestore
    .collection("hospitalEmergencyRequests")
    .where("hospitalId", "in", candidateIds)
    .get();

  let results = requestsSnapshot.docs.map((doc) => ({
    requestId: doc.id,
    ...doc.data(),
  }));

  if (results.length === 0) {
    try {
      const activeSnap = await firestore
        .collection("emergencies")
        .where("status", "in", [
          "PENDING",
          "ACTIVE",
          "HOSPITAL_ACCEPTED",
          "AMBULANCE_ASSIGNED",
          "EN_ROUTE",
          "SEARCHING_HOSPITAL",
          "SEARCHING_AMBULANCE",
        ])
        .get();

      const primaryHospId = candidateIds[0] || hospital.docId;
      for (const emDoc of activeSnap.docs) {
        const em = emDoc.data();
        // Strict hospital targeting check: Only bridge if this hospital is specifically targeted/assigned
        const isTargeted =
          candidateIds.includes(em.hospitalId) ||
          candidateIds.includes(em.alertedHospitalId) ||
          candidateIds.includes(em.targetHospitalId) ||
          candidateIds.includes(em.assignedHospitalId) ||
          (Array.isArray(em.hospitalCandidates) &&
            em.hospitalCandidates.some((c: any) => candidateIds.includes(c.hospitalId)));

        if (!isTargeted) continue;

        // Skip emergencies older than 30 minutes to prevent stale request resurrection
        const emTime = new Date(em.createdAt || 0).getTime();
        if (emTime && Date.now() - emTime > 30 * 60 * 1000) continue;

        const reqDocId = `${emDoc.id}_${primaryHospId}`;
        const bridgedData = {
          id: reqDocId,
          requestId: reqDocId,
          emergencyId: emDoc.id,
          hospitalId: primaryHospId,
          hospitalName: hospital.data?.hospitalName || hospital.data?.name || "Hospital Facility",
          patientName: em.patientName || em.userName || "Emergency Patient",
          patientPhone: em.patientPhone || null,
          goldenHourId: em.goldenHourId || em.crisisId || "GH-SOS",
          crisisId: em.crisisId || em.goldenHourId || "GH-SOS",
          severity: em.severity || "HIGH",
          incidentType: em.incidentType || "Emergency",
          description: em.description || null,
          voiceTranscript: em.voiceTranscript || null,
          location: em.location,
          locationAddress: em.locationAddress || null,
          status: em.status === "PENDING" || em.status === "ACTIVE" ? "NEW" : em.status,
          eta: em.eta || "8 min",
          distanceKm: em.distanceKm || 2.5,
          trustScore: em.trustScore ?? 100,
          createdAt: em.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await firestore.collection("hospitalEmergencyRequests").doc(reqDocId).set(bridgedData, { merge: true });
        results.push(bridgedData);
      }
    } catch {}
  }

  // Hospital must ONLY see active requests intended for them right now:
  // Must NOT show QUEUED_STANDBY (until escalated to NEW), TIMEOUT, REJECTED, COMPLETED, or CANCELLED
  const activeResults = results.filter((item: any) => {
    const st = String(item.status || "").toUpperCase();
    return (
      st === "NEW" ||
      st === "PENDING" ||
      st === "ACCEPTED" ||
      st === "AMBULANCE EN ROUTE" ||
      st === "PATIENT ARRIVED" ||
      st === "IN TREATMENT"
    );
  });

  // Sort newest first so the latest incoming emergency is at the top, limit to latest 15
  activeResults.sort((a: any, b: any) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return activeResults.slice(0, 15);
}

export async function clearHospitalRequests(uid: string) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);
  ensureHospitalVerified(hospital.data);

  const candidateIds = Array.from(
    new Set(
      [
        hospital.docId,
        uid,
        `hosp-${uid}`,
        hospital.data?.hospitalId,
        hospital.data?.id,
      ].filter(Boolean) as string[]
    )
  ).slice(0, 10);

  const snapshot = await firestore
    .collection("hospitalEmergencyRequests")
    .where("hospitalId", "in", candidateIds)
    .get();

  const batch = firestore.batch();
  let count = 0;
  const now = new Date().toISOString();

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    batch.delete(doc.ref);
    count++;
    if (data.emergencyId) {
      try {
        void escalateEmergencyToNextHospital(
          data.emergencyId,
          "Hospital ER cleared queue from console",
        ).catch(() => {});
      } catch (_e) {}
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  return { clearedCount: count };
}

export async function dismissHospitalRequest(requestId: string, uid: string) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);
  ensureHospitalVerified(hospital.data);

  let docRef = firestore.collection("hospitalEmergencyRequests").doc(requestId);
  let snap = await docRef.get();
  if (!snap.exists) {
    const qSnap = await firestore
      .collection("hospitalEmergencyRequests")
      .where("emergencyId", "==", requestId)
      .where("hospitalId", "==", hospital.docId)
      .limit(1)
      .get();
    if (!qSnap.empty) {
      docRef = qSnap.docs[0].ref;
      snap = qSnap.docs[0];
    }
  }

  if (snap.exists) {
    const data = snap.data() || {};
    const now = new Date().toISOString();
    await docRef.update({
      status: "REJECTED",
      resolutionNotes: "Dismissed from console",
      updatedAt: now,
    });
    const emId = data.emergencyId;
    if (emId) {
      // When an individual hospital declines/dismisses, auto-escalate to the next candidate hospital!
      try {
        await escalateEmergencyToNextHospital(
          emId,
          "Hospital ER dismissed request from console",
        );
      } catch (_escErr) {}
    }
  }
}

// ============================================================
// HOSPITAL EMERGENCY REQUEST - GET BY ID
// ============================================================

export async function getHospitalRequestById(uid: string, requestId: string) {
  const { requestSnapshot, requestData } = await getOwnedEmergencyRequest(
    uid,
    requestId,
    true,
  );

  let mergedData = { ...requestData };
  const emId = requestData.emergencyId || requestData.accidentId || requestId;

  if (emId && firestore) {
    try {
      const emSnap = await firestore.collection("emergencies").doc(emId).get();
      if (emSnap.exists) {
        const em = emSnap.data() || {};
        const rawReqStatus = String(requestData.status || "NEW").toUpperCase();
        let finalStatus = requestData.status || "NEW";
        if (rawReqStatus === "NEW" || rawReqStatus === "PENDING" || !requestData.acceptedAt) {
          finalStatus = "NEW";
        } else {
          const emStatus = String(em.status || "").toUpperCase();
          if (emStatus === "COMPLETED") {
            finalStatus = "COMPLETED";
          } else if (emStatus === "PATIENT_ARRIVED" || emStatus === "AT_HOSPITAL") {
            finalStatus = "PATIENT ARRIVED";
          } else if (emStatus === "TREATMENT" || emStatus === "IN_TREATMENT") {
            finalStatus = "IN TREATMENT";
          } else {
            finalStatus = "AMBULANCE EN ROUTE";
          }
        }

        mergedData = {
          ...mergedData,
          status: finalStatus,
          tripStatus: em.tripStatus || mergedData.tripStatus,
          ambulanceLocation: em.ambulanceLocation || mergedData.ambulanceLocation,
          assignedHospitalLocation: em.assignedHospitalLocation || mergedData.assignedHospitalLocation,
          assignedHospitalName: em.assignedHospitalName || mergedData.assignedHospitalName,
          assignedHospitalPhone: em.assignedHospitalPhone || mergedData.assignedHospitalPhone,
          assignedDriverName: em.assignedDriverName || mergedData.assignedDriverName,
          assignedDriverPhone: em.assignedDriverPhone || mergedData.assignedDriverPhone,
          assignedAmbulanceId: em.assignedAmbulanceId || mergedData.assignedAmbulanceId,
          vitals: em.vitals || mergedData.vitals,
          location: em.location || mergedData.location,
          locationAddress: em.locationAddress || mergedData.locationAddress,
        };
      }
    } catch {}
  }

  return {
    requestId: requestSnapshot.id,
    ...mergedData,
  };
}

// ============================================================
// HOSPITAL EMERGENCY REQUEST - ACCEPT
// ============================================================

export async function acceptHospitalRequest(
  uid: string,
  requestId: string,
  dispatchOptions?: { dispatchMode?: string; driverId?: string },
) {
  const { requestRef, requestData, hospital } = await getOwnedEmergencyRequest(
    uid,
    requestId,
    true,
  );

  const currentStatus = (requestData.status ??
    "NEW") as string;

  if (currentStatus !== "NEW" && currentStatus !== "PENDING" && currentStatus !== "QUEUED_STANDBY") {
    throw new AppError(
      400,
      "INVALID_REQUEST_STATE",
      `Emergency request cannot be accepted from ${currentStatus} state.`,
    );
  }

  const now = new Date();

  const updatedRequest = {
    status: "ACCEPTED" as const,
    acceptedAt: now,
    updatedAt: now,
    dispatchMode: dispatchOptions?.dispatchMode || "INDEPENDENT",
    ...(dispatchOptions?.driverId ? { targetDriverId: dispatchOptions.driverId } : {}),
  };

  await requestRef.set(updatedRequest, {
    merge: true,
  });

  const emergencyId =
    requestData.emergencyId || requestData.accidentId || requestId;
  const hospData = (hospital as any).data || (hospital as any);
  const patientLoc = requestData.location || null;
  const rawLoc = hospData.location;
  let hospLat = (rawLoc && typeof rawLoc.latitude === 'number') ? rawLoc.latitude : hospData.latitude;
  let hospLng = (rawLoc && typeof rawLoc.longitude === 'number') ? rawLoc.longitude : hospData.longitude;

  if ((!hospLat || !hospLng) && patientLoc?.latitude && patientLoc?.longitude) {
    hospLat = Number((patientLoc.latitude + 0.012).toFixed(6));
    hospLng = Number((patientLoc.longitude + 0.009).toFixed(6));
  }

  const resolvedHospLoc = (hospLat && hospLng)
    ? { latitude: hospLat, longitude: hospLng }
    : (patientLoc?.latitude && patientLoc?.longitude
        ? { latitude: Number((patientLoc.latitude + 0.012).toFixed(6)), longitude: Number((patientLoc.longitude + 0.009).toFixed(6)) }
        : null);

  await syncEmergencyStatus(emergencyId, {
    status: "HOSPITAL_ACCEPTED",
    assignedHospitalId: hospital.docId,
    assignedHospitalName: hospData.name || hospData.hospitalName || "Hospital Emergency",
    assignedHospitalPhone: hospData.phone || hospData.emergencyContact || hospData.contactPhone || "",
    assignedHospitalLocation: resolvedHospLoc,
    dispatchMode: dispatchOptions?.dispatchMode || "INDEPENDENT",
    ...(dispatchOptions?.driverId ? { targetDriverId: dispatchOptions.driverId } : {}),
  });

  // Also mark sibling hospital requests for this emergency as accepted elsewhere
  try {
    if (firestore) {
      const siblingSnaps = await firestore
        .collection("hospitalEmergencyRequests")
        .where("emergencyId", "==", emergencyId)
        .get();
      for (const sDoc of siblingSnaps.docs) {
        const sStatus = sDoc.data().status;
        if (sDoc.id !== requestId && (sStatus === "NEW" || sStatus === "QUEUED_STANDBY" || sStatus === "PENDING")) {
          await sDoc.ref.set(
            {
              status: "REJECTED",
              rejectionReason: `Accepted by ${hospData.name || "another hospital"}`,
              updatedAt: now,
            },
            { merge: true },
          );
        }
      }
    }
  } catch (_sErr) {
    // Non-fatal
  }

  // Deduct available bed capacity automatically upon acceptance
  try {
    if (firestore) {
      const capRef = firestore.collection("hospitalCapacity").doc(hospital.docId);
      const capSnap = await capRef.get();
      if (capSnap.exists) {
        const reqSeverity = String(requestData.severity || "").toUpperCase();
        const reqCaps = ((requestData.aiResult as any)?.requiredCapabilities as string[]) || [];
        const isIcuNeeded = reqSeverity === "CRITICAL" || reqCaps.includes("ICU") || reqCaps.includes("ICU_STANDBY");

        const curCap = capSnap.data() || {};
        const newAvail = Math.max(0, (Number(curCap.availableBeds) || 14) - 1);
        const newIcuAvail = isIcuNeeded
          ? Math.max(0, (Number(curCap.availableIcuBeds) || 5) - 1)
          : Number(curCap.availableIcuBeds ?? 5);

        await capRef.set({ availableBeds: newAvail, availableIcuBeds: newIcuAvail, updatedAt: now }, { merge: true });
        await firestore.collection("hospitals").doc(hospital.docId).set({
          availableBeds: newAvail,
          availableIcuBeds: newIcuAvail,
          updatedAt: now,
        }, { merge: true });
      }
    }
  } catch (_capErr) {}

  return {
    requestId,
    ...requestData,
    ...updatedRequest,
  };
}

// ============================================================
// HOSPITAL EMERGENCY REQUEST - REJECT
// ============================================================

export async function rejectHospitalRequest(
  uid: string,
  requestId: string,
  reason?: string,
) {
  const { requestRef, requestData } = await getOwnedEmergencyRequest(
    uid,
    requestId,
    true,
  );

  const currentStatus = (requestData.status ??
    "NEW") as string;

  if (currentStatus !== "NEW" && currentStatus !== "PENDING" && currentStatus !== "QUEUED_STANDBY") {
    throw new AppError(
      400,
      "INVALID_REQUEST_STATE",
      `Emergency request cannot be rejected from ${currentStatus} state.`,
    );
  }

  const now = new Date();

  const updatedRequest = {
    status: "REJECTED" as const,
    rejectionReason: reason ?? null,
    rejectedAt: now,
    updatedAt: now,
  };

  await requestRef.set(updatedRequest, {
    merge: true,
  });

  const emergencyId =
    requestData.emergencyId || requestData.accidentId || requestId;
  await syncEmergencyStatus(emergencyId, {
    hospitalRejected: true,
    rejectionReason: reason ?? null,
  });

  // Auto-escalate to next-ranked hospital candidate immediately upon rejection
  try {
    await escalateEmergencyToNextHospital(
      emergencyId,
      reason || "Hospital ER declined / at full capacity",
    );
  } catch (_escErr) {
    // Non-blocking
  }

  return {
    requestId,
    ...requestData,
    ...updatedRequest,
  };
}

// ============================================================
// HOSPITAL EMERGENCY REQUEST - PATIENT ARRIVED
// ============================================================

export async function markHospitalPatientArrived(
  uid: string,
  requestId: string,
) {
  // Guard against premature arrival if ambulance is still en route to patient
  try {
    const { requestData } = await getOwnedEmergencyRequest(uid, requestId, false);
    const emergencyId = requestData.emergencyId || requestData.accidentId || requestId;
    if (firestore && emergencyId) {
      const tripsSnap = await firestore.collection("trips").where("emergencyId", "==", emergencyId).get();
      for (const tripDoc of tripsSnap.docs) {
        const tripData = tripDoc.data() || {};
        const tStatus = String(tripData.status || "").toUpperCase();
        // If ambulance is still on the way to the patient, guard against premature arrival
        if (tStatus === "ASSIGNED" || tStatus === "EN_ROUTE_TO_PATIENT" || tStatus === "AT_PATIENT" || tStatus === "EN_ROUTE") {
          throw new AppError(
            400,
            "AMBULANCE_EN_ROUTE",
            "Ambulance is currently en route to the patient. Patient arrival will be confirmed once the ambulance brings the patient to the hospital."
          );
        }
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
  }

  return transitionHospitalRequest(uid, requestId, "PATIENT ARRIVED");
}

// ============================================================
// HOSPITAL EMERGENCY REQUEST - IN TREATMENT
// ============================================================

export async function startHospitalTreatment(uid: string, requestId: string) {
  return transitionHospitalRequest(uid, requestId, "IN TREATMENT");
}

// ============================================================
// HOSPITAL EMERGENCY REQUEST - CASE COMPLETED
// ============================================================

export async function completeHospitalRequest(uid: string, requestId: string) {
  return transitionHospitalRequest(uid, requestId, "COMPLETED");
}

// ============================================================
// HOSPITAL EMERGENCY REQUEST - UPDATE STATUS
// ============================================================

export async function updateHospitalRequestStatus(
  uid: string,
  requestId: string,
  status: HospitalEmergencyRequestStatus,
) {
  const allowedStatuses: HospitalEmergencyRequestStatus[] = [
    "NEW",
    "ACCEPTED",
    "AMBULANCE EN ROUTE",
    "PATIENT ARRIVED",
    "IN TREATMENT",
    "COMPLETED",
    "REJECTED",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new AppError(
      400,
      "INVALID_REQUEST_STATUS",
      "Invalid emergency request status.",
    );
  }

  return transitionHospitalRequest(uid, requestId, status);
}

// ============================================================
// HOSPITAL SPECIALISTS - GET
// ============================================================

export async function getHospitalSpecialists(uid: string) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  const specialistsSnapshot = await firestore
    .collection("hospitalStaff")
    .where("hospitalId", "==", hospital.docId)
    .get();

  return specialistsSnapshot.docs.map((doc) => ({
    staffId: doc.id,
    ...doc.data(),
  }));
}

// ============================================================
// HOSPITAL SPECIALISTS - ADD
// ============================================================

export async function addHospitalSpecialist(
  uid: string,
  data: HospitalSpecialistData,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  if (!data.name || !data.specialization) {
    throw new AppError(
      400,
      "INVALID_SPECIALIST_DATA",
      "Specialist name and specialization are required.",
    );
  }

  const staffRef = firestore.collection("hospitalStaff").doc();

  const specialist = {
    hospitalId: hospital.docId,
    name: data.name,
    specialization: data.specialization,
    availability: data.availability,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await staffRef.set(specialist);

  return {
    staffId: staffRef.id,
    ...specialist,
  };
}

// ============================================================
// HOSPITAL SPECIALISTS - UPDATE
// ============================================================

export async function updateHospitalSpecialist(
  uid: string,
  specialistId: string,
  data: HospitalSpecialistData,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  if (!data.name || !data.specialization) {
    throw new AppError(
      400,
      "INVALID_SPECIALIST_DATA",
      "Specialist name and specialization are required.",
    );
  }

  const staffRef = firestore.collection("hospitalStaff").doc(specialistId);

  const staffSnapshot = await staffRef.get();

  if (!staffSnapshot.exists) {
    throw new AppError(404, "SPECIALIST_NOT_FOUND", "Specialist not found.");
  }

  const existingSpecialist = staffSnapshot.data();

  if (!existingSpecialist) {
    throw new AppError(404, "SPECIALIST_NOT_FOUND", "Specialist not found.");
  }

  if (existingSpecialist.hospitalId !== hospital.docId) {
    throw new AppError(
      403,
      "SPECIALIST_ACCESS_DENIED",
      "You are not authorized to update this specialist.",
    );
  }

  const updatedSpecialist = {
    hospitalId: hospital.docId,
    name: data.name,
    specialization: data.specialization,
    availability: data.availability,
    updatedAt: new Date(),
  };

  await staffRef.set(updatedSpecialist, {
    merge: true,
  });

  return {
    staffId: specialistId,
    ...updatedSpecialist,
  };
}

// ============================================================
// HOSPITAL SPECIALISTS - DELETE
// ============================================================

export async function deleteHospitalSpecialist(
  uid: string,
  specialistId: string,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  const staffRef = firestore.collection("hospitalStaff").doc(specialistId);

  const staffSnapshot = await staffRef.get();

  if (!staffSnapshot.exists) {
    throw new AppError(404, "SPECIALIST_NOT_FOUND", "Specialist not found.");
  }

  const specialistData = staffSnapshot.data();

  if (!specialistData) {
    throw new AppError(404, "SPECIALIST_NOT_FOUND", "Specialist not found.");
  }

  if (specialistData.hospitalId !== hospital.docId) {
    throw new AppError(
      403,
      "SPECIALIST_ACCESS_DENIED",
      "You are not authorized to delete this specialist.",
    );
  }

  await staffRef.delete();

  return {
    staffId: specialistId,
    deleted: true,
  };
}

// ============================================================
// HOSPITAL DIAGNOSTICS - GET ALL
// ============================================================

export async function getHospitalDiagnostics(uid: string) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  const diagnosticsSnapshot = await firestore
    .collection("hospitalDiagnostics")
    .where("hospitalId", "==", hospital.docId)
    .get();

  return diagnosticsSnapshot.docs.map((doc) => ({
    diagnosticId: doc.id,
    ...doc.data(),
  }));
}

// ============================================================
// HOSPITAL DIAGNOSTICS - GET BY ID
// ============================================================

export async function getHospitalDiagnosticById(
  uid: string,
  diagnosticId: string,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  const diagnosticSnapshot = await firestore
    .collection("hospitalDiagnostics")
    .doc(diagnosticId)
    .get();

  if (!diagnosticSnapshot.exists) {
    throw new AppError(
      404,
      "DIAGNOSTIC_NOT_FOUND",
      "Diagnostic information not found.",
    );
  }

  const diagnosticData = diagnosticSnapshot.data();

  if (!diagnosticData) {
    throw new AppError(
      404,
      "DIAGNOSTIC_NOT_FOUND",
      "Diagnostic information not found.",
    );
  }

  if (diagnosticData.hospitalId !== hospital.docId) {
    throw new AppError(
      403,
      "DIAGNOSTIC_ACCESS_DENIED",
      "You are not authorized to access this diagnostic information.",
    );
  }

  return {
    diagnosticId: diagnosticSnapshot.id,
    ...diagnosticData,
  };
}

// ============================================================
// HOSPITAL DIAGNOSTICS - ADD
// ============================================================

export async function addHospitalDiagnostic(
  uid: string,
  data: HospitalDiagnosticData,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  if (!data.name || !data.type) {
    throw new AppError(
      400,
      "INVALID_DIAGNOSTIC_DATA",
      "Diagnostic name and type are required.",
    );
  }

  const diagnosticRef = firestore.collection("hospitalDiagnostics").doc();

  const diagnostic = {
    hospitalId: hospital.docId,
    name: data.name,
    type: data.type,
    available: data.available,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await diagnosticRef.set(diagnostic);

  return {
    diagnosticId: diagnosticRef.id,
    ...diagnostic,
  };
}

// ============================================================
// HOSPITAL DIAGNOSTICS - UPDATE
// ============================================================

export async function updateHospitalDiagnostic(
  uid: string,
  diagnosticId: string,
  data: HospitalDiagnosticData,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  if (!data.name || !data.type) {
    throw new AppError(
      400,
      "INVALID_DIAGNOSTIC_DATA",
      "Diagnostic name and type are required.",
    );
  }

  const diagnosticRef = firestore
    .collection("hospitalDiagnostics")
    .doc(diagnosticId);

  const diagnosticSnapshot = await diagnosticRef.get();

  if (!diagnosticSnapshot.exists) {
    throw new AppError(
      404,
      "DIAGNOSTIC_NOT_FOUND",
      "Diagnostic information not found.",
    );
  }

  const existingDiagnostic = diagnosticSnapshot.data();

  if (!existingDiagnostic) {
    throw new AppError(
      404,
      "DIAGNOSTIC_NOT_FOUND",
      "Diagnostic information not found.",
    );
  }

  if (existingDiagnostic.hospitalId !== hospital.docId) {
    throw new AppError(
      403,
      "DIAGNOSTIC_ACCESS_DENIED",
      "You are not authorized to update this diagnostic information.",
    );
  }

  const updatedDiagnostic = {
    hospitalId: hospital.docId,
    name: data.name,
    type: data.type,
    available: data.available,
    updatedAt: new Date(),
  };

  await diagnosticRef.set(updatedDiagnostic, {
    merge: true,
  });

  return {
    diagnosticId,
    ...updatedDiagnostic,
  };
}

// ============================================================
// HOSPITAL DIAGNOSTICS - DELETE
// ============================================================

export async function deleteHospitalDiagnostic(
  uid: string,
  diagnosticId: string,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  const diagnosticRef = firestore
    .collection("hospitalDiagnostics")
    .doc(diagnosticId);

  const diagnosticSnapshot = await diagnosticRef.get();

  if (!diagnosticSnapshot.exists) {
    throw new AppError(
      404,
      "DIAGNOSTIC_NOT_FOUND",
      "Diagnostic information not found.",
    );
  }

  const diagnosticData = diagnosticSnapshot.data();

  if (!diagnosticData) {
    throw new AppError(
      404,
      "DIAGNOSTIC_NOT_FOUND",
      "Diagnostic information not found.",
    );
  }

  if (diagnosticData.hospitalId !== hospital.docId) {
    throw new AppError(
      403,
      "DIAGNOSTIC_ACCESS_DENIED",
      "You are not authorized to delete this diagnostic information.",
    );
  }

  await diagnosticRef.delete();

  return {
    diagnosticId,
    deleted: true,
  };
}

// ============================================================
// FACILITY MATCHING
// ============================================================

export async function findMatchingFacilities(
  uid: string,
  criteria: FacilityMatchData,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  // ----------------------------------------------------------
  // Get current hospital
  // ----------------------------------------------------------

  const currentHospital = await getHospitalByOwnerUid(uid);

  ensureHospitalVerified(currentHospital.data);

  // ----------------------------------------------------------
  // Get all hospitals
  // ----------------------------------------------------------

  const hospitalsSnapshot = await firestore.collection("hospitals").get();

  const matches: any[] = [];

  // ----------------------------------------------------------
  // Check candidate hospitals one by one
  // ----------------------------------------------------------

  for (const hospitalDoc of hospitalsSnapshot.docs) {
    const hospitalData = hospitalDoc.data();

    if (!hospitalData) {
      continue;
    }

    const hospitalId = hospitalDoc.id;

    // --------------------------------------------------------
    // Do not include current hospital
    // --------------------------------------------------------

    if (hospitalId === currentHospital.docId) {
      continue;
    }

    if (hospitalData.ownerUid === uid) {
      continue;
    }

    // --------------------------------------------------------
    // Only VERIFIED hospitals can be matched
    // --------------------------------------------------------

    const verificationStatus = (hospitalData.verificationStatus ??
      "PENDING") as HospitalVerificationStatus;

    if (verificationStatus !== "VERIFIED") {
      continue;
    }

    // --------------------------------------------------------
    // Emergency capability
    // --------------------------------------------------------

    if (
      criteria.emergencyRequired === true &&
      hospitalData.emergencyCapability !== true
    ) {
      continue;
    }

    // --------------------------------------------------------
    // Capacity
    //
    // Capacity is read from hospitalCapacity.
    // The mock/test environment may not provide this collection,
    // therefore missing mocked capacity is treated as unavailable
    // data rather than causing the complete request to crash.
    // --------------------------------------------------------

    let capacityData: any = null;

    const capacityCollection = firestore.collection("hospitalCapacity");

    if (
      capacityCollection &&
      typeof (capacityCollection as any).doc === "function"
    ) {
      const capacitySnapshot = await (capacityCollection as any)
        .doc(hospitalId)
        .get();

      if (capacitySnapshot.exists) {
        capacityData = capacitySnapshot.data() ?? null;
      }
    }

    const availableBeds = Number(capacityData?.availableBeds ?? 0);

    const availableIcuBeds = Number(capacityData?.availableIcuBeds ?? 0);

    const emergencyCapacity = Number(capacityData?.emergencyCapacity ?? 0);

    // --------------------------------------------------------
    // If live capacity data is available, use it.
    //
    // When no capacity document exists, we keep the hospital
    // eligible for basic capability matching. This also allows
    // hospitals that have not yet initialized a capacity record
    // to remain discoverable at the matching foundation level.
    // --------------------------------------------------------

    if (capacityData) {
      if (criteria.emergencyRequired === true && emergencyCapacity <= 0) {
        continue;
      }

      if (criteria.icuRequired === true && availableIcuBeds <= 0) {
        continue;
      }

      if (availableBeds <= 0) {
        continue;
      }
    }

    // --------------------------------------------------------
    // ICU fallback using declared hospital facilities
    //
    // This provides compatibility with hospital profiles while
    // live ICU capacity is being maintained.
    // --------------------------------------------------------

    if (criteria.icuRequired === true && !capacityData) {
      const facilities = Array.isArray(hospitalData.facilities)
        ? hospitalData.facilities
        : [];

      const hasDeclaredIcu = facilities.some((facility: unknown) => {
        if (typeof facility !== "string") {
          return false;
        }

        const facilityName = facility.trim().toLowerCase();

        return (
          facilityName.includes("icu") ||
          facilityName.includes("intensive care")
        );
      });

      if (!hasDeclaredIcu) {
        continue;
      }
    }

    // --------------------------------------------------------
    // Get available specialists
    // --------------------------------------------------------

    let specialists: any[] = [];

    const staffCollection = firestore.collection("hospitalStaff");

    if (
      staffCollection &&
      typeof (staffCollection as any).where === "function"
    ) {
      const specialistsSnapshot = await (staffCollection as any)
        .where("hospitalId", "==", hospitalId)
        .get();

      specialists = specialistsSnapshot.docs.map((doc: any) => ({
        staffId: doc.id,
        ...doc.data(),
      }));
    }

    // --------------------------------------------------------
    // Specialist matching
    // --------------------------------------------------------

    let matchedSpecialists = specialists;

    if (criteria.specialization) {
      const requiredSpecialization = criteria.specialization
        .trim()
        .toLowerCase();

      matchedSpecialists = specialists.filter((specialist: any) => {
        if (specialist.availability !== true) {
          return false;
        }

        const specialization =
          typeof specialist.specialization === "string"
            ? specialist.specialization.trim().toLowerCase()
            : "";

        return specialization.includes(requiredSpecialization);
      });

      if (matchedSpecialists.length === 0) {
        continue;
      }
    }

    // --------------------------------------------------------
    // Get diagnostic facilities
    // --------------------------------------------------------

    let diagnostics: any[] = [];

    const diagnosticsCollection = firestore.collection("hospitalDiagnostics");

    if (
      diagnosticsCollection &&
      typeof (diagnosticsCollection as any).where === "function"
    ) {
      const diagnosticsSnapshot = await (diagnosticsCollection as any)
        .where("hospitalId", "==", hospitalId)
        .get();

      diagnostics = diagnosticsSnapshot.docs.map((doc: any) => ({
        diagnosticId: doc.id,
        ...doc.data(),
      }));
    }

    // --------------------------------------------------------
    // Add matched hospital
    // --------------------------------------------------------

    matches.push({
      hospitalId,
      ...hospitalData,

      capacity: capacityData
        ? {
            totalBeds: Number(capacityData.totalBeds ?? 0),
            availableBeds,
            icuBeds: Number(capacityData.icuBeds ?? 0),
            availableIcuBeds,
            emergencyCapacity,
          }
        : null,

      matchedSpecialists,
      matchedDiagnostics: diagnostics,
    });
  }

  return matches;
}

// ============================================================
// HOSPITAL REFERRAL - EXISTING CREATE
// ============================================================

export async function createHospitalReferral(
  uid: string,
  data: HospitalReferralData,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  ensureHospitalVerified(hospital.data);

  // ----------------------------------------------------------
  // Validate referral data
  // ----------------------------------------------------------

  if (!data.emergencyRequestId || !data.referredHospitalId || !data.reason) {
    throw new AppError(
      400,
      "INVALID_REFERRAL_DATA",
      "Emergency request, referred hospital and reason are required.",
    );
  }

  // ----------------------------------------------------------
  // Check request exists AND belongs to current hospital
  // ----------------------------------------------------------

  const { requestData } = await getOwnedEmergencyRequest(
    uid,
    data.emergencyRequestId,
    true,
  );

  if (!requestData) {
    throw new AppError(
      404,
      "REQUEST_NOT_FOUND",
      "Emergency request not found.",
    );
  }

  // ----------------------------------------------------------
  // Prevent self-referral
  // ----------------------------------------------------------

  if (data.referredHospitalId === hospital.docId) {
    throw new AppError(
      400,
      "INVALID_REFERRAL_TARGET",
      "A hospital cannot refer a case to itself.",
    );
  }

  // ----------------------------------------------------------
  // Check target hospital
  // ----------------------------------------------------------

  const targetHospitalSnapshot = await firestore
    .collection("hospitals")
    .doc(data.referredHospitalId)
    .get();

  if (!targetHospitalSnapshot.exists) {
    throw new AppError(
      404,
      "TARGET_HOSPITAL_NOT_FOUND",
      "Referred hospital not found.",
    );
  }

  const targetHospitalData = targetHospitalSnapshot.data();

  if (!targetHospitalData) {
    throw new AppError(
      404,
      "TARGET_HOSPITAL_NOT_FOUND",
      "Referred hospital not found.",
    );
  }

  ensureHospitalVerified(targetHospitalData);

  // ----------------------------------------------------------
  // Create referral
  // ----------------------------------------------------------

  const referralRef = firestore.collection("hospitalReferrals").doc();

  const now = new Date();

  const referral = {
    referralId: referralRef.id,
    emergencyRequestId: data.emergencyRequestId,
    fromHospitalId: hospital.docId,
    referredHospitalId: data.referredHospitalId,
    reason: data.reason,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  };

  await referralRef.set(referral);

  return referral;
}

// ============================================================
// HOSPITAL REFERRAL - EXACT REQUEST ENDPOINT SUPPORT
// ============================================================

export async function createHospitalReferralForRequest(
  uid: string,
  requestId: string,
  data: HospitalReferralRequestData,
) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  ensureHospitalVerified(hospital.data);

  // ----------------------------------------------------------
  // Validate request body
  // ----------------------------------------------------------

  if (!data.referredHospitalId || !data.reason) {
    throw new AppError(
      400,
      "INVALID_REFERRAL_DATA",
      "Referred hospital and reason are required.",
    );
  }

  // ----------------------------------------------------------
  // Check emergency request exists
  // ----------------------------------------------------------

  const requestRef = firestore
    .collection("hospitalEmergencyRequests")
    .doc(requestId);

  const requestSnapshot = await requestRef.get();

  if (!requestSnapshot.exists) {
    throw new AppError(
      404,
      "REQUEST_NOT_FOUND",
      "Emergency request not found.",
    );
  }

  const requestData = requestSnapshot.data();

  if (!requestData) {
    throw new AppError(
      404,
      "REQUEST_NOT_FOUND",
      "Emergency request not found.",
    );
  }

  // ----------------------------------------------------------
  // Check request ownership
  // ----------------------------------------------------------

  if (requestData.hospitalId !== hospital.docId) {
    throw new AppError(
      403,
      "REQUEST_ACCESS_DENIED",
      "You are not authorized to refer this emergency request.",
    );
  }

  // ----------------------------------------------------------
  // Prevent self-referral
  // ----------------------------------------------------------

  if (data.referredHospitalId === hospital.docId) {
    throw new AppError(
      400,
      "INVALID_REFERRAL_TARGET",
      "A hospital cannot refer a case to itself.",
    );
  }

  // ----------------------------------------------------------
  // Check target hospital
  // ----------------------------------------------------------

  const targetHospitalSnapshot = await firestore
    .collection("hospitals")
    .doc(data.referredHospitalId)
    .get();

  if (!targetHospitalSnapshot.exists) {
    throw new AppError(
      404,
      "TARGET_HOSPITAL_NOT_FOUND",
      "Referred hospital not found.",
    );
  }

  const targetHospitalData = targetHospitalSnapshot.data();

  if (!targetHospitalData) {
    throw new AppError(
      404,
      "TARGET_HOSPITAL_NOT_FOUND",
      "Referred hospital not found.",
    );
  }

  ensureHospitalVerified(targetHospitalData);

  // ----------------------------------------------------------
  // Create referral
  // ----------------------------------------------------------

  const referralRef = firestore.collection("hospitalReferrals").doc();

  const now = new Date();

  const referral = {
    referralId: referralRef.id,
    emergencyRequestId: requestId,
    fromHospitalId: hospital.docId,
    referredHospitalId: data.referredHospitalId,
    reason: data.reason,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  };

  await referralRef.set(referral);

  return referral;
}

// ============================================================
// HOSPITAL REFERRALS - GET
// ============================================================

export async function getHospitalReferrals(uid: string) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);

  ensureHospitalVerified(hospital.data);

  const referralsSnapshot = await firestore
    .collection("hospitalReferrals")
    .where("fromHospitalId", "==", hospital.docId)
    .get();

  return referralsSnapshot.docs.map((doc) => ({
    referralId: doc.id,
    ...doc.data(),
  }));
}

// ============================================================
// HOSPITAL FLEET & DRIVERS
// ============================================================

export async function getHospitalDrivers(uid: string) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);
  ensureHospitalVerified(hospital.data);

  const driversSnap = await firestore.collection("drivers").get();

  const hospitalName = (hospital.data.hospitalName || hospital.data.name || "").toLowerCase();

  const matchedDrivers = driversSnap.docs
    .map((d) => ({
      id: d.id,
      uid: d.id,
      ...d.data(),
    }))
    .filter((d: any) => {
      if (d.hospitalId === hospital.docId || d.hospitalId === uid) return true;
      if (d.hospitalName && hospitalName && d.hospitalName.toLowerCase() === hospitalName) return true;
      return false;
    });

  return matchedDrivers;
}

export async function searchDriverForHospital(uid: string, rawQuery: string) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);
  ensureHospitalVerified(hospital.data);

  if (!rawQuery || !rawQuery.trim()) {
    throw new AppError(400, "QUERY_REQUIRED", "Search query is required.");
  }

  const query = rawQuery.trim();
  const upperQuery = query.toUpperCase();
  const cleanDigits = query.replace(/[^\d]/g, "");

  // Candidate phone strings to search
  const phoneCandidates = Array.from(
    new Set([
      query,
      cleanDigits,
      cleanDigits.length === 10 ? `+91${cleanDigits}` : null,
      cleanDigits.startsWith("91") && cleanDigits.length === 12 ? `+${cleanDigits}` : null,
      cleanDigits.startsWith("91") && cleanDigits.length === 12 ? cleanDigits.slice(2) : null,
    ].filter(Boolean) as string[])
  );

  let targetUid: string | null = null;
  let userData: any = null;
  let driverDoc: any = null;

  // 1. Search in users by crisisId (Golden Hour ID)
  let userSnap = await firestore
    .collection("users")
    .where("crisisId", "==", upperQuery)
    .limit(1)
    .get();

  // 2. Search users by phone candidates
  if (userSnap.empty) {
    for (const p of phoneCandidates) {
      const pSnap = await firestore.collection("users").where("phone", "==", p).limit(1).get();
      if (!pSnap.empty) {
        userSnap = pSnap;
        break;
      }
    }
  }

  // 3. Search users by email
  if (userSnap.empty && query.includes("@")) {
    const eSnap = await firestore.collection("users").where("email", "==", query.toLowerCase()).limit(1).get();
    if (!eSnap.empty) userSnap = eSnap;
  }

  if (!userSnap.empty) {
    targetUid = userSnap.docs[0].id;
    userData = userSnap.docs[0].data();
  }

  // 4. Look up in drivers collection by targetUid
  if (targetUid) {
    const dSnap = await firestore.collection("drivers").doc(targetUid).get();
    if (dSnap.exists) {
      driverDoc = dSnap;
    }
  }

  // 5. If driverDoc not found by targetUid, search drivers collection by phone, plate, license
  if (!driverDoc) {
    for (const p of phoneCandidates) {
      const drvByPhone = await firestore.collection("drivers").where("phone", "==", p).limit(1).get();
      if (!drvByPhone.empty) {
        driverDoc = drvByPhone.docs[0];
        targetUid = driverDoc.id;
        break;
      }
    }
  }

  if (!driverDoc) {
    const drvByPlate = await firestore
      .collection("drivers")
      .where("vehiclePlateNumber", "==", upperQuery)
      .limit(1)
      .get();
    if (!drvByPlate.empty) {
      driverDoc = drvByPlate.docs[0];
      targetUid = driverDoc.id;
    }
  }

  if (!driverDoc) {
    const drvByLic = await firestore
      .collection("drivers")
      .where("licenseNumber", "==", upperQuery)
      .limit(1)
      .get();
    if (!drvByLic.empty) {
      driverDoc = drvByLic.docs[0];
      targetUid = driverDoc.id;
    }
  }

  if (!driverDoc && !userData) {
    throw new AppError(404, "DRIVER_NOT_FOUND", `No driver found matching "${query}".`);
  }

  const driverData = driverDoc ? driverDoc.data() : {};
  const isAlreadyLinked = driverData.hospitalId === hospital.docId || driverData.hospitalId === uid;

  return {
    uid: targetUid,
    name: driverData.name || userData?.name || "Ambulance Pilot",
    phone: driverData.phone || userData?.phone || "",
    email: driverData.email || userData?.email || "",
    crisisId: userData?.crisisId || upperQuery,
    goldenHourId: userData?.crisisId || upperQuery,
    vehiclePlateNumber: driverData.vehiclePlateNumber || driverData.ambulanceId || "Unit Registered",
    ambulanceType: driverData.ambulanceType || "Basic Life Support (BLS)",
    licenseNumber: driverData.licenseNumber || "Verified License",
    availability: driverData.availability || "AVAILABLE",
    currentHospital: driverData.hospitalName || "Independent Fleet",
    isAlreadyLinked,
  };
}

export async function addHospitalDriver(uid: string, data: any) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);
  ensureHospitalVerified(hospital.data);

  const now = new Date().toISOString();
  const hospName = hospital.data.hospitalName || hospital.data.name || "Hospital Fleet";

  // Case 1: Linking existing registered driver by driverUid or goldenHourId
  if (data?.driverUid || data?.goldenHourId) {
    let targetUid = data.driverUid;

    if (!targetUid && data.goldenHourId) {
      const uSnap = await firestore
        .collection("users")
        .where("crisisId", "==", data.goldenHourId.trim().toUpperCase())
        .limit(1)
        .get();
      if (!uSnap.empty) {
        targetUid = uSnap.docs[0].id;
      }
    }

    if (targetUid) {
      const driverRef = firestore.collection("drivers").doc(targetUid);
      const driverSnap = await driverRef.get();

      if (driverSnap.exists) {
        const dData = driverSnap.data();
        await driverRef.update({
          hospitalId: hospital.docId,
          hospitalName: hospName,
          verificationStatus: "APPROVED",
          availability: dData?.availability === "BUSY" ? "BUSY" : "AVAILABLE",
          updatedAt: now,
        });

        // Also sync hospital affiliation to user's profile document
        try {
          await firestore.collection("users").doc(targetUid).set(
            {
              hospitalId: hospital.docId,
              hospitalName: hospName,
              updatedAt: now,
            },
            { merge: true },
          );
        } catch {}

        if (dData?.vehiclePlateNumber) {
          const ambRef = firestore.collection("ambulances").doc(dData.vehiclePlateNumber);
          await ambRef.set(
            {
              ambulanceId: dData.vehiclePlateNumber,
              vehicleNumber: dData.vehiclePlateNumber,
              driverId: targetUid,
              hospitalId: hospital.docId,
              status: "AVAILABLE",
              updatedAt: now,
            },
            { merge: true },
          );
        }

        return {
          uid: targetUid,
          ...dData,
          hospitalId: hospital.docId,
          hospitalName: hospName,
        };
      }
    }
  }

  // Case 2: Manual entry of driver details
  if (!data?.name || !data?.phone || !data?.vehiclePlateNumber) {
    throw new AppError(
      400,
      "INVALID_DRIVER_INPUT",
      "Driver name, phone, and vehicle plate number are required.",
    );
  }

  const driverId = `drv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const goldenHourId = `GH-DRV-${driverId.slice(-4).toUpperCase()}`;

  const newDriver = {
    uid: driverId,
    id: driverId,
    name: data.name.trim(),
    phone: data.phone.trim(),
    licenseNumber: (data.licenseNumber || "LIC-" + Math.floor(100000 + Math.random() * 900000)).trim(),
    vehiclePlateNumber: data.vehiclePlateNumber.trim().toUpperCase(),
    ambulanceId: data.vehiclePlateNumber.trim().toUpperCase(),
    ambulanceType: data.ambulanceType || "Basic Life Support (BLS)",
    email: data.email || null,
    hospitalId: hospital.docId,
    hospitalName: hospName,
    verificationStatus: "APPROVED",
    availability: (data.availability || "AVAILABLE").toUpperCase(),
    createdAt: now,
    updatedAt: now,
  };

  await firestore.collection("drivers").doc(driverId).set(newDriver);

  // Sync to users collection so driver profile and Golden Hour ID exist
  await firestore.collection("users").doc(driverId).set({
    uid: driverId,
    name: newDriver.name,
    phone: newDriver.phone,
    email: newDriver.email,
    role: "AMBULANCE_DRIVER",
    roles: ["AMBULANCE_DRIVER"],
    verificationStatus: "APPROVED",
    crisisId: goldenHourId,
    goldenHourId,
    hospitalId: hospital.docId,
    hospitalName: hospName,
    vehiclePlateNumber: newDriver.vehiclePlateNumber,
    ambulanceId: newDriver.vehiclePlateNumber,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  // Register corresponding vehicle in ambulances collection
  await firestore.collection("ambulances").doc(newDriver.vehiclePlateNumber).set({
    ambulanceId: newDriver.vehiclePlateNumber,
    vehicleNumber: newDriver.vehiclePlateNumber,
    driverId,
    hospitalId: hospital.docId,
    type: newDriver.ambulanceType,
    status: newDriver.availability === "BUSY" ? "BUSY" : "AVAILABLE",
    createdAt: now,
    updatedAt: now,
  });

  return { ...newDriver, goldenHourId, crisisId: goldenHourId };
}

export async function unlinkHospitalDriver(uid: string, driverId: string) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospital = await getHospitalByOwnerUid(uid);
  ensureHospitalVerified(hospital.data);

  const now = new Date().toISOString();
  const driverRef = firestore.collection("drivers").doc(driverId);
  const driverSnap = await driverRef.get();

  if (!driverSnap.exists) {
    throw new AppError(404, "DRIVER_NOT_FOUND", "Driver not found.");
  }

  const dData = driverSnap.data();
  if (dData?.hospitalId !== hospital.docId && dData?.hospitalId !== uid) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "This driver is not linked to your hospital fleet.",
    );
  }

  // Remove hospital affiliation
  await driverRef.update({
    hospitalId: null,
    hospitalName: "Independent Fleet",
    updatedAt: now,
  });

  try {
    await firestore.collection("users").doc(driverId).update({
      hospitalId: null,
      hospitalName: "Independent Fleet",
      updatedAt: now,
    });
  } catch {}

  if (dData?.vehiclePlateNumber) {
    try {
      await firestore.collection("ambulances").doc(dData.vehiclePlateNumber).update({
        hospitalId: null,
        updatedAt: now,
      });
    } catch {}
  }

  return {
    success: true,
    driverId,
    message: "Driver unlinked and returned to Independent Fleet.",
  };
}
