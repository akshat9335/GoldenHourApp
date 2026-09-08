import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUserGet,
  mockNotificationGet,
  mockNotificationSet,
  mockFirestore,
} = vi.hoisted(() => {
  const mockUserGet = vi.fn();
  const mockNotificationGet = vi.fn();
  const mockNotificationSet = vi.fn();

  const mockFirestore = {
    collection: vi.fn((collectionName: string) => {
      if (collectionName === "users") {
        return {
          doc: vi.fn(() => ({
            get: mockUserGet,
            set: mockNotificationSet,
          })),
        };
      }

      return {
        doc: vi.fn(() => ({
          get: mockNotificationGet,
          set: mockNotificationSet,
        })),
        where: vi.fn(() => ({
          get: mockNotificationGet,
        })),
      };
    }),
  };

  return {
    mockUserGet,
    mockNotificationGet,
    mockNotificationSet,
    mockFirestore,
  };
});

vi.mock("../src/config/firebase", () => ({
  firestore: mockFirestore,
}));

import {
  getNotifications,
  markNotificationAsRead,
  saveDeviceToken,
} from "../src/services/notifications/notification.service";

describe("Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationSet.mockResolvedValue(undefined);
  });

  it("saves a valid device token", async () => {
    mockUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: "user-123",
        crisisId: "AS-1234",
      }),
    });

    const result = await saveDeviceToken(
      "user-123",
      "test-fcm-token",
      "android",
    );

    expect(result.token).toBe("test-fcm-token");
    expect(result.platform).toBe("android");
    expect(mockNotificationSet).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty device token", async () => {
    await expect(
      saveDeviceToken("user-123", ""),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_DEVICE_TOKEN",
    });
  });

  it("rejects saving a token for a non-existing user", async () => {
    mockUserGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    await expect(
      saveDeviceToken("user-123", "test-fcm-token"),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "USER_NOT_FOUND",
    });
  });

  it("gets notifications for the current user", async () => {
    mockNotificationGet.mockResolvedValue({
      docs: [
        {
          id: "notification-1",
          data: () => ({
            userId: "user-123",
            title: "Emergency Alert",
            body: "An emergency has been reported.",
            type: "EMERGENCY",
            read: false,
            createdAt: "2026-09-09T00:00:00.000Z",
          }),
        },
      ],
    });

    const notifications = await getNotifications("user-123");

    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe("notification-1");
    expect(notifications[0].title).toBe("Emergency Alert");
    expect(notifications[0].read).toBe(false);
  });

  it("returns an empty list when there are no notifications", async () => {
    mockNotificationGet.mockResolvedValue({
      docs: [],
    });

    const notifications = await getNotifications("user-123");

    expect(notifications).toEqual([]);
  });

  it("marks a notification as read", async () => {
    mockNotificationGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: "user-123",
        title: "Emergency Alert",
        body: "Emergency reported.",
        type: "EMERGENCY",
        read: false,
      }),
    });

    await markNotificationAsRead(
      "user-123",
      "notification-1",
    );

    expect(mockNotificationSet).toHaveBeenCalledWith(
      { read: true },
      { merge: true },
    );
  });

  it("rejects marking another user's notification as read", async () => {
    mockNotificationGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: "another-user",
        title: "Emergency Alert",
        body: "Emergency reported.",
        type: "EMERGENCY",
        read: false,
      }),
    });

    await expect(
      markNotificationAsRead(
        "user-123",
        "notification-1",
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });

  it("returns not found for a missing notification", async () => {
    mockNotificationGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    await expect(
      markNotificationAsRead(
        "user-123",
        "missing-notification",
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOTIFICATION_NOT_FOUND",
    });
  });
});