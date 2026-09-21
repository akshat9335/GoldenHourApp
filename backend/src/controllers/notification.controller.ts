import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";
import {
  getNotifications,
  markNotificationAsRead,
  saveDeviceToken,
  clearAllNotifications,
} from "../services/notifications/notification.service";

function getUserUid(req: Request): string {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication is required.",
    );
  }

  return req.user.uid;
}

export async function saveDeviceTokenController(
  req: Request,
  res: Response,
): Promise<void> {
  const uid = getUserUid(req);
  const { token, platform } = req.body;

  if (typeof token !== "string" || !token.trim()) {
    throw new AppError(
      400,
      "INVALID_DEVICE_TOKEN",
      "Device token is required.",
    );
  }

  const deviceToken = await saveDeviceToken(
    uid,
    token,
    typeof platform === "string" ? platform : undefined,
  );

  sendSuccess(
    res,
    deviceToken,
    "Device token saved successfully.",
  );
}

export async function getNotificationsController(
  req: Request,
  res: Response,
): Promise<void> {
  const uid = getUserUid(req);

  const notifications = await getNotifications(uid);

  sendSuccess(
    res,
    notifications,
    "Notifications retrieved successfully.",
  );
}

export async function markNotificationAsReadController(
  req: Request,
  res: Response,
): Promise<void> {
  const uid = getUserUid(req);
  const { id } = req.params;

  if (!id) {
    throw new AppError(
      400,
      "INVALID_NOTIFICATION_ID",
      "Notification ID is required.",
    );
  }

  await markNotificationAsRead(uid, id);

  sendSuccess(
    res,
    null,
    "Notification marked as read.",
  );
}

export async function clearAllNotificationsController(
  req: Request,
  res: Response,
): Promise<void> {
  const uid = getUserUid(req);
  await clearAllNotifications(uid);
  sendSuccess(res, null, "All notifications cleared successfully.");
}