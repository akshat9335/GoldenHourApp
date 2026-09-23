import { Request, Response, NextFunction } from "express";
import { healthRecordService } from "../services/healthRecord/healthRecord.service";
import { fhirConverter } from "../services/fhir/fhir.converter";
import { referralService } from "../services/referral/referral.service";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";

export class HealthRecordController {
  public async createRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        patientId,
        patientName,
        doctorId,
        doctorName,
        doctorSpecialty,
        clinicName,
        appointmentId,
        tokenNumber,
        diagnosis,
        notes,
        vitals,
        prescriptions,
        referral,
      } = req.body;

      const effectiveDoctorId = doctorId || (req.user?.uid ? `doc-${req.user.uid}` : "doc-1");
      const effectivePatientId = patientId || "demo-patient";

      if (!diagnosis) {
        throw new AppError(400, "MISSING_DIAGNOSIS", "Diagnosis is required to complete consultation.");
      }

      const record = await healthRecordService.createRecord({
        patientId: effectivePatientId,
        patientName,
        doctorId: effectiveDoctorId,
        doctorName,
        doctorSpecialty,
        clinicName,
        appointmentId,
        tokenNumber,
        diagnosis,
        notes,
        vitals,
        prescriptions,
        referral,
      });

      sendSuccess(res, record, "Health record & consultation saved successfully", 201);
    } catch (err) {
      next(err);
    }
  }

  public async getPatientRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.params.patientId || req.user?.uid || (req.query.patientId as string);
      if (!patientId) {
        throw new AppError(400, "MISSING_PATIENT_ID", "Patient ID is required.");
      }

      const records = await healthRecordService.getRecordsByPatient(patientId);
      sendSuccess(res, records, `Retrieved ${records.length} health records`);
    } catch (err) {
      next(err);
    }
  }

  public async getPatientFHIRBundle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.params.patientId || req.user?.uid || (req.query.patientId as string);
      if (!patientId) {
        throw new AppError(400, "MISSING_PATIENT_ID", "Patient ID is required.");
      }

      const records = await healthRecordService.getRecordsByPatient(patientId);
      const referrals = await referralService.getReferralsByPatient(patientId);

      const patientMeta = {
        id: patientId,
        name: records[0]?.patientName || req.user?.email || "Verified Patient",
        phone: undefined,
        gender: "unknown",
      };

      const bundle = fhirConverter.createPatientFHIRBundle(patientMeta, records, referrals);
      sendSuccess(res, bundle, "FHIR R4 Bundle generated successfully");
    } catch (err) {
      next(err);
    }
  }

  public async getRecordById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await healthRecordService.getRecordById(req.params.id);
      if (!record) {
        throw new AppError(404, "RECORD_NOT_FOUND", "Health record not found.");
      }
      sendSuccess(res, record, "Health record details retrieved");
    } catch (err) {
      next(err);
    }
  }
}

export const healthRecordController = new HealthRecordController();
