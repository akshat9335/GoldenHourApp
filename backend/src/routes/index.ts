import { Router } from "express";

import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import userRoutes from "./users.routes";
import contactRoutes from "./contacts.route";
import emergencyRoutes from "./emergencies.routes";
import notificationRoutes from "./notifications.routes";

/**
 * Centralized API routing.
 *
 * Core routes currently implemented:
 *   /health          → Health check
 *   /auth            → Firebase authentication
 *   /users           → User profile and persistent Crisis ID
 *   /contacts        → Emergency contacts
 *   /emergencies     → Emergency reporting and management
 *   /notifications   → Notification and FCM device-token foundation
 *
 * Future feature routes will be added by their respective owners:
 *   /ai              → Archit
 *   /hospitals       → Aastha
 *   /facility        → Aastha
 *   /referrals       → Aastha
 *   /ambulances      → Akshita
 *   /trips           → Akshita
 *   /location        → Anant
 *   /confirmations   → Adish
 *   /doctors         → Doctor module
 *   /appointments    → Doctor module
 *   /queue           → Doctor module
 *
 * Sync is currently an internal Core integration service and does not
 * expose a public route. Other backend modules can use the sync service
 * when integrating shared emergency state.
 *
 * Feature business routes should be added only when their respective
 * modules are implemented and tested.
 */

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/contacts", contactRoutes);
router.use("/emergencies", emergencyRoutes);
router.use("/notifications", notificationRoutes);

export default router;