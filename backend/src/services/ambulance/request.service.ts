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

export async function getAmbulanceRequests(
  driverUid?: string,
): Promise<AmbulanceRequest[]> {
  assertFirebaseReady();

  let driverHospId: string | null = null;
  let isIndependent = true;

  if (driverUid && firestore) {
    try {
      const driverDoc = await firestore.collection("drivers").doc(driverUid).get();
      if (driverDoc.exists) {
        const dData = driverDoc.data();
        driverHospId = dData?.hospitalId || null;
        const hospName = String(dData?.hospitalName || "").toLowerCase();
        isIndependent = !driverHospId || hospName.includes("independent") || driverHospId === "independent";
      }
    } catch {}
  }

  const snapshot = await firestore!
    .collection(EMERGENCY_COLLECTION)
    .get();

  const requests = snapshot.docs.map((doc) => mapRequest(doc.id, doc.data()));

  return requests
    .filter((req) => {
      const st = String(req.status || "").toUpperCase();
      // Exclude terminal/closed emergencies
      if (
        st === "COMPLETED" ||
        st === "CANCELLED" ||
        st === "RESOLVED" ||
        st === "REJECTED"
      ) {
        return false;
      }
      // 1. HOSPITAL MUST ACCEPT FIRST!
      // An ambulance driver should NEVER see an emergency before a hospital has accepted and dispatched it.
      const hasHospitalAccepted = !!req.assignedHospitalId || st === "HOSPITAL_ACCEPTED" || st === "AMBULANCE_SEARCH";
      if (!hasHospitalAccepted) {
        return false;
      }

      // If already assigned to this driver, it is an active mission, not a pending alert in queue
      if (req.assignedDriverId && req.assignedDriverId === driverUid) {
        return false;
      }
      // If already assigned to another driver, exclude from this driver's queue
      if (req.assignedDriverId && req.assignedDriverId !== driverUid) {
        return false;
      }
      // If emergency is already en route/arrived/treated by someone else
      if (
        (st === "AMBULANCE_ASSIGNED" ||
          st === "EN_ROUTE" ||
          st === "PATIENT_ARRIVED" ||
          st === "TREATMENT") &&
        req.assignedDriverId !== driverUid
      ) {
        return false;
      }

      // If targeted to a specific driver, only that driver can see it
      if (req.targetDriverId && driverUid && req.targetDriverId !== driverUid) {
        return false;
      }

      // If hospital chose AFFILIATED dispatch, only show to targeted driver or hospital's affiliated fleet
      if (req.dispatchMode === "AFFILIATED") {
        if (req.targetDriverId && driverUid) {
          if (req.targetDriverId !== driverUid) return false;
        } else if (driverHospId && req.assignedHospitalId) {
          if (req.assignedHospitalId !== driverHospId) return false;
        }
      } else {
        // If hospital dispatched to independent/broadcast, drivers bound exclusively to a different hospital don't see it
        if (req.assignedHospitalId && !isIndependent && driverHospId && req.assignedHospitalId !== driverHospId) {
          return false;
        }
      }

      // If dismissed by this driver
      if (Array.isArray((req as any).dismissedBy) && driverUid && (req as any).dismissedBy.includes(driverUid)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aTime = (a.createdAt as any) || 0;
      const bTime = (b.createdAt as any) || 0;
      return String(bTime).localeCompare(String(aTime));
    });
}

export async function dismissAmbulanceRequest(
  emergencyId: string,
  driverUid: string,
): Promise<void> {
  assertFirebaseReady();
  const docRef = firestore!.collection(EMERGENCY_COLLECTION).doc(emergencyId);
  const snap = await docRef.get();
  if (!snap.exists) return;

  const data = snap.data();
  const dismissedBy = Array.isArray(data?.dismissedBy) ? [...data!.dismissedBy] : [];
  if (!dismissedBy.includes(driverUid)) {
    dismissedBy.push(driverUid);
    await docRef.update({
      dismissedBy,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function clearAllAmbulanceRequests(
  driverUid: string,
): Promise<number> {
  assertFirebaseReady();
  const requests = await getAmbulanceRequests(driverUid);
  let count = 0;
  for (const req of requests) {
    await dismissAmbulanceRequest(req.id, driverUid);
    count++;
  }
  return count;
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
