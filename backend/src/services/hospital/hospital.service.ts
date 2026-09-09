import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";

// ============================================================
// TYPES
// ============================================================

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
    verificationStatus: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await hospitalRef.set(hospital);

  return hospital;
}

// ============================================================
// HOSPITAL PROFILE
// ============================================================

export async function getHospitalProfile(uid: string) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const snapshot = await firestore
    .collection("hospitals")
    .where("ownerUid", "==", uid)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new AppError(
      404,
      "HOSPITAL_NOT_FOUND",
      "Hospital profile not found.",
    );
  }

  return snapshot.docs[0].data();
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

  const hospitalId = hospitalSnapshot.docs[0].id;

  const capacitySnapshot = await firestore
    .collection("hospitalCapacity")
    .doc(hospitalId)
    .get();

  if (!capacitySnapshot.exists) {
    throw new AppError(
      404,
      "CAPACITY_NOT_FOUND",
      "Hospital capacity information not found.",
    );
  }

  return {
    hospitalId,
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

  const hospitalId = hospitalSnapshot.docs[0].id;

  // Validate negative values
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

  // Available beds cannot exceed total beds
  if (data.availableBeds > data.totalBeds) {
    throw new AppError(
      400,
      "INVALID_BED_CAPACITY",
      "Available beds cannot exceed total beds.",
    );
  }

  // Available ICU beds cannot exceed total ICU beds
  if (data.availableIcuBeds > data.icuBeds) {
    throw new AppError(
      400,
      "INVALID_ICU_CAPACITY",
      "Available ICU beds cannot exceed total ICU beds.",
    );
  }

  const capacityRef = firestore.collection("hospitalCapacity").doc(hospitalId);

  const capacity = {
    hospitalId,
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

  const hospitalId = hospitalSnapshot.docs[0].id;

  const requestsSnapshot = await firestore
    .collection("hospitalEmergencyRequests")
    .where("hospitalId", "==", hospitalId)
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

  const hospitalId = hospitalSnapshot.docs[0].id;

  const requestSnapshot = await firestore
    .collection("hospitalEmergencyRequests")
    .doc(requestId)
    .get();

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

  // Security: hospital can access only its own request
  if (requestData.hospitalId !== hospitalId) {
    throw new AppError(
      403,
      "REQUEST_ACCESS_DENIED",
      "You are not authorized to access this emergency request.",
    );
  }

  return {
    requestId: requestSnapshot.id,
    ...requestData,
  };
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

  const hospitalId = hospitalSnapshot.docs[0].id;

  const specialistsSnapshot = await firestore
    .collection("hospitalStaff")
    .where("hospitalId", "==", hospitalId)
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

  const hospitalId = hospitalSnapshot.docs[0].id;

  // Basic validation
  if (!data.name || !data.specialization) {
    throw new AppError(
      400,
      "INVALID_SPECIALIST_DATA",
      "Specialist name and specialization are required.",
    );
  }

  const staffRef = firestore.collection("hospitalStaff").doc();

  const specialist = {
    hospitalId,
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

  const hospitalId = hospitalSnapshot.docs[0].id;

  const diagnosticsSnapshot = await firestore
    .collection("hospitalDiagnostics")
    .where("hospitalId", "==", hospitalId)
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

  const hospitalId = hospitalSnapshot.docs[0].id;

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

  // Security: hospital can access only its own diagnostic
  if (diagnosticData.hospitalId !== hospitalId) {
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

  const hospitalId = hospitalSnapshot.docs[0].id;

  // Basic validation
  if (!data.name || !data.type) {
    throw new AppError(
      400,
      "INVALID_DIAGNOSTIC_DATA",
      "Diagnostic name and type are required.",
    );
  }

  const diagnosticRef = firestore.collection("hospitalDiagnostics").doc();

  const diagnostic = {
    hospitalId,
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

  const hospitalId = hospitalSnapshot.docs[0].id;

  // Validate input
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

  // Security: hospital can update only its own diagnostic
  if (existingDiagnostic.hospitalId !== hospitalId) {
    throw new AppError(
      403,
      "DIAGNOSTIC_ACCESS_DENIED",
      "You are not authorized to update this diagnostic information.",
    );
  }

  const updatedDiagnostic = {
    hospitalId,
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

  const hospitalId = hospitalSnapshot.docs[0].id;

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

  // Security: hospital can delete only its own diagnostic
  if (diagnosticData.hospitalId !== hospitalId) {
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

export interface FacilityMatchData {
  specialization?: string;
  emergencyRequired?: boolean;
  icuRequired?: boolean;
}

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

  // Verify current hospital exists
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

  const hospitalsSnapshot = await firestore.collection("hospitals").get();

  const matches = hospitalsSnapshot.docs
    .map((doc) => ({
      hospitalId: doc.id,
      ...doc.data(),
    }))
    .filter((hospital: any) => {
      if (hospital.ownerUid === uid) {
        return false;
      }

      if (criteria.emergencyRequired === true) {
        if (hospital.emergencyCapability !== true) {
          return false;
        }
      }

      return true;
    });

  return matches;
}

// ============================================================
// HOSPITAL REFERRAL - CREATE
// ============================================================

export interface HospitalReferralData {
  emergencyRequestId: string;
  referredHospitalId: string;
  reason: string;
}

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

  const hospitalId = hospitalSnapshot.docs[0].id;

  if (!data.emergencyRequestId || !data.referredHospitalId || !data.reason) {
    throw new AppError(
      400,
      "INVALID_REFERRAL_DATA",
      "Emergency request, referred hospital and reason are required.",
    );
  }

  if (data.referredHospitalId === hospitalId) {
    throw new AppError(
      400,
      "INVALID_REFERRAL_TARGET",
      "A hospital cannot refer a case to itself.",
    );
  }

  const referralRef = firestore.collection("hospitalReferrals").doc();

  const referral = {
    referralId: referralRef.id,
    emergencyRequestId: data.emergencyRequestId,
    fromHospitalId: hospitalId,
    referredHospitalId: data.referredHospitalId,
    reason: data.reason,
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await referralRef.set(referral);

  return referral;
}

// ============================================================
// HOSPITAL REFERRAL - GET
// ============================================================

export async function getHospitalReferrals(uid: string) {
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

  const hospitalId = hospitalSnapshot.docs[0].id;

  const referralsSnapshot = await firestore
    .collection("hospitalReferrals")
    .where("fromHospitalId", "==", hospitalId)
    .get();

  return referralsSnapshot.docs.map((doc) => ({
    referralId: doc.id,
    ...doc.data(),
  }));
}
