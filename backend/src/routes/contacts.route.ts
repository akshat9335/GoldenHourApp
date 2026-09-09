import { Router } from "express";
import {
  addContactController,
  deleteContactController,
  getContactsController,
} from "../controllers/contact.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, getContactsController);

router.post("/", requireAuth, addContactController);

router.delete("/:id", requireAuth, deleteContactController);

export default router; 