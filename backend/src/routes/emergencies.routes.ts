import { Router } from "express";
import {
  createEmergencyController,
  getEmergencyController,
  updateEmergencyController,
  listUserEmergenciesController,
} from "../controllers/emergency.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, listUserEmergenciesController);
router.post("/", requireAuth, createEmergencyController);

router.get("/:id", requireAuth, getEmergencyController);

router.patch("/:id", requireAuth, updateEmergencyController);

export default router;