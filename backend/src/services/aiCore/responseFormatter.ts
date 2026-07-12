import { IntentType } from "./intentRouter";
import { ToolCallResult } from "./actionEngine";

export type ResponseType =
  | "Text"
  | "Voice"
  | "Navigation"
  | "Charts"
  | "Reports"
  | "ActionCards"
  | "Notifications";

export interface CoreResponsePayload {
  text: string;
  intents: IntentType[];
  responseType: ResponseType;
  recommendedActions: string[];
  toolExecutions?: ToolCallResult[];
  navigationPath?: string;
  meta: {
    engine: "Gemini" | "FallbackRule";
    timestamp: string;
  };
}

export function formatResponse(
  rawText: string,
  intents: IntentType[],
  engine: "Gemini" | "FallbackRule",
  toolExecutions?: ToolCallResult[]
): CoreResponsePayload {
  const recommendedActions: string[] = [];

  // Parse recommended actions from text (bullet points starting with •)
  const lines = rawText.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      const actionText = trimmed.replace(/^[•\-\*]\s*/, "");
      if (actionText) {
        recommendedActions.push(actionText);
      }
    }
  }

  // Determine Response Type based on tool calls
  let responseType: ResponseType = "Text";
  let navigationPath: string | undefined = undefined;

  if (toolExecutions && toolExecutions.length > 0) {
    const navCall = toolExecutions.find((t) => t.toolName === "NavigationTool" && t.success);
    if (navCall) {
      responseType = "Navigation";
      navigationPath = navCall.output?.path;
    } else {
      const reportCall = toolExecutions.find((t) => t.toolName === "ReportsTool" && t.success);
      if (reportCall) {
        responseType = "Reports";
      } else {
        responseType = "ActionCards";
      }
    }
  }

  return {
    text: rawText,
    intents,
    responseType,
    recommendedActions,
    toolExecutions,
    navigationPath,
    meta: {
      engine,
      timestamp: new Date().toISOString(),
    },
  };
}
