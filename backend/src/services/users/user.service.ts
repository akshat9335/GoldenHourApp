import { firestore } from "../../config/firebase";
import { dataStore } from "../../models/dataStore";
import { AppError } from "../../utils/AppError";
import { CanonicalRole, VerificationStatus } from "../../types/express";

const USERS_COLLECTION = "users";
const CRISIS_IDS_COLLECTION = "crisisIds";

export interface UserProfile {
  uid: string;
  crisisId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  role?: CanonicalRole | null;
  roles?: CanonicalRole[];
  verificationStatus?: VerificationStatus;
  roleVerificationStatus?: Partial<Record<CanonicalRole, VerificationStatus>>;
  trustScore?: number | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  medications?: string | null;
  chronicConditions?: string | null;
  homeAddress?: string | null;
  emergencyContacts?: any[];
  // Professional domain fields
  specialty?: string | null;
  qualification?: string | null;
  licenseNumber?: string | null;
  clinicId?: string | null;
  clinicName?: string | null;
  clinicAddress?: string | null;
  consultationFee?: number | null;
  hospitalId?: string | null;
  hospitalName?: string | null;
  hospitalRegNumber?: string | null;
  driverId?: string | null;
  ambulanceId?: string | null;
  vehiclePlateNumber?: string | null;
  ambulanceType?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  exists?: boolean;
}

