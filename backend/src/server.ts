import { createApp } from "./app";
import { env } from "./config/env";
// Importing this module triggers the single centralized Firebase Admin
// initialization (or a warning if not configured). No further Firebase
// setup should happen anywhere else in the codebase.
import "./config/firebase";

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] Golden Hour backend listening on port ${env.port} (${env.nodeEnv})`);
  // eslint-disable-next-line no-console
  console.log(`[server] Health check: http://localhost:${env.port}/api/health`);
});
