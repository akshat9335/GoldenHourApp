import { Router } from "express";
import { uploadMediaController } from "../controllers/media.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/upload", requireAuth, uploadMediaController);

export default router;
