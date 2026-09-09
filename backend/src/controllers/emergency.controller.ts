import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";
import {
  createEmergency,
  getEmergencyById,
  updateEmergency,
  CreateEmergencyInput,
} from "../services/emergencies/emergency.service";

function getUserUid(req: Request): string {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication is required.",
    );
  }

  return req.user.uid;
}

export async function createEmergencyController(
  req: Request,
  res: Response,
): Promise<void> {
  const uid = getUserUid(req);

  const input = req.body as CreateEmergencyInput;

  const emergency = await createEmergency(uid, input);

  sendSuccess(
    res,
    emergency,
    "Emergency reported successfully.",
    201,
  );
}

export async function getEmergencyController(
  req: Request,
  res: Response,
): Promise<void> {
  const uid = getUserUid(req);
  const { id } = req.params;

  if (!id) {
    throw new AppError(
      400,
      "INVALID_EMERGENCY_ID",
      "Emergency ID is required.",
    );
  }

  const emergency = await getEmergencyById(id, uid);

  sendSuccess(
    res,
    emergency,
    "Emergency retrieved successfully.",
  );
}

export async function updateEmergencyController(
  req: Request,
  res: Response,
): Promise<void> {
  const uid = getUserUid(req);
  const { id } = req.params;

  if (!id) {
    throw new AppError(
      400,
      "INVALID_EMERGENCY_ID",
      "Emergency ID is required.",
    );
  }

  const emergency = await updateEmergency(
    id,
    uid,
    req.body,
  );

  sendSuccess(
    res,
    emergency,
    "Emergency updated successfully.",
  );
}