import { Router } from "express";
import { queueController } from "../controllers/queue.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/queues/:doctorId
router.get("/:doctorId", (req, res, next) => queueController.getLiveQueue(req, res, next));

// POST /api/queues/:doctorId/next
router.post("/:doctorId/next", (req, res, next) => {
  if (req.headers.authorization) {
    return requireAuth(req, res, () => queueController.advanceQueue(req, res, next));
  }
  return queueController.advanceQueue(req, res, next);
});

export default router;
