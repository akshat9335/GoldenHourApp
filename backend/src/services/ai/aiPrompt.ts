import { EmergencyInput, ImageAnalysisInput } from "../../types/ai";

const safetyInstruction = `
You are an emergency decision-support assistant, not a doctor. Use only the
information supplied. Never claim a definitive diagnosis and never invent
vital signs. Prioritize immediate safety. If information is missing, say so.
Return ONLY valid JSON, with no markdown, using the requested schema.
`;

export function buildTriagePrompt(input: EmergencyInput): string {
  return `${safetyInstruction}
Analyze this emergency input:
${JSON.stringify(input)}

Return exactly:
{
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "emergencyType": "short non-diagnostic description",
  "confidence": 0.0,
  "immediateActions": ["safe action"],
  "avoidActions": ["unsafe action to avoid"],
  "hospitalRequired": true,
  "ambulanceRecommended": false,
  "explanation": "brief reasoning based only on supplied information",
  "disclaimer": "AI-generated emergency decision support. It is not a medical diagnosis."
}
`;
}

export function buildImagePrompt(input: ImageAnalysisInput): string {
  return `${safetyInstruction}
Review the attached image for visible injury indicators only. Do not identify a
person or provide a definitive diagnosis. Context: ${input.context || "none"}

Return exactly:
{
  "findings": ["visible finding or uncertainty"],
  "possibleInjuries": ["possible non-diagnostic category"],
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "confidence": 0.0,
  "immediateActions": ["safe action"],
  "requiresProfessionalAssessment": true,
  "explanation": "brief description of limits and findings",
  "disclaimer": "AI-generated emergency decision support. It is not a medical diagnosis."
}
`;
}
