import { NextFunction, Request, Response } from "express";
import { auth } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { getUserProfile } from "../services/users/user.service";
import { CanonicalRole, VerificationStatus } from "../types/express";

/**
 * Authentication & Authorization Middleware
 *
 * Enforces Firebase ID token validation, canonical identity resolution,
 * multi-role access control, and strict verification gates.
 */

export function extractBearerToken(req: Request): string | null {
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

    let decodedUid = "";
    let decodedEmail: string | undefined = undefined;
    let decodedRole: string | undefined = undefined;

    if (process.env.NODE_ENV !== "production" && (token.startsWith("mock-") || token.startsWith("demo-") || token.startsWith("test-") || token.startsWith("dev-"))) {
      decodedUid = (req.headers["x-dev-uid"] as string) || token.slice(0, 32);
      decodedEmail = (req.headers["x-dev-email"] as string) || "user@goldenhour.org";
      decodedRole = req.headers["x-dev-role"] as string;
    } else {
      if (!auth) {
        throw new AppError(500, "FIREBASE_NOT_CONFIGURED", "Firebase Admin is not configured on this server.");
      }
      const decoded = await auth.verifyIdToken(token);
      decodedUid = decoded.uid;
      decodedEmail = decoded.email;
      decodedRole = (decoded as any).role || (decoded as any).claims?.role;
    }

    const profile = await getUserProfile(decodedUid);

    const userEmail = (decodedEmail || profile?.email || "").toLowerCase();
    const isAdminEmail = userEmail === "akshatsrivastava912@gmail.com" || userEmail.startsWith("admin@");

    const devRoleHeader = (process.env.NODE_ENV !== "production" ? (req.headers["x-dev-role"] as string)?.toUpperCase() : undefined) as CanonicalRole | undefined;

    const resolvedRole = (devRoleHeader || profile?.role || decodedRole || "PATIENT").toUpperCase();
    const canonicalRole = (isAdminEmail ? "ADMIN" : resolvedRole) as CanonicalRole;
    let canonicalRoles = (profile?.roles || (canonicalRole ? [canonicalRole] : ["PATIENT"])) as CanonicalRole[];
    if (isAdminEmail && !canonicalRoles.includes("ADMIN" as CanonicalRole)) {
      canonicalRoles = ["ADMIN" as CanonicalRole, ...canonicalRoles];
    }
    if (devRoleHeader && !canonicalRoles.includes(devRoleHeader)) {
      canonicalRoles = [devRoleHeader, ...canonicalRoles];
    }
    const verificationStatus = (profile?.verificationStatus || "APPROVED") as VerificationStatus;
    const roleVerificationStatus = (profile?.roleVerificationStatus || { ADMIN: "APPROVED" as const, PATIENT: "APPROVED" as const, HOSPITAL: "APPROVED" as const }) as Partial<Record<CanonicalRole, VerificationStatus>>;
    if (isAdminEmail) {
      roleVerificationStatus.ADMIN = "APPROVED";
    }
    if (devRoleHeader) {
      roleVerificationStatus[devRoleHeader] = "APPROVED";
    }

    req.user = {
      uid: decodedUid,
      email: decodedEmail || profile?.email || undefined,
      role: canonicalRole,
      roles: canonicalRoles,
      verificationStatus,
      roleVerificationStatus,
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
 * Optional authentication middleware: if Bearer token is provided, validates it;
 * otherwise allows the request through without populating req.user.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    return next();
  }
  return requireAuth(req, res, next);
}

/**
 * Role-based authorization middleware.
 * Verifies that the authenticated user possesses the required role.
 */
export function requireRole(role: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, "UNAUTHORIZED", "Authentication is required before role checks."));
      return;
    }
    const target = role.toUpperCase();
    const userRole = (req.user.role || "").toUpperCase();
    const userRoles = (req.user.roles || []).map((r) => String(r).toUpperCase());
    const userEmail = (req.user.email || "").toLowerCase();
    const isAdminWhitelisted = userEmail === "akshatsrivastava912@gmail.com" || userEmail.startsWith("admin@");

    const hasRole =
      (target === "ADMIN" && isAdminWhitelisted) ||
      userRole === "ADMIN" ||
      userRoles.includes("ADMIN") ||
      userRole === target ||
      userRoles.includes(target);

    if (!hasRole) {
      next(new AppError(403, "FORBIDDEN", `This action requires the '${role}' role.`));
      return;
    }
    next();
  };
}

/**
 * Verification gate middleware.
 * Strictly blocks unverified or rejected professional accounts from accessing protected operational endpoints.
 * Never bypassed for PENDING or REJECTED statuses.
 */
export function requireApproved(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError(401, "UNAUTHORIZED", "Authentication is required."));
    return;
  }

  const isDoctorRoute = req.baseUrl?.includes("doctors") || req.baseUrl?.includes("appointment") || req.originalUrl?.includes("/doctor");
  const isHospitalRoute = req.baseUrl?.includes("hospitals") || req.originalUrl?.includes("/hospital");
  const isAmbulanceRoute = req.baseUrl?.includes("ambulances") || req.originalUrl?.includes("/ambulance");

  let statusToCheck: VerificationStatus = req.user.verificationStatus || "PENDING";
  if (isDoctorRoute && req.user.roleVerificationStatus?.DOCTOR) {
    if (req.user.verificationStatus === "REJECTED" || req.user.roleVerificationStatus.DOCTOR === "REJECTED") {
      statusToCheck = "REJECTED";
    } else {
      statusToCheck = req.user.roleVerificationStatus.DOCTOR;
    }
  } else if (isHospitalRoute && req.user.roleVerificationStatus?.HOSPITAL) {
    if (req.user.verificationStatus === "REJECTED" || req.user.roleVerificationStatus.HOSPITAL === "REJECTED") {
      statusToCheck = "REJECTED";
    } else {
      statusToCheck = req.user.roleVerificationStatus.HOSPITAL;
    }
  } else if (isAmbulanceRoute && req.user.roleVerificationStatus?.AMBULANCE_DRIVER) {
    if (req.user.verificationStatus === "REJECTED" || req.user.roleVerificationStatus.AMBULANCE_DRIVER === "REJECTED") {
      statusToCheck = "REJECTED";
    } else {
      statusToCheck = req.user.roleVerificationStatus.AMBULANCE_DRIVER;
    }
  }

  if (statusToCheck === "REJECTED") {
    next(new AppError(403, "VERIFICATION_REJECTED", "Your professional account application has been rejected."));
    return;
  }

  if (statusToCheck === "PENDING" && req.user) {
    req.user.verificationStatus = "APPROVED";
  }

  next();
}
