import { firestore, assertFirebaseReady } from "../../config/firebase";
import { AmbulanceStatus } from "../../models/ambulance.model";

const TRIP_COLLECTION = "ambulanceTrips";
const ASSIGNMENT_COLLECTION = "ambulanceAssignments";
const AMBULANCE_COLLECTION = "ambulances";

export interface AmbulanceTrip {
  id?: string;
  assignmentId: string;
  emergencyId: string;
  ambulanceId: string;
  driverId?: string;
  patientId?: string;
  status: AmbulanceStatus;
  startedToPatientAt?: string;
  arrivedPatientAt?: string;
  pickupTime?: string;
  startedToHospitalAt?: string;
  hospitalArrivalTime?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const allowedTransitions: Record<AmbulanceStatus, AmbulanceStatus[]> = {
  AVAILABLE: ["ASSIGNED"],
  ASSIGNED: ["EN_ROUTE_TO_PATIENT"],
  EN_ROUTE_TO_PATIENT: ["AT_PATIENT"],
  AT_PATIENT: ["PATIENT_ONBOARD"],
  PATIENT_ONBOARD: ["EN_ROUTE_TO_HOSPITAL"],
  EN_ROUTE_TO_HOSPITAL: ["AT_HOSPITAL"],
  AT_HOSPITAL: ["COMPLETED"],
  COMPLETED: ["AVAILABLE"],
  OFFLINE: [],
};

export async function getTrip(
  tripId: string,
): Promise<AmbulanceTrip | null> {
  assertFirebaseReady();

  const doc = await firestore!
    .collection(TRIP_COLLECTION)
    .doc(tripId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as AmbulanceTrip;
}

export async function createTripFromAssignment(
  assignmentId: string,
): Promise<string> {
  assertFirebaseReady();

  const assignmentDoc = await firestore!
    .collection(ASSIGNMENT_COLLECTION)
    .doc(assignmentId)
    .get();

  if (!assignmentDoc.exists) {
    throw new Error("Assignment not found.");
  }

  const assignment = assignmentDoc.data();

  if (assignment?.status !== "assigned") {
    throw new Error("Assignment is not in an assignable state.");
  }

  if (!assignment?.ambulanceId || !assignment?.emergencyId) {
    throw new Error("Assignment data is incomplete.");
  }

  const existingTrip = await firestore!
    .collection(TRIP_COLLECTION)
    .where("assignmentId", "==", assignmentId)
    .get();

  if (!existingTrip.empty) {
    throw new Error("Trip already exists for this assignment.");
  }

  const ambulanceSnapshot = await firestore!
    .collection(AMBULANCE_COLLECTION)
    .where("ambulanceId", "==", assignment.ambulanceId)
    .get();

  if (ambulanceSnapshot.empty) {
    throw new Error("Ambulance not found.");
  }

  const ambulance = ambulanceSnapshot.docs[0].data();
  const now = new Date().toISOString();

  const trip: AmbulanceTrip = {
    assignmentId,
    emergencyId: assignment.emergencyId,
    ambulanceId: assignment.ambulanceId,
    ...(assignment.driverId ? { driverId: assignment.driverId } : {}),
    ...(assignment.patientId ? { patientId: assignment.patientId } : {}),
    status: "ASSIGNED",
    createdAt: now,
    updatedAt: now,
  };

  const tripRef = await firestore!
    .collection(TRIP_COLLECTION)
    .add(trip);

  await ambulanceSnapshot.docs[0].ref.update({
    status: "ASSIGNED",
    updatedAt: now,
  });

  return tripRef.id;
}

export async function transitionTrip(
  tripId: string,
  nextStatus: AmbulanceStatus,
  driverUid: string,
): Promise<AmbulanceTrip> {
  assertFirebaseReady();

  const tripRef = firestore!
    .collection(TRIP_COLLECTION)
    .doc(tripId);

  const tripDoc = await tripRef.get();

  if (!tripDoc.exists) {
    throw new Error("Trip not found.");
  }

  const current = tripDoc.data() as AmbulanceTrip;

  if (!current.driverId || current.driverId !== driverUid) {
    throw new Error("You are not authorized to update this trip.");
  }

  if (!allowedTransitions[current.status]?.includes(nextStatus)) {
    throw new Error(
      `Invalid trip transition: ${current.status} -> ${nextStatus}.`,
    );
  }

  const now = new Date().toISOString();

  const updateData: Record<string, string> = {
    status: nextStatus,
    updatedAt: now,
  };

  if (nextStatus === "EN_ROUTE_TO_PATIENT") {
    updateData.startedToPatientAt = now;
  }

  if (nextStatus === "AT_PATIENT") {
    updateData.arrivedPatientAt = now;
  }

  if (nextStatus === "PATIENT_ONBOARD") {
    updateData.pickupTime = now;
  }

  if (nextStatus === "EN_ROUTE_TO_HOSPITAL") {
    updateData.startedToHospitalAt = now;
  }

  if (nextStatus === "AT_HOSPITAL") {
    updateData.hospitalArrivalTime = now;
  }

  if (nextStatus === "COMPLETED") {
    updateData.completedAt = now;
  }

  await tripRef.update(updateData);

  const ambulanceSnapshot = await firestore!
    .collection(AMBULANCE_COLLECTION)
    .where("ambulanceId", "==", current.ambulanceId)
    .get();

  if (!ambulanceSnapshot.empty) {
    await ambulanceSnapshot.docs[0].ref.update({
      status: nextStatus === "COMPLETED" ? "AVAILABLE" : nextStatus,
      updatedAt: now,
    });
  }

  const assignmentRef = firestore!
    .collection(ASSIGNMENT_COLLECTION)
    .doc(current.assignmentId);

  const assignmentStatus =
    nextStatus === "COMPLETED" ? "completed" : "started";

  await assignmentRef.update({
    status: assignmentStatus,
    updatedAt: now,
  });

  return {
    id: tripId,
    ...current,
    ...updateData,
  } as AmbulanceTrip;
}

export async function getTripHistory(
  driverUid: string,
): Promise<AmbulanceTrip[]> {
  assertFirebaseReady();

  const snapshot = await firestore!
    .collection(TRIP_COLLECTION)
    .where("driverId", "==", driverUid)
    .get();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }) as AmbulanceTrip)
    .sort((a, b) =>
      (b.completedAt || b.updatedAt).localeCompare(
        a.completedAt || a.updatedAt,
      ),
    );
}
