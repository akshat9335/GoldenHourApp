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

describe("Hospital Registration", () => {
  it("rejects registration without authentication", async () => {
    const res = await request(app)
      .post("/api/hospitals/register")
      .send({
        name: "Test Hospital",
        registrationNumber: "TEST-001",
        phone: "9876543210",
        email: "test@hospital.com",
        address: "Test Address",
        emergencyCapability: true,
        facilities: ["Emergency", "ICU"],
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("allows an authenticated hospital to register", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "hospital-user-001",
      email: "hospital@test.com",
      role: "hospital",
    } as any);

    const mockSet = vi.fn().mockResolvedValue(undefined);

    const mockDoc = vi.fn().mockReturnValue({
      id: "hospital-001",
      set: mockSet,
    });

    vi.mocked(firestore!.collection).mockReturnValue({
      doc: mockDoc,
    } as any);

    const res = await request(app)
      .post("/api/hospitals/register")
      .set("Authorization", "Bearer fake-token")
      .send({
        name: "Test Hospital",
        registrationNumber: "TEST-001",
        phone: "9876543210",
        email: "test@hospital.com",
        address: "Test Address",
        emergencyCapability: true,
        facilities: ["Emergency", "ICU"],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hospitalId).toBe("hospital-001");
    expect(res.body.data.ownerUid).toBe("hospital-user-001");
    expect(res.body.data.verificationStatus).toBe("PENDING");

    expect(mockSet).toHaveBeenCalled();
  });
});

describe("Hospital Profile", () => {
  it("rejects profile request without authentication", async () => {
    const res = await request(app).get("/api/hospitals/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("returns the authenticated hospital profile", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "hospital-user-001",
      email: "hospital@test.com",
      role: "hospital",
    } as any);

    const hospitalData = {
      hospitalId: "hospital-001",
      ownerUid: "hospital-user-001",
      name: "Test Hospital",
      registrationNumber: "TEST-001",
      phone: "9876543210",
      email: "hospital@test.com",
      address: "Test Address",
      location: {
        latitude: 25.4358,
        longitude: 81.8463,
      },
      emergencyCapability: true,
      facilities: ["Emergency", "ICU"],
      verificationStatus: "PENDING",
    };

    const mockGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => hospitalData,
        },
      ],
    });

    vi.mocked(firestore!.collection).mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockGet,
        }),
      }),
    } as any);

    const res = await request(app)
      .get("/api/hospitals/me")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hospitalId).toBe("hospital-001");
    expect(res.body.data.ownerUid).toBe("hospital-user-001");
    expect(res.body.data.name).toBe("Test Hospital");
    expect(res.body.data.verificationStatus).toBe("PENDING");
  });
});

describe("Hospital Emergency Requests", () => {
  it("rejects emergency requests without authentication", async () => {
    const res = await request(app).get("/api/hospitals/requests");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("returns emergency requests for the authenticated hospital", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "hospital-user-001",
      email: "hospital@test.com",
      role: "hospital",
    } as any);

    const emergencyRequests = [
      {
        id: "request-001",
        accidentId: "accident-001",
        hospitalId: "hospital-001",
        status: "NEW",
        patientCount: 2,
      },
      {
        id: "request-002",
        accidentId: "accident-002",
        hospitalId: "hospital-001",
        status: "ACCEPTED",
        patientCount: 1,
      },
    ];

    const mockRequestsGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: emergencyRequests.map((emergencyRequest) => ({
        id: emergencyRequest.id,
        data: () => ({
          accidentId: emergencyRequest.accidentId,
          hospitalId: emergencyRequest.hospitalId,
          status: emergencyRequest.status,
          patientCount: emergencyRequest.patientCount,
        }),
      })),
    });

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

    const mockRequestsCollection = {
      where: vi.fn().mockReturnValue({
        get: mockRequestsGet,
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalEmergencyRequests") {
        return mockRequestsCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .get("/api/hospitals/requests")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    expect(res.body.data[0].requestId).toBe("request-001");
    expect(res.body.data[0].hospitalId).toBe("hospital-001");
    expect(res.body.data[0].status).toBe("NEW");

    expect(res.body.data[1].requestId).toBe("request-002");
    expect(res.body.data[1].status).toBe("ACCEPTED");

    expect(mockRequestsGet).toHaveBeenCalled();
  });
});

