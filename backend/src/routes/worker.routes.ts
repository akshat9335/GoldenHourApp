import { Router } from "express";
import {
  getCommunityPatientsController,
  saveCommunityPatientController,
  getCommunityPatientByIdController,
  getCommunityVisitsController,
  recordCommunityVisitController,
  getCommunityReferralsController,
  createCommunityReferralController,
} from "../controllers/worker.controller";

const router = Router();

// Community Patients
router.get("/patients", getCommunityPatientsController);
router.post("/patients", saveCommunityPatientController);
router.get("/patients/:id", getCommunityPatientByIdController);

// Community Visits
router.get("/visits", getCommunityVisitsController);
router.post("/visits", recordCommunityVisitController);

// Community Referrals
router.get("/referrals", getCommunityReferralsController);
router.post("/referrals", createCommunityReferralController);

export default router;
