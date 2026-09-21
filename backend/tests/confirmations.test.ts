import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory Firestore stores for testing
let emergencyStore = new Map<string, any>();
let confirmationStore = new Map<string, any>();

const { mockVerifyIdToken, mockFirestore } = vi.hoisted(() => {
  const mockVerifyIdToken = vi.fn();

  const mockFirestore = {
    collection: vi.fn((collectionName: string) => {
      if (collectionName === "emergencies") {
        return {
          doc: vi.fn((id: string) => ({
            id,
            get: vi.fn(async () => {
              const data = emergencyStore.get(id);
              return {
                exists: Boolean(data),
                id,
                data: () => data,
              };
            }),
            set: vi.fn(async (data: any, options?: { merge?: boolean }) => {
              const current = emergencyStore.get(id) || {};
              const updated = options?.merge ? { ...current, ...data } : data;
              emergencyStore.set(id, updated);
            }),
            update: vi.fn(async (updates: any) => {
              const current = emergencyStore.get(id) || {};
              emergencyStore.set(id, { ...current, ...updates });
            }),
          })),
        };
      }

      if (collectionName === "incidentConfirmations") {
        return {
          doc: vi.fn((id: string) => ({
            id,
            get: vi.fn(async () => {
              const data = confirmationStore.get(id);
              return {
                exists: Boolean(data),
                id,
                data: () => data,
              };
            }),
            set: vi.fn(async (data: any) => {
              confirmationStore.set(id, data);
            }),
          })),
          where: vi.fn((field: string, op: string, value: any) => ({
            get: vi.fn(async () => {
              const results: any[] = [];
              for (const [, item] of confirmationStore) {
                if (op === "==" && item[field] === value) {
                  results.push({
                    id: item.confirmationId,
                    data: () => item,
                  });
                }
              }
              return {
                empty: results.length === 0,
                docs: results,
              };
            }),
          })),
        };
      }

      return {
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({ exists: false, data: () => null })),
          set: vi.fn(async () => {}),
        })),
      };
    }),
    runTransaction: vi.fn(async (updateFunction: any) => {
      const transaction = {
        get: async (docRef: any) => docRef.get(),
        set: (docRef: any, data: any, options?: any) => docRef.set(data, options),
        update: (docRef: any, data: any) => docRef.update(data),
      };
      return await updateFunction(transaction);
    }),
  };

  return {
    mockVerifyIdToken,
    mockFirestore,
  };
});

vi.mock("../src/config/firebase", () => ({
  auth: {
    verifyIdToken: mockVerifyIdToken,
  },
  firestore: mockFirestore,
}));

import confirmationRoutes from "../src/routes/confirmation.routes";
import { errorHandler } from "../src/middleware/errorHandler";
import { notFound } from "../src/middleware/notFound";
import { hasUserConfirmed, getUserConfirmation } from "../src/services/confirmation/duplicate.service";
import { getConfirmationCount } from "../src/services/confirmation/count.service";

const app = express();
app.use(express.json());
app.use("/api/confirmations", confirmationRoutes);
app.use(notFound);
app.use(errorHandler);

