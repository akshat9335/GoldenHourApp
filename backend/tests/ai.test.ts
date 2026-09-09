import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { analyzeEmergency } from "../src/services/ai/aiService";
import { mockCases } from "../src/data/ai/mockCases";
import { parseTriageResponse } from "../src/services/ai/aiParser";

const app = createApp();
const originalMode = process.env.AI_MODE;
const originalKey = process.env.GEMINI_API_KEY;
const originalTimeout = process.env.AI_TIMEOUT_MS;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalMode === undefined) delete process.env.AI_MODE;
  else process.env.AI_MODE = originalMode;
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  if (originalTimeout === undefined) delete process.env.AI_TIMEOUT_MS;
  else process.env.AI_TIMEOUT_MS = originalTimeout;
});

describe("AI emergency triage", () => {
  it("classifies the supplied mock emergency cases deterministically", async () => {
    process.env.AI_MODE = "mock";
    for (const emergencyCase of mockCases) {
      const result = await analyzeEmergency(emergencyCase.input);
      expect(result.severity, emergencyCase.id).toBe(emergencyCase.expectedSeverity);
      expect(result.source).toBe("mock");
      expect(result.immediateActions.length).toBeGreaterThan(0);
      expect(result.disclaimer).toContain("not a medical diagnosis");
    }
  });

  it("always applies critical safety rules over a provider result", async () => {
    process.env.AI_MODE = "live";
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        severity: "LOW",
                        emergencyType: "minor issue",
                        confidence: 0.99,
                        immediateActions: ["rest"],
                        avoidActions: [],
                        hospitalRequired: false,
                        ambulanceRecommended: false,
                        explanation: "provider",
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const result = await analyzeEmergency({
      symptoms: [],
      consciousness: "unconscious",
    });
    expect(result.severity).toBe("CRITICAL");
    expect(result.ambulanceRecommended).toBe(true);
    expect(result.source).toBe("gemini");
  });

  it("uses a safe fallback when live Gemini is unavailable", async () => {
    process.env.AI_MODE = "live";
    delete process.env.GEMINI_API_KEY;
    const result = await analyzeEmergency({ symptoms: ["chest pain"] });
    expect(result.source).toBe("fallback");
    expect(result.severity).toBe("HIGH");
    expect(result.immediateActions.length).toBeGreaterThan(0);
  });

  it("falls back when the Gemini request times out", async () => {
    process.env.AI_MODE = "live";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.AI_TIMEOUT_MS = "5";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, options: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener("abort", () =>
              reject(new Error("aborted")),
            );
          }),
      ),
    );
    const result = await analyzeEmergency({ symptoms: ["minor scratch"] });
    expect(result.source).toBe("fallback");
    expect(result.severity).toBe("LOW");
  });

  it("rejects invalid input and malformed provider JSON", async () => {
    await expect(analyzeEmergency({ symptoms: "chest pain" })).rejects.toMatchObject({
      code: "INVALID_AI_INPUT",
      statusCode: 400,
    });
    expect(() =>
      parseTriageResponse("The patient seems serious, but no JSON was returned."),
    ).toThrow();
  });
});

describe("AI routes", () => {
  it("returns standardized envelopes for triage, first aid, and image analysis", async () => {
    process.env.AI_MODE = "mock";
    const triage = await request(app)
      .post("/api/ai/triage")
      .send({ symptoms: ["minor scratch"] });
    expect(triage.status).toBe(200);
    expect(triage.body.success).toBe(true);
    expect(triage.body.data.source).toBe("mock");

    const firstAid = await request(app)
      .post("/api/ai/first-aid")
      .send({ injuryType: "burn" });
    expect(firstAid.status).toBe(200);
    expect(firstAid.body.success).toBe(true);
    expect(firstAid.body.data.steps.length).toBeGreaterThan(0);

    const image = await request(app)
      .post("/api/ai/image-analysis")
      .send({ imageBase64: "aaaaaaaaaaaaaaaaaaaa", mimeType: "image/png" });
    expect(image.status).toBe(200);
    expect(image.body.success).toBe(true);
    expect(image.body.data.requiresProfessionalAssessment).toBe(true);
  });

  it("returns a standard validation error envelope", async () => {
    const response = await request(app)
      .post("/api/ai/triage")
      .send({ symptoms: "not-an-array" });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("INVALID_AI_INPUT");
  });
});
