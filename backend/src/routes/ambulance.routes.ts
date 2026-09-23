import { Router } from "express";
import { requireApproved, requireAuth, requireRole } from "../middleware/auth";
import {
  registerDriverController,
  getDriverController,
  updateDriverAvailabilityController,
  updateDriverController,
  registerAmbulanceController,
  assignAmbulanceController,
  getAmbulanceRequestsController,
  getAmbulanceRequestController,
  dismissAmbulanceRequestController,
  clearAllAmbulanceRequestsController,
} from "../controllers/ambulance.controller";

import {
  startToPatientController,
  arrivedPatientController,
  pickupController,
  startToHospitalController,
  arrivedHospitalController,
  completeTripController,
  getTripHistoryController,
} from "../controllers/trip.controller";

const router = Router();


router.post(
  "/",
  requireAuth,
  registerAmbulanceController,
);

router.post(
  "/requests/:id/accept",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  assignAmbulanceController,
);

router.get(
  "/requests",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  getAmbulanceRequestsController,
);

router.post(
  "/requests/clear-all",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  clearAllAmbulanceRequestsController,
);

router.post(
  "/requests/:id/dismiss",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  dismissAmbulanceRequestController,
);

router.get(
  "/requests/:id",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  getAmbulanceRequestController,
);


router.post(
  "/drivers/register",
  requireAuth,
  registerDriverController,
);

router.get(
  "/drivers/me",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  getDriverController,
);

router.patch(
  "/drivers/me/availability",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  updateDriverAvailabilityController,
);

router.patch(
  "/drivers/me",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  updateDriverController,
);

router.get(
  "/trips/history",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  getTripHistoryController,
);

router.post(
  "/trips/:id/start-to-patient",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  startToPatientController,
);

router.post(
  "/trips/:id/arrived-patient",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  arrivedPatientController,
);

router.post(
  "/trips/:id/pickup",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  pickupController,
);

router.post(
  "/trips/:id/start-to-hospital",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  startToHospitalController,
);

router.post(
  "/trips/:id/arrived-hospital",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  arrivedHospitalController,
);

router.post(
  "/trips/:id/complete",
  requireAuth,
  requireRole("AMBULANCE_DRIVER"),
  requireApproved,
  completeTripController,
);

export default router;