describe("Incident Confirmations Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emergencyStore.clear();
    confirmationStore.clear();

    // Default mock implementation for auth
    mockVerifyIdToken.mockImplementation(async (token: string) => {
      if (token === "valid-token-user1") {
        return { uid: "user-1", email: "user1@goldenhour.org" };
      }
      if (token === "valid-token-user2") {
        return { uid: "user-2", email: "user2@goldenhour.org" };
      }
      if (token === "valid-token-user3") {
        return { uid: "user-3", email: "user3@goldenhour.org" };
      }
      throw new Error("Invalid token");
    });

    // Seed a standard active emergency
    emergencyStore.set("emergency-100", {
      id: "emergency-100",
      reporterId: "reporter-99",
      crisisId: "CRISIS-100",
      incidentType: "ACCIDENT",
      description: "Car collision on Highway 10",
      severity: "HIGH",
      aiResult: { severity: "HIGH", confidence: 0.95 },
      status: "REPORTED",
      confirmationCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  // ==========================================================
  // AUTHENTICATION TESTS (Cases 1-5)
  // ==========================================================
  describe("Authentication & Security", () => {
    it("1. No token → 401 UNAUTHORIZED", async () => {
      const res = await request(app)
        .post("/api/confirmations")
        .send({ emergencyId: "emergency-100" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("2. Invalid token → 401 INVALID_TOKEN", async () => {
      const res = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer invalid-or-expired-token")
        .send({ emergencyId: "emergency-100" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_TOKEN");
    });

    it("3. Valid Firebase user → allowed", async () => {
      const res = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.confirmed).toBe(true);
    });

    it("4. Firebase UID correctly derived from token (req.user.uid)", async () => {
      await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });

      const savedRecord = confirmationStore.get("emergency-100_user-1");
      expect(savedRecord).toBeDefined();
      expect(savedRecord.userId).toBe("user-1");
    });

    it("5. Fake frontend userId cannot bypass authentication or override req.user.uid", async () => {
      const res = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({
          emergencyId: "emergency-100",
          userId: "fake-victim-uid", // Attacker attempt to confirm on behalf of another user
        });

      expect(res.status).toBe(200);
      // Record must be attributed strictly to token's UID, not the body parameter
      expect(confirmationStore.has("emergency-100_fake-victim-uid")).toBe(false);
      expect(confirmationStore.has("emergency-100_user-1")).toBe(true);
      expect(confirmationStore.get("emergency-100_user-1").userId).toBe("user-1");
    });
  });

  // ==========================================================
  // CONFIRMATION FUNCTIONALITY (Cases 6-12)
  // ==========================================================
  describe("Confirmation Flow", () => {
    it("6. First confirmation → success", async () => {
      const res = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.confirmed).toBe(true);
      expect(res.body.confirmationCount).toBe(1);
      expect(res.body.data.status).toBe("CONFIRMING");
    });

    it("7. Same user + same emergency again → 409 ALREADY_CONFIRMED", async () => {
      // First confirmation
      const firstRes = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });
      expect(firstRes.status).toBe(200);

      // Duplicate attempt
      const duplicateRes = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error.code).toBe("ALREADY_CONFIRMED");
    });

    it("8. Different user + same emergency → success", async () => {
      // User 1 confirms
      const resUser1 = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });
      expect(resUser1.status).toBe(200);
      expect(resUser1.body.confirmationCount).toBe(1);

      // User 2 confirms
      const resUser2 = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user2")
        .send({ emergencyId: "emergency-100" });
      expect(resUser2.status).toBe(200);
      expect(resUser2.body.confirmationCount).toBe(2);
    });

    it("9. Invalid/missing emergency → 404 EMERGENCY_NOT_FOUND", async () => {
      const res = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "non-existent-emergency-404" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("EMERGENCY_NOT_FOUND");
    });

    it("10. Invalid input → proper error (422 INVALID_INPUT)", async () => {
      // Missing emergencyId
      const resEmpty = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({});
      expect(resEmpty.status).toBe(422);
      expect(resEmpty.body.error.code).toBe("INVALID_INPUT");

      // Blank emergencyId
      const resBlank = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "   " });
      expect(resBlank.status).toBe(422);
      expect(resBlank.body.error.code).toBe("INVALID_INPUT");
    });

    it("11. Confirmation record created correctly", async () => {
      await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });

      const record = confirmationStore.get("emergency-100_user-1");
      expect(record).toBeDefined();
      expect(record.confirmationId).toBe("emergency-100_user-1");
      expect(record.emergencyId).toBe("emergency-100");
      expect(record.userId).toBe("user-1");
      expect(record.confirmedAt).toBeDefined();
      expect(record.createdAt).toBeDefined();
    });

    it("12. Accurate confirmation count maintained and preserves unrelated emergency fields", async () => {
      await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });

      const emergency = emergencyStore.get("emergency-100");
      expect(emergency.confirmationCount).toBe(1);
      // Unrelated Core & AI fields must be preserved intact
      expect(emergency.crisisId).toBe("CRISIS-100");
      expect(emergency.reporterId).toBe("reporter-99");
      expect(emergency.severity).toBe("HIGH");
      expect(emergency.aiResult).toEqual({ severity: "HIGH", confidence: 0.95 });
      expect(emergency.description).toBe("Car collision on Highway 10");
    });
  });

  // ==========================================================
  // USER CONFIRMATION STATUS (Cases 13-14)
  // ==========================================================
  describe("User Confirmation Status (/api/confirmations/:emergencyId/me)", () => {
    it("13. User who confirmed → confirmed=true", async () => {
      await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });

      const res = await request(app)
        .get("/api/confirmations/emergency-100/me")
        .set("Authorization", "Bearer valid-token-user1");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.confirmed).toBe(true);
      expect(res.body.data.confirmed).toBe(true);
    });

    it("14. User who has not confirmed → confirmed=false", async () => {
      const res = await request(app)
        .get("/api/confirmations/emergency-100/me")
        .set("Authorization", "Bearer valid-token-user2");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.confirmed).toBe(false);
      expect(res.body.data.confirmed).toBe(false);
    });
  });

  // ==========================================================
  // CONFIRMATION COUNT API (Cases 15-16)
  // ==========================================================
  describe("Confirmation Count & Summary (/api/confirmations/:emergencyId)", () => {
    it("15. Correct count returned from backend", async () => {
      await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });

      const res = await request(app)
        .get("/api/confirmations/emergency-100")
        .set("Authorization", "Bearer valid-token-user2");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.confirmationCount).toBe(1);
      expect(res.body.data.confirmationCount).toBe(1);
    });

    it("16. Count increases only once for a duplicate attempt", async () => {
      // First confirmation: count becomes 1
      await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });

      // Duplicate confirmation attempt (409)
      const duplicateRes = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });
      expect(duplicateRes.status).toBe(409);

      // Verify count remains 1
      const countRes = await request(app)
        .get("/api/confirmations/emergency-100")
        .set("Authorization", "Bearer valid-token-user1");

      expect(countRes.status).toBe(200);
      expect(countRes.body.confirmationCount).toBe(1);
      expect(emergencyStore.get("emergency-100").confirmationCount).toBe(1);
    });
  });

  // ==========================================================
  // AUTHORIZATION & DATA INTEGRITY (Cases 17-18)
  // ==========================================================
  describe("Authorization & Data Integrity", () => {
    it("17. Unauthorized access rejected across endpoints", async () => {
      const endpoints = [
        () => request(app).post("/api/confirmations").send({ emergencyId: "emergency-100" }),
        () => request(app).get("/api/confirmations/emergency-100/me"),
        () => request(app).get("/api/confirmations/my"),
        () => request(app).get("/api/confirmations/emergency-100"),
      ];

      for (const call of endpoints) {
        const res = await call();
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      }
    });

    it("18. User cannot manipulate another user's confirmation data", async () => {
      // User 1 confirms
      await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-100" });

      // User 2 checking user 1's status using token 2 gets user 2's status (false)
      const res = await request(app)
        .get("/api/confirmations/emergency-100/me")
        .set("Authorization", "Bearer valid-token-user2");

      expect(res.body.confirmed).toBe(false);
    });
  });

  // ==========================================================
  // CONCURRENCY & RACE CONDITION PROTECTION (Cases 19-23)
  // ==========================================================
  describe("Concurrency & Race Conditions", () => {
    it("19-23. Handles two simultaneous confirmation requests safely", async () => {
      // Setup fresh emergency
      emergencyStore.set("emergency-race", {
        id: "emergency-race",
        reporterId: "reporter-race",
        crisisId: "CRISIS-RACE",
        incidentType: "FIRE",
        status: "REPORTED",
        confirmationCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Fire two simultaneous requests from SAME user for SAME emergency
      const [resA, resB] = await Promise.all([
        request(app)
          .post("/api/confirmations")
          .set("Authorization", "Bearer valid-token-user1")
          .send({ emergencyId: "emergency-race" }),
        request(app)
          .post("/api/confirmations")
          .set("Authorization", "Bearer valid-token-user1")
          .send({ emergencyId: "emergency-race" }),
      ]);

      const statuses = [resA.status, resB.status].sort();

      // 20. Exactly ONE should succeed (200)
      // 21. Exactly ONE should return duplicate/conflict (409)
      expect(statuses).toEqual([200, 409]);

      const successRes = resA.status === 200 ? resA : resB;
      const conflictRes = resA.status === 409 ? resA : resB;

      expect(successRes.body.success).toBe(true);
      expect(successRes.body.confirmed).toBe(true);
      expect(conflictRes.body.success).toBe(false);
      expect(conflictRes.body.error.code).toBe("ALREADY_CONFIRMED");

      // 22. Only ONE confirmation record should exist
      expect(confirmationStore.has("emergency-race_user-1")).toBe(true);
      let recordsForThisPair = 0;
      for (const [key] of confirmationStore) {
        if (key === "emergency-race_user-1") {
          recordsForThisPair++;
        }
      }
      expect(recordsForThisPair).toBe(1);

      // 23. Count should increase only once
      const finalEmergency = emergencyStore.get("emergency-race");
      expect(finalEmergency.confirmationCount).toBe(1);
    });
  });

  // ==========================================================
  // INCIDENT STATE & HISTORY TESTS (Cases 24-25)
  // ==========================================================
  describe("Incident State & User History", () => {
    it("24. Completed emergency cannot be confirmed → 422 INCIDENT_NOT_CONFIRMABLE", async () => {
      emergencyStore.set("emergency-completed", {
        id: "emergency-completed",
        reporterId: "reporter-99",
        crisisId: "CRISIS-COMPLETED",
        status: "COMPLETED",
        confirmationCount: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emergency-completed" });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INCIDENT_NOT_CONFIRMABLE");
    });

    it("25. GET /api/confirmations/my returns user's confirmation history", async () => {
      // Seed two emergencies
      emergencyStore.set("emg-a", {
        id: "emg-a",
        status: "REPORTED",
        confirmationCount: 0,
      });
      emergencyStore.set("emg-b", {
        id: "emg-b",
        status: "REPORTED",
        confirmationCount: 0,
      });

      // User 1 confirms both
      await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emg-a" });

      await request(app)
        .post("/api/confirmations")
        .set("Authorization", "Bearer valid-token-user1")
        .send({ emergencyId: "emg-b" });

      const res = await request(app)
        .get("/api/confirmations/my")
        .set("Authorization", "Bearer valid-token-user1");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      const emergencyIds = res.body.data.map((c: any) => c.emergencyId).sort();
      expect(emergencyIds).toEqual(["emg-a", "emg-b"]);
    });
  });

  // ==========================================================
  // STANDALONE SERVICE UNIT TESTS
  // ==========================================================
  describe("Standalone Service Unit Tests", () => {
    it("hasUserConfirmed and getUserConfirmation return accurate status", async () => {
      // Initially false
      expect(await hasUserConfirmed("emergency-100", "user-1")).toBe(false);
      expect(await getUserConfirmation("emergency-100", "user-1")).toBeNull();

      // Seed confirmation
      confirmationStore.set("emergency-100_user-1", {
        confirmationId: "emergency-100_user-1",
        emergencyId: "emergency-100",
        userId: "user-1",
        confirmedAt: "2026-09-11T00:00:00.000Z",
        createdAt: "2026-09-11T00:00:00.000Z",
      });

      expect(await hasUserConfirmed("emergency-100", "user-1")).toBe(true);
      const record = await getUserConfirmation("emergency-100", "user-1");
      expect(record).not.toBeNull();
      expect(record?.userId).toBe("user-1");
    });

    it("getConfirmationCount returns count and throws 404 for missing emergency", async () => {
      emergencyStore.set("emergency-count-test", {
        id: "emergency-count-test",
        confirmationCount: 7,
      });

      const count = await getConfirmationCount("emergency-count-test");
      expect(count).toBe(7);

      await expect(getConfirmationCount("missing-emg-id")).rejects.toMatchObject({
        statusCode: 404,
        code: "EMERGENCY_NOT_FOUND",
      });
    });
  });
});

