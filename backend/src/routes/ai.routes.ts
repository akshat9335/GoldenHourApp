import { Router } from "express";
import {
  firstAid,
  imageAnalysis,
  triage,
  validateInput,
  voiceTriage,
} from "../controllers/ai.controller";

const router = Router();

router.post("/triage", triage);
// /analyze is retained as a small compatibility alias for early clients.
router.post("/analyze", triage);
router.post("/voice-triage", voiceTriage);
router.post("/image-analysis", imageAnalysis);
router.post("/first-aid", firstAid);
router.post("/validate", validateInput);

export default router;
