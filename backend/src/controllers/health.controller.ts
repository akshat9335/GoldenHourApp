import { Request, Response } from "express";
import { sendSuccess } from "../utils/response";

/**
 * GET /api/health
 * Must work immediately after `npm install && npm run dev`, even when
 * Firebase/Gemini/Maps/Twilio are not configured yet.
 */
export function getHealth(_req: Request, res: Response): void {
  sendSuccess(
    res,
    {
      status: "ok",
      service: "golden-hour-backend",
    },
    "Golden Hour backend is running"
  );
}
