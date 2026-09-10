import { firestore, assertFirebaseReady } from "../../config/firebase";
import { AmbulanceStatus } from "../../models/ambulance.model";

export interface Ambulance {
  id?: string;
  ambulanceId: string;
  registrationNumber?: string;
  vehicleNumber?: string;
  type: string;
  equipment?: string[];
  ownerRef?: string;
  hospitalRef?: string;
  hospitalId?: string;
  driverId?: string;
  status: AmbulanceStatus;
  locationRef?: string;
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = "ambulances";

export async function registerAmbulance(
  ambulance: Omit<Ambulance, "id" | "createdAt" | "updatedAt" | "status">
): Promise<string> {
  assertFirebaseReady();

  if (!ambulance.ambulanceId) {
    throw new Error("Ambulance ID is required.");
  }

  if (!ambulance.driverId) {
    throw new Error("Driver ID is required.");
  }

  const snapshot = await firestore!
    .collection(COLLECTION)
    .where("ambulanceId", "==", ambulance.ambulanceId)
    .get();

  if (!snapshot.empty) {
    throw new Error("Ambulance ID already exists.");
  }

  const now = new Date().toISOString();

  const docRef = await firestore!.collection(COLLECTION).add({
    ...ambulance,
    status: "AVAILABLE",
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

export async function getAllAmbulances(): Promise<Ambulance[]> {
  assertFirebaseReady();

  const snapshot = await firestore!.collection(COLLECTION).get();

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Ambulance[];
}

export async function getAmbulanceById(
  ambulanceId: string
): Promise<Ambulance | null> {
  assertFirebaseReady();

  const snapshot = await firestore!
    .collection(COLLECTION)
    .where("ambulanceId", "==", ambulanceId)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as Ambulance;
}

export async function updateAmbulanceStatus(
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

  await snapshot.docs[0].ref.update({
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteAmbulance(
  ambulanceId: string
): Promise<void> {
  assertFirebaseReady();

  const snapshot = await firestore!
    .collection(COLLECTION)
    .where("ambulanceId", "==", ambulanceId)
    .get();

  if (snapshot.empty) {
    throw new Error("Ambulance not found.");
  }

  await snapshot.docs[0].ref.delete();
}
