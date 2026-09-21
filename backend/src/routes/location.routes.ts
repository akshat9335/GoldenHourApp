import { Router } from "express";
import { locationController } from "../controllers/location.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// POST /api/location/update
router.post("/update", requireAuth, (req, res, next) => locationController.updateLocation(req, res, next));

// GET /api/location/nearby-hospitals?lat=...&lng=...&radius=...
router.get("/nearby-hospitals", (req, res, next) => locationController.getNearbyHospitals(req, res, next));

// GET /api/location/nearby-incidents?lat=...&lng=...&radius=...
router.get("/nearby-incidents", (req, res, next) => locationController.getNearbyIncidents(req, res, next));

// GET /api/location/route?originLat=...&originLng=...&destLat=...&destLng=...
router.get("/route", (req, res, next) => locationController.getRoute(req, res, next));

export default router;
