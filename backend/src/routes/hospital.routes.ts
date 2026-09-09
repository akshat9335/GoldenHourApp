import { Router } from "express";

import {
  acceptHospitalRequestController,
  addHospitalDiagnosticController,
  addHospitalSpecialistController,
  createHospitalReferralController,
  createHospitalReferralForRequestController,
  deleteHospitalDiagnosticController,
  deleteHospitalSpecialistController,
  findMatchingFacilitiesController,
  getHospitalCapacityController,
  getHospitalDiagnosticByIdController,
  getHospitalDiagnosticsController,
  getHospitalProfileController,
  getHospitalReferralsController,
  getHospitalRequestByIdController,
  getHospitalRequestsController,
  getHospitalSpecialistsController,
  registerHospitalController,
  rejectHospitalRequestController,
  updateHospitalCapacityController,
  updateHospitalDiagnosticController,
  updateHospitalProfileController,
  updateHospitalRequestStatusController,
  updateHospitalSpecialistController,
} from "../controllers/hospital.controller";

import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// ============================================================
// HOSPITAL REGISTRATION
// ============================================================

router.post(
  "/register",
  requireAuth,
  requireRole("hospital"),
  registerHospitalController,
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

router.get(
  "/requests/:id",
  requireAuth,
  requireRole("hospital"),
  getHospitalRequestByIdController,
);

router.post(
  "/requests/:id/accept",
  requireAuth,
  requireRole("hospital"),
  acceptHospitalRequestController,
);

router.post(
  "/requests/:id/reject",
  requireAuth,
  requireRole("hospital"),
  rejectHospitalRequestController,
);

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
