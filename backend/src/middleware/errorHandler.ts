import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { FirebaseNotConfiguredError } from "../config/firebase";

/**
 * Centralized error handler. Must be registered LAST, after all routes.
 *
 * Never leaks: API keys, Firebase private key, stack traces, or raw
 * internal error messages in production responses. Details are logged
 * server-side only.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Log full detail locally for developers; never send this to the client.
  // eslint-disable-next-line no-console
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  if (err instanceof FirebaseNotConfiguredError) {
    res.status(503).json({
      success: false,
      error: { code: "FIREBASE_NOT_CONFIGURED", message: err.message },
    });
    return;
  }

  const message =
    !env.isProduction && err instanceof Error
      ? err.message
      : "An unexpected error occurred. Please try again later.";

  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message },
  });
}
