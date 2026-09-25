import cors from "cors";
import express, { Application } from "express";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

/**
 * Express app assembly. Kept separate from server.ts so tests can
 * import the app directly (supertest) without binding a real port.
 */
export function createApp(): Application {
  const app = express();

  // Security Headers
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use((req, _res, next) => {
    // eslint-disable-next-line no-console
    console.log(`[REQ] ${req.method} ${req.originalUrl} | Auth: ${Boolean(req.headers.authorization)}`);
    next();
  });

  app.get("/", (_req, res) => {
    res.json({
      service: "Golden Hour Emergency API",
      status: "online",
      version: "1.0.0",
      documentation: "Golden Hour Emergency Response & Critical Care Network",
      healthCheck: "/api/health",
    });
  });

  app.use("/api", routes);

  // Order matters: notFound catches anything unmatched above,
  // errorHandler must be registered last of all.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

