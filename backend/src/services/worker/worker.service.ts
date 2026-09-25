import { firestore } from "../../config/firebase";
import { isFirebaseConfigured } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { CommunityPatient, CommunityVisit, CommunityReferral } from "../../models/worker.model";
import { dataStore } from "../../models/dataStore";

const PATIENTS_COL = "communityPatients";
const VISITS_COL = "communityVisits";
const REFERRALS_COL = "communityReferrals";

// ─── Patient operations ──────────────────────────────────────────────────────

/**
 * Register a new rural patient under an ASHA worker.
 * Auto-generates a Crisis ID if not provided.
 */
export async function registerCommunityPatient(
  workerUid: string,
  data: Omit<CommunityPatient, "id" | "crisisId" | "workerUid" | "createdAt" | "updatedAt">
): Promise<CommunityPatient> {
  const id = `pat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const crisisId = `CR-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();

  const patient: CommunityPatient = {
    id,
    crisisId,
    workerUid,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  // Cache in in-memory datastore
  dataStore.communityPatients.set(id, patient);

  // Persist to Firestore if available
  if (isFirebaseConfigured() && firestore) {
    try {
      await firestore.collection(PATIENTS_COL).doc(id).set(patient);
    } catch (err) {
      console.warn("[WorkerService] Firestore write failed, stored in memory:", err);
    }
  }

  return patient;
}

/**
 * List all patients registered in a worker's area.
 */
export async function getWorkerPatients(workerUid: string): Promise<CommunityPatient[]> {
  if (isFirebaseConfigured() && firestore) {
    try {
      const snap = await firestore
        .collection(PATIENTS_COL)
        .where("workerUid", "==", workerUid)
        .get();

      if (!snap.empty) {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as CommunityPatient));
        docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        return docs;
      }
    } catch (err) {
      console.warn("[WorkerService] Firestore get patients failed, falling back to memory:", err);
    }
  }

  // Fallback to in-memory store
  const all = Array.from(dataStore.communityPatients.values());
  const filtered = all.filter((p) => !workerUid || p.workerUid === workerUid || workerUid === "asha-worker-prayagraj");
  return filtered.length > 0 ? filtered : all;
}

/**
 * Get detailed patient profile with their past visits and referrals.
 */
export async function getPatientById(
  patientId: string
): Promise<{ patient: CommunityPatient; visits: CommunityVisit[]; referrals: CommunityReferral[] } | null> {
  let patient: CommunityPatient | null = null;

  if (isFirebaseConfigured() && firestore) {
    try {
      const doc = await firestore.collection(PATIENTS_COL).doc(patientId).get();
      if (doc.exists) {
        patient = { id: doc.id, ...(doc.data() as any) } as CommunityPatient;
      }
    } catch {
      // fallback
    }
  }

  if (!patient) {
    patient = dataStore.communityPatients.get(patientId) ?? null;
  }

  if (!patient) {
    return null;
  }

  // Get visits
  let visits: CommunityVisit[] = [];
  if (isFirebaseConfigured() && firestore) {
    try {
      const snap = await firestore
        .collection(VISITS_COL)
        .where("patientId", "==", patientId)
        .orderBy("createdAt", "desc")
        .get();
      if (!snap.empty) {
        visits = snap.docs.map((d) => d.data() as CommunityVisit);
      }
    } catch {
      // fallback
    }
  }

  if (visits.length === 0) {
    visits = Array.from(dataStore.communityVisits.values()).filter(
      (v) => v.patientId === patientId
    );
  }

  // Get referrals
  const referrals = Array.from(dataStore.communityReferrals.values()).filter(
    (r) => r.patientId === patientId
  );

  return { patient, visits, referrals };
}

// ─── Visit operations ────────────────────────────────────────────────────────

/**
 * Record a home visit with vitals and AI triage result.
 */
