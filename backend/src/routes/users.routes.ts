import { Router } from "express";
import { getMe, register, updateMe } from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me", requireAuth, getMe);
router.post("/register", requireAuth, register);
router.patch("/me", requireAuth, updateMe);

export default router;