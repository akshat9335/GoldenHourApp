import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Firebase Admin Auth & Firestore for hermetic test execution
const { mockVerifyIdToken, mockFirestoreUsers, mockFirestoreDoctors, mockFirestoreHospitals, mockFirestoreDrivers } = vi.hoisted(() => {
  const mockVerifyIdToken = vi.fn();
  const mockFirestoreUsers = new Map<string, any>();
  const mockFirestoreDoctors = new Map<string, any>();
  const mockFirestoreHospitals = new Map<string, any>();
  const mockFirestoreDrivers = new Map<string, any>();

  return {
    mockVerifyIdToken,
    mockFirestoreUsers,
    mockFirestoreDoctors,
    mockFirestoreHospitals,
    mockFirestoreDrivers,
  };
});

vi.mock("../src/config/firebase", () => ({
  auth: {
    verifyIdToken: mockVerifyIdToken,
    createCustomToken: vi.fn(async (uid, claims) => `custom-token-${uid}-${JSON.stringify(claims)}`),
  },
  firestore: {
    collection: (col: string) => ({
      doc: (id: string) => ({
        get: vi.fn(async () => {
          let data: any;
          if (col === "users") data = mockFirestoreUsers.get(id);
          else if (col === "doctors") data = mockFirestoreDoctors.get(id);
          else if (col === "hospitals") data = mockFirestoreHospitals.get(id);
          else if (col === "drivers") data = mockFirestoreDrivers.get(id);
          return {
            exists: Boolean(data),
            data: () => data,
          };
        }),
        set: vi.fn(async (val: any) => {
          if (col === "users") mockFirestoreUsers.set(id, val);
          else if (col === "doctors") mockFirestoreDoctors.set(id, val);
          else if (col === "hospitals") mockFirestoreHospitals.set(id, val);
          else if (col === "drivers") mockFirestoreDrivers.set(id, val);
        }),
      }),
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: vi.fn(async () => ({ empty: true, docs: [] })),
        })),
      })),
    }),
  },
  assertFirebaseReady: vi.fn(),
}));

import request from "supertest";
import { createApp } from "../src/app";
import { dataStore } from "../src/models/dataStore";

const app = createApp();