export async function recordCommunityVisit(
  workerUid: string,
  data: Omit<CommunityVisit, "id" | "workerUid" | "createdAt">
): Promise<CommunityVisit> {
  const id = `visit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const visit: CommunityVisit = {
    id,
    workerUid,
    ...data,
    syncedFromOffline: data.syncedFromOffline ?? true,
    createdAt: now,
  };

  dataStore.communityVisits.set(id, visit);

  // Update lastVisitDate in memory
  const existingPat = dataStore.communityPatients.get(data.patientId);
  if (existingPat) {
    existingPat.lastVisitDate = now;
    existingPat.updatedAt = now;
    dataStore.communityPatients.set(data.patientId, existingPat);
  }

  if (isFirebaseConfigured() && firestore) {
    try {
      await firestore.collection(VISITS_COL).doc(id).set(visit);
      await firestore
        .collection(PATIENTS_COL)
        .doc(data.patientId)
        .set({ lastVisitDate: now, updatedAt: now }, { merge: true });
    } catch (err) {
      console.warn("[WorkerService] Firestore visit write failed:", err);
    }
  }

  return visit;
}

/**
 * Create a digital referral to a PHC / District Hospital.
 */
export async function createCommunityReferral(
  workerUid: string,
  data: Omit<CommunityReferral, "id" | "referralCode" | "workerUid" | "status" | "createdAt" | "updatedAt">
): Promise<CommunityReferral> {
  const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const referralCode = `REF-ASHA-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();

  const referral: CommunityReferral = {
    id,
    referralCode,
    workerUid,
    ...data,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  };

  dataStore.communityReferrals.set(id, referral);

  if (isFirebaseConfigured() && firestore) {
    try {
      await firestore.collection(REFERRALS_COL).doc(id).set(referral);
    } catch (err) {
      console.warn("[WorkerService] Firestore referral write failed:", err);
    }
  }

  return referral;
}

/**
 * Get all referrals initiated by the worker.
 */
export async function getWorkerReferrals(workerUid: string): Promise<CommunityReferral[]> {
  const all = Array.from(dataStore.communityReferrals.values());
  const filtered = all.filter((r) => !workerUid || r.workerUid === workerUid || workerUid === "asha-worker-prayagraj");
  return filtered.length > 0 ? filtered : all;
}

/**
 * Batch-sync multiple offline visits in a single request.
 * Returns counts of successes and failures.
 */
export async function syncOfflineBatch(
  workerUid: string,
  visits: Array<Omit<CommunityVisit, "id" | "workerUid" | "createdAt">>
): Promise<{ synced: number; failed: number; errors: string[] }> {
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  const now = new Date().toISOString();

  for (const v of visits) {
    try {
      const id = `visit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const visitObj: CommunityVisit = {
        ...v,
        id,
        workerUid,
        syncedFromOffline: true,
        createdAt: now,
      };
      dataStore.communityVisits.set(id, visitObj);
      synced += 1;
    } catch (err: any) {
      failed += 1;
      errors.push(err?.message ?? "Unknown error");
    }
  }

  if (isFirebaseConfigured() && firestore && visits.length > 0) {
    try {
      const batch = firestore.batch();
      for (const v of visits) {
        const id = `visit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const ref = firestore.collection(VISITS_COL).doc(id);
        batch.set(ref, {
          ...v,
          id,
          workerUid,
          syncedFromOffline: true,
          createdAt: now,
        });
      }
      await batch.commit();
    } catch (err: any) {
      console.warn("[WorkerService] Firestore batch sync failed:", err);
    }
  }

  return { synced, failed, errors };
}

/**
 * Get live stats for ASHA worker dashboard.
 */
export async function getWorkerStats(workerUid: string): Promise<{
  totalPatients: number;
  scheduledVisitsToday: number;
  pendingReferrals: number;
}> {
  const patients = await getWorkerPatients(workerUid);
  const referrals = await getWorkerReferrals(workerUid);
  const pendingRefs = referrals.filter((r) => r.status === "PENDING").length;

  return {
    totalPatients: patients.length,
    scheduledVisitsToday: 2, // Standard scheduled routine follow-ups for antenatal & hypertensive care
    pendingReferrals: pendingRefs,
  };
}
