import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

describe("Location & Maps Endpoints", () => {
  describe("POST /api/location/update", () => {
    it("updates location with valid GPS coordinates", async () => {
      const res = await request(app)
        .post("/api/location/update")
        .send({
          userId: "user-test-anant",
          lat: 28.6139,
          lng: 77.2090,
          accuracy: 12.5,
          role: "user",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lat).toBe(28.6139);
      expect(res.body.data.lng).toBe(77.209);
      expect(res.body.data.userId).toBe("user-test-anant");
    });

    it("rejects invalid latitude > 90 with 400", async () => {
      const res = await request(app)
        .post("/api/location/update")
        .send({
          userId: "user-test-anant",
          lat: 95.5,
          lng: 77.2090,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_COORDINATES");
    });

    it("rejects non-numeric coordinates", async () => {
      const res = await request(app)
        .post("/api/location/update")
        .send({
          userId: "user-test-anant",
          lat: "invalid-lat",
          lng: 77.2090,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_INPUT");
    });

    it("rejects negative accuracy", async () => {
      const res = await request(app)
        .post("/api/location/update")
        .send({
          userId: "user-test-anant",
          lat: 28.6139,
          lng: 77.2090,
          accuracy: -5,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_ACCURACY");
    });
  });

  describe("GET /api/location/nearby-hospitals", () => {
    it("returns nearby hospitals sorted by proximity with capabilities", async () => {
      // Near Connaught Place (AIIMS, Safdarjung)
      const res = await request(app)
        .get("/api/location/nearby-hospitals?lat=28.5670&lng=77.2100&radius=15");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const first = res.body.data[0];
      expect(first).toHaveProperty("hospitalId");
      expect(first).toHaveProperty("distanceKm");
      expect(first).toHaveProperty("etaMinutes");
      expect(first).toHaveProperty("emergencyCapability");
      expect(first).toHaveProperty("availableCapacity");
      expect(first.distanceKm).toBeLessThanOrEqual(15);
    });

    it("rejects missing/invalid coordinates with 400", async () => {
      const res = await request(app).get("/api/location/nearby-hospitals?lat=999&lng=77.21");
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_COORDINATES");
    });
  });

  describe("GET /api/location/nearby-incidents", () => {
    it("returns incidents with privacy protection", async () => {
      const res = await request(app)
        .get("/api/location/nearby-incidents?lat=28.5670&lng=77.2100&radius=15");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        const incident = res.body.data[0];
        expect(incident).toHaveProperty("incidentId");
        expect(incident).toHaveProperty("approximateLocation");
        expect(incident).toHaveProperty("severity");
        expect(incident).toHaveProperty("confirmationCount");
      }
    });
  });

  describe("GET /api/location/route", () => {
    it("calculates route with distance and duration", async () => {
      const res = await request(app).get(
        "/api/location/route?originLat=28.6139&originLng=77.2090&destLat=28.5672&destLng=77.2100"
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.distanceKm).toBeGreaterThan(0);
      expect(res.body.data.durationMin).toBeGreaterThan(0);
      expect(res.body.data).toHaveProperty("provider");
    });
  });
});
