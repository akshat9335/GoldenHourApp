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

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", routes);

  // Order matters: notFound catches anything unmatched above,
  // errorHandler must be registered last of all.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