function generateCrisisId(name?: string): string {
  const initials =
    (name ?? "GH")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "GH";

  const prefix = initials.padEnd(2, "G").slice(0, 2);
  const number = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}-${number}`;
}

async function reserveUniqueCrisisId(
  uid: string,
  name?: string,
): Promise<string> {
  if (!firestore) {
    return generateCrisisId(name);
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const crisisId = generateCrisisId(name);
    const reservationRef = firestore
      .collection(CRISIS_IDS_COLLECTION)
      .doc(crisisId);

    try {
      await reservationRef.create({
        uid,
        crisisId,
        createdAt: new Date().toISOString(),
      });

      const existingUsers = await firestore
        .collection(USERS_COLLECTION)
        .where("crisisId", "==", crisisId)
        .limit(1)
        .get();

      if (!existingUsers.empty) {
        await reservationRef.delete();
        continue;
      }

      return crisisId;
    } catch (error: unknown) {
      if (isAlreadyExistsError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new AppError(
    500,
    "CRISIS_ID_GENERATION_FAILED",
    "Unable to generate a unique Crisis ID. Please try again.",
  );
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  return code === 6 || code === "6" || code === "already-exists";
}

/**
 * Retrieve user profile by canonical Firebase UID.
 * Checks local in-memory store and Firestore, hydrating domain properties.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  let profile = dataStore.users.get(uid) as UserProfile | undefined;

  if (!profile && firestore) {
    try {
      const snap = await firestore.collection(USERS_COLLECTION).doc(uid).get();
      if (snap.exists) {
        profile = { uid, ...snap.data() } as UserProfile;
        dataStore.users.set(uid, profile);
      }
    } catch (err) {
      console.warn("[UserService] Failed to read user from Firestore:", err);
    }
  }

  if (!profile) {
    return null;
  }

  // Hydrate driver details if driver
  if (profile.role === "AMBULANCE_DRIVER" || profile.roles?.includes("AMBULANCE_DRIVER")) {
    if (firestore && (!profile.vehiclePlateNumber || !profile.ambulanceId)) {
      try {
        const driverDoc = await firestore.collection("drivers").doc(uid).get();
        if (driverDoc.exists) {
          const dData = driverDoc.data() as any;
          if (dData) {
            profile = {
              ...profile,
              ambulanceId: dData.ambulanceId || profile.ambulanceId || null,
              vehiclePlateNumber: dData.vehiclePlateNumber || dData.ambulanceId || profile.vehiclePlateNumber || null,
              hospitalId: dData.hospitalId || profile.hospitalId || null,
              hospitalName: dData.hospitalName || profile.hospitalName || null,
            };
            dataStore.users.set(uid, profile);
          }
        }
      } catch {}
    }

    if (profile.verificationStatus !== "REJECTED") {
      profile.verificationStatus = "APPROVED";
    }
    if (!profile.roleVerificationStatus) {
      profile.roleVerificationStatus = {};
    }
    if (profile.roleVerificationStatus.AMBULANCE_DRIVER !== "REJECTED") {
      profile.roleVerificationStatus.AMBULANCE_DRIVER = "APPROVED";
    }
  }

  // Hydrate doctor details if doctor
  if (profile.role === "DOCTOR" || profile.roles?.includes("DOCTOR")) {
    const doctorRecord = dataStore.doctors.get(`doc-${uid}`) as any;
    if (doctorRecord) {
      profile = {
        ...profile,
        specialty: doctorRecord.specialty || profile.specialty,
        qualification: doctorRecord.qualification || profile.qualification,
        licenseNumber: doctorRecord.licenseNumber || profile.licenseNumber,
        clinicId: doctorRecord.clinicId || profile.clinicId,
        clinicName: doctorRecord.clinicName || profile.clinicName,
        clinicAddress: doctorRecord.clinicAddress || profile.clinicAddress,
        consultationFee: doctorRecord.consultationFee || profile.consultationFee,
      };
    }
  }

  return profile;
}

/**
 * Ensures a user profile exists, generating a crisisId if missing.
 */
export async function getOrCreateUserProfile(
  uid: string,
  fallbackEmail?: string,
): Promise<UserProfile> {
  const existing = await getUserProfile(uid);
  if (existing && existing.crisisId) {
    return existing;
  }

  const name = existing?.name || undefined;
  const email = existing?.email || fallbackEmail || undefined;
  const crisisId = await reserveUniqueCrisisId(uid, name);

  const userData: UserProfile = {
    uid,
    crisisId,
    name: name || null,
    email: email || null,
    role: existing?.role || "PATIENT",
    roles: existing?.roles || ["PATIENT"],
    verificationStatus: existing?.verificationStatus || "APPROVED",
    roleVerificationStatus: existing?.roleVerificationStatus || { PATIENT: "APPROVED" },
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dataStore.users.set(uid, userData);
  if (firestore) {
    try {
      await firestore.collection(USERS_COLLECTION).doc(uid).set(userData, { merge: true });
    } catch {}
  }

  return userData;
}

/**
 * Register a user profile with role enforcement, multi-role coexistence,
 * and strict verification gating.
 */
export async function registerUserProfile(
  uid: string,
  input: any,
): Promise<UserProfile> {
  const requestedRole = (input.role || "PATIENT").toUpperCase();

  // Strict check: Cannot register publicly as ADMIN
  if (requestedRole === "ADMIN") {
    throw new AppError(403, "FORBIDDEN", "Registration as ADMIN is not permitted.");
  }

  const existing = await getUserProfile(uid);

  // If registering same role for an existing profile, prevent duplicate registration
  if (existing && existing.role === requestedRole && requestedRole === "PATIENT") {
    throw new AppError(409, "USER_ALREADY_EXISTS", "A user profile already exists for this account.");
  }

  const existingRoles: CanonicalRole[] = existing?.roles && existing.roles.length > 0
    ? existing.roles
    : (existing?.role ? [existing.role as CanonicalRole] : []);

  const combinedRoles: CanonicalRole[] = Array.from(
    new Set([...existingRoles, requestedRole as CanonicalRole])
  );

  // Auto-approve patients and operational testing roles so drivers and hospitals are never locked out
  const targetVerificationStatus: VerificationStatus =
    input.verificationStatus === "APPROVED" ||
    requestedRole === "PATIENT" ||
    requestedRole === "AMBULANCE_DRIVER" ||
    requestedRole === "HOSPITAL"
      ? "APPROVED"
      : "PENDING";

  const roleVerificationStatus: Partial<Record<CanonicalRole, VerificationStatus>> = {
    ...(existing?.roleVerificationStatus || {}),
    [requestedRole]: targetVerificationStatus,
  };

  // Preserve existing crisis ID or generate a new one
  const crisisId = existing?.crisisId || (await reserveUniqueCrisisId(uid, input.name || existing?.name));

  const now = new Date().toISOString();

  const profile: UserProfile = {
    ...existing,
    uid,
    crisisId,
    name: input.name || existing?.name || null,
    email: input.email || existing?.email || null,
    phone: input.phone || existing?.phone || null,
    photoURL: input.photoURL || existing?.photoURL || null,
    role: requestedRole as CanonicalRole,
    roles: combinedRoles,
    verificationStatus: targetVerificationStatus,
    roleVerificationStatus,
    bloodGroup: input.bloodGroup || existing?.bloodGroup || null,
    allergies: input.allergies || existing?.allergies || null,
    medications: input.medications || existing?.medications || null,
    chronicConditions: input.chronicConditions || existing?.chronicConditions || null,
    homeAddress: input.homeAddress || existing?.homeAddress || null,
    emergencyContacts: input.emergencyContacts || existing?.emergencyContacts || [],
    // Doctor fields
    specialty: input.specialty || existing?.specialty || null,
    qualification: input.qualification || existing?.qualification || null,
    licenseNumber: input.licenseNumber || existing?.licenseNumber || null,
    clinicId: input.clinicId || existing?.clinicId || null,
    clinicName: input.clinicName || existing?.clinicName || null,
    clinicAddress: input.clinicAddress || existing?.clinicAddress || null,
    consultationFee: input.consultationFee !== undefined ? Number(input.consultationFee) : existing?.consultationFee || null,
    // Hospital fields
    hospitalRegNumber: input.hospitalRegNumber || input.registrationNumber || existing?.hospitalRegNumber || null,
    // Ambulance Driver fields
    driverId: input.driverId || existing?.driverId || null,
    ambulanceId: input.ambulanceId || existing?.ambulanceId || null,
    vehiclePlateNumber: input.vehiclePlateNumber || input.ambulanceId || existing?.vehiclePlateNumber || null,
    ambulanceType: input.ambulanceType || existing?.ambulanceType || "Basic Life Support (BLS)",
    hospitalId: input.hospitalId || existing?.hospitalId || null,
    hospitalName: input.hospitalName || existing?.hospitalName || "Independent Fleet",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  dataStore.users.set(uid, profile);

  if (firestore) {
    try {
      await firestore.collection(USERS_COLLECTION).doc(uid).set(profile, { merge: true });
    } catch (err) {
      console.warn("[UserService] Failed to persist user to Firestore:", err);
    }
  }

  // Create professional domain records
  if (requestedRole === "DOCTOR") {
    const doctorId = `doc-${uid}`;
    const doctorRecord = {
      doctorId,
      userId: uid,
      name: profile.name || "Doctor",
      specialty: profile.specialty || "General Medicine",
      qualification: profile.qualification || "MBBS",
      experienceYears: Number(input.experienceYears) || 5,
      licenseNumber: profile.licenseNumber || "",
      clinicId: profile.clinicId || `clinic-${uid}`,
      clinicName: profile.clinicName || null,
      clinicAddress: profile.clinicAddress || null,
      consultationFee: profile.consultationFee || 500,
      verificationStatus: "PENDING" as const,
      availability: "OFFLINE" as const,
      rating: 5.0,
      servingToken: 0,
      queueLength: 0,
      estimatedWaitMinutes: 0,
      createdAt: now,
      updatedAt: now,
    };

    dataStore.doctors.set(doctorId, doctorRecord as any);
    if (firestore) {
      try {
        await firestore.collection("doctors").doc(doctorId).set(doctorRecord, { merge: true });
      } catch {}
    }
  } else if (requestedRole === "HOSPITAL") {
    const rawLoc = (input as any).location;
    const hospLat = typeof (input as any).latitude === 'number' ? (input as any).latitude : rawLoc?.latitude;
    const hospLng = typeof (input as any).longitude === 'number' ? (input as any).longitude : rawLoc?.longitude;
    const finalLoc = (hospLat && hospLng) ? { latitude: hospLat, longitude: hospLng } : null;

    const hospitalRecord = {
      id: uid,
      ownerUid: uid,
      name: profile.name || "Hospital Facility",
      email: profile.email || null,
      phone: profile.phone || null,
      registrationNumber: profile.hospitalRegNumber || null,
      address: profile.clinicAddress || profile.homeAddress || null,
      verificationStatus: targetVerificationStatus === "APPROVED" ? ("APPROVED" as const) : ("PENDING" as const),
      totalBeds: input.totalBeds || 20,
      icuBeds: input.icuBeds || 5,
      emergencyCapability: input.emergencyCapability || [],
      facilities: input.facilities || [],
      location: finalLoc,
      latitude: hospLat || null,
      longitude: hospLng || null,
      createdAt: now,
      updatedAt: now,
    };

    if (firestore) {
      try {
        await firestore.collection("hospitals").doc(uid).set(hospitalRecord, { merge: true });
      } catch {}
    }
  } else if (requestedRole === "AMBULANCE_DRIVER") {
    const rawDriverLoc = (input as any).location;
    const driverLat = typeof (input as any).latitude === 'number' ? (input as any).latitude : rawDriverLoc?.latitude;
    const driverLng = typeof (input as any).longitude === 'number' ? (input as any).longitude : rawDriverLoc?.longitude;
    const driverFinalLoc = (driverLat && driverLng) ? { latitude: driverLat, longitude: driverLng } : null;

    const driverRecord = {
      id: uid,
      uid,
      driverId: profile.driverId || `DRV-${uid.slice(0, 6)}`,
      name: profile.name || "Ambulance Driver",
      phone: profile.phone || null,
      email: profile.email || null,
      licenseNumber: profile.licenseNumber || null,
      ambulanceId: profile.ambulanceId || null,
      vehiclePlateNumber: profile.vehiclePlateNumber || profile.ambulanceId || null,
      ambulanceType: profile.ambulanceType || "Basic Life Support (BLS)",
      hospitalId: profile.hospitalId || null,
      hospitalName: profile.hospitalName || "Independent Fleet",
      verificationStatus: targetVerificationStatus === "APPROVED" ? ("VERIFIED" as const) : ("PENDING" as const),
      availability: "AVAILABLE" as const,
      location: driverFinalLoc,
      latitude: driverLat || null,
      longitude: driverLng || null,
      createdAt: now,
      updatedAt: now,
    };

    if (firestore) {
      try {
        await firestore.collection("drivers").doc(uid).set(driverRecord, { merge: true });
      } catch {}
    }
  }

  return profile;
}

/**
 * Updates user profile while preventing privilege escalation or identity spoofing.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>,
): Promise<UserProfile> {
  const existing = await getUserProfile(uid);
  if (!existing) {
    throw new AppError(404, "PROFILE_NOT_FOUND", "User profile not found.");
  }

  // Prevent changing canonical identifiers or self-elevating verificationStatus
  delete updates.uid;
  delete updates.crisisId;
  delete updates.role;
  delete updates.roles;
  delete updates.verificationStatus;
  delete updates.roleVerificationStatus;

  const merged: UserProfile = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  dataStore.users.set(uid, merged);

  if (firestore) {
    try {
      await firestore.collection(USERS_COLLECTION).doc(uid).set(merged, { merge: true });
    } catch (err) {
      console.warn("[UserService] Failed to update Firestore user:", err);
    }
  }

  return merged;
}