import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";

const USERS_COLLECTION = "users";
const NOTIFICATIONS_COLLECTION = "notifications";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: unknown;
}

export interface DeviceToken {
  token: string;
  platform?: string | null;
  updatedAt: unknown;
}

function getFirestore() {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase Admin is not configured on this server.",
    );
  }

  return firestore;
}

export async function saveDeviceToken(
  userId: string,
  token: string,
  platform?: string,
): Promise<DeviceToken> {
  const db = getFirestore();

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new AppError(
      400,
      "INVALID_DEVICE_TOKEN",
      "Device token is required.",
    );
  }

  const userRef = db.collection(USERS_COLLECTION).doc(userId);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    throw new AppError(
      404,
      "USER_NOT_FOUND",
      "User profile was not found.",
    );
  }

  const deviceToken: DeviceToken = {
    token: normalizedToken,
    platform: platform?.trim() || null,
    updatedAt: new Date().toISOString(),
  };

  await userRef.set(
    {
      fcmToken: deviceToken.token,
      fcmPlatform: deviceToken.platform,
      fcmTokenUpdatedAt: deviceToken.updatedAt,
    },
    { merge: true },
  );

  return deviceToken;
}

export async function getNotifications(
  userId: string,
): Promise<Notification[]> {
  const db = getFirestore();

  const snapshot = await db
    .collection(NOTIFICATIONS_COLLECTION)
    .where("userId", "==", userId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Notification, "id">),
  }));
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  const db = getFirestore();

  const notificationRef = db
    .collection(NOTIFICATIONS_COLLECTION)
    .doc(notificationId);

  const snapshot = await notificationRef.get();

  if (!snapshot.exists) {
    throw new AppError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "Notification was not found.",
    );
  }

  const notification = snapshot.data() as Notification;

  if (notification.userId !== userId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You are not allowed to update this notification.",
    );
  }

  await notificationRef.set(
    {
      read: true,
    },
    { merge: true },
  );
}