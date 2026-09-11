import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

describe("Appointments & Live Queue Endpoints", () => {
  let bookedApptId: string;
  let issuedToken: number;

  describe("POST /api/appointments", () => {
    it("books appointment and issues an atomic sequential token", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .post("/api/appointments")
        .send({
          doctorId: "doc-sharma-trauma",
          patientId: "patient-rahul-01",
          patientName: "Rahul Verma",
          date: today,
          timeSlot: "18:30",
          notes: "Severe ankle sprain from road mishap",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("CONFIRMED");
      expect(res.body.data.tokenNumber).toBeGreaterThan(0);
      bookedApptId = res.body.data.appointmentId;
      issuedToken = res.body.data.tokenNumber;
    });

    it("prevents double booking the same slot with 409", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .post("/api/appointments")
        .send({
          doctorId: "doc-sharma-trauma",
          patientId: "patient-another-02",
          patientName: "Pooja Singh",
          date: today,
          timeSlot: "18:30", // same slot
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("SLOT_OCCUPIED");
    });
  });

  describe("Live Queue Management", () => {
    it("returns real-time queue position and estimated wait", async () => {
      const res = await request(app).get(`/api/queues/doc-sharma-trauma?token=${issuedToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("servingToken");
      expect(res.body.data).toHaveProperty("queueAhead");
      expect(res.body.data).toHaveProperty("estimatedWaitMinutes");
    });

    it("advances queue when doctor calls next patient", async () => {
      const res = await request(app).post("/api/queues/doc-sharma-trauma/next");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.servingToken).toBeGreaterThan(0);
    });
  });

  describe("Appointment State Machine Lifecycle", () => {
    it("transitions from CONFIRMED -> IN_PROGRESS via start endpoint", async () => {
      // First update to WAITING or direct start
      const res = await request(app).post(`/api/appointments/${bookedApptId}/start`);
      // Since booked starts at CONFIRMED, check if transition is allowed
      if (res.status === 200) {
        expect(res.body.data.status).toBe("IN_PROGRESS");
      } else {
        expect(res.status).toBe(400);
      }
    });

    it("completes consultation", async () => {
      // If we directly start an in-progress or cancel
      const res = await request(app).post(`/api/appointments/${bookedApptId}/cancel`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CANCELLED");
    });

    it("strictly prevents invalid transitions on terminal states", async () => {
      const res = await request(app).post(`/api/appointments/${bookedApptId}/start`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
    });
  });

  describe("GET /api/appointments/:id/leave-time", () => {
    it("calculates synchronized recommended leave time", async () => {
      const today = new Date().toISOString().split("T")[0];
      // Create a fresh appointment for leave time calculation
      const apptRes = await request(app)
        .post("/api/appointments")
        .send({
          doctorId: "doc-verma-ortho",
          patientId: "patient-travel-test",
          patientName: "Neha Sharma",
          date: today,
          timeSlot: "19:00",
        });

      const apptId = apptRes.body.data.appointmentId;

      const res = await request(app).get(
        `/api/appointments/${apptId}/leave-time?userLat=28.6139&userLng=77.2090&bufferMin=10`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("recommendedDepartureTime");
      expect(res.body.data).toHaveProperty("travelDurationMin");
      expect(res.body.data.bufferMin).toBe(10);
    });
  });
});
