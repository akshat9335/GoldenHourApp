import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";

const USERS_COLLECTION = "users";
const EMERGENCIES_COLLECTION = "emergencies";

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
  status: EmergencyStatus;
  severity?: string | null;
  aiResult?: unknown;
  confirmationCount: number;
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
    status: "REPORTED",
    severity: null,
    aiResult: null,
    confirmationCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await emergencyRef.set(emergency);

  return emergency;
}

export async function getEmergencyById(
  emergencyId: string,
  requesterId: string,
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

  if (emergency.reporterId !== requesterId) {
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
    >
  >,
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

  if (existing.reporterId !== requesterId) {
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

  return {
    ...existing,
    ...allowedUpdates,
  };
}