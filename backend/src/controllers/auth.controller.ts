import { Request, Response } from "express";
import { AppError } from "../utils/AppError";

export function getMe(req: Request, res: Response): void {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication is required."
    );
  }

  res.status(200).json({
    success: true,
    user: {
      uid: req.user.uid,
      email: req.user.email ?? null,
      role: req.user.role ?? null,
    },
  });
}

export function createSession(req: Request, res: Response): void {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication is required."
    );
  }

  res.status(200).json({
    success: true,
    session: {
      authenticated: true,
    },
    user: {
      uid: req.user.uid,
      email: req.user.email ?? null,
      role: req.user.role ?? null,
    },
  });
}