import { Router } from "express";

import {
  addHospitalDiagnosticController,
  addHospitalSpecialistController,
  createHospitalReferralController,
  deleteHospitalDiagnosticController,
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
  updateHospitalCapacityController,
  updateHospitalDiagnosticController,
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

export default router;
