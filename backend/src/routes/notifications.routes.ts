import { Router } from "express";
import {
  getNotificationsController,
  markNotificationAsReadController,
  saveDeviceTokenController,
  clearAllNotificationsController,
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

router.post(
  "/clear-all",
  requireAuth,
  clearAllNotificationsController,
);

router.delete(
  "/",
  requireAuth,
  clearAllNotificationsController,
);

export default router;