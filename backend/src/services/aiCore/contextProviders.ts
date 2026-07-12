import { prisma } from "../../lib/prisma";
import { analyzeDigitalPresence } from "../../agents/digitalPresenceAgent";
import { analyzeGrowth } from "../../agents/growthAgent";
import { memoryDigest } from "../../agents/memoryAgent";
import { NEXORA_KNOWLEDGE } from "./appKnowledge";

export async function getBusinessProfileContext(businessId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return null;
  return {
    name: business.name,
    industry: business.industry,
    category: business.category,
    location: business.location,
    employeesCount: business.employees || "10",
    yearsInBusiness: business.yearsInBusiness,
    products: business.products,
    services: business.services,
    avgDailySales: business.avgDailySales,
    avgMonthlyRevenue: business.avgMonthlyRevenue || 500000,
    goals: business.goals,
  };
}

export async function getDashboardContext(businessId: string) {
  const assessment = await prisma.assessment.findUnique({ where: { businessId } });
  const dbMetrics = await prisma.dashboardMetrics.findUnique({ where: { businessId } });
  return {
    assessmentReadiness: assessment
      ? {
          readinessScore: assessment.readinessScore,
          confidenceScore: assessment.confidenceScore,
          digitalMaturity: assessment.digitalMaturity,
          growthScore: assessment.growthScore,
          strengths: assessment.strengthsJson ? JSON.parse(assessment.strengthsJson) : [],
          weaknesses: assessment.weaknessesJson ? JSON.parse(assessment.weaknessesJson) : [],
          roadmap: assessment.roadmapJson ? JSON.parse(assessment.roadmapJson) : [],
        }
      : null,
    dashboardMetrics: dbMetrics ? JSON.parse(dbMetrics.metricsJson) : null,
  };
}

export async function getAnalyticsContext(businessId: string) {
  const customers = await prisma.customer.findMany({ where: { businessId } });
  const sales = await prisma.sale.findMany({ where: { businessId } });
  const customerAnalytics = await prisma.customerAnalytics.findUnique({ where: { businessId } });
  const growth = analyzeGrowth(sales, customers);
  return {
    salesAndCustomersSummary: {
      totalCustomers: customers.length,
      totalSalesCount: sales.length,
      totalRevenue: sales.reduce((acc, s) => acc + s.amount, 0),
      avgOrderValue: sales.length > 0 ? Math.round(sales.reduce((sum, s) => sum + s.amount, 0) / sales.length) : 0,
      repeatCustomerRate: growth.repeatCustomerRate,
      inactiveCustomersCount: growth.inactiveCustomers.length,
    },
    customerSegments: customerAnalytics ? JSON.parse(customerAnalytics.dataJson) : null,
  };
}

export async function getGrowthMissionsContext(businessId: string) {
  const missions = await prisma.mission.findMany({
    where: { businessId, status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return { pendingMissions: missions };
}

export async function getInsightsContext(businessId: string) {
  const insights = await prisma.insight.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return { insightsStoryList: insights.map((i) => i.narrative) };
}

export async function getAutomationContext(businessId: string) {
  const drafts = await prisma.automationDraft.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return { automationDrafts: drafts };
}

export async function getWebsiteAnalysisContext(businessId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return null;
  const digital = analyzeDigitalPresence(business);
  return { digitalPresence: digital };
}

export async function getConversationMemoryContext(businessId: string) {
  const digest = await memoryDigest(businessId);
  return { memoryDigestSummary: digest };
}

export function getApplicationKnowledgeContext(question: string) {
  const q = question.toLowerCase();
  const matched = NEXORA_KNOWLEDGE.filter((item) =>
    item.keywords.some((kw) => q.includes(kw))
  );
  if (matched.length === 0) return { documentation: "Nexora is your AI Growth Partner. It helps small businesses evaluate search traffic, customer cohorts, daily missions, and WhatsApp auto-reminders." };
  return { documentation: matched.map((m) => `${m.category}: ${m.content}`).join("\n\n") };
}
