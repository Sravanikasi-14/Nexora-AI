import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  if (!client) {
    client = new GoogleGenAI({
      apiKey: key,
    });
  }
  return client;
}

export function isGeminiEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function generateContent(params: {
  system: string;
  contents: string;
}): Promise<string | null> {
  const ai = getClient();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: params.contents,
      config: {
        systemInstruction: params.system,
      },
    });

    return response.text ?? null;
  } catch (err) {
    console.error("[AI Core] Gemini generation error:", err);
    return null;
  }
}
