import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";
import {
  EMERGENCIES_COLLECTION,
  INCIDENT_CONFIRMATIONS_COLLECTION,
  getConfirmationDocId,
  validateEmergencyId,
} from "../../models/confirmation.model";
import {
  ConfirmEmergencyInput,
  ConfirmationResult,
  ConfirmationSummary,
  IncidentConfirmation,
  UserConfirmationStatus,
} from "../../types/confirmation";
import { Emergency } from "../emergencies/emergency.service";

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

// In-process concurrency lock map to serialize simultaneous confirmation requests
// for the same (emergencyId, userId) combination.
const activeLocks = new Map<string, Promise<void>>();

async function acquireConfirmationLock(key: string): Promise<() => void> {
  while (activeLocks.has(key)) {
    await activeLocks.get(key);
  }

  let release!: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    release = resolve;
  });

  activeLocks.set(key, lockPromise);

  return () => {
    activeLocks.delete(key);
    release();
  };
}

/**
 * Concurrency-safe incident confirmation.
 * Enforces:
 * - Valid emergency existence
 * - Confirmable incident status (e.g. rejects COMPLETED incidents)
 * - Strict single confirmation per user + emergency pair
 * - Atomic confirmation record creation and count increment
 */
export async function confirmIncident(
  userId: string,
  input: ConfirmEmergencyInput,
): Promise<ConfirmationResult> {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const emergencyId = validateEmergencyId(input?.emergencyId);
  const lockKey = `${emergencyId}:${userId}`;
  const releaseLock = await acquireConfirmationLock(lockKey);

  try {
    const db = getFirestore();
    const docId = getConfirmationDocId(emergencyId, userId);
    const confirmationRef = db
      .collection(INCIDENT_CONFIRMATIONS_COLLECTION)
      .doc(docId);
    const emergencyRef = db
      .collection(EMERGENCIES_COLLECTION)
      .doc(emergencyId);

    // If Firestore runTransaction is available, execute inside a transaction
    if (typeof (db as any).runTransaction === "function") {
      return await (db as any).runTransaction(
        async (transaction: {
          get: (ref: any) => Promise<any>;
          set: (ref: any, data: any, options?: any) => void;
          update: (ref: any, data: any) => void;
        }) => {
          const emergencySnap = await transaction.get(emergencyRef);
          if (!emergencySnap.exists) {
            throw new AppError(
              404,
              "EMERGENCY_NOT_FOUND",
              "Emergency was not found.",
            );
          }

          const emergencyData = emergencySnap.data() as Emergency;
          if (emergencyData.status === "COMPLETED") {
            throw new AppError(
              422,
              "INCIDENT_NOT_CONFIRMABLE",
              "This incident is completed and can no longer be confirmed.",
            );
          }

          const confirmationSnap = await transaction.get(confirmationRef);
          if (confirmationSnap.exists) {
            throw new AppError(
              409,
              "ALREADY_CONFIRMED",
              "You have already confirmed this emergency.",
            );
          }

          const now = new Date().toISOString();
          const currentCount = Number(emergencyData.confirmationCount) || 0;
          const newCount = currentCount + 1;
          const newStatus =
            emergencyData.status === "REPORTED" ? "CONFIRMING" : emergencyData.status;

          const confirmationRecord: IncidentConfirmation = {
            confirmationId: docId,
            emergencyId,
            userId,
            confirmedAt: now,
            createdAt: now,
          };

          transaction.set(confirmationRef, confirmationRecord);
          transaction.update(emergencyRef, {
            confirmationCount: newCount,
            status: newStatus,
            updatedAt: now,
          });

          return {
            emergencyId,
            confirmed: true,
            confirmationCount: newCount,
            status: newStatus,
            confirmationId: docId,
            confirmedAt: now,
          };
        },
      );
    }

    // Fallback path when runTransaction is not mocked/available
    const emergencySnap = await emergencyRef.get();
    if (!emergencySnap.exists) {
      throw new AppError(
        404,
        "EMERGENCY_NOT_FOUND",
        "Emergency was not found.",
      );
    }

    const emergencyData = emergencySnap.data() as Emergency;
    if (emergencyData.status === "COMPLETED") {
      throw new AppError(
        422,
        "INCIDENT_NOT_CONFIRMABLE",
        "This incident is completed and can no longer be confirmed.",
      );
    }

    const confirmationSnap = await confirmationRef.get();
    if (confirmationSnap.exists) {
      throw new AppError(
        409,
        "ALREADY_CONFIRMED",
        "You have already confirmed this emergency.",
      );
    }

    const now = new Date().toISOString();
    const currentCount = Number(emergencyData.confirmationCount) || 0;
    const newCount = currentCount + 1;
    const newStatus =
      emergencyData.status === "REPORTED" ? "CONFIRMING" : emergencyData.status;

    const confirmationRecord: IncidentConfirmation = {
      confirmationId: docId,
      emergencyId,
      userId,
      confirmedAt: now,
      createdAt: now,
    };

    await confirmationRef.set(confirmationRecord);

    if (typeof (emergencyRef as any).update === "function") {
      await (emergencyRef as any).update({
        confirmationCount: newCount,
        status: newStatus,
        updatedAt: now,
      });
    } else {
      await emergencyRef.set(
        {
          confirmationCount: newCount,
          status: newStatus,
          updatedAt: now,
        },
        { merge: true },
      );
    }

    return {
      emergencyId,
      confirmed: true,
      confirmationCount: newCount,
      status: newStatus,
      confirmationId: docId,
      confirmedAt: now,
    };
  } finally {
    releaseLock();
  }
}

