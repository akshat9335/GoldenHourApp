import {
  AI_DISCLAIMER,
  FirstAidInput,
  FirstAidResult,
  Severity,
  SEVERITIES,
} from "../../types/ai";
import { AppError } from "../../utils/AppError";

function textOf(input: FirstAidInput): string {
  return [
    input.emergencyType,
    input.injuryType,
    ...(input.symptoms || []),
    input.context,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getFirstAid(input: unknown): FirstAidResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(400, "INVALID_AI_INPUT", "First-aid input must be a JSON object.");
  }
  const value = input as FirstAidInput;
  if (value.symptoms !== undefined && !Array.isArray(value.symptoms)) {
    throw new AppError(400, "INVALID_AI_INPUT", "symptoms must be an array.");
  }
  if (
    value.symptoms?.some((symptom) => typeof symptom !== "string") ||
    (value.emergencyType !== undefined && typeof value.emergencyType !== "string") ||
    (value.injuryType !== undefined && typeof value.injuryType !== "string") ||
    (value.context !== undefined && typeof value.context !== "string")
  ) {
    throw new AppError(400, "INVALID_AI_INPUT", "First-aid fields have invalid types.");
  }
  if (
    value.severity !== undefined &&
    !SEVERITIES.includes(value.severity as (typeof SEVERITIES)[number])
  ) {
    throw new AppError(400, "INVALID_AI_INPUT", "severity is not valid.");
  }
  const text = textOf(value);
  let result: FirstAidResult = {
    title: "General emergency support",
    steps: [
      "Move to a safe place and keep the person calm.",
      "Monitor breathing, responsiveness, and worsening symptoms.",
      "Arrange medical assessment if symptoms do not improve.",
    ],
    doNot: ["Do not give unprescribed medication.", "Do not leave the person alone if they may deteriorate."],
    callEmergencyServices: false,
    explanation: "First-aid guidance is general support while arranging appropriate care.",
    disclaimer: AI_DISCLAIMER,
    source: "mock",
  };

  if (/\b(severe bleeding|uncontrolled bleeding|heavy bleeding)\b/.test(text)) {
    result = {
      ...result,
      title: "Severe bleeding",
      steps: [
        "Call local emergency services.",
        "Apply firm, continuous pressure with a clean dressing.",
        "Add more dressings if needed without removing the first.",
      ],
      doNot: ["Do not remove an embedded object.", "Do not repeatedly lift the dressing to check the wound."],
      callEmergencyServices: true,
    };
  } else if (/\b(burn|scald)\b/.test(text)) {
    result = {
      ...result,
      title: "Burn or scald",
      steps: [
        "Cool the area under clean, cool running water for at least 20 minutes.",
        "Remove nearby jewellery or clothing unless stuck to the skin.",
        "Cover loosely with a sterile non-fluffy dressing and seek assessment.",
      ],
      doNot: ["Do not apply ice, butter, creams, or adhesive dressings.", "Do not burst blisters."],
      callEmergencyServices: value.severity === "CRITICAL" || /\bsevere\b/.test(text),
    };
  } else if (/\b(fracture|broken bone|trauma)\b/.test(text)) {
    result = {
      ...result,
      title: "Possible fracture or trauma",
      steps: [
        "Keep the injured area still in the position found.",
        "Support it with padding without straightening the limb.",
        "Use a wrapped cold pack for swelling and arrange urgent assessment.",
      ],
      doNot: ["Do not straighten or push a bone back into place.", "Do not allow unnecessary movement."],
      callEmergencyServices: true,
    };
  } else if (/\b(choking|not breathing|unconscious)\b/.test(text)) {
    result = {
      ...result,
      title: "Breathing or responsiveness emergency",
      steps: [
        "Call local emergency services immediately.",
        "Check responsiveness and breathing and follow dispatcher instructions.",
        "Begin CPR only if trained or instructed by the dispatcher.",
      ],
      doNot: ["Do not leave the person alone.", "Do not give food, drink, or objects by mouth."],
      callEmergencyServices: true,
    };
  }

  if (value.severity === "CRITICAL") {
    result = {
      ...result,
      callEmergencyServices: true,
      steps: [
        "Call local emergency services immediately.",
        ...result.steps,
      ].slice(0, 5),
    };
  }
  return result;
}

export function isFirstAidSeverityCritical(severity?: Severity): boolean {
  return severity === "CRITICAL";
}
