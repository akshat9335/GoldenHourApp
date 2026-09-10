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
// HOSPITAL SPECIALISTS / STAFF
// ============================================================

describe("Hospital Specialists", () => {
  it("rejects specialists request without authentication", async () => {
    const res = await request(app).get("/api/hospitals/me/specialists");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("returns specialists for the authenticated hospital", async () => {
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

    const specialists = [
      {
        id: "staff-001",
        name: "Dr. Rahul Sharma",
        specialization: "Cardiology",
        availability: true,
      },
      {
        id: "staff-002",
        name: "Dr. Priya Singh",
        specialization: "Emergency Medicine",
        availability: false,
      },
    ];

    const mockSpecialistsGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: specialists.map((specialist) => ({
        id: specialist.id,
        data: () => ({
          hospitalId: "hospital-001",
          name: specialist.name,
          specialization: specialist.specialization,
          availability: specialist.availability,
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

    const mockSpecialistsCollection = {
      where: vi.fn().mockReturnValue({
        get: mockSpecialistsGet,
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalStaff") {
        return mockSpecialistsCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .get("/api/hospitals/me/specialists")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data).toHaveLength(2);

    expect(res.body.data[0].staffId).toBe("staff-001");
    expect(res.body.data[0].name).toBe("Dr. Rahul Sharma");
    expect(res.body.data[0].specialization).toBe("Cardiology");
    expect(res.body.data[0].availability).toBe(true);

    expect(res.body.data[1].staffId).toBe("staff-002");
    expect(res.body.data[1].name).toBe("Dr. Priya Singh");
    expect(res.body.data[1].specialization).toBe("Emergency Medicine");
    expect(res.body.data[1].availability).toBe(false);

    expect(mockSpecialistsGet).toHaveBeenCalled();
  });

  it("adds a specialist for the authenticated hospital", async () => {
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
      id: "staff-003",
      set: mockSet,
    });

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    const mockSpecialistsCollection = {
      doc: mockDoc,
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalStaff") {
        return mockSpecialistsCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .post("/api/hospitals/me/specialists")
      .set("Authorization", "Bearer fake-token")
      .send({
        name: "Dr. Amit Verma",
        specialization: "Neurology",
        availability: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    expect(res.body.data.staffId).toBe("staff-003");
    expect(res.body.data.hospitalId).toBe("hospital-001");
    expect(res.body.data.name).toBe("Dr. Amit Verma");
    expect(res.body.data.specialization).toBe("Neurology");
    expect(res.body.data.availability).toBe(true);

    expect(mockSet).toHaveBeenCalled();

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        hospitalId: "hospital-001",
        name: "Dr. Amit Verma",
        specialization: "Neurology",
        availability: true,
      }),
    );
  });

  it("rejects specialist creation without name or specialization", async () => {
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
      .post("/api/hospitals/me/specialists")
      .set("Authorization", "Bearer fake-token")
      .send({
        name: "",
        specialization: "",
        availability: true,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_SPECIALIST_DATA");
  });
});

// ============================================================
// HOSPITAL DIAGNOSTICS
// ============================================================

describe("Hospital Diagnostics", () => {
  it("rejects diagnostics request without authentication", async () => {
    const res = await request(app).get("/api/hospitals/me/diagnostics");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("returns diagnostics for the authenticated hospital", async () => {
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

    const diagnostics = [
      {
        id: "diagnostic-001",
        name: "CT Scan",
        type: "Imaging",
        available: true,
      },
      {
        id: "diagnostic-002",
        name: "MRI",
        type: "Imaging",
        available: false,
      },
    ];

    const mockDiagnosticsGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: diagnostics.map((diagnostic) => ({
        id: diagnostic.id,
        data: () => ({
          hospitalId: "hospital-001",
          name: diagnostic.name,
          type: diagnostic.type,
          available: diagnostic.available,
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

    const mockDiagnosticsCollection = {
      where: vi.fn().mockReturnValue({
        get: mockDiagnosticsGet,
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalDiagnostics") {
        return mockDiagnosticsCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .get("/api/hospitals/me/diagnostics")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data).toHaveLength(2);

    expect(res.body.data[0].diagnosticId).toBe("diagnostic-001");
    expect(res.body.data[0].name).toBe("CT Scan");
    expect(res.body.data[0].type).toBe("Imaging");
    expect(res.body.data[0].available).toBe(true);

    expect(res.body.data[1].diagnosticId).toBe("diagnostic-002");
    expect(res.body.data[1].name).toBe("MRI");
    expect(res.body.data[1].type).toBe("Imaging");
    expect(res.body.data[1].available).toBe(false);

    expect(mockDiagnosticsGet).toHaveBeenCalled();
  });

  it("returns a specific diagnostic for the authenticated hospital", async () => {
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

    const diagnosticData = {
      hospitalId: "hospital-001",
      name: "X-Ray",
      type: "Imaging",
      available: true,
    };

    const mockDiagnosticGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "diagnostic-001",
      data: () => diagnosticData,
    });

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    const mockDiagnosticsCollection = {
      doc: vi.fn().mockReturnValue({
        get: mockDiagnosticGet,
      }),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalDiagnostics") {
        return mockDiagnosticsCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .get("/api/hospitals/me/diagnostics/diagnostic-001")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data.diagnosticId).toBe("diagnostic-001");
    expect(res.body.data.hospitalId).toBe("hospital-001");
    expect(res.body.data.name).toBe("X-Ray");
    expect(res.body.data.type).toBe("Imaging");
    expect(res.body.data.available).toBe(true);

    expect(mockDiagnosticGet).toHaveBeenCalled();
  });

  it("adds a diagnostic for the authenticated hospital", async () => {
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
      id: "diagnostic-003",
      set: mockSet,
    });

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    const mockDiagnosticsCollection = {
      doc: mockDoc,
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalDiagnostics") {
        return mockDiagnosticsCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .post("/api/hospitals/me/diagnostics")
      .set("Authorization", "Bearer fake-token")
      .send({
        name: "Blood Test",
        type: "Laboratory",
        available: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    expect(res.body.data.diagnosticId).toBe("diagnostic-003");
    expect(res.body.data.hospitalId).toBe("hospital-001");
    expect(res.body.data.name).toBe("Blood Test");
    expect(res.body.data.type).toBe("Laboratory");
    expect(res.body.data.available).toBe(true);

    expect(mockSet).toHaveBeenCalled();

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        hospitalId: "hospital-001",
        name: "Blood Test",
        type: "Laboratory",
        available: true,
      }),
    );
  });

  it("updates a diagnostic for the authenticated hospital", async () => {
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

    const mockDiagnosticGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "diagnostic-001",
      data: () => ({
        hospitalId: "hospital-001",
        name: "CT Scan",
        type: "Imaging",
        available: false,
      }),
    });

    const mockDiagnosticDoc = {
      get: mockDiagnosticGet,
      set: mockSet,
    };

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    const mockDiagnosticsCollection = {
      doc: vi.fn().mockReturnValue(mockDiagnosticDoc),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalDiagnostics") {
        return mockDiagnosticsCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .patch("/api/hospitals/me/diagnostics/diagnostic-001")
      .set("Authorization", "Bearer fake-token")
      .send({
        name: "CT Scan",
        type: "Imaging",
        available: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data.diagnosticId).toBe("diagnostic-001");
    expect(res.body.data.hospitalId).toBe("hospital-001");
    expect(res.body.data.name).toBe("CT Scan");
    expect(res.body.data.type).toBe("Imaging");
    expect(res.body.data.available).toBe(true);

    expect(mockDiagnosticGet).toHaveBeenCalled();

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        hospitalId: "hospital-001",
        name: "CT Scan",
        type: "Imaging",
        available: true,
      }),
      { merge: true },
    );
  });

  it("deletes a diagnostic for the authenticated hospital", async () => {
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

    const mockDelete = vi.fn().mockResolvedValue(undefined);

    const mockDiagnosticGet = vi.fn().mockResolvedValue({
      exists: true,
      id: "diagnostic-001",
      data: () => ({
        hospitalId: "hospital-001",
        name: "MRI",
        type: "Imaging",
        available: true,
      }),
    });

    const mockDiagnosticDoc = {
      get: mockDiagnosticGet,
      delete: mockDelete,
    };

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
    };

    const mockDiagnosticsCollection = {
      doc: vi.fn().mockReturnValue(mockDiagnosticDoc),
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalDiagnostics") {
        return mockDiagnosticsCollection as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .delete("/api/hospitals/me/diagnostics/diagnostic-001")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data.diagnosticId).toBe("diagnostic-001");
    expect(res.body.data.deleted).toBe(true);

    expect(mockDiagnosticGet).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  it("rejects diagnostic creation without name or type", async () => {
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
      .post("/api/hospitals/me/diagnostics")
      .set("Authorization", "Bearer fake-token")
      .send({
        name: "",
        type: "",
        available: true,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_DIAGNOSTIC_DATA");
  });
});

// ============================================================
// FACILITY MATCHING
// ============================================================

describe("Facility Matching", () => {
  it("rejects matching request without authentication", async () => {
    const res = await request(app).post("/api/hospitals/matching").send({
      emergencyRequired: true,
      specialization: "Cardiology",
      icuRequired: true,
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });

  it("returns verified emergency-capable hospitals for emergency matching", async () => {
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
            facilities: ["Emergency Department"],
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
          get: mockHospitalGet,
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
  });

  it("excludes the current hospital from matching results", async () => {
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
            name: "Other Hospital",
            emergencyCapability: true,
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
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].hospitalId).toBe("hospital-002");

    expect(
      res.body.data.some(
        (hospital: any) => hospital.hospitalId === "hospital-001",
      ),
    ).toBe(false);
  });

  it("rejects facility matching for an unverified current hospital", async () => {
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
      .post("/api/hospitals/matching")
      .set("Authorization", "Bearer fake-token")
      .send({
        emergencyRequired: true,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("HOSPITAL_NOT_VERIFIED");
  });

  it("matches a hospital with the requested available specialization", async () => {
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
            name: "Current Hospital",
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
            verificationStatus: "VERIFIED",
          }),
        },
        {
          id: "hospital-002",
          data: () => ({
            hospitalId: "hospital-002",
            ownerUid: "hospital-user-002",
            name: "Cardiac Care Hospital",
            emergencyCapability: true,
            verificationStatus: "VERIFIED",
          }),
        },
        {
          id: "hospital-003",
          data: () => ({
            hospitalId: "hospital-003",
            ownerUid: "hospital-user-003",
            name: "Unavailable Specialist Hospital",
            emergencyCapability: true,
            verificationStatus: "VERIFIED",
          }),
        },
      ],
    });

    const mockSpecialistsGet = vi.fn().mockImplementation(async () => ({
      empty: false,
      docs: [
        {
          id: "staff-001",
          data: () => ({
            hospitalId: "hospital-002",
            name: "Dr. Rahul Sharma",
            specialization: "Cardiology",
            availability: true,
          }),
        },
      ],
    }));

    const mockUnavailableSpecialistsGet = vi
      .fn()
      .mockImplementation(async () => ({
        empty: false,
        docs: [
          {
            id: "staff-002",
            data: () => ({
              hospitalId: "hospital-003",
              name: "Dr. Amit",
              specialization: "Neurology",
              availability: false,
            }),
          },
        ],
      }));

    let staffCall = 0;

    const mockHospitalCollection = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: mockHospitalGet,
        }),
      }),
      get: mockHospitalsGet,
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalStaff") {
        staffCall += 1;

        return {
          where: vi.fn().mockReturnValue({
            get:
              staffCall === 1
                ? mockSpecialistsGet
                : mockUnavailableSpecialistsGet,
          }),
        } as any;
      }

      return {} as any;
    });

    const res = await request(app)
      .post("/api/hospitals/matching")
      .set("Authorization", "Bearer fake-token")
      .send({
        specialization: "Cardiology",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].hospitalId).toBe("hospital-002");
    expect(res.body.data[0].name).toBe("Cardiac Care Hospital");

    expect(mockSpecialistsGet).toHaveBeenCalled();
  });

  it("matches a hospital with ICU capability from facility information", async () => {
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
            name: "Current Hospital",
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
            verificationStatus: "VERIFIED",
          }),
        },
        {
          id: "hospital-002",
          data: () => ({
            hospitalId: "hospital-002",
            ownerUid: "hospital-user-002",
            name: "ICU Hospital",
            emergencyCapability: true,
            verificationStatus: "VERIFIED",
            facilities: ["ICU", "Emergency Department"],
          }),
        },
        {
          id: "hospital-003",
          data: () => ({
            hospitalId: "hospital-003",
            ownerUid: "hospital-user-003",
            name: "No ICU Hospital",
            emergencyCapability: true,
            verificationStatus: "VERIFIED",
            facilities: ["Emergency Department"],
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
        icuRequired: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].hospitalId).toBe("hospital-002");
    expect(res.body.data[0].name).toBe("ICU Hospital");
  });

  it("does not match an unverified target hospital", async () => {
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
            name: "Current Hospital",
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
            verificationStatus: "VERIFIED",
          }),
        },
        {
          id: "hospital-002",
          data: () => ({
            hospitalId: "hospital-002",
            ownerUid: "hospital-user-002",
            name: "Pending Emergency Hospital",
            emergencyCapability: true,
            verificationStatus: "PENDING",
            facilities: ["ICU"],
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
        icuRequired: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it("can expose diagnostic information for a matching hospital", async () => {
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
            name: "Current Hospital",
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
            verificationStatus: "VERIFIED",
          }),
        },
        {
          id: "hospital-002",
          data: () => ({
            hospitalId: "hospital-002",
            ownerUid: "hospital-user-002",
            name: "Diagnostic Hospital",
            emergencyCapability: true,
            verificationStatus: "VERIFIED",
          }),
        },
      ],
    });

    const mockDiagnosticsGet = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "diagnostic-001",
          data: () => ({
            hospitalId: "hospital-002",
            name: "CT Scan",
            type: "Imaging",
            available: true,
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
      get: mockHospitalsGet,
    };

    vi.mocked(firestore!.collection).mockImplementation((collectionName) => {
      if (collectionName === "hospitals") {
        return mockHospitalCollection as any;
      }

      if (collectionName === "hospitalDiagnostics") {
        return {
          where: vi.fn().mockReturnValue({
            get: mockDiagnosticsGet,
          }),
        } as any;
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
    expect(mockDiagnosticsGet).toHaveBeenCalled();
  });
});
