import { Router } from "express";
import { doctorController } from "../controllers/doctor.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Doctor discovery & registration
router.post("/register", (req, res, next) => doctorController.registerDoctor(req, res, next));
router.get("/", (req, res, next) => doctorController.searchDoctors(req, res, next));

// Authenticated doctor self-management
router.get("/me", requireAuth, (req, res, next) => doctorController.getMyDoctorProfile(req, res, next));
router.patch("/me", requireAuth, (req, res, next) => doctorController.updateMyDoctorProfile(req, res, next));
router.patch("/me/availability", requireAuth, (req, res, next) =>
  doctorController.updateMyAvailability(req, res, next)
);

// Individual doctor inspection, clinic and navigation
router.get("/:id", (req, res, next) => doctorController.getDoctorProfile(req, res, next));
router.patch("/:id/verify", (req, res, next) => doctorController.verifyDoctor(req, res, next));
router.get("/:id/clinic", (req, res, next) => doctorController.getDoctorClinic(req, res, next));
router.get("/:id/route", (req, res, next) => doctorController.getRouteToClinic(req, res, next));

export default router;
