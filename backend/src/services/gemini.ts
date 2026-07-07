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

export function isAiEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function generateGroundedText(params: {
  system: string;
  groundingFacts: Record<string, unknown>;
  instruction: string;
  maxTokens?: number;
}): Promise<string | null> {
  const ai = getClient();

  if (!ai) return null;

  const { system, groundingFacts, instruction } = params;

  const prompt = `
${system}

STRICT RULES

Only use the facts below.

DATA

${JSON.stringify(groundingFacts, null, 2)}

TASK

${instruction}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text ?? null;
  } catch (err) {
    console.error("[Gemini] Error:", err);
    return null;
  }
}