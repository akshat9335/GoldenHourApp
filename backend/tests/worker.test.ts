import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { dataStore } from "../src/models/dataStore";

const app = createApp();

describe("ASHA / Frontline Worker Routes", () => {
  beforeEach(() => {
    dataStore.communityPatients.clear();
    dataStore.communityVisits.clear();
    dataStore.communityReferrals.clear();
  });

  it("should register and retrieve a community patient without phone", async () => {
    const patientData = {
      id: "pat-test-001",
      crisisId: "CR-TEST01",
      workerUid: "asha-worker-local",
      name: "Sunita Devi",
      age: 28,
      gender: "FEMALE",
      villageOrArea: "Rampur Sub-Center",
      isPregnant: true,
      expectedDeliveryDate: "15/11/2026",
      knownConditions: ["Chronic BP"],
    };

    const resPost = await request(app)
      .post("/api/worker/patients")
      .send(patientData);

    expect(resPost.status).toBe(201);
    expect(resPost.body.success).toBe(true);
    expect(resPost.body.data.name).toBe("Sunita Devi");

    // Retrieve single patient
    const resGet = await request(app).get("/api/worker/patients/pat-test-001");
    expect(resGet.status).toBe(200);
    expect(resGet.body.data.villageOrArea).toBe("Rampur Sub-Center");
    expect(resGet.body.data.isPregnant).toBe(true);
  });

  it("should record a home visit with vitals, triage and follow-up", async () => {
    // Seed patient
    dataStore.communityPatients.set("pat-test-002", {
      id: "pat-test-002",
      crisisId: "CR-TEST02",
      workerUid: "asha-worker-local",
      name: "Ram Lal",
      age: 62,
      gender: "MALE",
      villageOrArea: "Kisan Nagar",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const visitData = {
      id: "visit-test-001",
      patientId: "pat-test-002",
      patientName: "Ram Lal",
      workerUid: "asha-worker-local",
      vitals: {
        bloodPressure: "140/90",
        pulse: 82,
        spO2: 95,
        temperature: 98.6,
      },
      symptoms: "Mild fever and joint pain",
      aiTriageSeverity: "MODERATE",
      followUpRequired: true,
      followUpDate: "28/09/2026",
    };

    const resPost = await request(app)
      .post("/api/worker/visits")
      .send(visitData);

    expect(resPost.status).toBe(201);
    expect(resPost.body.success).toBe(true);
    expect(resPost.body.data.aiTriageSeverity).toBe("MODERATE");

    // Verify patient's followUpDate got updated
    const updatedPatient = dataStore.communityPatients.get("pat-test-002");
    expect(updatedPatient?.followUpRequired).toBe(true);
    expect(updatedPatient?.followUpDate).toBe("28/09/2026");

    // List visits for patient
    const resList = await request(app)
      .get("/api/worker/visits?patientId=pat-test-002");
    expect(resList.status).toBe(200);
    expect(resList.body.data.length).toBe(1);
    expect(resList.body.data[0].vitals.pulse).toBe(82);
  });

  it("should create a referral for a patient to a PHC/Hospital", async () => {
    const referralData = {
      id: "ref-test-001",
      patientId: "pat-test-003",
      patientName: "Geeta Bai",
      workerUid: "asha-worker-local",
      facilityId: "hosp-phc-rampur",
      facilityName: "Rampur Primary Health Centre (PHC)",
      reason: "High blood pressure during third trimester",
      priority: "HIGH",
    };

    const resPost = await request(app)
      .post("/api/worker/referrals")
      .send(referralData);

    expect(resPost.status).toBe(201);
    expect(resPost.body.success).toBe(true);
    expect(resPost.body.data.facilityName).toBe("Rampur Primary Health Centre (PHC)");

    // List referrals
    const resList = await request(app).get("/api/worker/referrals?patientId=pat-test-003");
    expect(resList.status).toBe(200);
    expect(resList.body.data.length).toBe(1);
    expect(resList.body.data[0].priority).toBe("HIGH");
  });
});
