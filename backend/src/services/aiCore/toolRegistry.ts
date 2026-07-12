import { prisma } from "../../lib/prisma";
import { analyzeGrowth } from "../../agents/growthAgent";
import { analyzeDigitalPresence } from "../../agents/digitalPresenceAgent";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
  execute: (businessId: string, input: any) => Promise<any>;
}

const TOOLS: Record<string, ToolDefinition> = {};

export function registerTool(tool: ToolDefinition) {
  TOOLS[tool.name] = tool;
}

export function getTool(name: string): ToolDefinition | undefined {
  return TOOLS[name];
}

export function getAllTools(): ToolDefinition[] {
  return Object.values(TOOLS);
}

// 1. Dashboard Tool: returns assessment metrics summary
registerTool({
  name: "DashboardTool",
  description: "Retrieve dashboard summaries and business readiness metrics.",
  inputSchema: {},
  outputSchema: { metrics: "object" },
  execute: async (businessId) => {
    const assessment = await prisma.assessment.findUnique({ where: { businessId } });
    return {
      readinessScore: assessment?.readinessScore || 0,
      confidenceScore: assessment?.confidenceScore || 0,
      hasEnoughData: assessment?.hasEnoughData || false,
    };
  },
});

// 2. Analytics Tool: returns customer segments and sales summaries
registerTool({
  name: "AnalyticsTool",
  description: "Fetch customer Analytics summary, repeat client rates, and segment sizes.",
  inputSchema: {},
  outputSchema: { analytics: "object" },
  execute: async (businessId) => {
    const customers = await prisma.customer.findMany({ where: { businessId } });
    const sales = await prisma.sale.findMany({ where: { businessId } });
    const growth = analyzeGrowth(sales, customers);
    return {
      totalCustomers: customers.length,
      totalSalesCount: sales.length,
      repeatCustomerRate: growth.repeatCustomerRate,
      inactiveCustomersCount: growth.inactiveCustomers.length,
    };
  },
});

// 3. Navigation Tool: helps request path routes
registerTool({
  name: "NavigationTool",
  description: "Navigate to a specific path route in the application.",
  inputSchema: { path: "string" },
  outputSchema: { path: "string", success: "boolean" },
  execute: async (businessId, input) => {
    const path = input.path || "/dashboard";
    return { path, success: true };
  },
});

// 4. Growth Missions Tool: lists pending missions
registerTool({
  name: "GrowthMissionsTool",
  description: "Retrieve pending high-priority growth missions.",
  inputSchema: {},
  outputSchema: { missions: "array" },
  execute: async (businessId) => {
    const missions = await prisma.mission.findMany({
      where: { businessId, status: "pending" },
      take: 5,
    });
    return { pendingMissions: missions };
  },
});

// 5. Automation Tool: returns automation drafts count
registerTool({
  name: "AutomationTool",
  description: "Fetch draft messaging automations.",
  inputSchema: {},
  outputSchema: { drafts: "array" },
  execute: async (businessId) => {
    const drafts = await prisma.automationDraft.findMany({
      where: { businessId },
      take: 5,
    });
    return { automationDraftsCount: drafts.length };
  },
});

// 6. Insights Tool
registerTool({
  name: "InsightsTool",
  description: "Retrieve narrative analysis insights.",
  inputSchema: {},
  outputSchema: { insights: "array" },
  execute: async (businessId) => {
    const insights = await prisma.insight.findMany({ where: { businessId }, take: 5 });
    return { insightsCount: insights.length };
  },
});

// 7. Website Analysis Tool
registerTool({
  name: "WebsiteAnalysisTool",
  description: "Analyze business digital presence link states.",
  inputSchema: {},
  outputSchema: { maturity: "object" },
  execute: async (businessId) => {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return { error: "No business context" };
    const digital = analyzeDigitalPresence(business);
    return { digitalMaturity: digital.maturityScore };
  },
});

// 8. Placeholder tools for future capabilities
registerTool({
  name: "ReportsTool",
  description: "Generate sales or customer ledger reports.",
  inputSchema: { type: "string" },
  outputSchema: { success: "boolean" },
  execute: async () => ({ success: true, message: "Placeholder report generated successfully." }),
});

registerTool({
  name: "ExportTool",
  description: "Export data to CSV.",
  inputSchema: { format: "string" },
  outputSchema: { success: "boolean" },
  execute: async () => ({ success: true, message: "Data export initiated." }),
});

registerTool({
  name: "SearchTool",
  description: "Search local documents.",
  inputSchema: { query: "string" },
  outputSchema: { matches: "array" },
  execute: async () => ({ matches: [], message: "No matches found." }),
});
