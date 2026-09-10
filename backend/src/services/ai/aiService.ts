import {
  AI_DISCLAIMER,
  EmergencyInput,
  TriageResult,
} from "../../types/ai";
import { buildTriagePrompt } from "./aiPrompt";
import { getAiConfig } from "./aiConfig";
import { parseTriageResponse } from "./aiParser";
import { requestGemini } from "./geminiProvider";
import {
  applySafetyRules,
  evaluateSafetyRules,
  maxSeverity,
} from "./emergencyRules";
import { validateEmergencyInput } from "./aiValidator";

function heuristicResult(input: EmergencyInput, source: "mock" | "fallback"): TriageResult {
  const text = [
    ...input.symptoms,
    input.injury?.type,
    input.injury?.description,
    input.breathing,
    input.consciousness,
    input.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  let severity: TriageResult["severity"] = "MEDIUM";
  let emergencyType = "Unspecified medical concern";
  if (/\b(minor|small|superficial|scratch|bruise)\b/.test(text)) {
    severity = "LOW";
    emergencyType = "Minor injury or symptoms";
  } else if (/\b(chest pain|difficulty breathing|shortness of breath|fracture|head injury|burn)\b/.test(text)) {
    severity = "HIGH";
    emergencyType = "Potentially serious injury or symptom";
  }
  const rule = evaluateSafetyRules(input);
  if (rule) {
    severity = maxSeverity(severity, rule.severity);
    emergencyType = rule.emergencyType;
  }
  return {
    severity,
    emergencyType,
    confidence: source === "mock" ? 0.72 : 0.35,
    immediateActions: rule?.immediateActions || [
      "Keep the person comfortable and monitor for changes.",
      "Arrange a medical assessment if symptoms persist or worsen.",
    ],
    avoidActions: rule?.avoidActions || [
      "Do not ignore worsening symptoms.",
      "Do not give medication unless it is normally prescribed for the person.",
    ],
    hospitalRequired: severity !== "LOW",
    ambulanceRecommended: severity === "CRITICAL",
    explanation:
      source === "mock"
        ? "This deterministic mock response is based only on the supplied emergency information."
        : "The AI provider was unavailable, so a conservative safety fallback was used.",
    disclaimer: AI_DISCLAIMER,
    source,
  };
}

export async function analyzeEmergency(input: unknown): Promise<TriageResult> {
  const validated = validateEmergencyInput(input);
  const config = getAiConfig();
  let result: TriageResult;

  if (config.mode === "mock") {
    result = heuristicResult(validated, "mock");
  } else {
    try {
      result = parseTriageResponse(
        await requestGemini(buildTriagePrompt(validated)),
      );
    } catch {
      result = heuristicResult(validated, "fallback");
    }
  }
  return applySafetyRules(result, validated);
}
