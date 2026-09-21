import { Router } from "express";
import {
  confirmIncidentController,
  getConfirmationSummaryController,
  getMyConfirmationHistoryController,
  getMyConfirmationStatusController,
} from "../controllers/confirmation.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Order is important: /my must come before /:emergencyId to prevent parameter capture
router.post("/", requireAuth, confirmIncidentController);
router.get("/my", requireAuth, getMyConfirmationHistoryController);
router.get("/:emergencyId/me", requireAuth, getMyConfirmationStatusController);
router.get("/:emergencyId", requireAuth, getConfirmationSummaryController);

export default router;
