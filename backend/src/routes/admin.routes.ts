import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// All Admin routes require authentication AND the ADMIN role
router.use(requireAuth);
router.use(requireRole("ADMIN"));

// Reusable applications query
router.get("/applications", (req, res, next) => adminController.getApplications(req, res, next));

// Doctor verification workflows
router.get("/doctors/pending", (req, res, next) => adminController.getPendingDoctors(req, res, next));
router.patch("/doctors/:id/verification", (req, res, next) => adminController.verifyDoctor(req, res, next));

// Generic multi-role verification endpoint (future ready)
router.patch("/applications/:role/:id/verification", (req, res, next) =>
  adminController.verifyApplication(req, res, next)
);

export default router;
