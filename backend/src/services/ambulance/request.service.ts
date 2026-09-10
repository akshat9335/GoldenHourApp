import { firestore, assertFirebaseReady } from "../../config/firebase";
import { AppError } from "../../utils/AppError";

const EMERGENCY_COLLECTION = "emergencies";

export interface AmbulanceRequest {
  id: string;
  emergencyId: string;
  patientId?: string;
  incidentType?: string;
  severity?: string;
  patientLocation?: unknown;
  hospital?: unknown;
  aiSummary?: unknown;
  createdAt?: unknown;
  status?: string;
  [key: string]: unknown;
}

function mapRequest(
  id: string,
  data: FirebaseFirestore.DocumentData,
): AmbulanceRequest {
  return {
    id,
    emergencyId: id,
    ...data,
  };
}

export async function getAmbulanceRequests(): Promise<AmbulanceRequest[]> {
  assertFirebaseReady();

  const snapshot = await firestore!
    .collection(EMERGENCY_COLLECTION)
    .get();

  return snapshot.docs.map((doc) => mapRequest(doc.id, doc.data()));
}

export async function getAmbulanceRequest(
  emergencyId: string,
): Promise<AmbulanceRequest> {
  assertFirebaseReady();

  if (!emergencyId) {
    throw new AppError(
      400,
      "EMERGENCY_ID_REQUIRED",
      "Emergency ID is required.",
    );
  }

  const doc = await firestore!
    .collection(EMERGENCY_COLLECTION)
    .doc(emergencyId)
    .get();

  if (!doc.exists) {
    throw new AppError(
      404,
      "EMERGENCY_NOT_FOUND",
      "Emergency request not found.",
    );
  }

  return mapRequest(doc.id, doc.data()!);
}
