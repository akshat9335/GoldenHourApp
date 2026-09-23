import { Request, Response, NextFunction } from "express";
import { referralService } from "../services/referral/referral.service";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";

export class ReferralController {
  public async createReferral(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, patientName, doctorId, doctorName, hospitalId, hospitalName, reason, priority, notes } = req.body;

      const effectiveDoctorId = doctorId || (req.user?.uid ? `doc-${req.user.uid}` : "doc-1");
      const effectivePatientId = patientId || "demo-patient";

      if (!hospitalId || !reason) {
        throw new AppError(400, "MISSING_FIELDS", "hospitalId and reason are required.");
      }

      const referral = await referralService.createReferral({
        patientId: effectivePatientId,
        patientName,
        doctorId: effectiveDoctorId,
        doctorName,
        hospitalId,
        hospitalName,
        reason,
        priority: priority || "NORMAL",
        notes,
      });

      sendSuccess(res, referral, "Referral created successfully", 201);
    } catch (err) {
      next(err);
    }
  }

  public async getHospitalReferrals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = req.params.hospitalId || req.user?.uid || (req.query.hospitalId as string) || "all";
      const referrals = await referralService.getReferralsByHospital(hospitalId);
      sendSuccess(res, referrals, `Retrieved ${referrals.length} referrals for hospital`);
    } catch (err) {
      next(err);
    }
  }

  public async getPatientReferrals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.params.patientId || req.user?.uid || (req.query.patientId as string);
      if (!patientId) {
        throw new AppError(400, "MISSING_PATIENT_ID", "Patient ID is required.");
      }
      const referrals = await referralService.getReferralsByPatient(patientId);
      sendSuccess(res, referrals, `Retrieved ${referrals.length} referrals for patient`);
    } catch (err) {
      next(err);
    }
  }

  public async updateReferralStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !["PENDING", "ACCEPTED", "REJECTED", "COMPLETED"].includes(status)) {
        throw new AppError(400, "INVALID_STATUS", "Valid statuses are PENDING, ACCEPTED, REJECTED, COMPLETED.");
      }

      const updated = await referralService.updateReferralStatus(id, status);
      sendSuccess(res, updated, `Referral status updated to ${status}`);
    } catch (err) {
      next(err);
    }
  }
}

export const referralController = new ReferralController();
