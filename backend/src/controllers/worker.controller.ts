import { Request, Response, NextFunction } from "express";
import { dataStore } from "../models/dataStore";
import { firestore } from "../config/firebase";
import { CommunityPatient, CommunityVisit, CommunityReferral } from "../models/worker.model";
import { AppError } from "../utils/AppError";

const COMMUNITY_PATIENTS_COLLECTION = "communityPatients";
const COMMUNITY_VISITS_COLLECTION = "communityVisits";
const COMMUNITY_REFERRALS_COLLECTION = "communityReferrals";

// ============================================================
// COMMUNITY PATIENTS
// ============================================================

export async function getCommunityPatientsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workerUid = req.user?.uid || (req.query.workerUid as string) || "asha-worker-local";

    let patients: CommunityPatient[] = [];

    if (firestore) {
      const snap = await firestore
        .collection(COMMUNITY_PATIENTS_COLLECTION)
        .where("workerUid", "==", workerUid)
        .get();
      patients = snap.docs.map((doc) => doc.data() as CommunityPatient);
    }

    // Include/fallback to in-memory store
    const localPatients = Array.from(dataStore.communityPatients.values()).filter(
      (p) => !workerUid || p.workerUid === workerUid || p.workerUid === "asha-worker-local"
    );

    const mergedMap = new Map<string, CommunityPatient>();
    patients.forEach((p) => mergedMap.set(p.id, p));
    localPatients.forEach((p) => mergedMap.set(p.id, p));

    res.status(200).json({
      success: true,
      data: Array.from(mergedMap.values()),
      message: "Community patients retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function saveCommunityPatientController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const patientData = req.body as CommunityPatient;
    if (!patientData.id || !patientData.name) {
      throw new AppError(400, "INVALID_DATA", "Patient ID and Name are required.");
    }

    const patient: CommunityPatient = {
      ...patientData,
      workerUid: patientData.workerUid || req.user?.uid || "asha-worker-local",
      createdAt: patientData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in-memory
    dataStore.communityPatients.set(patient.id, patient);

    // Store in Firestore if available
    if (firestore) {
      await firestore.collection(COMMUNITY_PATIENTS_COLLECTION).doc(patient.id).set(patient, { merge: true });
    }

    res.status(201).json({
      success: true,
      data: patient,
      message: "Community patient saved successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getCommunityPatientByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    let patient = dataStore.communityPatients.get(id);

    if (!patient && firestore) {
      const snap = await firestore.collection(COMMUNITY_PATIENTS_COLLECTION).doc(id).get();
      if (snap.exists) {
        patient = snap.data() as CommunityPatient;
      }
    }

    if (!patient) {
      throw new AppError(404, "PATIENT_NOT_FOUND", "Community patient not found");
    }

    res.status(200).json({
      success: true,
      data: patient,
      message: "Patient details retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// COMMUNITY VISITS
// ============================================================

export async function getCommunityVisitsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const patientId = req.query.patientId as string | undefined;
    let visits: CommunityVisit[] = [];

    if (firestore) {
      let query: any = firestore.collection(COMMUNITY_VISITS_COLLECTION);
      if (patientId) {
        query = query.where("patientId", "==", patientId);
      }
      const snap = await query.get();
      visits = snap.docs.map((doc: any) => doc.data() as CommunityVisit);
    }

    const localVisits = Array.from(dataStore.communityVisits.values()).filter(
      (v) => !patientId || v.patientId === patientId
    );

    const merged = new Map<string, CommunityVisit>();
    visits.forEach((v) => merged.set(v.id, v));
    localVisits.forEach((v) => merged.set(v.id, v));

    res.status(200).json({
      success: true,
      data: Array.from(merged.values()),
      message: "Community visits retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function recordCommunityVisitController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const visitData = req.body as CommunityVisit;
    if (!visitData.id || !visitData.patientId) {
      throw new AppError(400, "INVALID_DATA", "Visit ID and Patient ID are required.");
    }

    const visit: CommunityVisit = {
      ...visitData,
      workerUid: visitData.workerUid || req.user?.uid || "asha-worker-local",
      createdAt: visitData.createdAt || new Date().toISOString(),
      visitDate: visitData.visitDate || new Date().toISOString(),
    };

    // Store in-memory
    dataStore.communityVisits.set(visit.id, visit);

    // Update patient's lastVisitDate in memory
    const existingPatient = dataStore.communityPatients.get(visit.patientId);
    if (existingPatient) {
      existingPatient.lastVisitDate = visit.visitDate;
      if (visit.followUpRequired) {
        existingPatient.followUpRequired = true;
        existingPatient.followUpDate = visit.followUpDate;
      }
      dataStore.communityPatients.set(existingPatient.id, existingPatient);
    }

    if (firestore) {
      await firestore.collection(COMMUNITY_VISITS_COLLECTION).doc(visit.id).set(visit, { merge: true });
      if (existingPatient) {
        await firestore.collection(COMMUNITY_PATIENTS_COLLECTION).doc(existingPatient.id).set(existingPatient, { merge: true });
      }
    }

    res.status(201).json({
      success: true,
      data: visit,
      message: "Community visit recorded successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// COMMUNITY REFERRALS
// ============================================================

export async function getCommunityReferralsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const patientId = req.query.patientId as string | undefined;
    let referrals: CommunityReferral[] = [];

    if (firestore) {
      let query: any = firestore.collection(COMMUNITY_REFERRALS_COLLECTION);
      if (patientId) {
        query = query.where("patientId", "==", patientId);
      }
      const snap = await query.get();
      referrals = snap.docs.map((doc: any) => doc.data() as CommunityReferral);
    }

    const localReferrals = Array.from(dataStore.communityReferrals.values()).filter(
      (r) => !patientId || r.patientId === patientId
    );

    const merged = new Map<string, CommunityReferral>();
    referrals.forEach((r) => merged.set(r.id, r));
    localReferrals.forEach((r) => merged.set(r.id, r));

    res.status(200).json({
      success: true,
      data: Array.from(merged.values()),
      message: "Community referrals retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function createCommunityReferralController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const referralData = req.body as CommunityReferral;
    if (!referralData.id || !referralData.patientId || !referralData.facilityId) {
      throw new AppError(400, "INVALID_DATA", "Referral ID, Patient ID, and Facility ID are required.");
    }

    const referral: CommunityReferral = {
      ...referralData,
      workerUid: referralData.workerUid || req.user?.uid || "asha-worker-local",
      status: referralData.status || "PENDING",
      createdAt: referralData.createdAt || new Date().toISOString(),
    };

    dataStore.communityReferrals.set(referral.id, referral);

    if (firestore) {
      await firestore.collection(COMMUNITY_REFERRALS_COLLECTION).doc(referral.id).set(referral, { merge: true });
    }

    res.status(201).json({
      success: true,
      data: referral,
      message: "Community referral created successfully",
    });
  } catch (error) {
    next(error);
  }
}
