import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

describe("Doctor & Clinic Services Endpoints", () => {
  let createdDoctorId: string;

  describe("POST /api/doctors/register", () => {
    it("registers a doctor with initial PENDING status", async () => {
      const res = await request(app)
        .post("/api/doctors/register")
        .send({
          userId: "user-new-doc-99",
          name: "Dr. Siddharth Sen",
          specialty: "Cardiovascular Emergency",
          qualification: "MBBS, MD, DM (Cardiology)",
          experienceYears: 12,
          licenseNumber: `MCI-DL-2012-${Date.now().toString().slice(-5)}`,
          clinicId: "clinic-apollo-cr",
          consultationFee: 1000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe("PENDING");
      expect(res.body.data.name).toBe("Dr. Siddharth Sen");
      createdDoctorId = res.body.data.doctorId;
    });

    it("rejects registration with non-existent clinic", async () => {
      const res = await request(app)
        .post("/api/doctors/register")
        .send({
          userId: "user-doc-fail",
          name: "Dr. Unknown",
          specialty: "Pediatrics",
          licenseNumber: `MCI-FAKE-${Date.now()}`,
          clinicId: "non-existent-clinic-id",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CLINIC_NOT_FOUND");
    });
  });

  describe("PATCH /api/doctors/:id/verify", () => {
    it("allows verifying a doctor", async () => {
      const res = await request(app)
        .patch(`/api/doctors/${createdDoctorId}/verify`)
        .send({ status: "VERIFIED" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe("VERIFIED");
    });
  });

  describe("GET /api/doctors", () => {
    it("searches and filters doctors by specialty", async () => {
      const res = await request(app).get("/api/doctors?specialty=Trauma");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].specialty).toContain("Trauma");
    });

    it("calculates distance to doctor clinic when coordinates provided", async () => {
      const res = await request(app).get("/api/doctors?userLat=28.6328&userLng=77.2197");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0]).toHaveProperty("distanceKm");
      expect(typeof res.body.data[0].distanceKm).toBe("number");
    });
  });

  describe("GET /api/doctors/:id/clinic and :id/route", () => {
    it("returns clinic details for a doctor", async () => {
      const res = await request(app).get("/api/doctors/doc-sharma-trauma/clinic");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.clinicId).toBe("clinic-apollo-cr");
      expect(res.body.data).toHaveProperty("workingHours");
    });

    it("calculates navigation route to clinic", async () => {
      const res = await request(app).get(
        "/api/doctors/doc-sharma-trauma/route?userLat=28.6139&userLng=77.2090"
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.distanceKm).toBeGreaterThan(0);
      expect(res.body.data.durationMin).toBeGreaterThan(0);
    });
  });
});
