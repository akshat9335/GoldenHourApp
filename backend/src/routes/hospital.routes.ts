import { Router } from "express";
import { registerHospitalController } from "../controllers/hospital.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.post(
  "/register",
  requireAuth,
  requireRole("hospital"),
  registerHospitalController,
);

export default router;
