import { Router } from "express";
import { appointmentController } from "../controllers/appointment.controller";
import { optionalAuth } from "../middleware/auth";

const router = Router();

// Booking & listing
router.post("/", optionalAuth, (req, res, next) => appointmentController.createAppointment(req, res, next));
router.get("/my", optionalAuth, (req, res, next) => appointmentController.getMyAppointments(req, res, next));
router.get("/doctor", optionalAuth, (req, res, next) =>
  appointmentController.getDoctorAppointments(req, res, next)
);
router.get("/:id", (req, res, next) => appointmentController.getAppointment(req, res, next));

// Consultation state lifecycle actions
router.post("/:id/start", optionalAuth, (req, res, next) => appointmentController.startAppointment(req, res, next));
router.post("/:id/complete", optionalAuth, (req, res, next) => appointmentController.completeAppointment(req, res, next));
router.post("/:id/skip", optionalAuth, (req, res, next) => appointmentController.skipAppointment(req, res, next));
router.post("/:id/cancel", optionalAuth, (req, res, next) => appointmentController.cancelAppointment(req, res, next));

// Recommended departure synchronization
router.get("/:id/leave-time", (req, res, next) =>
  appointmentController.getRecommendedLeaveTime(req, res, next)
);

export default router;
