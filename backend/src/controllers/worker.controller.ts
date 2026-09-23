import { Request, Response, NextFunction } from "express";
import {
  registerCommunityPatient,
  getWorkerPatients,
  getPatientById,
  recordCommunityVisit,
  createCommunityReferral,
  getWorkerReferrals,
  syncOfflineBatch,
  getWorkerStats,
} from "../services/worker/worker.service";
import { AppError } from "../utils/AppError";

export class WorkerController {
  public static async registerPatient(req: Request, res: Response, next: NextFunction) {
    try {
      const workerUid = (req as any).user?.uid || req.body.workerUid || "asha-worker-prayagraj";
      const { name, age, gender, phone, villageOrArea, bloodGroup, knownConditions, isPregnant, expectedDeliveryDate } = req.body;

      if (!name) {
        throw new AppError(400, "MISSING_REQUIRED_FIELD", "Patient name is required");
      }

      const patient = await registerCommunityPatient(workerUid, {
        name,
        age: Number(age) || 0,
        gender: gender || "FEMALE",
        phone: phone || "",
        villageOrArea: villageOrArea || "Prayagraj Rural",
        workerName: req.body.workerName || "Sunita Verma (ASHA Sangini)",
        bloodGroup,
        knownConditions: knownConditions || [],
        isPregnant: !!isPregnant,
        expectedDeliveryDate,
      });

      res.status(201).json({
        success: true,
        message: "Community patient registered successfully",
        data: patient,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getPatients(req: Request, res: Response, next: NextFunction) {
    try {
      const workerUid = ((req as any).user?.uid || req.query.workerUid || "asha-worker-prayagraj") as string;
      const patients = await getWorkerPatients(workerUid);

      res.status(200).json({
        success: true,
        data: patients,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getPatientDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const detail = await getPatientById(id);

      if (!detail) {
        throw new AppError(404, "PATIENT_NOT_FOUND", "Patient not found");
      }

      res.status(200).json({
        success: true,
        data: detail,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async recordVisit(req: Request, res: Response, next: NextFunction) {
    try {
      const workerUid = (req as any).user?.uid || req.body.workerUid || "asha-worker-prayagraj";
      const {
        patientId,
        patientName,
        vitals,
        symptoms,
        aiTriageSeverity,
        aiGuidanceInHindi,
        referredToHospitalId,
        visitDate,
        syncedFromOffline,
      } = req.body;

      if (!patientId || !patientName) {
        throw new AppError(400, "MISSING_REQUIRED_FIELDS", "patientId and patientName are required");
      }

      const visit = await recordCommunityVisit(workerUid, {
        patientId,
        patientName,
        vitals: vitals || {},
        symptoms: symptoms || "",
        aiTriageSeverity: aiTriageSeverity || "NORMAL",
        aiGuidanceInHindi: aiGuidanceInHindi || "",
        referredToHospitalId: referredToHospitalId || null,
        visitDate: visitDate || new Date().toISOString(),
        syncedFromOffline: !!syncedFromOffline,
      });

      res.status(201).json({
        success: true,
        message: "Home visit recorded successfully",
        data: visit,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createReferral(req: Request, res: Response, next: NextFunction) {
    try {
      const workerUid = (req as any).user?.uid || req.body.workerUid || "asha-worker-prayagraj";
      const {
        patientId,
        patientName,
        patientAge,
        patientGender,
        workerName,
        destinationFacility,
        priority,
        reason,
        vitalsSnapshot,
      } = req.body;

      if (!patientId || !destinationFacility) {
        throw new AppError(400, "MISSING_REQUIRED_FIELDS", "patientId and destinationFacility are required");
      }

      const referral = await createCommunityReferral(workerUid, {
        patientId,
        patientName: patientName || "Community Patient",
        patientAge: Number(patientAge) || 0,
        patientGender: patientGender || "FEMALE",
        workerName: workerName || "Sunita Verma (ASHA Sangini)",
        destinationFacility,
        priority: priority || "HIGH",
        reason: reason || "Emergency referral from rural sub-center",
        vitalsSnapshot,
      });

      res.status(201).json({
        success: true,
        message: "Frontline digital referral transmitted successfully",
        data: referral,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getReferrals(req: Request, res: Response, next: NextFunction) {
    try {
      const workerUid = ((req as any).user?.uid || req.query.workerUid || "asha-worker-prayagraj") as string;
      const referrals = await getWorkerReferrals(workerUid);

      res.status(200).json({
        success: true,
        data: referrals,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async syncBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const workerUid = (req as any).user?.uid || req.body.workerUid || "asha-worker-prayagraj";
      const visits = Array.isArray(req.body.visits) ? req.body.visits : [];

      const result = await syncOfflineBatch(workerUid, visits);

      res.status(200).json({
        success: true,
        message: `Offline batch sync complete (${result.synced} synced, ${result.failed} failed)`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const workerUid = ((req as any).user?.uid || req.query.workerUid || "asha-worker-prayagraj") as string;
      const stats = await getWorkerStats(workerUid);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
}
