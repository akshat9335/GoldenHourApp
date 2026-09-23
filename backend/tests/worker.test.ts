import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { dataStore } from "../src/models/dataStore";

const app = createApp();

describe("ASHA / ANM Frontline Worker Module (/api/worker)", () => {
  it("GET /api/worker/stats - returns summary metrics for ASHA dashboard", async () => {
    const res = await request(app).get("/api/worker/stats");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("totalPatients");
    expect(res.body.data).toHaveProperty("scheduledVisitsToday");
    expect(res.body.data).toHaveProperty("pendingReferrals");
    expect(res.body.data.totalPatients).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/worker/patients - registers a rural community patient with Crisis ID", async () => {
    const payload = {
      name: "Radhika Devi",
      age: 24,
      gender: "FEMALE",
      phone: "9918273645",
      villageOrArea: "Naini Sub-Center Sector 4",
      bloodGroup: "O+",
      knownConditions: ["High Risk Pregnancy"],
      isPregnant: true,
      expectedDeliveryDate: "20/12/2026",
    };

    const res = await request(app).post("/api/worker/patients").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Radhika Devi");
    expect(res.body.data.crisisId).toMatch(/^CR-/);
    expect(res.body.data.isPregnant).toBe(true);
  });

  it("GET /api/worker/patients - retrieves registered community patients", async () => {
    const res = await request(app).get("/api/worker/patients");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/worker/visits - records home visit with vital signs and AI triage", async () => {
    const payload = {
      patientId: "pat-seed-01",
      patientName: "Sunita Devi",
      vitals: {
        bloodPressure: "120/80",
        pulse: 76,
        spO2: 99,
        temperature: 36.6,
        bloodSugar: 90,
      },
      symptoms: "Normal follow up, taking prescribed iron tablets",
      aiTriageSeverity: "NORMAL",
      aiGuidanceInHindi: "स्वास्थ्य सामान्य है। नियमित जांच जारी रखें।",
      syncedFromOffline: true,
    };

    const res = await request(app).post("/api/worker/visits").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.patientId).toBe("pat-seed-01");
    expect(res.body.data.aiTriageSeverity).toBe("NORMAL");
    expect(res.body.data.syncedFromOffline).toBe(true);
  });

  it("GET /api/worker/patients/:id - gets patient detail with visits and referrals", async () => {
    const res = await request(app).get("/api/worker/patients/pat-seed-01");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.patient.id).toBe("pat-seed-01");
    expect(Array.isArray(res.body.data.visits)).toBe(true);
  });

  it("POST /api/worker/referrals - transmits digital frontline referral to PHC/Hospital", async () => {
    const payload = {
      patientId: "pat-seed-01",
      patientName: "Sunita Devi",
      patientAge: 26,
      patientGender: "FEMALE",
      destinationFacility: "Naini Primary Health Centre (PHC)",
      priority: "MODERATE",
      reason: "Antenatal screening and ultrasound evaluation",
      vitalsSnapshot: {
        bloodPressure: "120/80",
        pulse: 76,
        spO2: 99,
      },
    };

    const res = await request(app).post("/api/worker/referrals").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.referralCode).toMatch(/^REF-ASHA-/);
    expect(res.body.data.status).toBe("PENDING");
  });

  it("POST /api/worker/sync - batch syncs multiple offline visits", async () => {
    const batchPayload = {
      visits: [
        {
          patientId: "pat-seed-03",
          patientName: "Meera Devi",
          vitals: { bloodPressure: "118/76", pulse: 74, spO2: 98 },
          symptoms: "Routine post-partum check",
          aiTriageSeverity: "NORMAL",
          visitDate: new Date().toISOString(),
        },
      ],
    };

    const res = await request(app).post("/api/worker/sync").send(batchPayload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.synced).toBe(1);
    expect(res.body.data.failed).toBe(0);
  });
});
