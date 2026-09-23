import { firestore, assertFirebaseReady } from "../../config/firebase";
import { AppError } from "../../utils/AppError";
import {
  Driver,
  DriverAvailability,
  DriverVerificationStatus,
} from "../../models/driver.model";

const driversCollection = "drivers";

export interface RegisterDriverInput {
  name: string;
  phone: string;
  licenseNumber: string;
}

export async function registerDriver(
  uid: string,
  input: RegisterDriverInput,
): Promise<Driver> {
  assertFirebaseReady();

  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase Admin is not configured on this server.",
    );
  }

  if (!input.name || !input.phone || !input.licenseNumber) {
    throw new AppError(
      400,
      "INVALID_DRIVER_DATA",
      "Name, phone and license number are required.",
    );
  }

  const driverRef = firestore.collection(driversCollection).doc(uid);
  const existing = await driverRef.get();

  if (existing.exists) {
    throw new AppError(
      409,
      "DRIVER_ALREADY_EXISTS",
      "Driver profile already exists.",
    );
  }

  const now = new Date().toISOString();

  const driver: Driver = {
    uid,
    name: input.name.trim(),
    phone: input.phone.trim(),
    licenseNumber: input.licenseNumber.trim(),
    verificationStatus: "PENDING",
    availability: "OFFLINE",
    createdAt: now,
    updatedAt: now,
  };

  await driverRef.set(driver);

  return driver;
}

export async function getDriver(uid: string): Promise<Driver> {
  assertFirebaseReady();

  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase Admin is not configured on this server.",
    );
  }

  const snapshot = await firestore
    .collection(driversCollection)
    .doc(uid)
    .get();

  if (!snapshot.exists) {
    throw new AppError(404, "DRIVER_NOT_FOUND", "Driver profile not found.");
  }

  return snapshot.data() as Driver;
}

export async function updateDriver(
  uid: string,
  input: Partial<Pick<Driver, "name" | "phone" | "licenseNumber">>,
): Promise<Driver> {
  assertFirebaseReady();

  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase Admin is not configured on this server.",
    );
  }

  const driverRef = firestore.collection(driversCollection).doc(uid);
  const snapshot = await driverRef.get();

  if (!snapshot.exists) {
    throw new AppError(404, "DRIVER_NOT_FOUND", "Driver profile not found.");
  }

  const updates = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  await driverRef.update(updates);

  return (await driverRef.get()).data() as Driver;
}

export async function updateDriverVerification(
  uid: string,
  verificationStatus: DriverVerificationStatus,
): Promise<Driver> {
  assertFirebaseReady();

  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase Admin is not configured on this server.",
    );
  }

  const validStatuses: DriverVerificationStatus[] = [
    "PENDING",
    "VERIFIED",
    "REJECTED",
  ];

  if (!validStatuses.includes(verificationStatus)) {
    throw new AppError(
      400,
      "INVALID_VERIFICATION_STATUS",
      "Verification status must be PENDING, VERIFIED, or REJECTED.",
    );
  }

  const driverRef = firestore.collection(driversCollection).doc(uid);
  const snapshot = await driverRef.get();

  if (!snapshot.exists) {
    throw new AppError(404, "DRIVER_NOT_FOUND", "Driver profile not found.");
  }

  await driverRef.update({
    verificationStatus,
    updatedAt: new Date().toISOString(),
  });

  return (await driverRef.get()).data() as Driver;
}

export async function updateDriverAvailability(
  uid: string,
  availability: DriverAvailability,
): Promise<Driver> {
  assertFirebaseReady();

  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase Admin is not configured on this server.",
    );
  }

  const validStatuses: DriverAvailability[] = [
    "AVAILABLE",
    "BUSY",
    "OFFLINE",
  ];

  if (!validStatuses.includes(availability)) {
    throw new AppError(
      400,
      "INVALID_AVAILABILITY",
      "Availability must be AVAILABLE, BUSY, or OFFLINE.",
    );
  }

  const driverRef = firestore.collection(driversCollection).doc(uid);
  const snapshot = await driverRef.get();

  if (!snapshot.exists) {
    throw new AppError(404, "DRIVER_NOT_FOUND", "Driver profile not found.");
  }

  const driver = snapshot.data() as Driver;

  const vStatus = (driver.verificationStatus || '').toUpperCase();
  if (availability === "AVAILABLE" && vStatus !== "VERIFIED" && vStatus !== "APPROVED") {
    throw new AppError(
      403,
      "DRIVER_NOT_VERIFIED",
      "Driver must be VERIFIED before becoming AVAILABLE.",
    );
  }

  await driverRef.update({
    availability,
    updatedAt: new Date().toISOString(),
  });

  return (await driverRef.get()).data() as Driver;
}
