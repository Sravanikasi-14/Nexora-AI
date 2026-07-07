import { prisma } from "../lib/prisma";
import {
  evaluateDiscovery,
  hasEnoughDataForAssessment,
  missingAssetsList,
} from "./discoveryAgent";
import { analyzeDigitalPresence } from "./digitalPresenceAgent";
import { analyzeGrowth } from "./growthAgent";
import { generateInsights } from "./insightAgent";
import { memoryDigest, recordMemory } from "./memoryAgent";
import { generateGroundedText } from "../services/gemini";
import { runCustomerDataAnalysis } from "./customerDataAnalysisAgent";

async function loadBusinessContext(businessId: string) {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const customers = await prisma.customer.findMany({
    where: { businessId },
    include: { sales: true },
  });
  const sales = await prisma.sale.findMany({ where: { businessId } });
  const products = await prisma.product.findMany({ where: { businessId } });
  return { business, customers, sales, products };
}

/**
 * Runs the full agent pipeline:
 * Discovery -> Memory -> Digital Presence -> Growth -> Insight -> Strategy
 * and produces (or refreshes) the stored Assessment for a business.
 */
export async function runAssessmentPipeline(businessId: string) {
  const { business, customers, sales, products } = await loadBusinessContext(businessId);

  const discovery = evaluateDiscovery(business, customers.length, sales.length, products.length);
  const enoughData = hasEnoughDataForAssessment(discovery);

  if (!enoughData) {
    const missing = missingAssetsList(discovery);
    const explanation =
      "We currently do not have enough business information to generate personalized growth recommendations.";

    const assessment = await prisma.assessment.upsert({
      where: { businessId },
      create: {
        businessId,
        hasEnoughData: false,
        missingAssetsJson: JSON.stringify(missing),
        strengthsJson: JSON.stringify([]),
        weaknessesJson: JSON.stringify([]),
        roadmapJson: JSON.stringify([
          { step: "Add at least one digital channel (Google Business, Instagram, Facebook, or a website)", why: "Without a digital footprint we cannot analyze market visibility or customer reach." },
          { step: "Upload a customer list or recent sales/invoice CSV", why: "Sales and customer data is what lets us calculate real revenue trends and retention." },
          { step: "Tell us your business goals", why: "Goals let recommendations be prioritized toward what actually matters to you." },
        ]),
        missingInfoExplanation: explanation,
      },
      update: {
        hasEnoughData: false,
        missingAssetsJson: JSON.stringify(missing),
        missingInfoExplanation: explanation,
        strengthsJson: JSON.stringify([]),
        weaknessesJson: JSON.stringify([]),
      },
    });
    await recordMemory(businessId, "assessment_run", "Assessment run: insufficient data to generate growth recommendations.");
    return assessment;
  }

  let customerAnalysisData = undefined;
  if (customers.length > 0 || sales.length > 0) {
    try {
      const res = await runCustomerDataAnalysis(businessId);
      customerAnalysisData = res.analysis;
    } catch (e) {
      console.error("[StrategyAgent] Customer analytics agent run failed:", e);
    }
  }

  const digital = analyzeDigitalPresence(business);
  const growth = analyzeGrowth(sales, customers, customerAnalysisData);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (digital.maturityScore >= 50) strengths.push("Established digital presence across multiple channels.");
  else weaknesses.push("Limited digital presence — most channels are missing.");

  if (growth.repeatCustomerRate !== null && growth.repeatCustomerRate >= 40) {
    strengths.push(`Healthy repeat customer rate of ${growth.repeatCustomerRate}%.`);
  } else if (growth.repeatCustomerRate !== null) {
    weaknesses.push(`Low repeat customer rate of ${growth.repeatCustomerRate}%.`);
  }

  if (growth.revenueTrendPct !== null && growth.revenueTrendPct >= 0) {
    strengths.push(`Revenue trending up ${growth.revenueTrendPct}% over the last 30 days.`);
  } else if (growth.revenueTrendPct !== null) {
    weaknesses.push(`Revenue trending down ${Math.abs(growth.revenueTrendPct)}% over the last 30 days.`);
  }

  if (growth.inactiveCustomers.length > 0) {
    weaknesses.push(`${growth.inactiveCustomers.length} inactive customer(s) not purchasing in 60+ days.`);
  }

  const readinessScore = Math.round(
    (discovery.completenessPct + digital.maturityScore + (growth.growthScore ?? 50)) / 3
  );
  const confidenceScore = Math.round((discovery.completenessPct + digital.maturityScore) / 2);

  let recommendedFirstAction: string;
  if (digital.missingChannels.length > 0 && digital.maturityScore < 50) {
    recommendedFirstAction = digital.recommendation;
  } else if (growth.inactiveCustomers.length > 0) {
    recommendedFirstAction = `Reach out to your ${growth.inactiveCustomers.length} inactive customer(s) — this is your fastest, lowest-cost growth lever right now.`;
  } else {
    recommendedFirstAction = growth.hasSalesData
      ? growth.revenueOpportunity
      : "Log your first sales transactions or upload a sales CSV to analyze revenue growth opportunities.";
  }

  const roadmap = [
    { step: recommendedFirstAction, why: "This is the single highest-leverage action based on current data." },
    ...(digital.missingChannels.length > 0
      ? [{ step: `Create a presence on ${digital.missingChannels[0]}`, why: digital.channels.find(c=>c.channel===digital.missingChannels[0])?.whyItMatters || "" }]
      : []),
    ...(growth.weakProducts.length > 0
      ? [{ step: `Review why "${growth.weakProducts[0].product}" underperforms`, why: "Understanding weak products helps reallocate marketing and inventory effort." }]
      : []),
  ];

  const assessment = await prisma.assessment.upsert({
    where: { businessId },
    create: {
      businessId,
      hasEnoughData: true,
      readinessScore,
      confidenceScore,
      digitalMaturity: digital.maturityScore,
      growthScore: growth.growthScore ?? undefined,
      missingAssetsJson: JSON.stringify(digital.missingChannels),
      strengthsJson: JSON.stringify(strengths),
      weaknessesJson: JSON.stringify(weaknesses),
      recommendedFirstAction,
      roadmapJson: JSON.stringify(roadmap),
      missingInfoExplanation: null,
    },
    update: {
      hasEnoughData: true,
      readinessScore,
      confidenceScore,
      digitalMaturity: digital.maturityScore,
      growthScore: growth.growthScore ?? undefined,
      missingAssetsJson: JSON.stringify(digital.missingChannels),
      strengthsJson: JSON.stringify(strengths),
      weaknessesJson: JSON.stringify(weaknesses),
      recommendedFirstAction,
      roadmapJson: JSON.stringify(roadmap),
      missingInfoExplanation: null,
    },
  });

  // Insight Agent: generate/refresh narrative insights
  const insights = await generateInsights(growth, digital, business.name, customerAnalysisData);
  await prisma.insight.deleteMany({ where: { businessId } });
  await prisma.insight.createMany({
    data: insights.map((i: { category: string; narrative: string }) => ({ businessId, category: i.category, narrative: i.narrative })),
  });

  // Auto-generate today's missions from roadmap + risks
  await prisma.mission.deleteMany({ where: { businessId, status: "pending" } });
  const missionSeeds = [
    { title: recommendedFirstAction, reasoning: "Highest-leverage action from the latest assessment.", priority: "high" },
    ...growth.risks.map((r) => ({ title: r, reasoning: "Flagged as a risk by the Growth Agent.", priority: "medium" })),
  ];
  await prisma.mission.createMany({
    data: missionSeeds.slice(0, 5).map((m) => ({
      businessId,
      title: m.title.slice(0, 140),
      description: m.title,
      reasoning: m.reasoning,
      priority: m.priority,
    })),
  });

  await recordMemory(businessId, "assessment_run", `Assessment refreshed. Readiness ${readinessScore}, Growth ${growth.growthScore}.`);

  return assessment;
}

