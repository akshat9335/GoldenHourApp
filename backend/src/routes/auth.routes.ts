import { Router } from "express";
import { createSession, getMe } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me", requireAuth, getMe);
router.post("/sessions", requireAuth, createSession);

export default router;