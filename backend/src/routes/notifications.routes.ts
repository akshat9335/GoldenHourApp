import { Router } from "express";
import {
  getNotificationsController,
  markNotificationAsReadController,
  saveDeviceTokenController,
} from "../controllers/notification.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post(
  "/device-token",
  requireAuth,
  saveDeviceTokenController,
);

router.get(
  "/",
  requireAuth,
  getNotificationsController,
);

router.patch(
  "/:id/read",
  requireAuth,
  markNotificationAsReadController,
);

export default router;