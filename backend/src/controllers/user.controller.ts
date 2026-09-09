import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";
import { getOrCreateUserProfile } from "../services/users/user.service";

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication is required.",
    );
  }

  const user = await getOrCreateUserProfile(
    req.user.uid,
    req.user.email,
  );

  sendSuccess(res, user, "User profile retrieved successfully.");
}