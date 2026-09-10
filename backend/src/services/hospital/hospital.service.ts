import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";

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
  ACCEPTED: ["AMBULANCE EN ROUTE"],
  "AMBULANCE EN ROUTE": ["PATIENT ARRIVED"],
  "PATIENT ARRIVED": ["IN TREATMENT"],
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

  const hospitalSnapshot = await firestore
    .collection("hospitals")
    .where("ownerUid", "==", uid)
    .limit(1)
    .get();

  if (hospitalSnapshot.empty) {
    throw new AppError(
      404,
      "HOSPITAL_NOT_FOUND",
      "Hospital profile not found.",
    );
  }

  const hospitalDoc = hospitalSnapshot.docs[0];
  const hospitalData = hospitalDoc.data();

  if (!hospitalData) {
    throw new AppError(
      404,
      "HOSPITAL_NOT_FOUND",
      "Hospital profile not found.",
    );
  }

  return {
    docId: hospitalDoc.id,
    data: hospitalData,
  };
}

function ensureHospitalVerified(hospitalData: any) {
  const verificationStatus = (hospitalData.verificationStatus ??
    "PENDING") as HospitalVerificationStatus;

  if (verificationStatus !== "VERIFIED") {
    if (verificationStatus === "REJECTED") {
      throw new AppError(
        403,
        "HOSPITAL_NOT_VERIFIED",
        "Hospital verification has been rejected. Operational actions are not allowed.",
      );
    }

    throw new AppError(
      403,
      "HOSPITAL_NOT_VERIFIED",
      "Hospital is not verified yet. Operational actions are not allowed.",
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

  if (requestData.hospitalId !== hospital.docId) {
    throw new AppError(
      403,
      "REQUEST_ACCESS_DENIED",
      "You are not authorized to access this emergency request.",
    );
  }

  return {
    hospital,
    requestRef,
    requestSnapshot,
    requestData,
  };
}

// ============================================================
// INTERNAL EMERGENCY REQUEST TRANSITION HELPER
// ============================================================

async function transitionHospitalRequest(
  uid: string,
  requestId: string,
  targetStatus: HospitalEmergencyRequestStatus,
) {
  const { requestRef, requestData } = await getOwnedEmergencyRequest(
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

  const requestsSnapshot = await firestore
    .collection("hospitalEmergencyRequests")
    .where("hospitalId", "==", hospital.docId)
    .get();

  return requestsSnapshot.docs.map((doc) => ({
    requestId: doc.id,
    ...doc.data(),
  }));
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

  return {
    requestId: requestSnapshot.id,
    ...requestData,
  };
}

// ============================================================
// HOSPITAL EMERGENCY REQUEST - ACCEPT
// ============================================================

export async function acceptHospitalRequest(uid: string, requestId: string) {
  const { requestRef, requestData } = await getOwnedEmergencyRequest(
    uid,
    requestId,
    true,
  );

  const currentStatus = (requestData.status ??
    "NEW") as HospitalEmergencyRequestStatus;

  if (currentStatus !== "NEW") {
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
  };

  await requestRef.set(updatedRequest, {
    merge: true,
  });

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
    "NEW") as HospitalEmergencyRequestStatus;

  if (currentStatus !== "NEW") {
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

  const currentHospital = await getHospitalByOwnerUid(uid);

  ensureHospitalVerified(currentHospital.data);

  const hospitalsSnapshot = await firestore.collection("hospitals").get();

  const matches = hospitalsSnapshot.docs
    .map((doc) => ({
      hospitalId: doc.id,
      ...doc.data(),
    }))
    .filter((hospital: any) => {
      // --------------------------------------------------------
      // Do not include current hospital
      // --------------------------------------------------------

      if (hospital.ownerUid === uid) {
        return false;
      }

      // --------------------------------------------------------
      // Only verified hospitals should be matchable
      // --------------------------------------------------------

      const verificationStatus = (hospital.verificationStatus ??
        "PENDING") as HospitalVerificationStatus;

      if (verificationStatus !== "VERIFIED") {
        return false;
      }

      // --------------------------------------------------------
      // Emergency capability
      // --------------------------------------------------------

      if (criteria.emergencyRequired === true) {
        if (hospital.emergencyCapability !== true) {
          return false;
        }
      }

      // --------------------------------------------------------
      // Specialization
      // --------------------------------------------------------

      if (criteria.specialization) {
        const facilities = Array.isArray(hospital.facilities)
          ? hospital.facilities
          : [];

        const requiredSpecialization = criteria.specialization
          .trim()
          .toLowerCase();

        const hasSpecialization = facilities.some(
          (facility: unknown) =>
            typeof facility === "string" &&
            facility.trim().toLowerCase().includes(requiredSpecialization),
        );

        if (!hasSpecialization) {
          return false;
        }
      }

      // --------------------------------------------------------
      // ICU requirement
      // --------------------------------------------------------

      if (criteria.icuRequired === true) {
        const facilities = Array.isArray(hospital.facilities)
          ? hospital.facilities
          : [];

        const hasIcu = facilities.some((facility: unknown) => {
          if (typeof facility !== "string") {
            return false;
          }

          const facilityName = facility.trim().toLowerCase();

          return (
            facilityName.includes("icu") ||
            facilityName.includes("intensive care")
          );
        });

        if (!hasIcu) {
          return false;
        }
      }

      return true;
    });

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

  // ----------------------------------------------------------
  // Get current hospital + verify it
  // ----------------------------------------------------------

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
  // Check that emergency request exists
  // AND belongs to current hospital
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
  // Check referred hospital exists
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

  // ----------------------------------------------------------
  // Only verified hospitals can receive referrals
  // ----------------------------------------------------------

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
  // Check current hospital owns the request
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
  // Check referred hospital exists
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

  // ----------------------------------------------------------
  // Only verified hospitals can receive referrals
  // ----------------------------------------------------------

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