describe("Module 1: Authentication Foundation & Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestoreUsers.clear();
    mockFirestoreDoctors.clear();
    mockFirestoreHospitals.clear();
    mockFirestoreDrivers.clear();
    dataStore.users.clear();
  });

  // 1. Missing token → 401
  it("1. Missing token returns 401 UNAUTHORIZED", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  // 2. Invalid token → 401
  it("2. Invalid/expired token returns 401 INVALID_TOKEN", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("Firebase token expired"));

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer invalid-or-expired-token");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  // 3. Valid Firebase token → authenticated
  it("3. Valid Firebase token authenticates request", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "firebase-user-valid",
      email: "valid@user.com",
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.uid).toBe("firebase-user-valid");
  });

  // 4. UID comes from verified token
  it("4. UID strictly comes from the verified token", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "canonical-token-uid",
      email: "test@user.com",
    });

    const res = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "Test User",
        role: "PATIENT",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.uid).toBe("canonical-token-uid");
  });

  // 5. Client UID cannot override token UID
  it("5. Client UID in request body cannot override verified token UID", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "token-uid-actual",
      email: "actual@user.com",
    });

    const res = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        uid: "attacker-spoofed-uid",
        name: "Malicious Actor",
        role: "PATIENT",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.uid).toBe("token-uid-actual");
    expect(res.body.data.uid).not.toBe("attacker-spoofed-uid");
  });

  // 6. Client role cannot elevate privileges
  it("6. Client cannot elevate privileges or register as ADMIN", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "token-uid-admin-attempt",
      email: "hacker@user.com",
    });

    const res = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "Privilege Escalation",
        role: "ADMIN",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // 7. Client verificationStatus cannot force APPROVED
  it("7. Client verificationStatus cannot force APPROVED on professional registration", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "doctor-uid-tamper",
      email: "doctor@hospital.com",
    });

    const res = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "Dr. Tamper",
        role: "DOCTOR",
        verificationStatus: "APPROVED", // Malicious attempt to force approved
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("DOCTOR");
    expect(res.body.data.verificationStatus).toBe("PENDING");
  });

  // 8. Patient registration → PATIENT + APPROVED
  it("8. Patient registration creates role=PATIENT and verificationStatus=APPROVED", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "patient-uid-123",
      email: "patient@test.com",
    });

    const res = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "Ramesh Kumar",
        role: "PATIENT",
        phone: "+919876543210",
        bloodGroup: "O+",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("PATIENT");
    expect(res.body.data.verificationStatus).toBe("APPROVED");
    expect(res.body.data.crisisId).toBeDefined();
  });

  // 9. Doctor registration → DOCTOR + PENDING
  it("9. Doctor registration creates role=DOCTOR and verificationStatus=PENDING", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "doc-uid-456",
      email: "dr.anita@test.com",
    });

    const res = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "Dr. Anita Roy",
        role: "DOCTOR",
        licenseNumber: "KMC-9988",
        specialty: "Cardiologist",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("DOCTOR");
    expect(res.body.data.verificationStatus).toBe("PENDING");
  });

  // 10. Hospital registration → HOSPITAL + PENDING
  it("10. Hospital registration creates role=HOSPITAL and verificationStatus=PENDING", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "hosp-uid-789",
      email: "admin@citycare.com",
    });

    const res = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "CityCare Hospital",
        role: "HOSPITAL",
        hospitalRegNumber: "HOSP-REG-101",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("HOSPITAL");
    expect(res.body.data.verificationStatus).toBe("PENDING");
  });

  // 11. Ambulance driver registration → PENDING
  it("11. Ambulance driver registration creates role=AMBULANCE_DRIVER and verificationStatus=PENDING", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "driver-uid-101",
      email: "driver@emergency.com",
    });

    const res = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "Suresh Driver",
        role: "AMBULANCE_DRIVER",
        driverId: "AMB-014",
        ambulanceId: "KA-05-AB-1234",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("AMBULANCE_DRIVER");
    expect(res.body.data.verificationStatus).toBe("PENDING");
  });

  // 12. Frontline worker registration → PENDING
  it("12. Frontline worker registration creates role=FRONTLINE_WORKER and verificationStatus=PENDING", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "asha-uid-202",
      email: "asha@health.gov",
    });

    const res = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "Sunita Devi",
        role: "FRONTLINE_WORKER",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("FRONTLINE_WORKER");
    expect(res.body.data.verificationStatus).toBe("PENDING");
  });

  // 13. Admin public registration rejected
  it("13. Public registration as ADMIN is rejected with 403 FORBIDDEN", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: "unauth-admin",
      email: "admin@fake.com",
    });

    const res = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "Fake Admin",
        role: "ADMIN",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // 14. Duplicate registration prevented
  it("14. Duplicate registration for same UID is prevented with 409", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "user-duplicate-check",
      email: "dup@user.com",
    });

    // First registration
    const res1 = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "First Time",
        role: "PATIENT",
      });
    expect(res1.status).toBe(201);

    // Second registration with same UID
    const res2 = await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "Second Time",
        role: "PATIENT",
      });
    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe("USER_ALREADY_EXISTS");
  });

  // 15. /api/users/me returns authenticated user's profile
  it("15. /api/users/me returns authenticated user's canonical profile", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "user-registered-me",
      email: "me@goldenhour.app",
    });

    // Register user
    await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "Akshat Registered",
        role: "PATIENT",
        phone: "+919876500000",
      });

    // Query /me
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.data.uid).toBe("user-registered-me");
    expect(res.body.data.name).toBe("Akshat Registered");
    expect(res.body.data.role).toBe("PATIENT");
    expect(res.body.data.exists).toBe(true);
  });

  // 16. Doctor authorization enforced
  it("16. Doctor authorization enforced: patient cannot access doctor /me", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "patient-cant-access-doc",
      email: "patient@test.com",
    });

    // Register as patient
    await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Patient Only", role: "PATIENT" });

    // Attempt doctor route
    const res = await request(app)
      .get("/api/doctors/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // 17. Hospital authorization enforced
  it("17. Hospital authorization enforced: patient cannot access hospital /me", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "patient-cant-access-hosp",
      email: "patient@test.com",
    });

    await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Patient Only", role: "PATIENT" });

    const res = await request(app)
      .get("/api/hospitals/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // 18. Ambulance authorization enforced
  it("18. Ambulance authorization enforced: patient cannot access ambulance /drivers/me", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "patient-cant-access-amb",
      email: "patient@test.com",
    });

    await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Patient Only", role: "PATIENT" });

    const res = await request(app)
      .get("/api/ambulances/drivers/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // 19. Pending professional blocked from approved-only endpoint
  it("19. Pending doctor blocked from setting availability to AVAILABLE", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "doctor-pending-blocked",
      email: "doc.pending@test.com",
    });

    // Register as doctor (status = PENDING)
    await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "Dr. Pending",
        role: "DOCTOR",
        licenseNumber: "LIC-PENDING-TEST",
      });

    // Attempt to set availability to AVAILABLE
    const res = await request(app)
      .patch("/api/doctors/me/availability")
      .set("Authorization", "Bearer valid-token")
      .send({ availability: "AVAILABLE" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("VERIFICATION_PENDING");
  });

  // 20. Rejected professional blocked from approved-only endpoint
  it("20. Rejected doctor blocked from approved-only actions", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "doctor-rejected-blocked",
      email: "doc.rejected@test.com",
    });

    // Register as doctor
    await request(app)
      .post("/api/users/register")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "Dr. Rejected",
        role: "DOCTOR",
        licenseNumber: "LIC-REJECTED-TEST",
      });

    // Set verificationStatus to REJECTED in store
    const profile = dataStore.users.get("doctor-rejected-blocked");
    profile.verificationStatus = "REJECTED";

    // Attempt action
    const res = await request(app)
      .patch("/api/doctors/me/availability")
      .set("Authorization", "Bearer valid-token")
      .send({ availability: "AVAILABLE" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("VERIFICATION_REJECTED");
  });
});
