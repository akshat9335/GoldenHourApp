import dotenv from "dotenv";

dotenv.config();

/**
 * Centralized environment configuration.
 *
 * CORE variables are required for the backend to boot at all.
 * OPTIONAL variables belong to features (Firebase, Gemini, Maps, Twilio)
 * that will be implemented module-by-module later. Missing optional
 * variables must never crash the server — they only cause a
 * clear configuration error when that specific feature is actually used.
 */

interface CoreConfig {
  port: number;
  nodeEnv: "development" | "production" | "test";
  isProduction: boolean;
}

interface FirebaseConfig {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
}

interface OptionalConfig {
  firebase: FirebaseConfig;
  geminiApiKey?: string;
  googleMapsServerApiKey?: string;
  twilio: {
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
  };
}

function parsePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // .env files store the key with literal "\n" sequences; convert them
  // back into real newlines so the PEM key parses correctly.
  return raw.replace(/\\n/g, "\n");
}

const core: CoreConfig = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: (process.env.NODE_ENV as CoreConfig["nodeEnv"]) || "development",
  isProduction: process.env.NODE_ENV === "production",
};

const optional: OptionalConfig = {
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || undefined,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || undefined,
    privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  },
  geminiApiKey: process.env.GEMINI_API_KEY || undefined,
  googleMapsServerApiKey: process.env.GOOGLE_MAPS_SERVER_API_KEY || undefined,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || undefined,
    authToken: process.env.TWILIO_AUTH_TOKEN || undefined,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || undefined,
  },
};

export const env = {
  ...core,
  ...optional,
};

/** True when all three Firebase Admin credentials are present. */
export function isFirebaseConfigured(): boolean {
  const { projectId, clientEmail, privateKey } = env.firebase;
  return Boolean(projectId && clientEmail && privateKey);
}

export function isGeminiConfigured(): boolean {
  return Boolean(env.geminiApiKey);
}

export function isMapsConfigured(): boolean {
  return Boolean(env.googleMapsServerApiKey);
}

export function isTwilioConfigured(): boolean {
  const { accountSid, authToken, phoneNumber } = env.twilio;
  return Boolean(accountSid && authToken && phoneNumber);
}
