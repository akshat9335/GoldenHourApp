import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";
import type {
  Emergency,
  EmergencyStatus,
} from "../emergencies/emergency.service";

const EMERGENCIES_COLLECTION = "emergencies";

type SyncableEmergencyFields = Partial<
  Pick<
    Emergency,
    | "description"
    | "voiceTranscript"
    | "imageUrl"
    | "location"
    | "severity"
    | "aiResult"
    | "confirmationCount"
  >
>;

export interface SyncEmergencyInput {
  emergencyId: string;
  status?: EmergencyStatus;
  updates?: SyncableEmergencyFields;
}

export interface SyncedEmergency {
  id: string;
  status?: EmergencyStatus;
  updatedAt: string;
  [key: string]: unknown;
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

/**
 * Core integration helper for keeping an emergency's shared state
 * synchronized across backend modules.
 *
 * Only shared emergency fields can be synchronized here.
 * Identity and creation fields such as reporterId, crisisId,
 * id, and createdAt are intentionally protected.
 */
export async function syncEmergencyState(
  input: SyncEmergencyInput,
): Promise<SyncedEmergency> {
  const db = getFirestore();

  const emergencyId = input.emergencyId.trim();

  if (!emergencyId) {
    throw new AppError(
      400,
      "INVALID_EMERGENCY_ID",
      "Emergency ID is required.",
    );
  }

  if (!input.status && !input.updates) {
    throw new AppError(
      400,
      "INVALID_SYNC_DATA",
      "At least one emergency state update is required.",
    );
  }

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

  const updatedAt = new Date().toISOString();

  const syncData: SyncableEmergencyFields & {
    status?: EmergencyStatus;
    updatedAt: string;
  } = {
    ...(input.updates ?? {}),
    ...(input.status ? { status: input.status } : {}),
    updatedAt,
  };

  await emergencyRef.set(syncData, { merge: true });

  const updatedSnapshot = await emergencyRef.get();

  return {
    id: emergencyId,
    ...(updatedSnapshot.data() as Record<string, unknown>),
    updatedAt,
  };
}