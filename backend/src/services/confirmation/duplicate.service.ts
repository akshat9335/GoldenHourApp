import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";
import {
  INCIDENT_CONFIRMATIONS_COLLECTION,
  getConfirmationDocId,
} from "../../models/confirmation.model";
import { IncidentConfirmation } from "../../types/confirmation";

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
 * Checks whether a user has already confirmed a specific emergency.
 */
export async function hasUserConfirmed(
  emergencyId: string,
  userId: string,
): Promise<boolean> {
  const db = getFirestore();
  const docId = getConfirmationDocId(emergencyId, userId);
  const docRef = db.collection(INCIDENT_CONFIRMATIONS_COLLECTION).doc(docId);
  const snapshot = await docRef.get();
  return snapshot.exists;
}

/**
 * Retrieves the confirmation record for a user and emergency, or null if not found.
 */
export async function getUserConfirmation(
  emergencyId: string,
  userId: string,
): Promise<IncidentConfirmation | null> {
  const db = getFirestore();
  const docId = getConfirmationDocId(emergencyId, userId);
  const docRef = db.collection(INCIDENT_CONFIRMATIONS_COLLECTION).doc(docId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as IncidentConfirmation;
}
