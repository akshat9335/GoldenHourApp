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
  let requiredCapabilities: string[] = ["EMERGENCY_ROOM", "TRAUMA_BAY"];
  let specialtyNeeded = "GENERAL";
  let recommendedHospitalType = "Emergency Care Facility";

  if (!text.trim() || text.length < 3) {
    // Fail-safe golden rule: Blank SOS or panic tap must default to CRITICAL resuscitation capability
    severity = "CRITICAL";
    emergencyType = "Emergency Rapid SOS (Unspecified Trauma/Medical)";
    requiredCapabilities = ["EMERGENCY_ROOM", "TRAUMA_BAY", "ICU_STANDBY"];
    specialtyNeeded = "GENERAL";
    recommendedHospitalType = "Level-1 Multi-Specialty ER Trauma Center";
  } else if (/\b(minor|small|superficial|scratch|bruise|chhoti chot)\b/.test(text)) {
    severity = "LOW";
    emergencyType = "Minor injury or symptoms";
    requiredCapabilities = ["OUTPATIENT_CLINIC", "FIRST_AID"];
    specialtyNeeded = "GENERAL";
    recommendedHospitalType = "Primary Healthcare Center / Outpatient Clinic";
  } else if (/\b(dog bite|animal bite|kutta|kutte|snake bite|saanp|cat bite|rabies|bite)\b/.test(text)) {
    severity = "MEDIUM";
    emergencyType = "Animal Bite / Potential Rabies Exposure";
    requiredCapabilities = ["EMERGENCY_ROOM", "WOUND_CARE", "RABIES_VACCINE"];
    specialtyNeeded = "GENERAL";
    recommendedHospitalType = "Emergency Care Center / Anti-Rabies Clinic";
  } else if (
    /\b(chest pain|difficulty breathing|shortness of breath|seene me dard|chhaati me dard|heart|saans|cardiac)\b/.test(text)
  ) {
    severity = "CRITICAL";
    emergencyType = "Acute Cardiac / Respiratory Distress";
    requiredCapabilities = ["ICU", "CATH_LAB", "CARDIAC_TEAM"];
    specialtyNeeded = "CARDIOLOGY";
    recommendedHospitalType = "Tertiary Cardiac & Emergency Hospital";
  } else if (
    /\b(fracture|head injury|burn|accident|khoon|bleeding|haddi|behoshi|unconscious|paralysis|stroke)\b/.test(text)
  ) {
    severity = "HIGH";
    emergencyType = "Acute Physical Trauma / Neurological Incident";
    requiredCapabilities = ["TRAUMA_BAY", "ORTHOPEDIC", "BLOOD_BANK", "ICU"];
    specialtyNeeded = "TRAUMA_ORTHO";
    recommendedHospitalType = "Level-1 Multi-Specialty Trauma Center";
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
    requiredCapabilities,
    specialtyNeeded,
    recommendedHospitalType,
    immediateActions: rule?.immediateActions || [
      "Keep the person comfortable and monitor vital signs closely.",
      "Stand by for incoming ambulance paramedic assessment.",
    ],
    avoidActions: rule?.avoidActions || [
      "Do not give food, water, or oral medication unless directed by emergency physicians.",
      "Do not move the patient unnecessarily if spinal or head injury is suspected.",
    ],
    hospitalRequired: severity !== "LOW",
    ambulanceRecommended: severity === "CRITICAL" || severity === "HIGH",
    explanation:
      source === "mock"
        ? "Deterministic clinical protocol applied based on emergency criteria."
        : "Conservative clinical safety protocol applied while live telemetry was streaming.",
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
    } catch (err: any) {
      console.error("[analyzeEmergency] Gemini call failed:", err?.message || err);
      result = heuristicResult(validated, "fallback");
    }
  }
  return applySafetyRules(result, validated);
}
