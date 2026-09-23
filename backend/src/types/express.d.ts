import "express";

export type CanonicalRole =
  | "PATIENT"
  | "DOCTOR"
  | "HOSPITAL"
  | "AMBULANCE_DRIVER"
  | "FRONTLINE_WORKER"
  | "ADMIN";

export type VerificationStatus = "APPROVED" | "PENDING" | "REJECTED";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role?: string;
  roles?: CanonicalRole[];
  verificationStatus?: VerificationStatus;
  roleVerificationStatus?: Partial<Record<CanonicalRole, VerificationStatus>>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
