import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";
import {
  getUserProfile,
  registerUserProfile,
  updateUserProfile,
} from "../services/users/user.service";

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication is required.",
      );
    }

    const user = await getUserProfile(req.user.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        exists: false,
        error: {
          code: "PROFILE_NOT_FOUND",
          message: "User profile does not exist. Registration required.",
        },
      });
      return;
    }

    sendSuccess(res, { ...user, exists: true }, "User profile retrieved successfully.");
  } catch (err) {
    next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication is required.",
      );
    }

    // Canonical UID strictly from verified Firebase token
    const uid = req.user.uid;

    const profile = await registerUserProfile(uid, {
      ...req.body,
      email: req.user.email || req.body.email,
    });

    sendSuccess(res, profile, "User registered successfully.", 201);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication is required.",
      );
    }

    const updated = await updateUserProfile(req.user.uid, req.body);

    sendSuccess(res, updated, "User profile updated successfully.");
  } catch (err) {
    next(err);
  }
}