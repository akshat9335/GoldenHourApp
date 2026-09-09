import { Router } from "express";
import {
  firstAid,
  imageAnalysis,
  triage,
} from "../controllers/ai.controller";

const router = Router();

router.post("/triage", triage);
// /analyze is retained as a small compatibility alias for early clients.
router.post("/analyze", triage);
router.post("/image-analysis", imageAnalysis);
router.post("/first-aid", firstAid);

export default router;
