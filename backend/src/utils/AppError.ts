/**
 * Throw this from controllers/services for any expected, handled error
 * (validation failure, missing config, auth failure, not found, etc.).
 * The global error handler turns it into the standard error response.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace?.(this, AppError);
  }
}
