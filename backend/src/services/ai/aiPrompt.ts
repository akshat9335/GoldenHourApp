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
Analyze the attached emergency scene or injury photograph with extreme clinical care:
1. AUTHENTICITY INSPECTION:
   - Carefully examine visual features (textures, lighting, edge realism, coherence) to evaluate whether this is an authentic, genuine real-world photograph of an accident or physical trauma.
   - Detect if this image appears to be AI-generated/synthetic, a digital artwork/drawing, a non-emergency stock photo, or completely unrelated to a medical emergency.
   - Set "isAuthentic": true (if genuine real-world incident photo) or false (if synthetic, AI-generated, cartoon, or non-emergency).
   - Set "authenticityAssessment": a concise 1-sentence verdict (e.g., "Genuine real-world emergency photograph.", "Warning: Image appears to be AI-generated or synthetic.", "Image does not depict an emergency or trauma scene.").
   - Set "authenticityScore": a confidence float between 0.0 and 1.0 (where 1.0 is highest certainty of genuine real photo).

2. VISIBLE INJURY & TRAUMA EVALUATION:
   - Inspect specific visible injury signs: bleeding, open lacerations, abrasions, burns, bone deformities/fractures, swelling, vehicle damage, or explicitly state if no visible physical trauma is observed.
   - Do NOT identify a person or provide a definitive medical certification. Context: ${input.context || "none"}

Return exactly:
{
  "isAuthentic": true,
  "authenticityAssessment": "clear verdict on authenticity",
  "authenticityScore": 0.95,
  "findings": ["visible finding or uncertainty"],
  "possibleInjuries": ["possible non-diagnostic category"],
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "confidence": 0.0,
  "immediateActions": ["safe first-aid action based on visible trauma"],
  "requiresProfessionalAssessment": true,
  "explanation": "concise description of limits, visual findings, and authenticity",
  "disclaimer": "AI-generated emergency decision support. It is not a medical diagnosis."
}
`;
}