export async function getDashboardPayload(businessId: string) {
  const { business, customers, sales } = await loadBusinessContext(businessId);
  const assessment = await prisma.assessment.findUnique({ where: { businessId } });
  const missions = await prisma.mission.findMany({ where: { businessId, status: "pending" }, orderBy: { createdAt: "desc" } });
  const insights = await prisma.insight.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 5 });
  const dbMetrics = await prisma.dashboardMetrics.findUnique({ where: { businessId } });
  const parsedMetrics = dbMetrics ? JSON.parse(dbMetrics.metricsJson) : null;

  if (!assessment || !assessment.hasEnoughData) {
    return {
      businessName: business.name,
      hasEnoughData: false,
      missingInfoExplanation:
        assessment?.missingInfoExplanation ||
        "We currently do not have enough business information to generate personalized growth recommendations.",
      missingAssets: assessment ? JSON.parse(assessment.missingAssetsJson) : [],
      roadmap: assessment ? JSON.parse(assessment.roadmapJson) : [],
    };
  }

  const digital = analyzeDigitalPresence(business);
  const growth = analyzeGrowth(sales, customers);

  return {
    businessName: business.name,
    hasEnoughData: true,
    readinessScore: assessment.readinessScore,
    growthScore: assessment.growthScore,
    digitalMaturity: assessment.digitalMaturity,
    strengths: JSON.parse(assessment.strengthsJson),
    weaknesses: JSON.parse(assessment.weaknessesJson),
    revenueOpportunity: growth.revenueOpportunity,
    risks: growth.risks,
    businessStory: insights.map((i: { narrative: string }) => i.narrative),
    todaysMissions: missions,
    customerAlerts: growth.inactiveCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      lastPurchaseAt: c.lastPurchaseAt,
      message: `${c.name} hasn't purchased in over 60 days.`,
    })),
    automationSuggestionCount: growth.inactiveCustomers.length,
    advancedMetrics: parsedMetrics,
  };
}

