import { Router } from "express";

import healthRoutes from "./health.routes";
import ambulanceRoutes from "./ambulance.routes";
import authRoutes from "./auth.routes";
import userRoutes from "./users.routes";
import contactRoutes from "./contacts.route";
import emergencyRoutes from "./emergencies.routes";
import notificationRoutes from "./notifications.routes";
import aiRoutes from "./ai.routes";
import hospitalRoutes from "./hospital.routes";

/**
 * Centralized API routing.
 *
 * Core routes currently implemented:
 *   /health          → Health check
 *   /auth            → Firebase authentication
 *   /users           → User profile and persistent Crisis ID
 *   /contacts        → Emergency contacts
 *   /emergencies    → Emergency reporting and management
 *   /notifications → Notification and FCM device-token foundation
 *   /ai              → AI features (Triage, First Aid, Image Analysis)
 *   /hospitals       → Hospital registration, profile, capacity,
 *                      specialists, diagnostics, facility matching
 *                      and referrals
 *   /ambulances      → Akshita
 */

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/contacts", contactRoutes);
router.use("/emergencies", emergencyRoutes);
router.use("/notifications", notificationRoutes);
router.use("/ai", aiRoutes);
router.use("/hospitals", hospitalRoutes);
router.use("/ambulances", ambulanceRoutes);

export default router;
