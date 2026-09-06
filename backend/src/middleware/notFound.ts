import { NextFunction, Request, Response } from "express";

/** Registered after all routes, before errorHandler. Catches unknown routes. */
export function notFound(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} does not exist.`,
    },
  });
}
