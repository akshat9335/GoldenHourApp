import { Router } from "express";
import healthRoutes from "./health.routes";
import aiRoutes from "./ai.routes";

/**
 * Centralized API routing. Mount every feature router here.
 *
 * Future routes (owners in parentheses) will be added the same way:
 *   router.use("/auth", authRoutes);            (Akshat)
 *   router.use("/users", userRoutes);           (Akshat)
 *   router.use("/emergencies", emergencyRoutes); (Akshat)
 *   router.use("/contacts", contactRoutes);      (Akshat)
 *   router.use("/notifications", notificationRoutes); (Akshat)
 *   router.use("/ai", aiRoutes);                 (Archit)
 *   router.use("/hospitals", hospitalRoutes);    (Aastha)
 *   router.use("/facility", facilityRoutes);     (Aastha)
 *   router.use("/referrals", referralRoutes);    (Aastha)
 *   router.use("/ambulances", ambulanceRoutes);  (Akshita)
 *   router.use("/trips", tripRoutes);            (Akshita)
 *   router.use("/location", locationRoutes);     (Anant)
 *   router.use("/sync", syncRoutes);             (Anant)
 *   router.use("/confirmations", confirmationRoutes); (Adish)
 *   router.use("/doctors", doctorRoutes);        (Doctor module)
 *   router.use("/appointments", appointmentRoutes); (Doctor module)
 *   router.use("/queue", queueRoutes);           (Doctor module)
 *
 * Feature owners should keep their business logic in their own router;
 * the AI router is mounted here because it is the first implemented module.
 */
const router = Router();

router.use("/health", healthRoutes);
router.use("/ai", aiRoutes);

export default router;
