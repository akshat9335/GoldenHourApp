import { Router } from "express";
import { createDevTestToken, createSession, getMe } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me", requireAuth, getMe);
router.post("/sessions", requireAuth, createSession);
router.post("/session", requireAuth, createSession);

if (process.env.NODE_ENV !== "production") {
  router.post("/test-token", createDevTestToken);
}

export default router;