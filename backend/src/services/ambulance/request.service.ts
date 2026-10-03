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

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getAmbulanceRequests(
  driverUid?: string,
): Promise<AmbulanceRequest[]> {
  assertFirebaseReady();

  let driverHospId: string | null = null;
  let driverPhone: string | null = null;
  let driverLoc: { latitude: number; longitude: number } | null = null;
  let isIndependent = true;

  if (driverUid && firestore) {
    try {
      const driverDoc = await firestore.collection("drivers").doc(driverUid).get();
      if (driverDoc.exists) {
        const dData = driverDoc.data();
        driverHospId = dData?.hospitalId || null;
        driverPhone = dData?.phone || null;
        const rawLoc = dData?.location;
        if (rawLoc?.latitude && rawLoc?.longitude) {
          driverLoc = { latitude: rawLoc.latitude, longitude: rawLoc.longitude };
        } else if (dData?.latitude && dData?.longitude) {
          driverLoc = { latitude: dData.latitude, longitude: dData.longitude };
        }
        const hospName = String(dData?.hospitalName || "").toLowerCase();
        isIndependent = !driverHospId || hospName.includes("independent") || driverHospId === "independent";
      }

      // Also check user profile doc for hospital affiliation and location
      const userDoc = await firestore.collection("users").doc(driverUid).get();
      if (userDoc.exists) {
        const uData = userDoc.data();
        if (!driverHospId) driverHospId = uData?.hospitalId || uData?.assignedHospitalId || null;
        if (!driverPhone) driverPhone = uData?.phone || null;
        if (!driverLoc) {
          const uLoc = uData?.location;
          if (uLoc?.latitude && uLoc?.longitude) {
            driverLoc = { latitude: uLoc.latitude, longitude: uLoc.longitude };
          }
        }
        const uHospName = String(uData?.hospitalName || "").toLowerCase();
        if (driverHospId && !uHospName.includes("independent")) {
          isIndependent = false;
        }
      }

      if (!driverLoc) {
        const locDoc = await firestore.collection("locations").doc(driverUid).get();
        if (locDoc.exists) {
          const lData = locDoc.data();
          if (lData?.lat && lData?.lng) {
            driverLoc = { latitude: lData.lat, longitude: lData.lng };
          }
        }
      }
    } catch {}
  }

  // Fallback demo driver location (Civil Lines, Prayagraj) so distance checks always operate cleanly
  if (!driverLoc) {
    driverLoc = { latitude: 25.4484, longitude: 81.8460 };
  }

  const snapshot = await firestore!
    .collection(EMERGENCY_COLLECTION)
    .get();

  const requests = snapshot.docs.map((doc) => mapRequest(doc.id, doc.data()));

  return requests
    .filter((req) => {
      const st = String(req.status || "").toUpperCase();
      const tripSt = String((req as any).tripStatus || "").toUpperCase();

      // Strictly exclude terminal/closed/completed/arrived emergencies from incoming active requests
      if (
        st === "COMPLETED" ||
        st === "CANCELLED" ||
        st === "RESOLVED" ||
        st === "REJECTED" ||
        st === "PATIENT_ARRIVED" ||
        st === "IN_TREATMENT" ||
        st === "IN TREATMENT" ||
        st === "TREATMENT" ||
        st === "DISCHARGED" ||
        tripSt === "COMPLETED" ||
        tripSt === "AT_HOSPITAL"
      ) {
        return false;
      }

      // If already assigned to another driver, exclude
      if (req.assignedDriverId && driverUid && req.assignedDriverId !== driverUid) {
        return false;
      }

      // If already claimed by this driver, it belongs to active trip or mission history, not dispatch queue!
      if (req.assignedDriverId && driverUid && req.assignedDriverId === driverUid) {
        return false;
      }

      // Only show emergencies strictly awaiting an ambulance dispatch
      const isAwaitingDispatch =
        (st === "HOSPITAL_ACCEPTED" || st === "AMBULANCE_SEARCH" || st === "PENDING" || st === "SEARCHING" || st === "REPORTED" || st === "HOSPITAL_SEARCH") &&
        !req.assignedDriverId &&
        !req.assignedAmbulanceId;

      if (!isAwaitingDispatch) {
        return false;
      }

      // 1. Exclude stale emergencies older than 45 minutes to prevent flood of past requests
      const emTime = new Date((req.createdAt as string) || (req.updatedAt as string) || 0).getTime();
      if (emTime && Date.now() - emTime > 45 * 60 * 1000) {
        return false;
      }

      // 2. Geographic Proximity / Radius Filter (Max 35 km)
      const pLoc = (req.location as any) || (req.patientLocation as any);
      if (pLoc && typeof pLoc.latitude === "number" && typeof pLoc.longitude === "number" && driverLoc) {
        const dist = calculateHaversineKm(driverLoc.latitude, driverLoc.longitude, pLoc.latitude, pLoc.longitude);
        if (dist > 35) {
          return false; // Out of operational range!
        }
        (req as any).distanceKm = Number(dist.toFixed(1));
        (req as any).etaMinutes = Math.max(3, Math.round(dist * 2.5));
      }

      // 3. Hospital Fleet Affiliation Check
      if (driverUid === "driver-demo-ramesh") {
        // Demo driver Ramesh is affiliated with Apollo (hosp-demo-apollo) and ALS 108 Emergency Dispatch
        const isApolloOrUnassigned =
          !req.assignedHospitalId ||
          req.assignedHospitalId === "hosp-demo-apollo" ||
          req.assignedHospitalId === "hosp-hosp-demo-apollo" ||
          req.assignedHospitalId === "hosp-demo-token-hospital";
        if (!isApolloOrUnassigned && !isIndependent) {
          return false;
        }
      } else if (!isIndependent && driverHospId) {
        // Affiliated hospital driver: ONLY see emergencies that have been accepted by their hospital!
        if (!req.assignedHospitalId || driverHospId !== req.assignedHospitalId) {
          return false;
        }
      }

      // 4. If hospital dispatched to AFFILIATED fleet explicitly:
      if (req.dispatchMode === "AFFILIATED") {
        if (req.targetDriverId && driverUid && req.targetDriverId !== driverUid) {
          return false;
        }
        if (driverHospId && req.assignedHospitalId && driverHospId !== req.assignedHospitalId) {
          return false;
        }
      }

      // 5. If dismissed by this driver
      if (Array.isArray((req as any).dismissedBy) && driverUid && (req as any).dismissedBy.includes(driverUid)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aTime = new Date((a.createdAt as any) || 0).getTime();
      const bTime = new Date((b.createdAt as any) || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 5);
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
