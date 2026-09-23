import { Router } from "express";
import { referralController } from "../controllers/referral.controller";

const router = Router();

router.post("/", referralController.createReferral);
router.get("/hospital/:hospitalId", referralController.getHospitalReferrals);
router.get("/hospital", referralController.getHospitalReferrals);
router.get("/patient/:patientId", referralController.getPatientReferrals);
router.patch("/:id/status", referralController.updateReferralStatus);

export default router;
