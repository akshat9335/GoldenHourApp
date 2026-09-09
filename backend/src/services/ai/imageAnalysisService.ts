import {
  AI_DISCLAIMER,
  ImageAnalysisInput,
  ImageAnalysisResult,
} from "../../types/ai";
import { getAiConfig } from "./aiConfig";
import { buildImagePrompt } from "./aiPrompt";
import { parseImageAnalysisResponse } from "./aiParser";
import { requestGemini } from "./geminiProvider";
import { validateImageAnalysisInput } from "./aiValidator";

function fallbackImageResult(
  input: ImageAnalysisInput,
  source: "mock" | "fallback",
): ImageAnalysisResult {
  return {
    findings: [
      "An image was received, but visual findings cannot be safely confirmed without a professional examination.",
    ],
    possibleInjuries: [],
    severity: "MEDIUM",
    confidence: source === "mock" ? 0.2 : 0.1,
    immediateActions: [
      "Do not rely on the image alone to assess severity.",
      "Seek professional medical assessment if there is pain, bleeding, swelling, or loss of function.",
    ],
    requiresProfessionalAssessment: true,
    explanation: input.context
      ? `Image analysis is limited; supplied context: ${input.context.slice(0, 300)}`
      : "Image analysis is limited and cannot replace an in-person assessment.",
    disclaimer: AI_DISCLAIMER,
    source,
  };
}

export async function analyzeImage(input: unknown): Promise<ImageAnalysisResult> {
  const validated = validateImageAnalysisInput(input);
  const config = getAiConfig();
  if (config.mode === "mock") return fallbackImageResult(validated, "mock");

  try {
    const data =
      validated.imageBase64 || validated.imageData || validated.image || "";
    const result = parseImageAnalysisResponse(
      await requestGemini(buildImagePrompt(validated), {
        mimeType: validated.mimeType,
        data: data.replace(/^data:[^;]+;base64,/, ""),
      }),
    );
    return result;
  } catch {
    return fallbackImageResult(validated, "fallback");
  }
}
