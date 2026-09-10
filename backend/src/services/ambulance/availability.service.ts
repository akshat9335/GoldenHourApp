import { firestore, assertFirebaseReady } from "../../config/firebase";
import { AmbulanceStatus } from "../../models/ambulance.model";

const COLLECTION = "ambulances";

const allowedTransitions: Record<AmbulanceStatus, AmbulanceStatus[]> = {
  AVAILABLE: ["ASSIGNED", "OFFLINE"],
  ASSIGNED: ["EN_ROUTE_TO_PATIENT", "OFFLINE"],
  EN_ROUTE_TO_PATIENT: ["AT_PATIENT", "OFFLINE"],
  AT_PATIENT: ["PATIENT_ONBOARD", "OFFLINE"],
  PATIENT_ONBOARD: ["EN_ROUTE_TO_HOSPITAL", "OFFLINE"],
  EN_ROUTE_TO_HOSPITAL: ["AT_HOSPITAL", "OFFLINE"],
  AT_HOSPITAL: ["COMPLETED", "OFFLINE"],
  COMPLETED: ["AVAILABLE", "OFFLINE"],
  OFFLINE: ["AVAILABLE"],
};

export async function setAmbulanceAvailability(
  ambulanceId: string,
  status: AmbulanceStatus
): Promise<void> {
  assertFirebaseReady();

  const snapshot = await firestore!
    .collection(COLLECTION)
    .where("ambulanceId", "==", ambulanceId)
    .get();

  if (snapshot.empty) {
    throw new Error("Ambulance not found.");
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  const currentStatus = (data.status as AmbulanceStatus) || "OFFLINE";

  if (currentStatus === status) {
    return;
  }

  if (!allowedTransitions[currentStatus].includes(status)) {
    throw new Error(
      `Invalid ambulance status transition: ${currentStatus} -> ${status}.`
    );
  }

  await doc.ref.update({
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function getAvailableAmbulances(): Promise<unknown[]> {
  assertFirebaseReady();

  const snapshot = await firestore!
    .collection(COLLECTION)
    .where("status", "==", "AVAILABLE")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function getAmbulanceAvailability(
  ambulanceId: string
): Promise<AmbulanceStatus> {
  assertFirebaseReady();

  const snapshot = await firestore!
    .collection(COLLECTION)
    .where("ambulanceId", "==", ambulanceId)
    .get();

  if (snapshot.empty) {
    throw new Error("Ambulance not found.");
  }

  const data = snapshot.docs[0].data();

  return (data.status as AmbulanceStatus) || "OFFLINE";
}
