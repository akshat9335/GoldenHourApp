import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";

export interface HospitalData {
  name: string;
  registrationNumber: string;
  phone: string;
  email: string;
  address: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  emergencyCapability: boolean;
  facilities: string[];
}

export async function registerHospital(uid: string, data: HospitalData) {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured.",
    );
  }

  const hospitalRef = firestore.collection("hospitals").doc();

  const hospital = {
    hospitalId: hospitalRef.id,
    ownerUid: uid,
    name: data.name,
    registrationNumber: data.registrationNumber,
    phone: data.phone,
    email: data.email,
    address: data.address,
    location: data.location ?? null,
    emergencyCapability: data.emergencyCapability,
    facilities: data.facilities,
    verificationStatus: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await hospitalRef.set(hospital);

  return hospital;
}
