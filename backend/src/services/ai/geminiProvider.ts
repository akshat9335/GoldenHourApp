import { getAiConfig } from "./aiConfig";

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

export async function requestGemini(
  prompt: string,
  image?: { mimeType: string; data: string },
): Promise<string> {
  const config = getAiConfig();
  if (!config.apiKey) throw new Error("Gemini is not configured.");

  const parts: GeminiPart[] = [{ text: prompt }];
  if (image) parts.push({ inlineData: image });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });
    const body = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      throw new Error(body.error?.message || `Gemini request failed (${response.status}).`);
    }
    const text = body.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();
    if (!text) throw new Error("Gemini returned an empty response.");
    return text;
  } finally {
    clearTimeout(timer);
  }
}
