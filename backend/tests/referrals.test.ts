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

  it("returns matching facilities for authenticated verified hospital", async () => {
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
            verificationStatus: "VERIFIED",
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
            verificationStatus: "VERIFIED",
          }),
        },
        {
          id: "hospital-002",
          data: () => ({
            hospitalId: "hospital-002",
            ownerUid: "hospital-user-002",
            name: "City Emergency Hospital",
            emergencyCapability: true,
            verificationStatus: "VERIFIED",
          }),
        },
        {
          id: "hospital-003",
          data: () => ({
            hospitalId: "hospital-003",
            ownerUid: "hospital-user-003",
            name: "Normal Hospital",
            emergencyCapability: false,
            verificationStatus: "VERIFIED",
          }),
        },
        {
          id: "hospital-004",
          data: () => ({
            hospitalId: "hospital-004",
            ownerUid: "hospital-user-004",
            name: "Pending Hospital",
            emergencyCapability: true,
            verificationStatus: "PENDING",
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
    expect(res.body.data[0].verificationStatus).toBe("VERIFIED");

    expect(mockCurrentHospitalGet).toHaveBeenCalled();
    expect(mockHospitalsGet).toHaveBeenCalled();
  });

  it("rejects facility matching for an unverified hospital", async () => {
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
            verificationStatus: "PENDING",
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

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("HOSPITAL_NOT_VERIFIED");
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

  it("creates a referral for the authenticated verified hospital", async () => {
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
            verificationStatus: "VERIFIED",
          }),
        },
      ],
    });

    // --------------------------------------------------------
    // NEW: emergency request mock
    // --------------------------------------------------------

    const mockRequestGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "request-001",
      data: () => ({
        hospitalId: "hospital-001",
        status: "IN TREATMENT",
      }),
    });

    const mockTargetHospitalGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "hospital-002",
      data: () => ({
        hospitalId: "hospital-002",
        ownerUid: "hospital-user-002",
        name: "Target Hospital",
        verificationStatus: "VERIFIED",
      }),
    });

    const mockSet = vi.fn().mockResolvedValue(undefined);

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
      doc: vi.fn().mockReturnValue({
        get: mockTargetHospitalGet,
      }),
    };

    const mockRequestCollection = {
      doc: vi.fn().mockReturnValue({
        get: mockRequestGet,
      }),
    };

    const mockReferralCollection = {
      doc: vi.fn().mockReturnValue({
        id: "referral-001",
        set: mockSet,
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalEmergencyRequests") {
        return mockRequestCollection as any;
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

    expect(mockRequestGet).toHaveBeenCalled();
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
            verificationStatus: "VERIFIED",
          }),
        },
      ],
    });

    // --------------------------------------------------------
    // Request must exist before self-referral check
    // --------------------------------------------------------

    const mockRequestGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "request-001",
      data: () => ({
        hospitalId: "hospital-001",
        status: "IN TREATMENT",
      }),
    });

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    const mockRequestCollection = {
      doc: vi.fn().mockReturnValue({
        get: mockRequestGet,
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalEmergencyRequests") {
        return mockRequestCollection as any;
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
            verificationStatus: "VERIFIED",
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

  it("rejects referral to a non-existent target hospital", async () => {
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
            verificationStatus: "VERIFIED",
          }),
        },
      ],
    });

    // --------------------------------------------------------
    // Request must exist before target hospital check
    // --------------------------------------------------------

    const mockRequestGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "request-001",
      data: () => ({
        hospitalId: "hospital-001",
        status: "IN TREATMENT",
      }),
    });

    const mockTargetHospitalGet = vi.fn().mockResolvedValue({
      exists: false,
      id: "hospital-999",
      data: () => undefined,
    });

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
      doc: vi.fn().mockReturnValue({
        get: mockTargetHospitalGet,
      }),
    };

    const mockRequestCollection = {
      doc: vi.fn().mockReturnValue({
        get: mockRequestGet,
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalEmergencyRequests") {
        return mockRequestCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .post("/api/hospitals/referrals")
      .set("Authorization", "Bearer fake-token")
      .send({
        emergencyRequestId: "request-001",
        referredHospitalId: "hospital-999",
        reason: "Need specialist",
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("TARGET_HOSPITAL_NOT_FOUND");
  });
});

// ============================================================
// EXACT A-Z REFERRAL ENDPOINT
// ============================================================

describe("Hospital Emergency Request Referral", () => {
  it("creates a referral through the exact request referral endpoint", async () => {
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
            verificationStatus: "VERIFIED",
          }),
        },
      ],
    });

    const mockRequestGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "request-001",
      data: () => ({
        hospitalId: "hospital-001",
        status: "IN TREATMENT",
      }),
    });

    const mockTargetHospitalGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "hospital-002",
      data: () => ({
        hospitalId: "hospital-002",
        ownerUid: "hospital-user-002",
        name: "Target Hospital",
        verificationStatus: "VERIFIED",
      }),
    });

    const mockSet = vi.fn().mockResolvedValue(undefined);

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
      doc: vi.fn().mockReturnValue({
        get: mockTargetHospitalGet,
      }),
    };

    const mockRequestCollection = {
      doc: vi.fn().mockReturnValue({
        get: mockRequestGet,
      }),
    };

    const mockReferralCollection = {
      doc: vi.fn().mockReturnValue({
        id: "referral-002",
        set: mockSet,
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalEmergencyRequests") {
        return mockRequestCollection as any;
      }

      if (collectionName === "hospitalReferrals") {
        return mockReferralCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .post("/api/hospitals/requests/request-001/referral")
      .set("Authorization", "Bearer fake-token")
      .send({
        referredHospitalId: "hospital-002",
        reason: "Advanced trauma facility required",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    expect(res.body.data.referralId).toBe("referral-002");
    expect(res.body.data.emergencyRequestId).toBe("request-001");
    expect(res.body.data.fromHospitalId).toBe("hospital-001");
    expect(res.body.data.referredHospitalId).toBe("hospital-002");
    expect(res.body.data.reason).toBe("Advanced trauma facility required");
    expect(res.body.data.status).toBe("PENDING");

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        referralId: "referral-002",
        emergencyRequestId: "request-001",
        fromHospitalId: "hospital-001",
        referredHospitalId: "hospital-002",
        reason: "Advanced trauma facility required",
        status: "PENDING",
      }),
    );
  });

  it("rejects exact request referral without authentication", async () => {
    const res = await request(app)
      .post("/api/hospitals/requests/request-001/referral")
      .send({
        referredHospitalId: "hospital-002",
        reason: "Need advanced treatment",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects exact request referral when the request belongs to another hospital", async () => {
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
            verificationStatus: "VERIFIED",
          }),
        },
      ],
    });

    const mockRequestGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "request-002",
      data: () => ({
        hospitalId: "hospital-002",
        status: "IN TREATMENT",
      }),
    });

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    const mockRequestCollection = {
      doc: vi.fn().mockReturnValue({
        get: mockRequestGet,
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalEmergencyRequests") {
        return mockRequestCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .post("/api/hospitals/requests/request-002/referral")
      .set("Authorization", "Bearer fake-token")
      .send({
        referredHospitalId: "hospital-003",
        reason: "Need advanced treatment",
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("REQUEST_ACCESS_DENIED");
  });

  it("rejects exact request referral with missing reason", async () => {
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
            verificationStatus: "VERIFIED",
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
      .post("/api/hospitals/requests/request-001/referral")
      .set("Authorization", "Bearer fake-token")
      .send({
        referredHospitalId: "hospital-002",
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

  it("returns referrals for the authenticated verified hospital", async () => {
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
            verificationStatus: "VERIFIED",
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

  it("rejects referral list for an unverified hospital", async () => {
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
            verificationStatus: "PENDING",
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
      .get("/api/hospitals/referrals")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("HOSPITAL_NOT_VERIFIED");
  });
});