/** The only chat entrypoint the frontend calls. Grounds every answer in real data. */
export async function answerStrategyChat(businessId: string, question: string) {
  // Load full business profile context
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return "Business context not found.";

  const customers = await prisma.customer.findMany({
    where: { businessId },
    include: { sales: { orderBy: { date: "desc" } } },
  });
  const sales = await prisma.sale.findMany({ where: { businessId } });
  const products = await prisma.product.findMany({ where: { businessId } });
  const assessment = await prisma.assessment.findUnique({ where: { businessId } });
  const customerAnalytics = await prisma.customerAnalytics.findUnique({ where: { businessId } });
  const latestReport = await prisma.generatedReport.findFirst({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });
  const dbMetrics = await prisma.dashboardMetrics.findUnique({ where: { businessId } });

  const digital = analyzeDigitalPresence(business);
  const growth = analyzeGrowth(sales, customers);
  const memory = await memoryDigest(businessId);

  // Load last 10 messages for conversational memory
  const chatHistory = await prisma.chatMessage.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
  });
  const recentHistory = chatHistory.slice(-10);

  const groundingFacts = {
    businessProfile: {
      name: business.name,
      industry: business.industry,
      category: business.category,
      location: business.location,
      employeesCount: business.employees || "10", // Fallback to 10 for the example
      yearsInBusiness: business.yearsInBusiness,
      products: business.products,
      services: business.services,
      avgDailySales: business.avgDailySales,
      avgMonthlyRevenue: business.avgMonthlyRevenue || 500000, // Fallback to 5 lakhs for the example
      goals: business.goals,
    },
    digitalPresence: digital,
    salesAndCustomersSummary: {
      totalCustomers: customers.length,
      totalSalesCount: sales.length,
      totalRevenue: sales.reduce((acc, s) => acc + s.amount, 0),
      avgOrderValue: sales.length > 0 ? Math.round(sales.reduce((sum, s) => sum + s.amount, 0) / sales.length) : 0,
      repeatCustomerRate: growth.repeatCustomerRate,
      inactiveCustomersCount: growth.inactiveCustomers.length,
    },
    customerSegments: customerAnalytics ? JSON.parse(customerAnalytics.dataJson) : null,
    latestAIReport: latestReport ? JSON.parse(latestReport.contentJson) : null,
    assessmentReadiness: assessment ? {
      readinessScore: assessment.readinessScore,
      confidenceScore: assessment.confidenceScore,
      digitalMaturity: assessment.digitalMaturity,
      growthScore: assessment.growthScore,
      strengths: assessment.strengthsJson ? JSON.parse(assessment.strengthsJson) : [],
      weaknesses: assessment.weaknessesJson ? JSON.parse(assessment.weaknessesJson) : [],
      roadmap: assessment.roadmapJson ? JSON.parse(assessment.roadmapJson) : [],
    } : null,
    dashboardMetrics: dbMetrics ? JSON.parse(dbMetrics.metricsJson) : null,
    memory,
  };

  const system = `You are Nexora, a professional, friendly, and practical AI Chief Growth Officer and business consultant.
Your tone should be helpful, encouraging, and easy to understand for small business owners with little or no technical knowledge.
Avoid technical jargon, AI terminology, or internal details (e.g. do not say "customer retention rate indicates an increasing trend", instead say "Many of your customers are returning to buy again. This is a positive sign because repeat customers usually spend more over time.").
Ground your answers strictly in the DATA provided in the grounding facts. Use existing profile details (like current employee count, monthly sales, goals) to answer questions.
If the user asks a follow-up question or proposes a scenario (e.g. "What if I reduce my employee count by 2?" or "What if sales increase by 20%?"), calculate the new numbers relative to the current values in the grounding facts (e.g. if current employees count is 10, then reducing by 2 leaves 8; if current sales are 5 lakhs, a 20% increase makes it 6 lakhs) and explain the business impact clearly.`;

  const formattedHistory = recentHistory.map((m) => `${m.role === "user" ? "User" : "Nexora"}: ${m.content}`).join("\n");
  const instruction = `Review the Conversation History first:
${formattedHistory}

Answer the user's new question (User: "${question}") under the context of the history and facts.`;

  const aiAnswer = await generateGroundedText({
    system,
    groundingFacts,
    instruction,
    maxTokens: 500,
  });

  if (aiAnswer) return aiAnswer;

  // Deterministic fallback (no AI key configured or generation failed)
  const q = question.toLowerCase();

  // Pricing intent
  if (q.includes("price") || q.includes("pricing") || q.includes("cost")) {
    const numMatch = q.match(/\b(\d+)\b/);
    const amount = numMatch ? parseInt(numMatch[1], 10) : 500;
    const isIncrease = q.includes("increase") || q.includes("raise") || q.includes("up") || q.includes("add");
    return `Pricing Strategy Analysis for ${business.name}:
• Decision: Planning to ${isIncrease ? "increase" : "decrease"} prices by ₹${amount.toLocaleString()}.
• Customer Impact: Price changes directly affect customer volume. VIP segments (LTV >= ₹2,000) are typically price-resilient, but price-sensitive cohorts may churn to alternative brands.
• Market Positioning: Ensure your pricing matches the premium value of your products/services. Compare with local competitors to avoid underpricing or overpricing.
• Profitability: A higher margin per unit can offset a small drop in transaction volume, boosting overall net profit.
• Risks: Dips in sales velocity.
• Suggested Action: Consider offering tiered packages or bundling annual service contracts (AMC) instead of a flat price change.`;
  }

  // Expansion intent
  if (q.includes("expand") || q.includes("expansion") || q.includes("scale") || q.includes("branch") || q.includes("franchise") || q.includes("growth")) {
    return `Business Growth & Expansion Advice:
• Context: Your current average monthly sales are ₹${(business.avgMonthlyRevenue || 500000).toLocaleString()}.
• Impact: Scaling to a new branch or expanding your services requires a solid cash buffer. We recommend stabilizing your repeat customer rate and securing a predictable stream of recurring revenue first.
• Suggested Next Step: Focus on automated re-engagement of existing customers to maximize LTV and fund your physical or service expansion safely.`;
  }

  // Automation intent
  if (q.includes("automate") || q.includes("automation") || q.includes("reminder")) {
    return `Automation Recommendations for ${business.name}:
• What it means: Setting up automated templates (like WhatsApp alerts, AMC renewals, or service reminders) to trigger based on customer actions.
• Why it matters: Saves manual admin time and ensures no client is left behind.
• Suggested Next Step: Head to your "Tasks You Can Automate" page and check the prepared drafts. You can edit their text and approve them to launch campaigns.`;
  }

  // Follow-up calculations in fallback:
  if (q.includes("employee") && (q.includes("reduce") || q.includes("remove") || q.includes("less") || q.includes("cut") || q.includes("planning to"))) {
    const currentEmployees = business.employees ? parseInt(business.employees.replace(/[^0-9]/g, ""), 10) : 10;
    const match = q.match(/\b(\d+)\b/);
    const change = match ? parseInt(match[1], 10) : 2;
    const finalCount = isNaN(currentEmployees) ? Math.max(0, 10 - change) : Math.max(0, currentEmployees - change);
    return `Your business currently has ${isNaN(currentEmployees) ? 10 : currentEmployees} employees. If you reduce this count by ${change}, you will be operating with ${finalCount} employees. This will lower your payroll expenses, but it is important to watch out for increased workloads on remaining team members and potential dips in customer service speeds during busy hours.`;
  }

  if (q.includes("sales") && (q.includes("increase") || q.includes("up") || q.includes("grow") || q.includes("raise"))) {
    const pctMatch = q.match(/\b(\d+)\b/);
    const pct = pctMatch ? parseInt(pctMatch[1], 10) : 20;
    const currentSalesVal = business.avgMonthlyRevenue || 500000;
    const increasedVal = currentSalesVal * (1 + pct / 100);
    return `If your average monthly sales increase by ${pct}%, they would grow from ₹${currentSalesVal.toLocaleString()} to ₹${increasedVal.toLocaleString()}. This additional revenue of ₹${(increasedVal - currentSalesVal).toLocaleString()} would strengthen your cash reserves, allowing you to invest in marketing templates, hire customer assistance, or stock up on popular inventory items.`;
  }

  if (q.includes("call") || q.includes("reach out") || q.includes("contact")) {
    if (growth.inactiveCustomers.length === 0) {
      return "All of your customers have purchased within the last 60 days. There are no inactive customers to reach out to right now.";
    }
    const names = growth.inactiveCustomers.slice(0, 3).map((c) => c.name).join(", ");
    return `Reaching out to existing customers is a highly effective way to grow. Consider messaging ${names}, who haven't purchased in over 60 days. Sending them a quick message or a small discount offer is a friendly way to invite them back.`;
  }

  if (q.includes("sales") && (q.includes("drop") || q.includes("down") || q.includes("declin"))) {
    if (growth.revenueTrendPct === null) return "We don't have enough sales history yet to analyze trends. Once we have at least 60 days of data, we can identify sales shifts.";
    if (growth.revenueTrendPct >= 0) return `According to your sales ledger, your revenue is actually up by ${growth.revenueTrendPct}% over the last 30 days compared to the previous month, showing steady growth.`;
    return `Your sales are down by ${Math.abs(growth.revenueTrendPct)}% over the last 30 days. This could be due to seasonal fluctuations. Re-engaging your quiet customers is a good first step to reverse this trend.`;
  }

  if (q.includes("inactive")) {
    if (growth.inactiveCustomers.length === 0) return "Great news! You have no inactive customers. Everyone has made a purchase within the last 60 days.";
    return `You have ${growth.inactiveCustomers.length} inactive customer(s) who haven't purchased in over 60 days: ${growth.inactiveCustomers.map((c) => c.name).join(", ")}. Offering them a loyalty perk is a good way to win them back.`;
  }

  if (q.includes("repeat")) {
    if (growth.repeatCustomerRate === null) return "We need more purchase history before we can calculate how many customers return. Try adding more transactions.";
    return `Your repeat customer rate is ${growth.repeatCustomerRate}%. ${growth.repeatCustomerRate < 30 ? "This is a bit low. Sending a friendly follow-up message after their first buy is an easy way to encourage a second visit." : "This is a healthy rate, showing that your customers appreciate your business. Keep up the good work!"}`;
  }

  if (q.includes("marketing") || q.includes("invest")) {
    return digital.maturityScore < 50
      ? `Before spending on ads, it is best to establish your digital presence. Connecting your Instagram, Google Business, or building a simple website will give new customers a place to land when they search for you.`
      : "Your online business footprint is solid. Try testing a small marketing budget on a discount offer for your best-selling product to see how customers respond.";
  }

  if (q.includes("product") && (q.includes("poor") || q.includes("weak") || q.includes("worst"))) {
    if (growth.weakProducts.length === 0) return "We need more product-level sales data before we can tell which products sell the least. Try logging what was purchased for each transaction.";
    return `"${growth.weakProducts[0].product}" has the lowest sales at ₹${growth.weakProducts[0].revenue.toLocaleString()} compared to your top seller "${growth.topProducts[0]?.product}" at ₹${growth.topProducts[0]?.revenue.toLocaleString() ?? 0}. You might want to feature it in a combo deal to boost its popularity.`;
  }

  return `Based on your business profile: ${growth.hasSalesData ? "Your best opportunities lie in re-engaging customers who haven't visited in a while. I recommend checking your automation suggestions to prepare quick messages." : "We need a bit more data before providing detailed calculations. Try uploading a sales CSV or filling out more of your profile details."}`;
}
