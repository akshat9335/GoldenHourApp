import { Router } from "express";

import {
  acceptHospitalRequestController,
  addHospitalDiagnosticController,
  addHospitalSpecialistController,
  clearHospitalRequestsController,
  dismissHospitalRequestController,
  completeHospitalRequestController,
  createHospitalReferralController,
  createHospitalReferralForRequestController,
  deleteHospitalDiagnosticController,
  deleteHospitalSpecialistController,
  findMatchingFacilitiesController,
  getHospitalCapacityController,
  getHospitalDiagnosticByIdController,
  getHospitalDiagnosticsController,
  getHospitalDriversController,
  searchHospitalDriverController,
  addHospitalDriverController,
  unlinkHospitalDriverController,
  getHospitalProfileController,
  getHospitalReferralsController,
  getHospitalRequestByIdController,
  getHospitalRequestsController,
  getHospitalSpecialistsController,
  markHospitalPatientArrivedController,
  registerHospitalController,
  rejectHospitalRequestController,
  startHospitalTreatmentController,
  updateHospitalCapacityController,
  updateHospitalDiagnosticController,
  updateHospitalProfileController,
  updateHospitalRequestStatusController,
  updateHospitalSpecialistController,
  matchCandidateHospitalsController,
} from "../controllers/hospital.controller";

import { requireApproved, requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// ============================================================
// HOSPITAL REGISTRATION
// ============================================================

router.post(
  "/register",
  requireAuth,
  registerHospitalController,
);

// ============================================================
// AI HOSPITAL MATCH CANDIDATES (TOP 3 RANKING)
// ============================================================

router.post(
  "/match-candidates",
  requireAuth,
  matchCandidateHospitalsController,
);

// ============================================================
// HOSPITAL PROFILE
// ============================================================

router.get(
  "/me",
  requireAuth,
  requireRole("hospital"),
  getHospitalProfileController,
);

router.patch(
  "/me",
  requireAuth,
  requireRole("hospital"),
  updateHospitalProfileController,
);

// ============================================================
// HOSPITAL CAPACITY
// ============================================================

router.get(
  "/me/capacity",
  requireAuth,
  requireRole("hospital"),
  getHospitalCapacityController,
);

router.patch(
  "/me/capacity",
  requireAuth,
  requireRole("hospital"),
  updateHospitalCapacityController,
);

// ============================================================
// HOSPITAL SPECIALISTS / STAFF
// ============================================================

router.get(
  "/me/specialists",
  requireAuth,
  requireRole("hospital"),
  getHospitalSpecialistsController,
);

router.post(
  "/me/specialists",
  requireAuth,
  requireRole("hospital"),
  addHospitalSpecialistController,
);

router.patch(
  "/me/specialists/:id",
  requireAuth,
  requireRole("hospital"),
  updateHospitalSpecialistController,
);

router.delete(
  "/me/specialists/:id",
  requireAuth,
  requireRole("hospital"),
  deleteHospitalSpecialistController,
);

// ============================================================
// HOSPITAL FLEET & DRIVERS
// ============================================================

router.get(
  "/me/drivers/search",
  requireAuth,
  requireRole("hospital"),
  searchHospitalDriverController,
);

router.get(
  "/me/drivers",
  requireAuth,
  requireRole("hospital"),
  getHospitalDriversController,
);

router.post(
  "/me/drivers",
  requireAuth,
  requireRole("hospital"),
  addHospitalDriverController,
);

router.delete(
  "/me/drivers/:driverId",
  requireAuth,
  requireRole("hospital"),
  unlinkHospitalDriverController,
);

// ============================================================
// HOSPITAL DIAGNOSTICS
// ============================================================

router.get(
  "/me/diagnostics",
  requireAuth,
  requireRole("hospital"),
  getHospitalDiagnosticsController,
);

router.get(
  "/me/diagnostics/:id",
  requireAuth,
  requireRole("hospital"),
  getHospitalDiagnosticByIdController,
);

router.post(
  "/me/diagnostics",
  requireAuth,
  requireRole("hospital"),
  addHospitalDiagnosticController,
);

router.patch(
  "/me/diagnostics/:id",
  requireAuth,
  requireRole("hospital"),
  updateHospitalDiagnosticController,
);

router.delete(
  "/me/diagnostics/:id",
  requireAuth,
  requireRole("hospital"),
  deleteHospitalDiagnosticController,
);

// ============================================================
// FACILITY MATCHING
// ============================================================

router.post(
  "/matching",
  requireAuth,
  requireRole("hospital"),
  findMatchingFacilitiesController,
);

// ============================================================
// HOSPITAL REFERRALS
// ============================================================

// Existing referral route - kept for backward compatibility.
router.post(
  "/referrals",
  requireAuth,
  requireRole("hospital"),
  createHospitalReferralController,
);

router.get(
  "/referrals",
  requireAuth,
  requireRole("hospital"),
  getHospitalReferralsController,
);

// Exact A-Z referral endpoint.
router.post(
  "/requests/:id/referral",
  requireAuth,
  requireRole("hospital"),
  createHospitalReferralForRequestController,
);

// ============================================================
// HOSPITAL EMERGENCY REQUESTS
// ============================================================

router.get(
  "/requests",
  requireAuth,
  requireRole("hospital"),
  getHospitalRequestsController,
);

router.post(
  "/requests/clear-all",
  requireAuth,
  requireRole("hospital"),
  clearHospitalRequestsController,
);

router.post(
  "/requests/:id/dismiss",
  requireAuth,
  requireRole("hospital"),
  dismissHospitalRequestController,
);

router.get(
  "/requests/:id",
  requireAuth,
  requireRole("hospital"),
  getHospitalRequestByIdController,
);

// ------------------------------------------------------------
// ACCEPT / REJECT
// ------------------------------------------------------------

router.post(
  "/requests/:id/accept",
  requireAuth,
  requireRole("hospital"),
  requireApproved,
  acceptHospitalRequestController,
);

router.post(
  "/requests/:id/reject",
  requireAuth,
  requireRole("hospital"),
  rejectHospitalRequestController,
);

// ------------------------------------------------------------
// EXACT A-Z EMERGENCY LIFECYCLE
// ------------------------------------------------------------

// ACCEPTED → AMBULANCE EN ROUTE is handled through the
// existing generic status endpoint.
//
// PATCH /api/hospitals/requests/:id/status
//
// Body:
// {
//   "status": "AMBULANCE EN ROUTE"
// }

router.post(
  "/requests/:id/arrived",
  requireAuth,
  requireRole("hospital"),
  markHospitalPatientArrivedController,
);

router.post(
  "/requests/:id/treatment",
  requireAuth,
  requireRole("hospital"),
  startHospitalTreatmentController,
);

router.post(
  "/requests/:id/complete",
  requireAuth,
  requireRole("hospital"),
  completeHospitalRequestController,
);

// ------------------------------------------------------------
// GENERIC STATUS UPDATE
// ------------------------------------------------------------

router.patch(
  "/requests/:id/status",
  requireAuth,
  requireRole("hospital"),
  updateHospitalRequestStatusController,
);

// ============================================================
// EXPORT
// ============================================================

export default router;
