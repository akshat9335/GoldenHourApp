// Firebase singleton for the Golden Hour app.
// Wraps @react-native-firebase/* modules so the rest of the app imports a
// stable, typed handle. If the native modules are not installed (e.g. running
// on web without Firebase JS SDK), the export falls back to no-op mocks so
// the rest of the codebase still type-checks.

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export async function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (_app) return _app;
  try {
    // Lazy require so Metro doesn't crash when the deps are absent.
    const { initializeApp, getApps } = require('firebase/app');
    const apps = getApps();
    _app = apps[0] ?? initializeApp({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    });
    return _app;
  } catch (e) {
    console.warn('[firebase] native SDK missing, using offline mock', e);
    return null;
  }
}

export async function getAuth(): Promise<Auth | null> {
  if (_auth) return _auth;
  try {
    const app = await getFirebaseApp();
    if (!app) return null;
    const { getAuth: ga } = require('firebase/auth');
    _auth = ga(app);
    return _auth;
  } catch (e) {
    console.warn('[firebase] auth unavailable', e);
    return null;
  }
}

export async function getDb(): Promise<Firestore | null> {
  if (_db) return _db;
  try {
    const app = await getFirebaseApp();
    if (!app) return null;
    const { getFirestore } = require('firebase/firestore');
    _db = getFirestore(app);
    return _db;
  } catch (e) {
    console.warn('[firebase] firestore unavailable', e);
    return null;
  }
}
