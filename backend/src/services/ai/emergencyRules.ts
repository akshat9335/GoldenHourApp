import {
  AI_DISCLAIMER,
  EmergencyInput,
  Severity,
  TriageResult,
} from "../../types/ai";

export interface SafetyRuleResult {
  severity: Severity;
  emergencyType: string;
  immediateActions: string[];
  avoidActions: string[];
  hospitalRequired: boolean;
  ambulanceRecommended: boolean;
  explanation: string;
}

const rank: Record<Severity, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function maxSeverity(a: Severity, b: Severity): Severity {
  return rank[a] >= rank[b] ? a : b;
}

function allText(input: EmergencyInput): string {
  return [
    ...input.symptoms,
    input.injury?.type,
    input.injury?.description,
    input.consciousness,
    input.breathing,
    input.bleeding?.severity,
    input.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Deterministic overrides for obvious life-threatening conditions. */
export function evaluateSafetyRules(input: EmergencyInput): SafetyRuleResult | null {
  const text = allText(input);
  const unconscious =
    input.consciousness?.toLowerCase() === "unconscious" ||
    /\bunresponsive\b|\bpassed out\b/.test(text);
  const notBreathing =
    input.breathing?.toLowerCase() === "not_breathing" ||
    /\bnot breathing\b|\bno breathing\b|\bapnea\b/.test(text);
  const severeBleeding =
    ["severe", "uncontrolled", "massive"].includes(
      input.bleeding?.severity?.toLowerCase() || "",
    ) ||
    /\b(heavy|severe|uncontrolled|massive) bleeding\b/.test(text);
  const lowOxygen =
    typeof input.vitalSigns?.oxygenSaturation === "number" &&
    input.vitalSigns.oxygenSaturation < 90;
  const strokeLike =
    /\b(stroke|face droop|facial droop|slurred speech|speech difficulty|one-sided weakness)\b/.test(
      text,
    );
  const anaphylaxis =
    /\b(anaphylaxis|severe allergic|throat swelling|cannot swallow)\b/.test(text);
  const seizure = /\b(seizure|convulsion)\b/.test(text);

  if (notBreathing || unconscious) {
    return {
      severity: "CRITICAL",
      emergencyType: "Immediate threat to consciousness or breathing",
      immediateActions: [
        "Call local emergency services immediately.",
        "Check responsiveness and breathing.",
        "Follow the emergency dispatcher's instructions.",
      ],
      avoidActions: ["Do not leave the person alone.", "Do not give food or drink."],
      hospitalRequired: true,
      ambulanceRecommended: true,
      explanation: "The supplied information indicates a possible immediate threat to life.",
    };
  }
  if (severeBleeding) {
    return {
      severity: "CRITICAL",
      emergencyType: "Severe or uncontrolled bleeding",
      immediateActions: [
        "Call local emergency services immediately.",
        "Apply firm, continuous direct pressure with a clean dressing.",
        "Add more dressings without removing the first one if blood soaks through.",
      ],
      avoidActions: ["Do not remove an embedded object.", "Do not release pressure repeatedly to check the wound."],
      hospitalRequired: true,
      ambulanceRecommended: true,
      explanation: "Severe or uncontrolled bleeding can become life-threatening quickly.",
    };
  }
  if (lowOxygen || anaphylaxis || strokeLike) {
    return {
      severity: "CRITICAL",
      emergencyType: anaphylaxis
        ? "Possible severe allergic reaction"
        : strokeLike
          ? "Possible stroke-like emergency"
          : "Dangerously low oxygen reading",
      immediateActions: [
        "Call local emergency services immediately.",
        "Keep the person still and monitor breathing and responsiveness.",
        "Note when symptoms started for emergency responders.",
      ],
      avoidActions: ["Do not drive the person yourself if an ambulance is available.", "Do not give food or drink if swallowing is impaired."],
      hospitalRequired: true,
      ambulanceRecommended: true,
      explanation: "A supplied symptom or vital sign meets a deterministic high-risk safety rule.",
    };
  }
  if (seizure) {
    return {
      severity: "HIGH",
      emergencyType: "Seizure or convulsion reported",
      immediateActions: [
        "Protect the person from nearby hazards and cushion the head.",
        "Time the seizure and monitor breathing.",
        "Call emergency services if it lasts five minutes, repeats, or breathing does not return to normal.",
      ],
      avoidActions: ["Do not restrain the person.", "Do not put anything in their mouth."],
      hospitalRequired: true,
      ambulanceRecommended: false,
      explanation: "Seizures require close observation and urgent assessment when prolonged or repeated.",
    };
  }
  return null;
}

export function applySafetyRules(
  result: TriageResult,
  input: EmergencyInput,
): TriageResult {
  const rule = evaluateSafetyRules(input);
  if (!rule) return result;
  const immediateActions = Array.from(
    new Set([...rule.immediateActions, ...result.immediateActions]),
  ).slice(0, 10);
  const avoidActions = Array.from(
    new Set([...rule.avoidActions, ...result.avoidActions]),
  ).slice(0, 10);
  return {
    ...result,
    severity: maxSeverity(result.severity, rule.severity),
    emergencyType: rule.emergencyType,
    immediateActions,
    avoidActions,
    hospitalRequired: true,
    ambulanceRecommended:
      rule.ambulanceRecommended || result.ambulanceRecommended,
    explanation: rule.explanation,
    disclaimer: AI_DISCLAIMER,
  };
}
