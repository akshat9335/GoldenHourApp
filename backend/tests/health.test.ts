import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

// This suite must pass with ZERO external configuration - no Gemini,
// no Google Maps, no Twilio, no Firebase credentials required.
const app = createApp();

describe("GET /api/health", () => {
  it("returns 200 with a standard success envelope", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.service).toBe("golden-hour-backend");
    expect(typeof res.body.message).toBe("string");
  });
});

describe("Unknown routes", () => {
  it("returns a standard 404 error envelope", async () => {
    const res = await request(app).get("/api/this-route-does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("Auth-protected paths (foundation only)", () => {
  it("rejects requests with no Authorization header via requireAuth-style 401 shape", async () => {
    // No protected route is wired up yet in this foundation, so this
    // test only asserts the error envelope shape stays consistent for
    // a generic 404 on an imagined protected path - it documents intent
    // for feature owners without depending on unimplemented routes.
    const res = await request(app).get("/api/users/me");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });
});
