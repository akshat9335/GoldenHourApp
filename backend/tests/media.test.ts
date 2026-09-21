import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

describe("Media Upload Endpoint (POST /api/media/upload)", () => {
  it("rejects request without media data payload with 400", async () => {
    const res = await request(app)
      .post("/api/media/upload")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_MEDIA_PAYLOAD");
  });

  it("handles valid base64 payload safely and returns media descriptor", async () => {
    // 1x1 transparent PNG base64
    const sampleBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    const res = await request(app)
      .post("/api/media/upload")
      .send({
        data: sampleBase64,
        fileName: "test_accident.png",
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("contentType");
    expect(res.body.data.contentType).toBe("image/png");
    expect(res.body.data).toHaveProperty("sizeBytes");
    expect(res.body.data.sizeBytes).toBeGreaterThan(0);
  });
});
