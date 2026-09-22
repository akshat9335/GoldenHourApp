import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";
import { emergencyAlertService } from "../notifications/emergencyAlert.service";
import { locationService } from "../location/location.service";

const USERS_COLLECTION = "users";
const EMERGENCIES_COLLECTION = "emergencies";
const HOSPITAL_REQUESTS_COLLECTION = "hospitalEmergencyRequests";

export type EmergencyStatus =
  | "REPORTED"
  | "CONFIRMING"
  | "HOSPITAL_SEARCH"
  | "HOSPITAL_ACCEPTED"
  | "AMBULANCE_ASSIGNED"
  | "EN_ROUTE"
  | "PATIENT_ARRIVED"
  | "TREATMENT"
  | "COMPLETED";

export interface EmergencyLocation {
  latitude: number;
  longitude: number;
}

export interface CreateEmergencyInput {
  incidentType: string;
  description?: string;
  voiceTranscript?: string;
  imageUrl?: string;
  location: EmergencyLocation;
  locationAddress?: string | null;
  severity?: string | null;
  aiResult?: unknown;
}

export interface Emergency {
  id: string;
  reporterId: string;
  crisisId: string;
  incidentType: string;
  description?: string | null;
  voiceTranscript?: string | null;
  imageUrl?: string | null;
  location: EmergencyLocation;
  locationAddress?: string | null;
  status: EmergencyStatus;
  severity?: string | null;
  aiResult?: unknown;
  confirmationCount: number;
  assignedDriverId?: string | null;
  assignedAmbulanceId?: string | null;
  assignedHospitalId?: string | null;
  assignedStaffIds?: string[];
  ambulanceLocation?: EmergencyLocation | null;
  assignedHospitalLocation?: EmergencyLocation | null;
  assignedHospitalName?: string | null;
  assignedHospitalPhone?: string | null;
  assignedDriverName?: string | null;
  assignedDriverPhone?: string | null;
  patientName?: string | null;
  patientPhone?: string | null;
  dismissedBy?: string[];
  createdAt: unknown;
  updatedAt: unknown;
}

function getFirestore() {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase Admin is not configured on this server.",
    );
  }

  return firestore;
}

