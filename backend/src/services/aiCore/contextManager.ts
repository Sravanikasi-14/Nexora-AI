import { IntentType } from "./intentRouter";
import {
  getBusinessProfileContext,
  getDashboardContext,
  getAnalyticsContext,
  getGrowthMissionsContext,
  getInsightsContext,
  getAutomationContext,
  getWebsiteAnalysisContext,
  getConversationMemoryContext,
  getApplicationKnowledgeContext,
} from "./contextProviders";

export async function gatherContext(
  businessId: string,
  intents: IntentType[],
  question: string
): Promise<Record<string, unknown>> {
  const context: Record<string, unknown> = {};

  // Always load general business profile
  const profile = await getBusinessProfileContext(businessId);
  if (profile) {
    context.businessProfile = profile;
  }

  // Load conversational memory digest
  const memory = await getConversationMemoryContext(businessId);
  if (memory) {
    context.conversationMemory = memory;
  }

  // Conditionally load domain context based on active intents
  for (const intent of intents) {
    switch (intent) {
      case "Dashboard": {
        const data = await getDashboardContext(businessId);
        context.dashboard = data;
        break;
      }
      case "Customer Analytics": {
        const data = await getAnalyticsContext(businessId);
        context.customerAnalytics = data;
        break;
      }
      case "Growth Missions": {
        const data = await getGrowthMissionsContext(businessId);
        context.growthMissions = data;
        break;
      }
      case "Insights": {
        const data = await getInsightsContext(businessId);
        context.insights = data;
        break;
      }
      case "Automation": {
        const data = await getAutomationContext(businessId);
        context.automation = data;
        break;
      }
      case "Website Analysis":
      case "SEO":
      case "Marketing": {
        const data = await getWebsiteAnalysisContext(businessId);
        context.websiteAnalysis = data;
        break;
      }
      case "Application Help": {
        const data = getApplicationKnowledgeContext(question);
        context.appKnowledge = data;
        break;
      }
      default:
        break;
    }
  }

  return context;
}
