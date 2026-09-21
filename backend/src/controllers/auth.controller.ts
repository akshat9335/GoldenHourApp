import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { auth } from "../config/firebase";
import { getUserProfile } from "../services/users/user.service";

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication is required."
    );
  }

  const profile = await getUserProfile(req.user.uid);

  res.status(200).json({
    success: true,
    user: {
      uid: req.user.uid,
      email: req.user.email ?? null,
      role: profile?.role ?? req.user.role ?? null,
      roles: profile?.roles ?? (profile?.role ? [profile.role] : ["PATIENT"]),
      verificationStatus: profile?.verificationStatus ?? req.user.verificationStatus ?? null,
      roleVerificationStatus: profile?.roleVerificationStatus ?? req.user.roleVerificationStatus ?? {},
    },
  });
}

export async function createSession(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication is required."
    );
  }

  const profile = await getUserProfile(req.user.uid);

  res.status(200).json({
    success: true,
    session: {
      authenticated: true,
    },
    user: {
      uid: req.user.uid,
      email: req.user.email ?? null,
      role: profile?.role ?? req.user.role ?? null,
      roles: profile?.roles ?? (profile?.role ? [profile.role] : ["PATIENT"]),
      verificationStatus: profile?.verificationStatus ?? req.user.verificationStatus ?? null,
      roleVerificationStatus: profile?.roleVerificationStatus ?? req.user.roleVerificationStatus ?? {},
    },
  });
}

/**
 * Test token generator strictly for automated tests and local development.
 * Disabled in production environments.
 */
export async function createDevTestToken(req: Request, res: Response): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new AppError(403, "FORBIDDEN", "Test token generation is disabled in production.");
  }

  if (!auth) {
    throw new AppError(500, "FIREBASE_NOT_CONFIGURED", "Firebase Admin is not configured.");
  }

  const uid = req.body?.uid || "test-user-id";
  const customClaims = req.body?.claims || {};
  const customToken = await auth.createCustomToken(uid, customClaims);

  const apiKey =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyAuwCEuwtmQywC_W6xzlEM8F1VgcBvisPY";

  let idToken = customToken;
  try {
    const exchangeRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      }
    );
    const exchangeData = (await exchangeRes.json()) as { idToken?: string };
    if (exchangeData.idToken) {
      idToken = exchangeData.idToken;
    }
  } catch {}

  res.status(200).json({
    success: true,
    token: idToken,
    customToken,
    uid,
  });
}