function validateLocation(location: unknown): location is EmergencyLocation {
  if (!location || typeof location !== "object") {
    return false;
  }

  const value = location as Record<string, unknown>;

  return (
    typeof value.latitude === "number" &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}

export async function createEmergency(
  reporterId: string,
  input: CreateEmergencyInput,
): Promise<Emergency> {
  const db = getFirestore();

  if (!input.incidentType?.trim()) {
    throw new AppError(
      400,
      "INVALID_INCIDENT_TYPE",
      "Incident type is required.",
    );
  }

  if (!validateLocation(input.location)) {
    throw new AppError(
      400,
      "INVALID_LOCATION",
      "A valid latitude and longitude are required.",
    );
  }

  const userRef = db.collection(USERS_COLLECTION).doc(reporterId);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    throw new AppError(
      404,
      "USER_NOT_FOUND",
      "Reporter user profile was not found.",
    );
  }

  const user = userSnapshot.data() as {
    crisisId?: string;
    name?: string;
    patientName?: string;
    phone?: string;
  };

  if (!user.crisisId) {
    throw new AppError(
      400,
      "CRISIS_ID_NOT_FOUND",
      "Reporter does not have a Crisis ID.",
    );
  }

  const emergencyRef = db
    .collection(EMERGENCIES_COLLECTION)
    .doc();

  const now = new Date().toISOString();

  const emergency: Emergency = {
    id: emergencyRef.id,
    reporterId,
    crisisId: user.crisisId,
    incidentType: input.incidentType.trim(),
    description: input.description?.trim() || null,
    voiceTranscript: input.voiceTranscript?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    location: input.location,
    locationAddress: input.locationAddress?.trim() || null,
    status: "REPORTED",
    severity: input.severity ? input.severity.trim().toUpperCase() : null,
    aiResult: input.aiResult || null,
    confirmationCount: 0,
    patientName: user.name || user.patientName || "Emergency Patient",
    patientPhone: user.phone || null,
    createdAt: now,
    updatedAt: now,
  };

  await emergencyRef.set(emergency);

  // Auto-bridge emergency to nearby hospitals in hospitalEmergencyRequests (skipped in isolated unit test runner)
  if (process.env.NODE_ENV !== "test") {
    try {
      const targetMap = new Map<string, { hospitalId: string; name: string; etaMinutes: number; distanceKm: number }>();

      // 1. First find nearby hospitals using spatial proximity
      let nearby = await locationService.getNearbyHospitals(
        emergency.location.latitude,
        emergency.location.longitude,
        50,
      );
      if (!nearby || nearby.length === 0) {
        nearby = await locationService.getNearbyHospitals(
          emergency.location.latitude,
          emergency.location.longitude,
          500,
        );
      }
      if (Array.isArray(nearby)) {
        for (const targetHospital of nearby) {
          if (targetHospital.hospitalId) {
            targetMap.set(targetHospital.hospitalId, {
              hospitalId: targetHospital.hospitalId,
              name: targetHospital.name || "Hospital Facility",
              etaMinutes: targetHospital.etaMinutes || 8,
              distanceKm: targetHospital.distanceKm || 2.5,
            });
          }
        }
      }

      // 2. Guarantee all registered and active hospitals in Firestore receive the emergency
      const allHospitalsSnap = await db.collection("hospitals").get();
      if (allHospitalsSnap && !allHospitalsSnap.empty) {
        for (const hDoc of allHospitalsSnap.docs) {
          if (hDoc.id.startsWith("test-")) continue;
          const hData = hDoc.data();
          const vStatus = String(hData.verificationStatus || "").toUpperCase();
          if (vStatus === "REJECTED") continue;
          if (!targetMap.has(hDoc.id)) {
            targetMap.set(hDoc.id, {
              hospitalId: hDoc.id,
              name: hData.name || "Hospital Facility",
              etaMinutes: 10,
              distanceKm: 3.5,
            });
          }
        }
      }

      // 3. Write one clean doc per target hospital (no duplicate root docs)
      for (const targetHospital of targetMap.values()) {
        const reqDocId = `${emergency.id}_${targetHospital.hospitalId}`;
        await db.collection(HOSPITAL_REQUESTS_COLLECTION).doc(reqDocId).set(
          {
            id: reqDocId,
            requestId: reqDocId,
            emergencyId: emergency.id,
            hospitalId: targetHospital.hospitalId,
            hospitalName: targetHospital.name,
            patientName: (user as any).name || (user as any).patientName || "Emergency Patient",
            patientPhone: (user as any).phone || null,
            goldenHourId: user.crisisId,
            crisisId: user.crisisId,
            severity: emergency.severity || "HIGH",
            incidentType: emergency.incidentType,
            description: emergency.description || null,
            voiceTranscript: emergency.voiceTranscript || null,
            imageUrl: emergency.imageUrl || null,
            aiResult: emergency.aiResult || null,
            location: emergency.location,
            locationAddress: emergency.locationAddress || null,
            status: "NEW",
            eta: `${targetHospital.etaMinutes || 8} min`,
            distanceKm: targetHospital.distanceKm || 2.5,
            trustScore: (user as any).trustScore ?? 100,
            confirmationCount: emergency.confirmationCount || 0,
            createdAt: now,
            updatedAt: now,
          },
          { merge: true },
        );
      }
    } catch (bridgeErr) {
      console.warn("[createEmergency] Hospital request bridge error:", bridgeErr);
    }
  }

  // Trigger real FCM alerts asynchronously (Emergency Contact Alert + Nearby Emergency Alert)
  void emergencyAlertService
    .dispatchEmergencyAlerts(
      emergency.id,
      reporterId,
      emergency.incidentType,
      emergency.location,
    )
    .catch((err) => {
      console.warn("[createEmergency] Alert dispatch error:", err);
    });

  return emergency;
}

export async function getEmergencyById(
  emergencyId: string,
  requesterId: string,
  requesterRole?: string,
): Promise<Emergency> {
  const db = getFirestore();

  const emergencyRef = db
    .collection(EMERGENCIES_COLLECTION)
    .doc(emergencyId);

  const snapshot = await emergencyRef.get();

  if (!snapshot.exists) {
    throw new AppError(
      404,
      "EMERGENCY_NOT_FOUND",
      "Emergency was not found.",
    );
  }

  const emergency = {
    id: snapshot.id,
    ...(snapshot.data() as Omit<Emergency, "id">),
  };

  const isReporter = emergency.reporterId === requesterId;
  const isAssigned =
    emergency.assignedDriverId === requesterId ||
    emergency.assignedAmbulanceId === requesterId ||
    emergency.assignedHospitalId === requesterId ||
    (Array.isArray(emergency.assignedStaffIds) &&
      emergency.assignedStaffIds.includes(requesterId));
  const normRole = (requesterRole || "").toLowerCase();
  const isAuthorizedRole =
    normRole.includes("admin") ||
    normRole.includes("hospital") ||
    normRole.includes("ambulance") ||
    normRole.includes("doctor") ||
    normRole.includes("driver");

  let isAuthorized = isReporter || isAssigned || isAuthorizedRole;

  // 1. Allow registered emergency contacts of the reporter
  if (!isAuthorized) {
    try {
      const contactSnap = await db
        .collection("emergencyContacts")
        .where("ownerUid", "==", emergency.reporterId)
        .where("contactUid", "==", requesterId)
        .limit(1)
        .get();

      if (!contactSnap.empty) {
        isAuthorized = true;
      }
    } catch (_err) {
      // ignore
    }
  }

  // 2. Allow notified responders (received notification for this emergency)
  if (!isAuthorized) {
    try {
      const notifSnap = await db
        .collection("notifications")
        .where("userId", "==", requesterId)
        .where("data.emergencyId", "==", emergencyId)
        .limit(1)
        .get();

      if (!notifSnap.empty) {
        isAuthorized = true;
      }
    } catch (_err) {
      // ignore
    }
  }

  // 3. Allow responders who confirmed the incident
  if (!isAuthorized) {
    try {
      const confirmSnap = await db
        .collection("incidentConfirmations")
        .where("incidentId", "==", emergencyId)
        .where("userId", "==", requesterId)
        .limit(1)
        .get();

      if (!confirmSnap.empty) {
        isAuthorized = true;
      }
    } catch (_err) {
      // ignore
    }
  }

  if (!isAuthorized) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You are not allowed to access this emergency.",
    );
  }

  return emergency;
}

