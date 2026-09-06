import { Response } from "express";
import { ApiErrorBody } from "../types/api";

/** Send a standardized success response. */
export function sendSuccess<T>(res: Response, data: T, message = "Request successful", statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

/** Send a standardized error response. */
export function sendError(res: Response, statusCode: number, error: ApiErrorBody): void {
  res.status(statusCode).json({
    success: false,
    error,
  });
}
