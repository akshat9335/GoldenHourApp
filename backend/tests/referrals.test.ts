import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/config/firebase", () => ({
  auth: {
    verifyIdToken: vi.fn(),
  },
  firestore: {
    collection: vi.fn(),
  },
}));

import { createApp } from "../src/app";
import { auth, firestore } from "../src/config/firebase";

const app = createApp();

const mockVerifyIdToken = vi.mocked(auth!.verifyIdToken);

// ============================================================
// FACILITY MATCHING
// ============================================================

describe("Facility Matching", () => {
  it("rejects matching request without authentication", async () => {
    const res = await request(app).post("/api/hospitals/matching").send({
      emergencyRequired: true,
      icuRequired: true,
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("returns matching facilities for authenticated hospital", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "hospital-user-001",
      email: "hospital@test.com",
      role: "hospital",
    } as any);

    const mockCurrentHospitalGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "hospital-001",
          data: () => ({
            hospitalId: "hospital-001",
            ownerUid: "hospital-user-001",
            name: "Current Hospital",
            emergencyCapability: true,
          }),
        },
      ],
    });

    const mockHospitalsGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "hospital-001",
          data: () => ({
            hospitalId: "hospital-001",
            ownerUid: "hospital-user-001",
            name: "Current Hospital",
            emergencyCapability: true,
          }),
        },
        {
          id: "hospital-002",
          data: () => ({
            hospitalId: "hospital-002",
            ownerUid: "hospital-user-002",
            name: "City Emergency Hospital",
            emergencyCapability: true,
          }),
        },
        {
          id: "hospital-003",
          data: () => ({
            hospitalId: "hospital-003",
            ownerUid: "hospital-user-003",
            name: "Normal Hospital",
            emergencyCapability: false,
          }),
        },
      ],
    });

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockCurrentHospitalGet,
        }),
      }),
      get: mockHospitalsGet,
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .post("/api/hospitals/matching")
      .set("Authorization", "Bearer fake-token")
      .send({
        emergencyRequired: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].hospitalId).toBe("hospital-002");
    expect(res.body.data[0].name).toBe("City Emergency Hospital");
    expect(res.body.data[0].emergencyCapability).toBe(true);

    expect(mockCurrentHospitalGet).toHaveBeenCalled();
    expect(mockHospitalsGet).toHaveBeenCalled();
  });
});

// ============================================================
// HOSPITAL REFERRAL - CREATE
// ============================================================

describe("Hospital Referral Creation", () => {
  it("rejects referral creation without authentication", async () => {
    const res = await request(app).post("/api/hospitals/referrals").send({
      emergencyRequestId: "request-001",
      referredHospitalId: "hospital-002",
      reason: "ICU unavailable",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("creates a referral for the authenticated hospital", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "hospital-user-001",
      email: "hospital@test.com",
      role: "hospital",
    } as any);

    const mockHospitalGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "hospital-001",
          data: () => ({
            hospitalId: "hospital-001",
            ownerUid: "hospital-user-001",
          }),
        },
      ],
    });

    const mockSet = vi.fn().mockResolvedValue(undefined);

    const mockDoc = vi.fn().mockReturnValue({
      id: "referral-001",
      set: mockSet,
    });

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    const mockReferralCollection = {
      doc: mockDoc,
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalReferrals") {
        return mockReferralCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .post("/api/hospitals/referrals")
      .set("Authorization", "Bearer fake-token")
      .send({
        emergencyRequestId: "request-001",
        referredHospitalId: "hospital-002",
        reason: "ICU unavailable",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    expect(res.body.data.referralId).toBe("referral-001");
    expect(res.body.data.emergencyRequestId).toBe("request-001");
    expect(res.body.data.fromHospitalId).toBe("hospital-001");
    expect(res.body.data.referredHospitalId).toBe("hospital-002");
    expect(res.body.data.reason).toBe("ICU unavailable");
    expect(res.body.data.status).toBe("PENDING");

    expect(mockSet).toHaveBeenCalled();

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        referralId: "referral-001",
        emergencyRequestId: "request-001",
        fromHospitalId: "hospital-001",
        referredHospitalId: "hospital-002",
        reason: "ICU unavailable",
        status: "PENDING",
      }),
    );
  });

  it("rejects referral to the same hospital", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "hospital-user-001",
      email: "hospital@test.com",
      role: "hospital",
    } as any);

    const mockHospitalGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "hospital-001",
          data: () => ({
            hospitalId: "hospital-001",
            ownerUid: "hospital-user-001",
          }),
        },
      ],
    });

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .post("/api/hospitals/referrals")
      .set("Authorization", "Bearer fake-token")
      .send({
        emergencyRequestId: "request-001",
        referredHospitalId: "hospital-001",
        reason: "Need referral",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_REFERRAL_TARGET");
  });

  it("rejects referral with missing required data", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "hospital-user-001",
      email: "hospital@test.com",
      role: "hospital",
    } as any);

    const mockHospitalGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "hospital-001",
          data: () => ({
            hospitalId: "hospital-001",
            ownerUid: "hospital-user-001",
          }),
        },
      ],
    });

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .post("/api/hospitals/referrals")
      .set("Authorization", "Bearer fake-token")
      .send({
        emergencyRequestId: "",
        referredHospitalId: "",
        reason: "",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_REFERRAL_DATA");
  });
});

// ============================================================
// HOSPITAL REFERRALS - GET ALL
// ============================================================

describe("Hospital Referrals", () => {
  it("rejects referral request without authentication", async () => {
    const res = await request(app).get("/api/hospitals/referrals");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("returns referrals for the authenticated hospital", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "hospital-user-001",
      email: "hospital@test.com",
      role: "hospital",
    } as any);

    const mockHospitalGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "hospital-001",
          data: () => ({
            hospitalId: "hospital-001",
            ownerUid: "hospital-user-001",
          }),
        },
      ],
    });

    const referrals = [
      {
        id: "referral-001",
        emergencyRequestId: "request-001",
        fromHospitalId: "hospital-001",
        referredHospitalId: "hospital-002",
        reason: "ICU unavailable",
        status: "PENDING",
      },
      {
        id: "referral-002",
        emergencyRequestId: "request-002",
        fromHospitalId: "hospital-001",
        referredHospitalId: "hospital-003",
        reason: "Specialist unavailable",
        status: "ACCEPTED",
      },
    ];

    const mockReferralsGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: referrals.map((referral) => ({
        id: referral.id,
        data: () => ({
          emergencyRequestId: referral.emergencyRequestId,
          fromHospitalId: referral.fromHospitalId,
          referredHospitalId: referral.referredHospitalId,
          reason: referral.reason,
          status: referral.status,
        }),
      })),
    });

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    const mockReferralCollection = {
      where: vi.fn().mockReturnValue({
        get: mockReferralsGet,
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalReferrals") {
        return mockReferralCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .get("/api/hospitals/referrals")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data).toHaveLength(2);

    expect(res.body.data[0].referralId).toBe("referral-001");
    expect(res.body.data[0].emergencyRequestId).toBe("request-001");
    expect(res.body.data[0].referredHospitalId).toBe("hospital-002");
    expect(res.body.data[0].status).toBe("PENDING");

    expect(res.body.data[1].referralId).toBe("referral-002");
    expect(res.body.data[1].referredHospitalId).toBe("hospital-003");
    expect(res.body.data[1].status).toBe("ACCEPTED");

    expect(mockReferralsGet).toHaveBeenCalled();
  });
});
