import { Router } from "express";
import { appointmentController } from "../controllers/appointment.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// Booking & listing
router.post("/", requireAuth, (req, res, next) => appointmentController.createAppointment(req, res, next));
router.get("/my", requireAuth, (req, res, next) => appointmentController.getMyAppointments(req, res, next));
router.get("/doctor", requireAuth, requireRole("DOCTOR"), (req, res, next) =>
  appointmentController.getDoctorAppointments(req, res, next)
);
router.get("/:id", (req, res, next) => appointmentController.getAppointment(req, res, next));

// Consultation state lifecycle actions
router.post("/:id/start", requireAuth, (req, res, next) => appointmentController.startAppointment(req, res, next));
router.post("/:id/complete", requireAuth, (req, res, next) => appointmentController.completeAppointment(req, res, next));
router.post("/:id/skip", requireAuth, (req, res, next) => appointmentController.skipAppointment(req, res, next));
router.post("/:id/cancel", requireAuth, (req, res, next) => appointmentController.cancelAppointment(req, res, next));

// Recommended departure synchronization
router.get("/:id/leave-time", (req, res, next) =>
  appointmentController.getRecommendedLeaveTime(req, res, next)
);

export default router;
