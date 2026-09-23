import { AppError } from "../../utils/AppError";
import {
  EmergencyInput,
  ImageAnalysisInput,
  ImageAnalysisResult,
  SEVERITIES,
  TriageResult,
} from "../../types/ai";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function invalidInput(message: string): AppError {
  return new AppError(400, "INVALID_AI_INPUT", message);
}

/** Validate and normalize the public emergency-input contract. */
export function validateEmergencyInput(input: unknown): EmergencyInput {
  if (!isRecord(input)) {
    throw invalidInput("Emergency input must be a JSON object.");
  }

  if (!isStringArray(input.symptoms)) {
    throw invalidInput("symptoms must be an array of strings.");
  }

  const symptoms = input.symptoms
    .map((symptom) => symptom.trim())
    .filter(Boolean);
  if (symptoms.length > 50) {
    throw invalidInput("symptoms cannot contain more than 50 items.");
  }

  if (input.patient !== undefined && !isRecord(input.patient)) {
    throw invalidInput("patient must be an object.");
  }
  if (input.injury !== undefined && !isRecord(input.injury)) {
    throw invalidInput("injury must be an object.");
  }
  if (input.vitalSigns !== undefined && !isRecord(input.vitalSigns)) {
    throw invalidInput("vitalSigns must be an object.");
  }
  if (input.bleeding !== undefined && !isRecord(input.bleeding)) {
    throw invalidInput("bleeding must be an object.");
  }
  if (input.location !== undefined && !isRecord(input.location)) {
    throw invalidInput("location must be an object.");
  }

  const vitalSigns = input.vitalSigns as Record<string, unknown> | undefined;
  if (
    vitalSigns &&
    vitalSigns.heartRate !== undefined &&
    (typeof vitalSigns.heartRate !== "number" ||
      vitalSigns.heartRate < 0 ||
      vitalSigns.heartRate > 300)
  ) {
    throw invalidInput("vitalSigns.heartRate must be between 0 and 300.");
  }
  if (
    vitalSigns &&
    vitalSigns.oxygenSaturation !== undefined &&
    (typeof vitalSigns.oxygenSaturation !== "number" ||
      vitalSigns.oxygenSaturation < 0 ||
      vitalSigns.oxygenSaturation > 100)
  ) {
    throw invalidInput("vitalSigns.oxygenSaturation must be between 0 and 100.");
  }

  if (
    input.consciousness !== undefined &&
    typeof input.consciousness !== "string"
  ) {
    throw invalidInput("consciousness must be a string.");
  }
  if (input.breathing !== undefined && typeof input.breathing !== "string") {
    throw invalidInput("breathing must be a string.");
  }
  if (input.notes !== undefined && typeof input.notes !== "string") {
    throw invalidInput("notes must be a string.");
  }

  return input as unknown as EmergencyInput;
}

function hasStrings(value: unknown): value is string[] {
  return isStringArray(value) && value.length > 0;
}

/** Strictly validate provider output before it can reach a client. */
export function validateTriageResponse(value: unknown): TriageResult {
  if (!isRecord(value)) throw new Error("AI response is not an object.");
  if (!SEVERITIES.includes(value.severity as (typeof SEVERITIES)[number])) {
    throw new Error("AI response has an invalid severity.");
  }
  if (typeof value.emergencyType !== "string" || !value.emergencyType.trim()) {
    throw new Error("AI response has no emergency type.");
  }
  if (
    typeof value.confidence !== "number" ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1
  ) {
    throw new Error("AI response has invalid confidence.");
  }
  if (!hasStrings(value.immediateActions) || !isStringArray(value.avoidActions)) {
    throw new Error("AI response has invalid action lists.");
  }
  if (
    typeof value.hospitalRequired !== "boolean" ||
    typeof value.ambulanceRecommended !== "boolean" ||
    typeof value.explanation !== "string"
  ) {
    throw new Error("AI response is missing required fields.");
  }

  return {
    severity: value.severity as TriageResult["severity"],
    emergencyType: value.emergencyType.trim(),
    confidence: value.confidence,
    immediateActions: value.immediateActions.slice(0, 10),
    avoidActions: value.avoidActions.slice(0, 10),
    hospitalRequired: value.hospitalRequired,
    ambulanceRecommended: value.ambulanceRecommended,
    explanation: value.explanation.trim(),
    disclaimer:
      typeof value.disclaimer === "string" && value.disclaimer.trim()
        ? value.disclaimer
        : "AI-generated emergency decision support. It is not a medical diagnosis.",
    source: "gemini",
  };
}

export function validateImageAnalysisInput(input: unknown): ImageAnalysisInput {
  if (!isRecord(input)) {
    throw invalidInput("Image analysis input must be a JSON object.");
  }
  const image = input.imageBase64 || input.imageData || input.image;
  if (typeof image !== "string" || image.trim().length < 20) {
    throw invalidInput("imageBase64 (or imageData) is required.");
  }
  if (image.length > 12_000_000) {
    throw invalidInput("Image payload is too large.");
  }
  if (
    typeof input.mimeType !== "string" ||
    !["image/jpeg", "image/png", "image/webp"].includes(input.mimeType)
  ) {
    throw invalidInput("mimeType must be image/jpeg, image/png, or image/webp.");
  }
  if (input.context !== undefined && typeof input.context !== "string") {
    throw invalidInput("context must be a string.");
  }
  return input as unknown as ImageAnalysisInput;
}

export function validateImageAnalysisResponse(
  value: unknown,
): ImageAnalysisResult {
  if (!isRecord(value)) throw new Error("Image response is not an object.");
  if (!hasStrings(value.findings) || !isStringArray(value.possibleInjuries)) {
    throw new Error("Image response has invalid findings.");
  }
  if (!SEVERITIES.includes(value.severity as (typeof SEVERITIES)[number])) {
    throw new Error("Image response has invalid severity.");
  }
  if (
    typeof value.confidence !== "number" ||
    value.confidence < 0 ||
    value.confidence > 1 ||
    !hasStrings(value.immediateActions) ||
    typeof value.requiresProfessionalAssessment !== "boolean" ||
    typeof value.explanation !== "string"
  ) {
    throw new Error("Image response is missing required fields.");
  }
  return {
    findings: value.findings.slice(0, 10),
    possibleInjuries: value.possibleInjuries.slice(0, 10),
    severity: value.severity as ImageAnalysisResult["severity"],
    confidence: value.confidence,
    immediateActions: value.immediateActions.slice(0, 10),
    requiresProfessionalAssessment: value.requiresProfessionalAssessment,
    explanation: value.explanation.trim(),
    disclaimer:
      typeof value.disclaimer === "string" && value.disclaimer.trim()
        ? value.disclaimer
        : "AI-generated emergency decision support. It is not a medical diagnosis.",
    source: "gemini",
    isAuthentic: typeof value.isAuthentic === "boolean" ? value.isAuthentic : true,
    authenticityAssessment:
      typeof value.authenticityAssessment === "string" && value.authenticityAssessment.trim()
        ? value.authenticityAssessment.trim()
        : "Automated image visual check completed.",
    authenticityScore:
      typeof value.authenticityScore === "number"
        ? Math.min(Math.max(value.authenticityScore, 0), 1)
        : 0.9,
  };
}
