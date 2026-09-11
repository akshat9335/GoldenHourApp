import { Router } from "express";
import { appointmentController } from "../controllers/appointment.controller";

const router = Router();

// Booking & listing
router.post("/", (req, res, next) => appointmentController.createAppointment(req, res, next));
router.get("/my", (req, res, next) => appointmentController.getMyAppointments(req, res, next));
router.get("/:id", (req, res, next) => appointmentController.getAppointment(req, res, next));

// Consultation state lifecycle actions
router.post("/:id/start", (req, res, next) => appointmentController.startAppointment(req, res, next));
router.post("/:id/complete", (req, res, next) => appointmentController.completeAppointment(req, res, next));
router.post("/:id/skip", (req, res, next) => appointmentController.skipAppointment(req, res, next));
router.post("/:id/cancel", (req, res, next) => appointmentController.cancelAppointment(req, res, next));

// Recommended departure synchronization
router.get("/:id/leave-time", (req, res, next) =>
  appointmentController.getRecommendedLeaveTime(req, res, next)
);

export default router;
