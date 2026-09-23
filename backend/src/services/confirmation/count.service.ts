import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";
import { EMERGENCIES_COLLECTION } from "../../models/confirmation.model";
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

/**
 * Retrieves the authoritative confirmation count for an emergency from the database.
 */
export async function getConfirmationCount(emergencyId: string): Promise<number> {
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

  const emergency = snapshot.data() as Emergency;
  return Number(emergency.confirmationCount) || 0;
}