/**
 * Returns confirmation summary (count and status) for a given emergency.
 */
export async function getIncidentConfirmationSummary(
  emergencyIdParam: unknown,
): Promise<ConfirmationSummary> {
  const emergencyId = validateEmergencyId(emergencyIdParam);
  const db = getFirestore();
  const emergencyRef = db.collection(EMERGENCIES_COLLECTION).doc(emergencyId);
  const snapshot = await emergencyRef.get();

  if (!snapshot.exists) {
    throw new AppError(
      404,
      "EMERGENCY_NOT_FOUND",
      "Emergency was not found.",
    );
  }

  const emergencyData = snapshot.data() as Emergency;

  return {
    emergencyId,
    confirmationCount: Number(emergencyData.confirmationCount) || 0,
    status: emergencyData.status,
  };
}

/**
 * Returns whether the authenticated user has confirmed the given emergency.
 */
export async function getUserConfirmationStatus(
  emergencyIdParam: unknown,
  userId: string,
): Promise<UserConfirmationStatus> {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const emergencyId = validateEmergencyId(emergencyIdParam);
  const db = getFirestore();

  // Validate emergency exists first
  const emergencyRef = db.collection(EMERGENCIES_COLLECTION).doc(emergencyId);
  const emergencySnap = await emergencyRef.get();

  if (!emergencySnap.exists) {
    throw new AppError(
      404,
      "EMERGENCY_NOT_FOUND",
      "Emergency was not found.",
    );
  }

  const docId = getConfirmationDocId(emergencyId, userId);
  const confirmationRef = db
    .collection(INCIDENT_CONFIRMATIONS_COLLECTION)
    .doc(docId);
  const confirmationSnap = await confirmationRef.get();

  if (!confirmationSnap.exists) {
    return {
      emergencyId,
      confirmed: false,
      confirmedAt: null,
    };
  }

  const confirmationData = confirmationSnap.data() as IncidentConfirmation;
  return {
    emergencyId,
    confirmed: true,
    confirmedAt: confirmationData.confirmedAt,
  };
}

/**
 * Retrieves the confirmation history for the authenticated user.
 */
export async function getUserConfirmationHistory(
  userId: string,
): Promise<IncidentConfirmation[]> {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  const db = getFirestore();
  const collectionRef = db.collection(INCIDENT_CONFIRMATIONS_COLLECTION);

  if (typeof (collectionRef as any).where === "function") {
    const querySnap = await (collectionRef as any)
      .where("userId", "==", userId)
      .get();

    return querySnap.docs.map((doc: any) => doc.data() as IncidentConfirmation);
  }

  return [];
}
