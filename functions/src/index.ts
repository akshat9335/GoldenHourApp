// Firebase Cloud Functions for the Teleconsultation Module.
// Deploy with: firebase deploy --only functions
//
// Provides two https.onCall endpoints:
//   twilioToken  — short-lived Twilio Video Access Token, gated by patientId/doctorId.
//   iceServers   — short-lived TURN/STUN credentials from Twilio NTS.
//
// Storage of secrets (one-time):
//   firebase functions:secrets:set TWILIO_ACCOUNT_SID
//   firebase functions:secrets:set TWILIO_API_KEY_SID
//   firebase functions:secrets:set TWILIO_API_KEY_SECRET

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import twilio from 'twilio';

admin.initializeApp();

const AccessToken = twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

/** Returns a Twilio Video Access Token + the roomId to connect to. */
export const twilioToken = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'login required');
  }
  const { consultationId, role } = data as {
    consultationId: string;
    role: 'patient' | 'doctor';
  };

  const db = admin.firestore();
  const snap = await db.doc(`teleconsultations/${consultationId}`).get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'no consultation');
  }
  const t = snap.data()!;

  // ACCESS CHECK — must match userHasAccess() in src/services/teleconsultation.ts.
  const allowed =
    role === 'patient'
      ? t.patientId === ctx.auth.uid
      : t.doctorId === ctx.auth.uid;
  if (!allowed) {
    throw new functions.https.HttpsError('permission-denied', 'not your room');
  }

  const token = new AccessToken(
    functions.config().twilio.account_sid,
    functions.config().twilio.api_key_sid,
    functions.config().twilio.api_key_secret,
    { identity: `${ctx.auth.uid}_${role}`, ttl: 3600 },
  );
  token.addGrant(new VideoGrant({ room: t.roomId }));
  return { token: token.toJwt(), roomId: t.roomId };
});

/** Returns Twilio NTS ICE servers (TURN + STUN) with short-lived credentials. */
export const iceServers = functions.https.onCall(async (_data, ctx) => {
  if (!ctx.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'login required');
  }
  const sid = functions.config().twilio.account_sid;
  const secret = functions.config().twilio.api_key_secret;
  const auth =
    'Basic ' + Buffer.from(`${sid}:${secret}`).toString('base64');
  const r = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Tokens.json`,
    { headers: { Authorization: auth } },
  );
  const j = await r.json();
  return j.ice_servers;
});
