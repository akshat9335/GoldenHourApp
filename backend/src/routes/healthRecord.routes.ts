import { Router } from 'express';
import { healthRecordController } from '../controllers/healthRecord.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Create health record (Doctor, Hospital, or Patient) - builds FHIR bundle
router.post('/', requireAuth, (req, res, next) =>
  healthRecordController.createRecord(req, res, next)
);

// Patient longitudinal EHR timeline (reverse-chronological)
router.get('/patient/:patientUid', (req, res, next) =>
  healthRecordController.getPatientTimeline(req, res, next)
);

// Ultra-fast Emergency Summary (Active allergies, blood group, medications for 1s SOS loads)
router.get('/summary/:patientUid', (req, res, next) =>
  healthRecordController.getEmergencySummary(req, res, next)
);

// Raw ABDM/HL7 FHIR R4 JSON export for a single record
router.get('/:recordId/fhir', (req, res, next) =>
  healthRecordController.getFhirBundle(req, res, next)
);

export default router;
