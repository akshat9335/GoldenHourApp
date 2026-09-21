import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { dataStore } from "../src/models/dataStore";
import { registerUserProfile } from "../src/services/users/user.service";

// Mock Firebase verifyIdToken
const mockVerifyIdToken = vi.fn();
vi.mock("../src/config/firebase", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    auth: {
      verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
      createCustomToken: vi.fn().mockResolvedValue("mock-custom-token"),
    },
    firestore: null, // use in-memory store in tests
  };
});

const app = createApp();

describe("Admin Verification Module & Security Authorization", () => {
  const runId = Date.now();
  const patientUid = `sec-patient-${runId}`;
  const doctorUid = `sec-doc-${runId}`;
  const hospitalUid = `sec-hosp-${runId}`;
  const ambulanceUid = `sec-amb-${runId}`;
  const adminUid = `sec-admin-${runId}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Setup roles in dataStore
  it("0. Prepares seed user identities in dataStore", async () => {
    // 1. Patient
    await registerUserProfile(patientUid, { name: "Patient User", role: "PATIENT" });

    // 2. Doctor
    await registerUserProfile(doctorUid, {
      name: "Dr. Candidate",
      role: "DOCTOR",
      specialty: "Orthopedics",
      qualification: "MBBS, MS",
      licenseNumber: `KMC-SEC-${runId}`,
      clinicName: "Joint Care Clinic",
      consultationFee: 800,
    });

    // 3. Hospital
    await registerUserProfile(hospitalUid, {
      name: "City Hospital",
      role: "HOSPITAL",
      hospitalName: "City Care",
    });

    // 4. Ambulance Driver
    await registerUserProfile(ambulanceUid, {
      name: "Driver Joe",
      role: "AMBULANCE_DRIVER",
      driverId: `DL-${runId}`,
    });

    // 5. Admin profile set authoritatively in database
    dataStore.users.set(adminUid, {
      uid: adminUid,
      crisisId: `ADM-${runId.toString().slice(-4)}`,
      name: "System Administrator",
      role: "ADMIN",
      roles: ["ADMIN"],
      verificationStatus: "APPROVED",
      trustScore: 100,
    });
  });

  it("1. Public registration rejects self-assigning ADMIN role with 403", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: `hacker-${runId}` });

    const res = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer hacker-token")
      .send({
        name: "Wannabe Admin",
        role: "ADMIN",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("2. Patient attempting Admin API is rejected with 403", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: patientUid });

    const res = await request(app)
      .get("/api/admin/applications")
      .set("Authorization", "Bearer patient-token");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("3. Doctor attempting Admin API is rejected with 403", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: doctorUid });

    const res = await request(app)
      .get("/api/admin/doctors/pending")
      .set("Authorization", "Bearer doctor-token");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("4. Hospital attempting Admin API is rejected with 403", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: hospitalUid });

    const res = await request(app)
      .patch(`/api/admin/doctors/doc-${doctorUid}/verification`)
      .set("Authorization", "Bearer hospital-token")
      .send({ status: "APPROVED" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("5. Ambulance Driver attempting Admin API is rejected with 403", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: ambulanceUid });

    const res = await request(app)
      .get("/api/admin/applications")
      .set("Authorization", "Bearer ambulance-token");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("6. Unauthenticated request to Admin API is rejected with 401", async () => {
    const res = await request(app).get("/api/admin/applications");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("7. Authenticated Admin can list pending applications", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: adminUid });

    const res = await request(app)
      .get("/api/admin/applications")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const docApp = res.body.data.find((a: any) => a.userId === doctorUid);
    expect(docApp).toBeDefined();
    expect(docApp.role).toBe("DOCTOR");
    expect(docApp.verificationStatus).toBe("PENDING");
    expect(docApp.details.licenseNumber).toBe(`KMC-SEC-${runId}`);
  });

  it("8. Authenticated Admin can list pending doctors specifically", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: adminUid });

    const res = await request(app)
      .get("/api/admin/doctors/pending")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const pendingDoc = res.body.data.find((d: any) => d.userId === doctorUid);
    expect(pendingDoc).toBeDefined();
    expect(pendingDoc.verificationStatus).toBe("PENDING");
  });

  it("9. Non-admin is blocked from legacy PATCH /api/doctors/:id/verify with 403", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: patientUid });

    const res = await request(app)
      .patch(`/api/doctors/doc-${doctorUid}/verify`)
      .set("Authorization", "Bearer patient-token")
      .send({ status: "APPROVED" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("10. Admin approves doctor => updates doctor record to VERIFIED and user to APPROVED", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: adminUid });

    const res = await request(app)
      .patch(`/api/admin/doctors/doc-${doctorUid}/verification`)
      .set("Authorization", "Bearer admin-token")
      .send({ status: "APPROVED", notes: "Credentials verified with council" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationStatus).toBe("APPROVED");

    // Check doctor domain entity
    const docRecord = dataStore.doctors.get(`doc-${doctorUid}`);
    expect(docRecord?.verificationStatus).toBe("VERIFIED");
    expect(docRecord?.availability).toBe("AVAILABLE");

    // Check canonical user profile
    const userRecord = dataStore.users.get(doctorUid);
    expect(userRecord?.verificationStatus).toBe("APPROVED");
    expect(userRecord?.roleVerificationStatus?.DOCTOR).toBe("APPROVED");
  });

  it("11. Admin rejects another doctor => status becomes REJECTED and blocked", async () => {
    // Register another doctor to test rejection
    const doc2Uid = `sec-doc-rej-${runId}`;
    await registerUserProfile(doc2Uid, {
      name: "Dr. Fraudulent",
      role: "DOCTOR",
      specialty: "General",
      licenseNumber: `FAKE-LIC-${runId}`,
    });

    mockVerifyIdToken.mockResolvedValue({ uid: adminUid });

    const res = await request(app)
      .patch(`/api/admin/doctors/doc-${doc2Uid}/verification`)
      .set("Authorization", "Bearer admin-token")
      .send({ status: "REJECTED", notes: "Invalid council registration" });

    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe("REJECTED");

    // Verify rejection in database
    const docRecord = dataStore.doctors.get(`doc-${doc2Uid}`);
    expect(docRecord?.verificationStatus).toBe("REJECTED");

    const userRecord = dataStore.users.get(doc2Uid);
    expect(userRecord?.verificationStatus).toBe("REJECTED");
    expect(userRecord?.roleVerificationStatus?.DOCTOR).toBe("REJECTED");
  });
});
