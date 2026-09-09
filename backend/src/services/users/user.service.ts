import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";

const USERS_COLLECTION = "users";
const CRISIS_IDS_COLLECTION = "crisisIds";

function generateCrisisId(name?: string): string {
  const initials =
    (name ?? "GH")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "GH";

  const prefix = initials.padEnd(2, "G").slice(0, 2);
  const number = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}-${number}`;
}

export interface UserProfile {
  uid: string;
  crisisId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  role?: string | null;
  trustScore?: number | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function getOrCreateUserProfile(
  uid: string,
  fallbackEmail?: string,
): Promise<UserProfile> {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase Admin is not configured on this server.",
    );
  }

  const userRef = firestore.collection(USERS_COLLECTION).doc(uid);
  const snapshot = await userRef.get();

  if (snapshot.exists) {
    const existing = snapshot.data() as Partial<UserProfile>;

    if (existing.crisisId) {
      return {
        uid,
        ...existing,
        crisisId: existing.crisisId,
      } as UserProfile;
    }
  }

  const name = existingName(snapshot.data());
  const email = existingEmail(snapshot.data(), fallbackEmail);

  const crisisId = await reserveUniqueCrisisId(uid, name);

  const userData: UserProfile = {
    uid,
    crisisId,
    name,
    email,
    createdAt: snapshot.exists
      ? snapshot.data()?.createdAt
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await userRef.set(userData, { merge: true });

  return userData;
}

async function reserveUniqueCrisisId(
  uid: string,
  name?: string,
): Promise<string> {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase Admin is not configured on this server.",
    );
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const crisisId = generateCrisisId(name);
    const reservationRef = firestore
      .collection(CRISIS_IDS_COLLECTION)
      .doc(crisisId);

    try {
      await reservationRef.create({
        uid,
        crisisId,
        createdAt: new Date().toISOString(),
      });

      // Also protect against an ID that already belongs to an
      // older user created before the reservation collection existed.
      const existingUsers = await firestore
        .collection(USERS_COLLECTION)
        .where("crisisId", "==", crisisId)
        .limit(1)
        .get();

      if (!existingUsers.empty) {
        await reservationRef.delete();
        continue;
      }

      return crisisId;
    } catch (error: unknown) {
      // Another user already reserved this Crisis ID.
      if (isAlreadyExistsError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new AppError(
    500,
    "CRISIS_ID_GENERATION_FAILED",
    "Unable to generate a unique Crisis ID. Please try again.",
  );
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: unknown }).code;

  return code === 6 || code === "6" || code === "already-exists";
}

function existingName(
  data?: FirebaseFirestore.DocumentData,
): string | undefined {
  return typeof data?.name === "string" ? data.name : undefined;
}

function existingEmail(
  data?: FirebaseFirestore.DocumentData,
  fallbackEmail?: string,
): string | undefined {
  if (typeof data?.email === "string") {
    return data.email;
  }

  return fallbackEmail;
}