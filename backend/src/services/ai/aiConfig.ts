import { env } from "../../config/env";

export type AiMode = "mock" | "live";

export interface AiConfig {
  mode: AiMode;
  apiKey?: string;
  model: string;
  timeoutMs: number;
}

/**
 * Read feature settings at call time so tests and long-running development
 * processes can change AI_MODE without reloading the application.
 */
export function getAiConfig(): AiConfig {
  const requestedMode = (process.env.AI_MODE || "mock").toLowerCase();
  const mode: AiMode = requestedMode === "live" ? "live" : "mock";
  const requestedTimeout = Number(process.env.AI_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(requestedTimeout) && requestedTimeout >= 1
      ? Math.min(requestedTimeout, 60_000)
      : 25_000;

  return {
    mode,
    apiKey: process.env.GEMINI_API_KEY || env.geminiApiKey,
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    timeoutMs,
  };
}
