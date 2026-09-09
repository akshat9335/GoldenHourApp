# Golden Hour — Backend Foundation

Common backend foundation for the Golden Hour project. This is a single,
shared Node.js/Express/TypeScript backend that every feature module
(AI, Hospital, Ambulance, Doctor, Location, Confirmation, etc.) will be
built on top of. **The frontend was not modified.**

## 1. What this is

A minimal, production-shaped Express + TypeScript API that:

- boots successfully with **zero external services configured**
- exposes one real endpoint: `GET /api/health`
- centralizes environment config, Firebase Admin init, auth, error
  handling and the API response format so every future module reuses
  the same foundation instead of reinventing it
- has an automated test suite that runs without any API keys

No business logic (AI triage, hospital matching, ambulance dispatch,
doctor queues, etc.) is implemented here. That is intentional — this
PR is only the shared foundation the team builds their modules on.

## 2. Folder structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts          # centralized env var loading + validation helpers
│   │   └── firebase.ts     # single Firebase Admin SDK initialization
│   ├── middleware/
│   │   ├── auth.ts         # requireAuth (Firebase ID token verification)
│   │   ├── errorHandler.ts # global error handler (last middleware)
│   │   └── notFound.ts     # 404 handler for unknown routes
│   ├── routes/
│   │   ├── index.ts        # mounts every feature router under /api
│   │   └── health.routes.ts
│   ├── controllers/
│   │   └── health.controller.ts
│   ├── services/           # (empty — business logic goes here per module)
│   ├── models/             # (empty — Firestore data types go here per module)
│   ├── utils/
│   │   ├── response.ts     # sendSuccess / sendError helpers
│   │   └── AppError.ts     # throw this for any handled/expected error
│   ├── types/
│   │   ├── api.ts          # ApiResponse / ApiSuccess / ApiError types
│   │   └── express.d.ts    # augments Request with `user`
│   ├── app.ts               # Express app assembly (used by tests too)
│   └── server.ts            # entrypoint — starts the HTTP listener
├── tests/
│   └── health.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
└── .gitignore
```

## 3. Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+

## 4. Installation

```bash
cd backend
npm install
```

## 5. Creating your local `.env`

```bash
cp .env.example .env
```

Then fill in only what you need for the module you're working on.
**`PORT` and `NODE_ENV` are the only required variables** — everything
else (Firebase, Gemini, Google Maps, Twilio) is optional until the
feature that needs it is implemented. Never commit your real `.env`.

## 6. Running the development server

```bash
npm run dev
```

This starts the server with hot reload (`tsx watch`). It will start
successfully even with a completely empty `.env`, and you'll see a
console warning if Firebase isn't configured — that's expected, not
an error.

## 7. Building

```bash
npm run build
```

Compiles TypeScript from `src/` into `dist/` using `tsc`.

## 8. Running the production server

```bash
npm run build
npm start
```

`npm start` runs the compiled output at `dist/server.js`.

## 9. Running tests

```bash
npm test
```

Runs the Vitest suite in `tests/`. `health.test.ts` does **not**
require Gemini, Google Maps, Twilio, or Firebase credentials to pass.

## 10. Health endpoint

```
GET /api/health
```

```json
{
  "success": true,
  "data": { "status": "ok", "service": "golden-hour-backend" },
  "message": "Golden Hour backend is running"
}
```

## 11. Authentication architecture

```
Frontend
   ↓
Firebase Authentication
   ↓
Firebase ID Token
   ↓
Authorization: Bearer <token>
   ↓
requireAuth middleware (src/middleware/auth.ts)
   ↓
admin.auth().verifyIdToken()
   ↓
req.user = { uid, email, role? }
   ↓
protected route handler
```

To protect a route once you need it:

```ts
import { requireAuth } from "../middleware/auth";
router.get("/me", requireAuth, controller.getMe);
```

`requireRole("doctor")` is scaffolded in the same file for future
role-based authorization, but is **not wired into any route yet** —
role business logic is out of scope for this foundation.

## 12. Firebase setup

1. In the Firebase console, generate a service account key for your
   project (Project Settings → Service Accounts → Generate new private key).
2. From the downloaded JSON, copy `project_id`, `client_email`, and
   `private_key` into your local `.env` as `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
