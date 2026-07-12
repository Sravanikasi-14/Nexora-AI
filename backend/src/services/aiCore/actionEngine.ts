import { getTool } from "./toolRegistry";

export interface ToolCallResult {
  toolName: string;
  success: boolean;
  output: any;
  error?: string;
}

export async function executeAction(
  businessId: string,
  toolName: string,
  input: any
): Promise<ToolCallResult> {
  const tool = getTool(toolName);

  if (!tool) {
    return {
      toolName,
      success: false,
      output: null,
      error: `Tool "${toolName}" is not registered.`,
    };
  }

  try {
    const output = await tool.execute(businessId, input);
    return {
      toolName,
      success: true,
      output,
    };
  } catch (err: any) {
    console.error(`[Action Engine] Error executing tool "${toolName}":`, err);
    return {
      toolName,
      success: false,
      output: null,
      error: err.message || "Execution failed.",
    };
  }
}