describe("Hospital Emergency Request Detail", () => {
  it("rejects request detail without authentication", async () => {
    const res = await request(app).get("/api/hospitals/requests/request-001");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("returns a specific emergency request for the authenticated hospital", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "hospital-user-001",
      email: "hospital@test.com",
      role: "hospital",
    } as any);

    const hospitalData = {
      hospitalId: "hospital-001",
      ownerUid: "hospital-user-001",
    };

    const emergencyRequest = {
      accidentId: "accident-001",
      hospitalId: "hospital-001",
      status: "NEW",
      patientCount: 2,
      location: {
        latitude: 25.4358,
        longitude: 81.8463,
      },
    };

    const mockHospitalGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "hospital-001",
          data: () => hospitalData,
        },
      ],
    });

    const mockRequestGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "request-001",
      data: () => emergencyRequest,
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
      .get("/api/hospitals/requests/request-001")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data.requestId).toBe("request-001");
    expect(res.body.data.accidentId).toBe("accident-001");
    expect(res.body.data.hospitalId).toBe("hospital-001");
    expect(res.body.data.status).toBe("NEW");
    expect(res.body.data.patientCount).toBe(2);
    expect(res.body.data.location.latitude).toBe(25.4358);
    expect(res.body.data.location.longitude).toBe(81.8463);

    expect(mockRequestGet).toHaveBeenCalled();
  });

  it("rejects access when the emergency request belongs to another hospital", async () => {
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

    const mockRequestGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "request-002",
      data: () => ({
        accidentId: "accident-002",
        hospitalId: "hospital-002",
        status: "NEW",
        patientCount: 1,
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
      .get("/api/hospitals/requests/request-002")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("REQUEST_ACCESS_DENIED");
  });

  it("returns 404 when the emergency request does not exist", async () => {
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

    const mockRequestGet = vi.fn().mockResolvedValue({
      exists: false,
      id: "request-999",
      data: () => undefined,
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
      .get("/api/hospitals/requests/request-999")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("REQUEST_NOT_FOUND");
  });
});

/* =========================================================
   HOSPITAL CAPACITY
   ========================================================= */

describe("Hospital Capacity", () => {
  it("rejects capacity request without authentication", async () => {
    const res = await request(app).get("/api/hospitals/me/capacity");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("returns hospital capacity for the authenticated hospital", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "hospital-user-001",
      email: "hospital@test.com",
      role: "hospital",
    } as any);

    const hospitalData = {
      hospitalId: "hospital-001",
      ownerUid: "hospital-user-001",
    };

    const capacityData = {
      totalBeds: 100,
      availableBeds: 40,
      icuBeds: 20,
      availableIcuBeds: 8,
      emergencyCapacity: 10,
    };

    const mockHospitalGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "hospital-001",
          data: () => hospitalData,
        },
      ],
    });

    const mockCapacityGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "hospital-001",
      data: () => capacityData,
    });

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    const mockCapacityCollection = {
      doc: vi.fn().mockReturnValue({
        get: mockCapacityGet,
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalCapacity") {
        return mockCapacityCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .get("/api/hospitals/me/capacity")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hospitalId).toBe("hospital-001");
    expect(res.body.data.totalBeds).toBe(100);
    expect(res.body.data.availableBeds).toBe(40);
    expect(res.body.data.icuBeds).toBe(20);
    expect(res.body.data.availableIcuBeds).toBe(8);
    expect(res.body.data.emergencyCapacity).toBe(10);

    expect(mockCapacityGet).toHaveBeenCalled();
  });

  it("updates hospital capacity for the authenticated hospital", async () => {
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

    const mockCapacityDoc = {
      set: mockSet,
    };

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    const mockCapacityCollection = {
      doc: vi.fn().mockReturnValue(mockCapacityDoc),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalCapacity") {
        return mockCapacityCollection as any;
      }

      return {} as any;
    });

    const capacity = {
      totalBeds: 150,
      availableBeds: 75,
      icuBeds: 30,
      availableIcuBeds: 12,
      emergencyCapacity: 15,
    };

    const res = await request(app)
      .patch("/api/hospitals/me/capacity")
      .set("Authorization", "Bearer fake-token")
      .send(capacity);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hospitalId).toBe("hospital-001");
    expect(res.body.data.totalBeds).toBe(150);
    expect(res.body.data.availableBeds).toBe(75);
    expect(res.body.data.icuBeds).toBe(30);
    expect(res.body.data.availableIcuBeds).toBe(12);
    expect(res.body.data.emergencyCapacity).toBe(15);

    expect(mockSet).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        hospitalId: "hospital-001",
        totalBeds: 150,
        availableBeds: 75,
        icuBeds: 30,
        availableIcuBeds: 12,
        emergencyCapacity: 15,
      }),
      { merge: true },
    );
  });

  it("rejects negative capacity values", async () => {
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
      .patch("/api/hospitals/me/capacity")
      .set("Authorization", "Bearer fake-token")
      .send({
        totalBeds: -1,
        availableBeds: 10,
        icuBeds: 20,
        availableIcuBeds: 5,
        emergencyCapacity: 10,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_CAPACITY");
  });

  it("rejects available beds greater than total beds", async () => {
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
      .patch("/api/hospitals/me/capacity")
      .set("Authorization", "Bearer fake-token")
      .send({
        totalBeds: 50,
        availableBeds: 60,
        icuBeds: 20,
        availableIcuBeds: 5,
        emergencyCapacity: 10,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_BED_CAPACITY");
  });

  it("rejects available ICU beds greater than total ICU beds", async () => {
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
      .patch("/api/hospitals/me/capacity")
      .set("Authorization", "Bearer fake-token")
      .send({
        totalBeds: 100,
        availableBeds: 50,
        icuBeds: 20,
        availableIcuBeds: 25,
        emergencyCapacity: 10,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_ICU_CAPACITY");
  });
});
