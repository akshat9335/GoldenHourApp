import admin from "firebase-admin";
import { env, isFirebaseConfigured } from "./env";

/**
 * Single centralized Firebase Admin initialization.
 *
 * Feature modules must import `auth`, `firestore`, etc. from this file
 * instead of calling admin.initializeApp() themselves. If Firebase
 * credentials are not configured yet, these exports stay `null` and
 * any code that needs them should call `assertFirebaseReady()` first,
 * which throws a clear configuration error instead of a confusing
 * low-level Firebase SDK crash.
 */

let app: admin.app.App | null = null;

if (isFirebaseConfigured()) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey,
    }),
    storageBucket:
      env.firebase.storageBucket ||
      (env.firebase.projectId ? `${env.firebase.projectId}.firebasestorage.app` : undefined),
  });
} else {
  // Intentionally do not throw here. The core backend (health check,
  // routing, error handling) must be able to boot without Firebase
  // configured. Only Firebase-dependent features should fail.
  // eslint-disable-next-line no-console
  console.warn(
    "[firebase] Firebase Admin not initialized - FIREBASE_* env vars are missing. " +
      "Firebase-dependent routes will return a configuration error until this is set."
  );
}

export const firebaseApp = app;
export const auth = app ? admin.auth(app) : null;
export const firestore = (() => {
  if (!app) return null;
  const db = admin.firestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  return db;
})();
export const storage = app ? admin.storage(app) : null;
export const messaging = app ? admin.messaging(app) : null;

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super("Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.");
    this.name = "FirebaseNotConfiguredError";
  }
}

/** Call at the top of any Firebase-dependent code path. */
export function assertFirebaseReady(): void {
  if (!app) {
    throw new FirebaseNotConfiguredError();
  }
}
