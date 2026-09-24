import { Router } from "express";
import {
  createEmergencyController,
  getEmergencyController,
  updateEmergencyController,
  listUserEmergenciesController,
  cancelEmergencyController,
  cancelActiveEmergencyController,
} from "../controllers/emergency.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, listUserEmergenciesController);
router.post("/", requireAuth, createEmergencyController);
router.post("/active/cancel", requireAuth, cancelActiveEmergencyController);

router.get("/:id", requireAuth, getEmergencyController);
router.patch("/:id", requireAuth, updateEmergencyController);
router.post("/:id/cancel", requireAuth, cancelEmergencyController);

export default router;