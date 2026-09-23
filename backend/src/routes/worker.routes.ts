import { Router } from "express";
import { WorkerController } from "../controllers/worker.controller";

const router = Router();

// Dashboard Summary Stats
router.get("/stats", WorkerController.getStats);

// Patients Management
router.post("/patients", WorkerController.registerPatient);
router.get("/patients", WorkerController.getPatients);
router.get("/patients/:id", WorkerController.getPatientDetail);

// Home Visits & AI Triage
router.post("/visits", WorkerController.recordVisit);

// Frontline Referrals
router.post("/referrals", WorkerController.createReferral);
router.get("/referrals", WorkerController.getReferrals);

// Low-Connectivity Offline Batch Sync
router.post("/sync", WorkerController.syncBatch);

export default router;