3. `FIREBASE_PRIVATE_KEY` must be one line with `\n` escape sequences
   for newlines (see the example in `.env.example`) — `src/config/env.ts`
   converts these back into real newlines automatically.
4. Firebase Admin initializes exactly once, in `src/config/firebase.ts`.
   **Do not call `admin.initializeApp()` anywhere else.** Import
   `auth`, `firestore`, or `storage` from that file instead.
5. If Firebase isn't configured, `auth`/`firestore`/`storage` are
   `null`. Any Firebase-dependent code should call
   `assertFirebaseReady()` (exported from `config/firebase.ts`) first,
   which throws a clear `FIREBASE_NOT_CONFIGURED` error instead of a
   confusing low-level SDK crash.

## 13. Environment variables

| Variable | Required? | Used by |
|---|---|---|
| `PORT` | Core | Server |
| `NODE_ENV` | Core | Server, error handler |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Optional | Auth, Firestore-backed modules |
| `GEMINI_API_KEY` / `AI_MODE` / `GEMINI_MODEL` / `AI_TIMEOUT_MS` | Optional | AI module (Archit) |
| `GOOGLE_MAPS_SERVER_API_KEY` | Optional | Location module (Anant) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | Optional | Notifications (Akshat) |

`src/config/env.ts` exposes `isFirebaseConfigured()`,
`isGeminiConfigured()`, `isMapsConfigured()`, `isTwilioConfigured()` —
use these to fail fast with a clear error inside a specific
feature, rather than letting the whole server crash at boot.

## 14. Team development rules

- **Never** modify the frontend (`src/app`, `src/store`, etc. at the
  project root) — it is frozen.
- **Never** hard-code API keys or commit a real `.env`.
- **Never** re-initialize Firebase Admin outside `config/firebase.ts`.
- Keep controllers thin: `route → controller → service → Firebase/data
  layer → response`. Business logic belongs in `services/`.
- Common/core files (`app.ts`, `server.ts`, `config/env.ts`,
  `config/firebase.ts`, `middleware/*`, `routes/index.ts`) are shared —
  avoid unnecessary changes to them. Add your feature in its own
  `routes/<feature>.routes.ts`, `controllers/<feature>.controller.ts`,
  `services/<feature>/` instead.
- Work on your module in its own branch.

## 15. Future module structure

Add new features as sibling files/folders following the existing
pattern, then mount them in `src/routes/index.ts`:

| Owner | Routes |
|---|---|
| Akshat | `/auth`, `/users`, `/emergencies`, `/contacts`, `/notifications` |
| Archit | `/ai` |
| Aastha | `/hospitals`, `/facility`, `/referrals` |
| Akshita | `/ambulances`, `/trips` |
| Anant | `/location`, `/sync` |
| Adish | `/confirmations` |
| Doctor module | `/doctors`, `/appointments`, `/queue` |

Example for a new module:

```
src/routes/hospital.routes.ts
src/controllers/hospital.controller.ts
src/services/hospital/hospital.service.ts
```

```ts
// src/routes/index.ts
import hospitalRoutes from "./hospital.routes";
router.use("/hospitals", hospitalRoutes);
```

Firestore collections this backend is designed to eventually support
(not created yet): `users`, `emergencies`, `emergencyContacts`,
`confirmations`, `hospitals`, `ambulances`, `doctors`, `appointments`,
`queues`, `notifications`, `referrals`.

## 16. AI module

The AI module is available under `/api/ai` and is safe to run without any
external credentials. It defaults to deterministic mock mode:

```text
POST /api/ai/triage
POST /api/ai/image-analysis
POST /api/ai/first-aid
```

Set `AI_MODE=live` and provide `GEMINI_API_KEY` only in the backend
environment to use Gemini. Calls have a bounded timeout (`AI_TIMEOUT_MS`,
default 8000 ms). Provider errors, timeouts, missing configuration, and
malformed responses return a conservative fallback rather than crashing the
request. Deterministic safety rules always override a less severe provider
response for conditions such as unconsciousness, absent breathing, severe
bleeding, stroke-like symptoms, anaphylaxis, and critically low oxygen.

AI output is decision support, not a diagnosis. Every result includes the
standard disclaimer and a `source` (`mock`, `gemini`, or `fallback`).
