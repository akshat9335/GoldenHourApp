import { Router } from 'express';
import {
  getDiagnosticCatalogController,
  bookDiagnosticController,
  getFacilityRequestsController,
  uploadDiagnosticReportController,
  getPatientBookingsController,
} from '../controllers/diagnostic.controller';

const router = Router();

// Get pre-defined catalog of diagnostic tests
router.get('/catalog', getDiagnosticCatalogController);

// Book a diagnostic test (Patient or Doctor)
router.post('/book', bookDiagnosticController);

// Hospital lab desk queue of pending/scheduled tests
router.get('/facility/:facilityId/requests', getFacilityRequestsController);

// Lab technician/Hospital report upload/entry
router.patch('/bookings/:id/report', uploadDiagnosticReportController);

// Patient's booked tests & ready reports
router.get('/patient/my-bookings', getPatientBookingsController);

export default router;
