import {
  ImageAnalysisResult,
  TriageResult,
} from "../../types/ai";
import {
  validateImageAnalysisResponse,
  validateTriageResponse,
} from "./aiValidator";

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI response did not contain JSON.");
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

export function parseTriageResponse(text: string): TriageResult {
  return validateTriageResponse(extractJson(text));
}

export function parseImageAnalysisResponse(text: string): ImageAnalysisResult {
  return validateImageAnalysisResponse(extractJson(text));
}
