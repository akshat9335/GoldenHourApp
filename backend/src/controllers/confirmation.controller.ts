import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import {
  confirmIncident,
  getIncidentConfirmationSummary,
  getUserConfirmationHistory,
  getUserConfirmationStatus,
} from "../services/confirmation/confirmation.service";

function getAuthenticatedUid(req: Request): string {
  if (!req.user || !req.user.uid) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required.");
  }
  return req.user.uid;
}

/**
 * POST /api/confirmations
 * Confirms an incident for the authenticated Firebase user.
 */
export async function confirmIncidentController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const uid = getAuthenticatedUid(req);

    if (!req.body || typeof req.body !== "object") {
      throw new AppError(422, "INVALID_INPUT", "Request body is required.");
    }

    const { emergencyId } = req.body;
    if (!emergencyId || typeof emergencyId !== "string" || !emergencyId.trim()) {
      throw new AppError(422, "INVALID_INPUT", "A valid emergencyId is required.");
    }

    // Explicitly use authenticated Firebase UID, rejecting any client-supplied userId
    const result = await confirmIncident(uid, { emergencyId: emergencyId.trim() });

    res.status(200).json({
      success: true,
      confirmed: true,
      confirmationCount: result.confirmationCount,
      status: result.status,
      data: result,
      message: "Incident confirmed successfully.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/confirmations/:emergencyId
 * Returns the confirmation count and status for an emergency.
 */
export async function getConfirmationSummaryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { emergencyId } = req.params;
    if (!emergencyId || typeof emergencyId !== "string" || !emergencyId.trim()) {
      throw new AppError(422, "INVALID_INPUT", "A valid emergencyId parameter is required.");
    }

    const result = await getIncidentConfirmationSummary(emergencyId.trim());

    res.status(200).json({
      success: true,
      emergencyId: result.emergencyId,
      confirmationCount: result.confirmationCount,
      status: result.status,
      data: result,
      message: "Confirmation status retrieved successfully.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/confirmations/:emergencyId/me
 * Returns whether the authenticated user has confirmed the emergency.
 */
export async function getMyConfirmationStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const uid = getAuthenticatedUid(req);
    const { emergencyId } = req.params;

    if (!emergencyId || typeof emergencyId !== "string" || !emergencyId.trim()) {
      throw new AppError(422, "INVALID_INPUT", "A valid emergencyId parameter is required.");
    }

    const result = await getUserConfirmationStatus(emergencyId.trim(), uid);

    res.status(200).json({
      success: true,
      confirmed: result.confirmed,
      data: result,
      message: result.confirmed
        ? "Incident confirmed by user."
        : "Incident not confirmed by user.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/confirmations/my
 * Returns the confirmation history for the authenticated user.
 */
export async function getMyConfirmationHistoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const uid = getAuthenticatedUid(req);
    const history = await getUserConfirmationHistory(uid);

    res.status(200).json({
      success: true,
      data: history,
      message: "Confirmation history retrieved successfully.",
    });
  } catch (err) {
    next(err);
  }
}
