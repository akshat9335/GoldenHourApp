import { Router } from "express";
import {
  createEmergencyController,
  getEmergencyController,
  updateEmergencyController,
} from "../controllers/emergency.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", requireAuth, createEmergencyController);

router.get("/:id", requireAuth, getEmergencyController);

router.patch("/:id", requireAuth, updateEmergencyController);

export default router;