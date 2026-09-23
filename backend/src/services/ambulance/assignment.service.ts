import { firestore, assertFirebaseReady } from "../../config/firebase";
import { getDriver } from "./driver.service";
import { AppError } from "../../utils/AppError";

const AMBULANCE_COLLECTION = "ambulances";
const ASSIGNMENT_COLLECTION = "ambulanceAssignments";

export interface AmbulanceAssignment {
  id?: string;
  ambulanceId: string;
  emergencyId: string;
  patientId?: string;
  driverId?: string;
  status: "assigned" | "accepted" | "started" | "completed" | "cancelled";
  assignedAt: string;
  updatedAt?: string;
}

export async function assignAmbulance(
  ambulanceId: string,
  emergencyId: string,
  patientId: string | undefined,
  driverUid: string
): Promise<string> {
  assertFirebaseReady();

  if (!ambulanceId) {
    throw new Error("Ambulance ID is required.");
  }

  if (!emergencyId) {
    throw new Error("Emergency ID is required.");
  }

  if (!driverUid) {
    throw new AppError(401, "UNAUTHORIZED", "Driver authentication is required.");
  }

  const driver = await getDriver(driverUid);

  const vStatus = (driver.verificationStatus || '').toUpperCase();
  if (vStatus !== "VERIFIED" && vStatus !== "APPROVED") {
    throw new AppError(
      403,
      "DRIVER_NOT_VERIFIED",
      "Driver must be VERIFIED before accepting an ambulance assignment.",
    );
  }

  if (driver.availability === "BUSY") {
    throw new Error("Driver is not available.");
  }

  const now = new Date().toISOString();

  const ambulanceSnapshot = await firestore!
    .collection(AMBULANCE_COLLECTION)
    .where("ambulanceId", "==", ambulanceId)
    .get();

  let ambulanceDoc: any;
  if (ambulanceSnapshot.empty) {
    const newDoc = await firestore!.collection(AMBULANCE_COLLECTION).add({
      ambulanceId,
      driverId: driverUid,
      type: "Basic Life Support (BLS)",
      status: "AVAILABLE",
      createdAt: now,
      updatedAt: now,
    });
    ambulanceDoc = await newDoc.get();
  } else {
    ambulanceDoc = ambulanceSnapshot.docs[0];
  }

  const ambulanceData = ambulanceDoc.data() || {};

  if (ambulanceData.status !== "AVAILABLE" && ambulanceData.status !== "ASSIGNED") {
    throw new Error("Ambulance is not available.");
  }

  if (ambulanceData.driverId && ambulanceData.driverId !== driverUid) {
    throw new AppError(
      403,
      "AMBULANCE_NOT_ASSIGNED_TO_DRIVER",
      "This ambulance is not assigned to the authenticated driver.",
    );
  }

  // Prevent the same emergency from being assigned again.
  const existingAssignmentSnapshot = await firestore!
    .collection(ASSIGNMENT_COLLECTION)
    .where("emergencyId", "==", emergencyId)
    .where("status", "in", ["assigned", "accepted", "started"])
    .get();

  if (!existingAssignmentSnapshot.empty) {
    throw new Error("Emergency is already assigned to an ambulance.");
  }


  const assignment: AmbulanceAssignment = {
    ambulanceId,
    emergencyId,
    ...(patientId ? { patientId } : {}),
    ...(ambulanceData.driverId
      ? { driverId: ambulanceData.driverId }
      : {}),
    status: "assigned",
    assignedAt: now,
    updatedAt: now,
  };

  const assignmentRef = await firestore!
    .collection(ASSIGNMENT_COLLECTION)
    .add(assignment);

  await ambulanceDoc.ref.update({
    status: "ASSIGNED",
    updatedAt: now,
  });

  try {
    await firestore!.collection("drivers").doc(driverUid).update({
      availability: "BUSY",
      updatedAt: now,
    });
  } catch {}

  return assignmentRef.id;
}

export async function getAssignment(
  assignmentId: string
): Promise<AmbulanceAssignment | null> {
  assertFirebaseReady();

  const doc = await firestore!
    .collection(ASSIGNMENT_COLLECTION)
    .doc(assignmentId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as AmbulanceAssignment;
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: AmbulanceAssignment["status"]
): Promise<void> {
  assertFirebaseReady();

  const assignmentRef = firestore!
    .collection(ASSIGNMENT_COLLECTION)
    .doc(assignmentId);

  const assignmentDoc = await assignmentRef.get();

  if (!assignmentDoc.exists) {
    throw new Error("Assignment not found.");
  }

  const now = new Date().toISOString();

  await assignmentRef.update({
    status,
    updatedAt: now,
  });

  if (status === "completed" || status === "cancelled") {
    const data = assignmentDoc.data();

    if (data?.ambulanceId) {
      const ambulanceSnapshot = await firestore!
        .collection(AMBULANCE_COLLECTION)
        .where("ambulanceId", "==", data.ambulanceId)
        .get();

      if (!ambulanceSnapshot.empty) {
        await ambulanceSnapshot.docs[0].ref.update({
          status: "AVAILABLE",
          updatedAt: now,
        });
      }
    }
  }
}
