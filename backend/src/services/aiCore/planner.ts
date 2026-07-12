import { IntentType } from "./intentRouter";

export interface ToolCallSpec {
  toolName: string;
  input: any;
}

export interface ExecutionPlan {
  requiredProviders: string[];
  toolCalls: ToolCallSpec[];
  shouldAnswerDirectly: boolean;
}

export function generateExecutionPlan(
  intents: IntentType[],
  question: string
): ExecutionPlan {
  const q = question.toLowerCase();
  const requiredProviders: string[] = ["BusinessProfile", "ConversationMemory"];
  const toolCalls: ToolCallSpec[] = [];
  let shouldAnswerDirectly = true;

  // 1. Map classified intents to corresponding Context Providers
  for (const intent of intents) {
    switch (intent) {
      case "Dashboard":
        requiredProviders.push("Dashboard");
        break;
      case "Customer Analytics":
        requiredProviders.push("Analytics");
        break;
      case "Growth Missions":
        requiredProviders.push("GrowthMissions");
        break;
      case "Insights":
        requiredProviders.push("Insights");
        break;
      case "Automation":
        requiredProviders.push("Automation");
        break;
      case "Website Analysis":
      case "SEO":
      case "Marketing":
        requiredProviders.push("WebsiteAnalysis");
        break;
      case "Application Help":
        requiredProviders.push("ApplicationKnowledge");
        break;
      default:
        break;
    }
  }

  // 2. Planning & Tool Selection based on query triggers
  
  // Navigation trigger: e.g. "Open Customer Analytics"
  if (q.includes("navigate to") || q.includes("open") || q.includes("go to") || q.includes("show page")) {
    let path = "/dashboard";
    if (q.includes("analytic") || q.includes("customer")) path = "/customers";
    else if (q.includes("chat")) path = "/chat";
    else if (q.includes("mission")) path = "/missions";
    else if (q.includes("insight")) path = "/insights";
    else if (q.includes("automation")) path = "/automation";
    else if (q.includes("setting")) path = "/settings";

    toolCalls.push({
      toolName: "NavigationTool",
      input: { path },
    });
  }

  // Refresh data triggers
  if (q.includes("refresh") || q.includes("load") || q.includes("fetch")) {
    if (q.includes("analytic") || q.includes("customer") || q.includes("sales")) {
      toolCalls.push({ toolName: "AnalyticsTool", input: {} });
    }
    if (q.includes("dashboard") || q.includes("readiness")) {
      toolCalls.push({ toolName: "DashboardTool", input: {} });
    }
    if (q.includes("mission")) {
      toolCalls.push({ toolName: "GrowthMissionsTool", input: {} });
    }
  }

  // Report generation triggers
  if (q.includes("generate report") || q.includes("make report") || q.includes("create report")) {
    toolCalls.push({
      toolName: "ReportsTool",
      input: { type: q.includes("sale") ? "sales" : "customer_intelligence" },
    });
  }

  // Export triggers
  if (q.includes("export")) {
    toolCalls.push({
      toolName: "ExportTool",
      input: { format: q.includes("excel") ? "xlsx" : "csv" },
    });
  }

  // Search triggers
  if (q.includes("search for") || q.includes("find in docs")) {
    const queryTerm = question.substring(question.indexOf("search for") + 10).trim();
    toolCalls.push({
      toolName: "SearchTool",
      input: { query: queryTerm },
    });
  }

  return {
    requiredProviders: Array.from(new Set(requiredProviders)),
    toolCalls,
    shouldAnswerDirectly,
  };
}
