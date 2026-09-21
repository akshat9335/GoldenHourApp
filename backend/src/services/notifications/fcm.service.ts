import { messaging, firestore } from "../../config/firebase";

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  channelId?: string;
}

export interface PushResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}

export class FcmService {
  /**
   * Sends multicast push notifications to a list of device tokens via Firebase Admin Messaging.
   * Automatically handles invalid/unregistered tokens and removes them from user profiles.
   */
  public async sendMulticast(
    tokens: string[],
    payload: PushNotificationPayload,
  ): Promise<PushResult> {
    const validTokens = Array.from(
      new Set(tokens.filter((t) => typeof t === "string" && t.trim().length > 0)),
    );

    if (validTokens.length === 0) {
      return {
        totalRequested: 0,
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
      };
    }

    if (!messaging) {
      console.warn(
        "[fcm] Firebase Admin Messaging not initialized. Push skipped in current environment.",
      );
      return {
        totalRequested: validTokens.length,
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
      };
    }

    const message = {
      tokens: validTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: "high" as const,
        notification: {
          sound: "default",
          channelId: payload.channelId || "emergency_alerts",
          priority: "high" as const,
        },
      },
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      const invalidTokens: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/invalid-argument"
          ) {
            invalidTokens.push(validTokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0 && firestore) {
        this.cleanInvalidTokens(invalidTokens).catch((err) => {
          console.warn("[fcm] Error cleaning invalid tokens:", err.message);
        });
      }

      const successCount =
        typeof response.successCount === "number"
          ? response.successCount
          : response.responses.filter((r) => r.success).length;
      const failureCount =
        typeof response.failureCount === "number"
          ? response.failureCount
          : response.responses.filter((r) => !r.success).length;

      return {
        totalRequested: validTokens.length,
        successCount,
        failureCount,
        invalidTokens,
      };
    } catch (err: any) {
      console.error("[fcm] Multicast send error:", err.message);
      return {
        totalRequested: validTokens.length,
        successCount: 0,
        failureCount: validTokens.length,
        invalidTokens: [],
      };
    }
  }

  private async cleanInvalidTokens(tokens: string[]): Promise<void> {
    if (!firestore) return;
    for (const token of tokens) {
      try {
        const snap = await firestore
          .collection("users")
          .where("fcmToken", "==", token)
          .get();
        if (!snap.empty) {
          const batch = firestore.batch();
          snap.docs.forEach((d) => {
            batch.update(d.ref, {
              fcmToken: null,
              fcmTokenUpdatedAt: new Date().toISOString(),
            });
          });
          await batch.commit();
        }
      } catch (_err) {
        // Safe silence
      }
    }
  }
}

export const fcmService = new FcmService();
