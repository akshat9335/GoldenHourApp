import { Request, Response, NextFunction } from 'express';
import { healthRecordService } from '../services/healthRecord/healthRecord.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/AppError';

export class HealthRecordController {
  /**
   * Create a new health record (Doctor, Hospital, or Patient upload).
   * Automatically attaches ABDM/FHIR R4 Bundle.
   */
  public async createRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientUid = req.body.patientUid || req.user?.uid;
      if (!patientUid) {
        throw new AppError(400, 'MISSING_PATIENT_UID', 'Patient UID is required to create a health record.');
      }

      const record = await healthRecordService.createRecord({
        ...req.body,
        patientUid,
      });

      sendSuccess(res, record, 'Health record created successfully with FHIR R4 Bundle', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get patient's complete longitudinal timeline.
   */
  public async getPatientTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientUid = req.params.patientUid || req.user?.uid;
      if (!patientUid) {
        throw new AppError(400, 'MISSING_PATIENT_UID', 'Patient UID parameter is required.');
      }

      const timeline = await healthRecordService.getPatientTimeline(patientUid);
      sendSuccess(res, timeline, 'Patient health records retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Quick Emergency Summary for SOS/Ambulance/Hospital 1-second triage.
   */
  public async getEmergencySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientUid = req.params.patientUid || req.user?.uid;
      if (!patientUid) {
        throw new AppError(400, 'MISSING_PATIENT_UID', 'Patient UID parameter is required.');
      }

      const summary = await healthRecordService.getEmergencySummary(patientUid);
      sendSuccess(res, summary, 'Emergency health summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get raw ABDM / HL7 FHIR R4 JSON export for a single health record.
   */
  public async getFhirBundle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId } = req.params;
      const patientUid = (req.query.patientUid as string) || req.user?.uid;

      const fhirBundle = await healthRecordService.getFhirBundle(recordId, patientUid);
      // Return raw FHIR R4 bundle
      res.status(200).json(fhirBundle);
    } catch (err) {
      next(err);
    }
  }
}

export const healthRecordController = new HealthRecordController();
