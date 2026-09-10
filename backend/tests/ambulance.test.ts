import { describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../src/middleware/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = {
      uid: "test-driver-001",
      email: "driver@test.com",
      role: "driver",
    };
    next();
  },
  requireRole: (_role: string) => (_req: any, _res: any, next: any) => {
    next();
  },
}));

vi.mock("../src/services/ambulance/ambulance.service", () => ({
  registerAmbulance: vi.fn().mockResolvedValue("ambulance-doc-001"),
}));

vi.mock("../src/services/ambulance/driver.service", () => ({
  updateDriverAvailability: vi.fn().mockResolvedValue({
    uid: "test-driver-001",
    name: "Test Driver",
    phone: "9876543210",
    licenseNumber: "DL123456",
    verificationStatus: "PENDING",
    availability: "AVAILABLE",
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
  }),
}));

import { createApp } from "../src/app";

const app = createApp();

describe("Ambulance Driver Availability", () => {
  it("updates driver availability successfully", async () => {
    const res = await request(app)
      .patch("/api/ambulances/drivers/me/availability")
      .send({
        availability: "AVAILABLE",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.uid).toBe("test-driver-001");
    expect(res.body.data.availability).toBe("AVAILABLE");
    expect(res.body.message).toBe(
      "Driver availability updated successfully.",
    );
  });
});


describe("Ambulance Registration", () => {
  it("registers ambulance successfully", async () => {
    const res = await request(app)
      .post("/api/ambulances")
      .send({
        ambulanceId: "AMB001",
        vehicleNumber: "UP70AB1234",
        driverId: "test-driver-001",
        hospitalId: "hospital-001",
        type: "Advanced Life Support",
        status: "AVAILABLE",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ambulanceId).toBe("ambulance-doc-001");
    expect(res.body.message).toBe(
      "Ambulance registered successfully.",
    );
  });
});

vi.mock("../src/services/ambulance/assignment.service", () => ({
  assignAmbulance: vi.fn().mockResolvedValue("assignment-001"),
}));

vi.mock("../src/services/ambulance/trip.service", () => ({
  createTripFromAssignment: vi.fn().mockResolvedValue("trip-001"),
}));

describe("Ambulance Assignment", () => {
  it("assigns ambulance successfully", async () => {
    const res = await request(app)
      .post("/api/ambulances/requests/emergency-001/accept")
      .send({
        ambulanceId: "AMB001",
        emergencyId: "emergency-001",
        patientId: "patient-001",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assignmentId).toBe("assignment-001");
    expect(res.body.data.tripId).toBe("trip-001");
    expect(res.body.message).toBe(
      "Ambulance assigned and trip created successfully.",
    );
  });
});
