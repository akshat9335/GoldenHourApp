import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  registerDriverController,
  getDriverController,
  updateDriverAvailabilityController,
  updateDriverController,
  registerAmbulanceController,
  assignAmbulanceController,
  getAmbulanceRequestsController,
  getAmbulanceRequestController,
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
  assignAmbulanceController,
);

router.get(
  "/requests",
  requireAuth,
  getAmbulanceRequestsController,
);

router.get(
  "/requests/:id",
  requireAuth,
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
  getDriverController,
);

router.patch(
  "/drivers/me/availability",
  requireAuth,
  updateDriverAvailabilityController,
);

router.patch(
  "/drivers/me",
  requireAuth,
  updateDriverController,
);

router.get(
  "/trips/history",
  requireAuth,
  getTripHistoryController,
);

router.post(
  "/trips/:id/start-to-patient",
  requireAuth,
  startToPatientController,
);

router.post(
  "/trips/:id/arrived-patient",
  requireAuth,
  arrivedPatientController,
);

router.post(
  "/trips/:id/pickup",
  requireAuth,
  pickupController,
);

router.post(
  "/trips/:id/start-to-hospital",
  requireAuth,
  startToHospitalController,
);

router.post(
  "/trips/:id/arrived-hospital",
  requireAuth,
  arrivedHospitalController,
);

router.post(
  "/trips/:id/complete",
  requireAuth,
  completeTripController,
);

export default router;
