import { NextFunction, Request, Response } from "express";
import { auth } from "../config/firebase";
import { AppError } from "../utils/AppError";

/**
 * Authentication middleware foundation.
 *
 * Flow: Frontend -> Firebase Auth -> Firebase ID Token -> Authorization
 * header -> this middleware -> verifyIdToken() -> req.user -> route.
 *
 * Usage once a route needs protection:
 *   router.get("/me", requireAuth, controller.getMe);
 *
 * Role-based authorization is intentionally NOT implemented yet. The
 * `requireRole` scaffold below shows the intended future shape so
 * feature owners (user / hospital / ambulance / doctor modules) can
 * wire it up without redesigning this file.
 */

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new AppError(401, "UNAUTHORIZED", "Missing or malformed Authorization header. Expected: Bearer <Firebase ID Token>.");
    }

    if (!auth) {
      throw new AppError(500, "FIREBASE_NOT_CONFIGURED", "Firebase Admin is not configured on this server.");
    }

    const decoded = await auth.verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: (decoded as Record<string, unknown>).role as string | undefined,
    };

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, "INVALID_TOKEN", "Firebase ID token is invalid or expired."));
  }
}

/**
 * Placeholder for future role-based authorization, e.g.
 * requireRole("doctor"). Not wired into any route yet - this is scaffolding
 * only, per project scope (do not implement role business logic now).
 */
export function requireRole(role: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, "UNAUTHORIZED", "Authentication is required before role checks."));
      return;
    }
    if (req.user.role !== role) {
      next(new AppError(403, "FORBIDDEN", `This action requires the '${role}' role.`));
      return;
    }
    next();
  };
}
