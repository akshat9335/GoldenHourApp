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
  let driverPhone: string | null = null;
  let isIndependent = true;

  if (driverUid && firestore) {
    try {
      const driverDoc = await firestore.collection("drivers").doc(driverUid).get();
      if (driverDoc.exists) {
        const dData = driverDoc.data();
        driverHospId = dData?.hospitalId || null;
        driverPhone = dData?.phone || null;
        const hospName = String(dData?.hospitalName || "").toLowerCase();
        isIndependent = !driverHospId || hospName.includes("independent") || driverHospId === "independent";
      }

      // Also check user profile doc for hospital affiliation
      if (!driverHospId) {
        const userDoc = await firestore.collection("users").doc(driverUid).get();
        if (userDoc.exists) {
          const uData = userDoc.data();
          driverHospId = uData?.hospitalId || uData?.assignedHospitalId || null;
          if (!driverPhone) driverPhone = uData?.phone || null;
          const uHospName = String(uData?.hospitalName || "").toLowerCase();
          if (driverHospId && !uHospName.includes("independent")) {
            isIndependent = false;
          }
        }
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
      // Strictly exclude terminal/closed/completed emergencies from incoming active requests
      if (
        st === "COMPLETED" ||
        st === "CANCELLED" ||
        st === "RESOLVED" ||
        st === "REJECTED"
      ) {
        return false;
      }

      // If already assigned to another driver, exclude
      if (req.assignedDriverId && driverUid && req.assignedDriverId !== driverUid) {
        return false;
      }

      // Only show emergencies strictly awaiting an ambulance dispatch
      const isAwaitingDispatch =
        (st === "HOSPITAL_ACCEPTED" || st === "AMBULANCE_SEARCH" || st === "PENDING" || st === "SEARCHING") &&
        !req.assignedDriverId &&
        !req.assignedAmbulanceId;

      if (!isAwaitingDispatch) {
        return false;
      }

      // If hospital dispatched to AFFILIATED fleet:
      if (req.dispatchMode === "AFFILIATED") {
        // 1. Direct target match
        if (req.targetDriverId && driverUid && req.targetDriverId === driverUid) {
          return true;
        }
        // 2. Affiliated hospital fleet match (all on-duty drivers belonging to this hospital)
        if (driverHospId && req.assignedHospitalId && driverHospId === req.assignedHospitalId) {
          return true;
        }
        // 3. If targetDriverId was set to a manual fleet entry, check if driver's phone matches
        if (req.targetDriverId && driverPhone) {
          // If this driver belongs to the hospital or has matching phone
          if (driverHospId && req.assignedHospitalId && driverHospId === req.assignedHospitalId) {
            return true;
          }
        }
        // 4. In demo mode or if no specific hospital is linked to driver, permit on-duty driver to see request
        if (!driverHospId || isIndependent) {
          return true;
        }
        // If driver belongs to a DIFFERENT hospital, exclude
        if (driverHospId && req.assignedHospitalId && driverHospId !== req.assignedHospitalId) {
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