export async function updateEmergency(
  emergencyId: string,
  requesterId: string,
  updates: Partial<
    Pick<
      Emergency,
      | "description"
      | "voiceTranscript"
      | "imageUrl"
      | "location"
      | "severity"
      | "aiResult"
      | "status"
      | "assignedDriverId"
      | "assignedAmbulanceId"
      | "assignedHospitalId"
      | "ambulanceLocation"
      | "assignedHospitalLocation"
      | "assignedHospitalName"
      | "assignedHospitalPhone"
      | "assignedDriverName"
      | "assignedDriverPhone"
      | "patientName"
      | "patientPhone"
      | "dismissedBy"
    >
  >,
  requesterRole?: string,
): Promise<Emergency> {
  const db = getFirestore();

  const emergencyRef = db
    .collection(EMERGENCIES_COLLECTION)
    .doc(emergencyId);

  const snapshot = await emergencyRef.get();

  if (!snapshot.exists) {
    throw new AppError(
      404,
      "EMERGENCY_NOT_FOUND",
      "Emergency was not found.",
    );
  }

  const existing = snapshot.data() as Emergency;

  const isReporter = existing.reporterId === requesterId;
  const isAssigned =
    existing.assignedDriverId === requesterId ||
    existing.assignedAmbulanceId === requesterId ||
    existing.assignedHospitalId === requesterId ||
    (Array.isArray(existing.assignedStaffIds) &&
      existing.assignedStaffIds.includes(requesterId));
  const isAuthorizedRole =
    !!requesterRole &&
    ["admin", "hospital", "ambulance", "doctor", "ambulance_driver"].includes(requesterRole.toLowerCase());

  if (!isReporter && !isAssigned && !isAuthorizedRole) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You are not allowed to update this emergency.",
    );
  }

  if (updates.location !== undefined && !validateLocation(updates.location)) {
    throw new AppError(
      400,
      "INVALID_LOCATION",
      "A valid latitude and longitude are required.",
    );
  }

  const allowedUpdates = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await emergencyRef.set(allowedUpdates, { merge: true });

  if (updates.location) {
    try {
      await db.collection("locations").doc(requesterId).set(
        {
          userId: requesterId,
          lat: updates.location.latitude,
          lng: updates.location.longitude,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (_err) {
      // ignore
    }
  }

  // Sync severity, aiResult, description, ambulanceLocation to hospitalEmergencyRequests
  if (process.env.NODE_ENV !== "test") {
    try {
      const bridgeUpdates: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (updates.severity) bridgeUpdates.severity = updates.severity;
      if (updates.aiResult) bridgeUpdates.aiResult = updates.aiResult;
      if (updates.description) bridgeUpdates.description = updates.description;
      if (updates.voiceTranscript) bridgeUpdates.voiceTranscript = updates.voiceTranscript;
      if (updates.imageUrl) bridgeUpdates.imageUrl = updates.imageUrl;
      if (updates.ambulanceLocation) bridgeUpdates.ambulanceLocation = updates.ambulanceLocation;
      if (updates.patientName) bridgeUpdates.patientName = updates.patientName;
      if (updates.patientPhone) bridgeUpdates.patientPhone = updates.patientPhone;

      const bridgeSnap = await db
        .collection(HOSPITAL_REQUESTS_COLLECTION)
        .where("emergencyId", "==", emergencyId)
        .get();
      
      for (const bDoc of bridgeSnap.docs) {
        await bDoc.ref.set(bridgeUpdates, { merge: true });
      }

      const directRef = db.collection(HOSPITAL_REQUESTS_COLLECTION).doc(emergencyId);
      const directSnap = await directRef.get();
      if (directSnap.exists) {
        await directRef.set(bridgeUpdates, { merge: true });
      }
    } catch (_err) {
      // Non-fatal
    }
  }

  return {
    ...existing,
    ...allowedUpdates,
  };
}