import { Router } from "express";
import { healthRecordController } from "../controllers/healthRecord.controller";

const router = Router();

router.post("/", healthRecordController.createRecord);
router.get("/patient/:patientId", healthRecordController.getPatientRecords);
router.get("/fhir/:patientId", healthRecordController.getPatientFHIRBundle);
router.get("/:id", healthRecordController.getRecordById);

export default router;
