import "express";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  /**
   * Role is not enforced yet (see middleware/auth.ts). It is read from
   * Firebase custom claims once role-based auth is implemented by the
   * respective feature owners (user / hospital / ambulance / doctor).
   */
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
