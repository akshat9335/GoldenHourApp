import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockMessagingSendMulticast,
  mockFirestore,
  mockBatchUpdate,
  mockBatchCommit,
} = vi.hoisted(() => {
  const mockMessagingSendMulticast = vi.fn();
  const mockBatchUpdate = vi.fn();
  const mockBatchCommit = vi.fn().mockResolvedValue(undefined);

  const mockFirestore = {
    collection: vi.fn(),
    batch: vi.fn(() => ({
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    })),
  };

  return {
    mockMessagingSendMulticast,
    mockFirestore,
    mockBatchUpdate,
    mockBatchCommit,
  };
});

vi.mock("../src/config/firebase", () => ({
  firestore: mockFirestore,
  messaging: {
    sendEachForMulticast: mockMessagingSendMulticast,
  },
}));

import { fcmService } from "../src/services/notifications/fcm.service";
import { emergencyAlertService } from "../src/services/notifications/emergencyAlert.service";
import { getEmergencyById, updateEmergency } from "../src/services/emergencies/emergency.service";

describe("Real FCM & Proximity Alerts Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("FcmService Multicast & Stale Token Pruning", () => {
    it("returns zero counts if token array is empty", async () => {
      const res = await fcmService.sendMulticast([], {
        title: "Test",
        body: "Test Body",
      });

      expect(res.totalRequested).toBe(0);
      expect(res.successCount).toBe(0);
      expect(res.failureCount).toBe(0);
      expect(mockMessagingSendMulticast).not.toHaveBeenCalled();
    });

    it("sends multicast message to real tokens and prunes invalid/unregistered tokens", async () => {
      const mockDocRef = { id: "user-with-stale-tok" };
      const mockUsersQuery = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          empty: false,
          docs: [
            {
              ref: mockDocRef,
            },
          ],
        }),
      });

      mockFirestore.collection.mockImplementation((col: string) => {
        if (col === "users") {
          return {
            where: mockUsersQuery,
          };
        }
        return {};
      });

      mockMessagingSendMulticast.mockResolvedValue({
        responses: [
          { success: true },
          {
            success: false,
            error: {
              code: "messaging/registration-token-not-registered",
              message: "Token unregistered",
            },
          },
        ],
      });

      const res = await fcmService.sendMulticast(["valid-tok", "stale-tok"], {
        title: "Emergency Alert",
        body: "Patient needs help",
        data: { emergencyId: "emg-999" },
      });

      expect(res.successCount).toBe(1);
      expect(res.failureCount).toBe(1);
      expect(res.invalidTokens.length).toBe(1);
      expect(res.invalidTokens).toContain("stale-tok");

      // Give microtasks a tick to complete asynchronous token pruning
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Verify stale token clean up was initiated
      expect(mockUsersQuery).toHaveBeenCalledWith("fcmToken", "==", "stale-tok");
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          fcmToken: null,
          fcmTokenUpdatedAt: expect.any(String),
        }),
      );
      expect(mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe("EmergencyAlertService Dual Dispatch & Deduplication", () => {
    it("dispatches contact alert and radius-filtered nearby alert without duplicating common users", async () => {
      // User IDs:
      // "rep-1": Reporter
      // "contact-1": Contact who is also nearby (within 1km) -> MUST receive ONLY contact alert (deduplicated)
      // "contact-2": Contact who is far away (10km) -> receives contact alert
      // "nearby-1": Non-contact user within 1km -> receives nearby alert
      // "far-1": Non-contact user 5km away (>2km radius) -> NOT alerted

      const mockAddNotification = vi.fn().mockResolvedValue({ id: "notif-123" });

      mockFirestore.collection.mockImplementation((col: string) => {
        if (col === "users") {
          return {
            doc: vi.fn((uid: string) => ({
              get: vi.fn().mockImplementation(async () => {
                const userMap: Record<string, any> = {
                  "rep-1": { name: "Ananya Sharma" },
                  "contact-1": { name: "Rohan", fcmToken: "tok-contact-1" },
                  "contact-2": { name: "Meera", fcmToken: "tok-contact-2" },
                  "nearby-1": { name: "Nearby Bystander", fcmToken: "tok-nearby-1" },
                  "far-1": { name: "Far User", fcmToken: "tok-far-1" },
                };
                return {
                  exists: !!userMap[uid],
                  data: () => userMap[uid] || {},
                };
              }),
            })),
          };
        }

        if (col === "emergencyContacts") {
          return {
            where: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({
                docs: [
                  { data: () => ({ contactUid: "contact-1" }) },
                  { data: () => ({ contactUid: "contact-2" }) },
                ],
              }),
            })),
          };
        }

        if (col === "locations") {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [
                // Reporter location (28.6139, 77.2090)
                // contact-1: 0.5km away (28.6145, 77.2095)
                { data: () => ({ userId: "contact-1", lat: 28.6145, lng: 77.2095 }) },
                // nearby-1: 0.8km away (28.6150, 77.2100)
                { data: () => ({ userId: "nearby-1", lat: 28.6150, lng: 77.2100 }) },
                // far-1: ~15km away (28.7500, 77.3500)
                { data: () => ({ userId: "far-1", lat: 28.7500, lng: 77.3500 }) },
                // reporter itself
                { data: () => ({ userId: "rep-1", lat: 28.6139, lng: 77.2090 }) },
              ],
            }),
          };
        }

        if (col === "notifications") {
          return {
            add: mockAddNotification,
          };
        }

        return {};
      });

      mockMessagingSendMulticast.mockResolvedValue({
        responses: [{ success: true }, { success: true }],
      });

      const result = await emergencyAlertService.dispatchEmergencyAlerts(
        "emg-test-456",
        "rep-1",
        "Cardiac Arrest",
        { latitude: 28.6139, longitude: 77.2090 },
        2.0, // 2km radius
      );

      // Contact tokens: contact-1 and contact-2
      expect(result.contactTokensFound).toBe(2);
      // Nearby tokens: ONLY nearby-1 (contact-1 was deduplicated, far-1 out of radius, rep-1 excluded)
      expect(result.nearbyTokensFound).toBe(1);
      // Total unique notified users: contact-1, contact-2, nearby-1 = 3
      expect(result.totalUniqueNotified).toBe(3);

      // Verify FCM multicast was called twice: once for contacts, once for nearby
      expect(mockMessagingSendMulticast).toHaveBeenCalledTimes(2);

      // Verify in-app notifications created with correct deep-link destinations
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "contact-1",
          type: "EMERGENCY_LIVE_TRACKING",
          data: expect.objectContaining({
            destination: "/(patient)/live-map?emergencyId=emg-test-456",
          }),
        }),
      );

      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "nearby-1",
          type: "NEARBY_EMERGENCY",
          data: expect.objectContaining({
            destination: "/nearby-incident?emergencyId=emg-test-456",
          }),
        }),
      );
    });
  });

  describe("Emergency Live Location Authorization & Tracking", () => {
    it("allows registered emergency contact to stream emergency details", async () => {
      mockFirestore.collection.mockImplementation((col: string) => {
        if (col === "emergencies") {
          return {
            doc: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({
                exists: true,
                id: "emg-live-1",
                data: () => ({
                  reporterId: "rep-100",
                  incidentType: "Accident",
                  status: "EN_ROUTE",
                  location: { latitude: 28.6139, longitude: 77.2090 },
                }),
              }),
            })),
          };
        }

        if (col === "emergencyContacts") {
          return {
            where: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(() => ({
                  get: vi.fn().mockResolvedValue({
                    empty: false, // is a registered contact!
                    docs: [{ id: "c1" }],
                  }),
                })),
              })),
            })),
          };
        }

        return {};
      });

      const emergency = await getEmergencyById("emg-live-1", "contact-999");
      expect(emergency.id).toBe("emg-live-1");
      expect(emergency.status).toBe("EN_ROUTE");
    });

    it("allows notified nearby responder to stream emergency details", async () => {
      mockFirestore.collection.mockImplementation((col: string) => {
        if (col === "emergencies") {
          return {
            doc: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({
                exists: true,
                id: "emg-live-2",
                data: () => ({
                  reporterId: "rep-100",
                  incidentType: "Accident",
                  status: "AMBULANCE_ASSIGNED",
                  location: { latitude: 28.6139, longitude: 77.2090 },
                }),
              }),
            })),
          };
        }

        if (col === "emergencyContacts") {
          return {
            where: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(() => ({
                  get: vi.fn().mockResolvedValue({ empty: true }),
                })),
              })),
            })),
          };
        }

        if (col === "notifications") {
          return {
            where: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(() => ({
                  get: vi.fn().mockResolvedValue({
                    empty: false, // user received notification for this emergency!
                    docs: [{ id: "notif-9" }],
                  }),
                })),
              })),
            })),
          };
        }

        return {};
      });

      const emergency = await getEmergencyById("emg-live-2", "responder-nearby-55");
      expect(emergency.id).toBe("emg-live-2");
      expect(emergency.incidentType).toBe("Accident");
    });

    it("rejects unauthorized stranger with 403 FORBIDDEN", async () => {
      mockFirestore.collection.mockImplementation((col: string) => {
        if (col === "emergencies") {
          return {
            doc: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({
                exists: true,
                id: "emg-live-3",
                data: () => ({
                  reporterId: "rep-100",
                  incidentType: "Accident",
                  status: "REPORTED",
                  location: { latitude: 28.6139, longitude: 77.2090 },
                }),
              }),
            })),
          };
        }

        // Empty matches for contacts, notifications, confirmations
        return {
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => ({
                get: vi.fn().mockResolvedValue({ empty: true }),
              })),
            })),
          })),
        };
      });

      await expect(
        getEmergencyById("emg-live-3", "stranger-1234"),
      ).rejects.toThrow("You are not allowed to access this emergency.");
    });

    it("allows reporter to update moving location and syncs with locations collection", async () => {
      const mockEmergencyUpdateSet = vi.fn().mockResolvedValue(undefined);
      const mockLocationsDocSet = vi.fn().mockResolvedValue(undefined);

      mockFirestore.collection.mockImplementation((col: string) => {
        if (col === "emergencies") {
          return {
            doc: vi.fn(() => ({
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  id: "emg-moving-1",
                  reporterId: "patient-1",
                  status: "EN_ROUTE",
                  location: { latitude: 28.6139, longitude: 77.2090 },
                }),
              }),
              set: mockEmergencyUpdateSet,
            })),
          };
        }

        if (col === "locations") {
          return {
            doc: vi.fn(() => ({
              set: mockLocationsDocSet,
            })),
          };
        }

        return {};
      });

      const updated = await updateEmergency("emg-moving-1", "patient-1", {
        location: { latitude: 28.6145, longitude: 77.2095 },
      });

      expect(updated.location).toEqual({ latitude: 28.6145, longitude: 77.2095 });
      expect(mockEmergencyUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          location: { latitude: 28.6145, longitude: 77.2095 },
          updatedAt: expect.any(String),
        }),
        { merge: true },
      );
      expect(mockLocationsDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "patient-1",
          lat: 28.6145,
          lng: 77.2095,
        }),
        { merge: true },
      );
    });
  });
});
