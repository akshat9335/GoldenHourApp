import { firestore, assertFirebaseReady } from "../../config/firebase";
import { AppError } from "../../utils/AppError";
import { CommunityPatient, CommunityVisit } from "../../models/worker.model";

const PATIENTS_COL = "communityPatients";
const VISITS_COL = "communityVisits";

// ─── Patient operations ──────────────────────────────────────────────────────

/**
 * Register a new rural patient under an ASHA worker.
 * Auto-generates a Crisis ID if not provided.
 */
export async function registerCommunityPatient(
  workerUid: string,
  data: Omit<CommunityPatient, "id" | "crisisId" | "workerUid" | "createdAt" | "updatedAt">
): Promise<CommunityPatient> {
  assertFirebaseReady();
  const db = firestore!;

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

  await db.collection(PATIENTS_COL).doc(id).set(patient);
  return patient;
}

/**
 * List all patients registered in a worker's area.
 */
export async function getWorkerPatients(workerUid: string): Promise<CommunityPatient[]> {
  assertFirebaseReady();
  const db = firestore!;

  const snap = await db
    .collection(PATIENTS_COL)
    .where("workerUid", "==", workerUid)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((d) => d.data() as CommunityPatient);
}

// ─── Visit operations ────────────────────────────────────────────────────────

/**
 * Record a home visit with vitals and AI triage result.
 */
export async function recordCommunityVisit(
  workerUid: string,
  data: Omit<CommunityVisit, "id" | "workerUid" | "createdAt">
): Promise<CommunityVisit> {
  assertFirebaseReady();
  const db = firestore!;

  const id = `visit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const visit: CommunityVisit = {
    id,
    workerUid,
    ...data,
    syncedFromOffline: data.syncedFromOffline ?? true,
    createdAt: now,
  };

  await db.collection(VISITS_COL).doc(id).set(visit);

  // Update lastVisitDate on the patient record
  await db
    .collection(PATIENTS_COL)
    .doc(data.patientId)
    .update({ lastVisitDate: now, updatedAt: now });

  return visit;
}

/**
 * Batch-sync multiple offline visits in a single request.
 * Returns counts of successes and failures.
 */
export async function syncOfflineBatch(
  workerUid: string,
  visits: Array<Omit<CommunityVisit, "id" | "workerUid" | "createdAt">>
): Promise<{ synced: number; failed: number; errors: string[] }> {
  assertFirebaseReady();
  const db = firestore!;

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  const batch = db.batch();
  const now = new Date().toISOString();

  for (const v of visits) {
    try {
      const id = `visit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const ref = db.collection(VISITS_COL).doc(id);
      batch.set(ref, {
        ...v,
        id,
        workerUid,
        syncedFromOffline: true,
        createdAt: now,
      });
      synced += 1;
    } catch (err: any) {
      failed += 1;
      errors.push(err?.message ?? "Unknown error");
    }
  }

  await batch.commit();
  return { synced, failed, errors };
}
