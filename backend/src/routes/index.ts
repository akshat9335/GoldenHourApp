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
import locationRoutes from "./location.routes";
import doctorRoutes from "./doctor.routes";
import appointmentRoutes from "./appointment.routes";
import queueRoutes from "./queue.routes";
import confirmationRoutes from "./confirmation.routes";
import mediaRoutes from "./media.routes";
import adminRoutes from "./admin.routes";
import workerRoutes from "./worker.routes";

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
 *   /location        → Anant (GPS tracking, Nearby Hospitals & Incidents, Maps routing)
 *   /doctors         → Anant (Doctor registration, Clinic profiles, Search)
 *   /appointments    → Anant (Slot booking, Lifecycle state machine, Departure sync)
 *   /queues          → Anant (Live queue management, Token issuance, Next caller)
 *   /confirmations   → Adish (Incident confirmations, Multi-user verification, Concurrency lock)
 *   /worker          → Member 4 (ASHA / ANM Frontline offline-sync patients, visits & referrals)
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
router.use("/location", locationRoutes);
router.use("/doctors", doctorRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/queues", queueRoutes);
router.use("/confirmations", confirmationRoutes);
router.use("/media", mediaRoutes);
router.use("/admin", adminRoutes);
router.use("/worker", workerRoutes);

export default router;

