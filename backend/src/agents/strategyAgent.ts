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
import { calculateMissionImpact } from "./revenueImpactAgent";

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
    todaysMissions: missions.map((m) => {
      const impact = calculateMissionImpact(m, sales, customers);
      return {
        ...m,
        projectedImpact: impact.projectedImpact,
        projectedImpactBasis: impact.projectedImpactBasis,
      };
    }),
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
Your tone should be helpful, encouraging, and easy to understand for small business owners.
Avoid technical jargon, AI terminology, or internal system details.

CRITICAL FORMATTING INSTRUCTIONS:
You must behave like a modern business assistant (similar to ChatGPT or Notion AI). Your response must be concise, well-structured, easy to skim, and between 150-250 words. Do not write long introductions, do not repeat the user's question, and avoid unnecessary filler or large walls of text.

ALWAYS use the following structure for your response:

### Short Answer
A 1–2 sentence direct summary answering the user's question immediately.

### Recommended Actions
Provide a bulleted list of 3-5 specific, clear, and actionable recommendations. Each recommendation must start with a bullet point (•) and be 1 sentence long. Bold key phrases.

**Priority:** [High / Medium / Low]
**Expected Impact:** [1 sentence explaining the expected business impact]

### Key Takeaway
A 1-sentence actionable takeaway for the user.

Intelligence rules:
- Focus ONLY on the topic of the user's question (e.g. if the user asks about website/Instagram, only give online footprint recommendations; if they ask about sales, give sales suggestions). Do not add unrelated recommendations.
- Ground your answers strictly in the DATA provided in the grounding facts. Perform mathematical calculations if the user asks a scenario (e.g. "What if I reduce my employee count by 2?" or "What if sales increase by 20%?"). Calculate the exact new numbers relative to current values in the grounding facts (e.g. if employees count is 10, then reducing by 2 leaves 8; if current sales are 5 lakhs, a 20% increase makes it 6 lakhs).`;

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
    return `### Short Answer
Planning to ${isIncrease ? "increase" : "decrease"} prices by ₹${amount.toLocaleString()} is a major lever that directly affects sales velocity and profitability.

### Recommended Actions
• **Review competitor rates** in your local market to avoid overpricing or underpricing.
• **Introduce bundle packages** instead of raising flat rates to soften user friction.
• **Test pricing shifts** with a small, less active customer segment first.

**Priority:** High
**Expected Impact:** Improved profit margins with minimal volume loss.

### Key Takeaway
Offer value bundles to adjust prices safely without alienating current clients.`;
  }

  // Expansion intent
  if (q.includes("expand") || q.includes("expansion") || q.includes("scale") || q.includes("branch") || q.includes("franchise") || q.includes("growth")) {
    return `### Short Answer
Expanding your business requires strong cash flow reserves, and you should stabilize recurring revenues before launching new locations.

### Recommended Actions
• **Build a cash buffer** equal to 3-6 months of operating expenses.
• **Establish recurring revenue** models, such as annual service contracts.
• **Audit local demand** in the target location to confirm market fit.

**Priority:** Medium
**Expected Impact:** Lower risk scaling and predictable expansion funding.

### Key Takeaway
Secure a steady stream of repeat customer revenue before launching new physical branches.`;
  }

  // Automation intent
  if (q.includes("automate") || q.includes("automation") || q.includes("reminder")) {
    return `### Short Answer
Setting up automated messaging templates saves admin time and keeps your customers engaged automatically.

### Recommended Actions
• **Activate automated triggers** for seasonal offers or service renewals.
• **Refine template copy** in your Automation page to sound personal and friendly.
• **Review task check-ins** weekly to track customer response rates.

**Priority:** High
**Expected Impact:** Reduced administrative hours and higher customer lifetime value.

### Key Takeaway
Enable ready-to-use email and message templates to re-engage quiet clients automatically.`;
  }

  // Follow-up calculations in fallback:
  if (q.includes("employee") && (q.includes("reduce") || q.includes("remove") || q.includes("less") || q.includes("cut") || q.includes("planning to"))) {
    const currentEmployees = business.employees ? parseInt(business.employees.replace(/[^0-9]/g, ""), 10) : 10;
    const match = q.match(/\b(\d+)\b/);
    const change = match ? parseInt(match[1], 10) : 2;
    const finalCount = isNaN(currentEmployees) ? Math.max(0, 10 - change) : Math.max(0, currentEmployees - change);
    return `### Short Answer
Operating with ${finalCount} employees (down from ${isNaN(currentEmployees) ? 10 : currentEmployees}) will lower your monthly payroll expenses.

### Recommended Actions
• **Redistribute key tasks** to ensure critical operations are fully covered.
• **Optimize work schedules** to prevent fatigue and high workload on remaining staff.
• **Set up automated notifications** to handle customer support FAQs without human labor.

**Priority:** Medium
**Expected Impact:** Lower payroll overhead offset by potential service speed limits.

### Key Takeaway
Balance the immediate payroll savings with workload support for your remaining staff.`;
  }

  if (q.includes("sales") && (q.includes("increase") || q.includes("up") || q.includes("grow") || q.includes("raise"))) {
    const pctMatch = q.match(/\b(\d+)\b/);
    const pct = pctMatch ? parseInt(pctMatch[1], 10) : 20;
    const currentSalesVal = business.avgMonthlyRevenue || 500000;
    const increasedVal = currentSalesVal * (1 + pct / 100);
    const difference = increasedVal - currentSalesVal;
    return `### Short Answer
A ${pct}% increase in monthly sales would boost your revenue from ₹${currentSalesVal.toLocaleString()} to ₹${increasedVal.toLocaleString()}.

### Recommended Actions
• **Reinvest the extra ₹${difference.toLocaleString()}** in local digital marketing campaigns.
• **Upgrade inventory levels** for popular products to handle increased demand.
• **Offer loyalty perks** to the new clients acquired during this sales spike.

**Priority:** High
**Expected Impact:** Stronger cash reserves and accelerated market growth.

### Key Takeaway
Reinvest the extra ₹${difference.toLocaleString()} revenue directly into customer acquisition to compound growth.`;
  }

  if (q.includes("call") || q.includes("reach out") || q.includes("contact")) {
    if (growth.inactiveCustomers.length === 0) {
      return `### Short Answer
You have no inactive customers. All registered buyers have made a transaction in the last 60 days.

### Recommended Actions
• **Monitor retention trends** monthly to ensure users stay active.
• **Send a thank-you note** to VIP buyers to maintain customer loyalty.
• **Introduce a referral perk** to encourage word-of-mouth growth.

**Priority:** Low
**Expected Impact:** Constant engagement and improved brand reputation.

### Key Takeaway
Continue delivering excellent service to keep your active customer base happy.`;
    }
    const names = growth.inactiveCustomers.slice(0, 3).map((c) => c.name).join(", ");
    return `### Short Answer
Reaching out to inactive users like ${names} is the fastest way to generate quick sales.

### Recommended Actions
• **Send a friendly check-in** text to ask for feedback.
• **Offer a small discount** or VIP reward to invite them back.
• **Automate reminder alerts** for clients who haven't visited in 60 days.

**Priority:** High
**Expected Impact:** Reactivated accounts and immediate revenue recovery.

### Key Takeaway
Reach out to ${names} today with a personalized offer to bring them back.`;
  }

  if (q.includes("sales") && (q.includes("drop") || q.includes("down") || q.includes("declin"))) {
    if (growth.revenueTrendPct === null) {
      return `### Short Answer
We need more transaction history to calculate monthly sales trends.

### Recommended Actions
• **Upload a recent sales ledger** or invoice CSV file.
• **Record daily sales** on the dashboard regularly.
• **Benchmark digital presence** to check for visibility gaps.

**Priority:** Medium
**Expected Impact:** Accurate data analytics and reliable business reports.

### Key Takeaway
Add at least 60 days of sales history to enable trend tracking.`;
    }
    if (growth.revenueTrendPct >= 0) {
      return `### Short Answer
Your revenue is up by ${growth.revenueTrendPct}% over the last 30 days, showing steady growth.

### Recommended Actions
• **Identify the primary growth source** to double down on what works.
• **Upsell additional services** during this periods of healthy traffic.
• **Promote AMC sign-ups** to lock in recurring cash flows.

**Priority:** Medium
**Expected Impact:** Sustained growth momentum and higher margins.

### Key Takeaway
Maximize the current sales spike by converting buyers into recurring subscribers.`;
    }
    return `### Short Answer
Your sales are down by ${Math.abs(growth.revenueTrendPct)}% over the last 30 days.

### Recommended Actions
• **Re-engage quiet clients** who haven't bought in over 60 days.
• **Run a seasonal promo** to clear slow-moving inventory.
• **Optimize digital channels** to capture fresh local leads.

**Priority:** High
**Expected Impact:** Rebound in transaction volume and improved cash flow.

### Key Takeaway
Activate an email re-engagement campaign to counter the recent sales dip.`;
  }

  if (q.includes("inactive")) {
    if (growth.inactiveCustomers.length === 0) {
      return `### Short Answer
You have no inactive customers. All clients have purchased in the last 60 days.

### Recommended Actions
• **Create a loyalty program** to reward regular repeat visits.
• **Gather user feedback** to maintain your high customer satisfaction.
• **Introduce seasonal products** to keep the menu exciting.

**Priority:** Low
**Expected Impact:** Long-term brand affinity and steady organic growth.

### Key Takeaway
Maintain high quality of service to keep customer retention at 100%.`;
    }
    return `### Short Answer
You have ${growth.inactiveCustomers.length} inactive customers who haven't made a purchase in 60+ days.

### Recommended Actions
• **Send a direct discount** code via email or WhatsApp.
• **Set up automated reminders** in the Nexora Automation Hub.
• **Launch a feedback campaign** to understand why they stopped buying.

**Priority:** High
**Expected Impact:** Reactivation of quiet accounts and recovered margins.

### Key Takeaway
Automate a friendly check-in email to win back your ${growth.inactiveCustomers.length} inactive clients.`;
  }

  if (q.includes("repeat")) {
    if (growth.repeatCustomerRate === null) {
      return `### Short Answer
More transaction records are needed to calculate your repeat buyer rate.

### Recommended Actions
• **Add customer names** to daily sales records.
• **Import your transaction list** from a CSV file.
• **Encourage email signups** at checkout to link customer profiles.

**Priority:** Medium
**Expected Impact:** Full customer metrics visibility and LTV calculations.

### Key Takeaway
Link customer profiles to transactions to monitor returning buyer rate.`;
    }
    return `### Short Answer
Your repeat customer rate is ${growth.repeatCustomerRate}%, which shows ${growth.repeatCustomerRate < 30 ? "room for improvement" : "healthy client loyalty"}.

### Recommended Actions
• **Deliver post-purchase notes** thanking buyers within 24 hours.
• **Offer a small discount** valid only for their next visit.
• **Automate AMC offers** to lock in recurring service relationships.

**Priority:** High
**Expected Impact:** Higher customer lifetime value and lower marketing costs.

### Key Takeaway
${growth.repeatCustomerRate < 30 ? "Activate a post-purchase follow-up task to bring clients back for a second buy." : "Reward your repeat buyers with early access to new products or VIP perks."}`;
  }

  if (q.includes("marketing") || q.includes("invest")) {
    return digital.maturityScore < 50
      ? `### Short Answer
Establish your basic digital profile before spending money on advertising.

### Recommended Actions
• **Claim your Google Business** profile to appear in local search results.
• **Create an Instagram page** to showcase your products visually.
• **Update your contact details** across all digital channels.

**Priority:** High
**Expected Impact:** Organic local traffic growth with zero ad spend.

### Key Takeaway
Claim your free Google Business profile first to capture local customers searching online.`
      : `### Short Answer
Your online digital footprint is solid. Try testing a small marketing ad budget.

### Recommended Actions
• **Promote your top seller** via a targeted local Instagram ad.
• **Set up a landing page discount** to track conversion rates.
• **Invite loyal VIPs** to test new products and write reviews.

**Priority:** Medium
**Expected Impact:** Efficient customer acquisition and higher digital sales.

### Key Takeaway
Run a small ₹1,000 local Instagram promotion featuring your best-selling offer.`;
  }

  if (q.includes("product") && (q.includes("poor") || q.includes("weak") || q.includes("worst"))) {
    if (growth.weakProducts.length === 0) {
      return `### Short Answer
We need product-level transaction details to identify which items are performing poorly.

### Recommended Actions
• **Record product names** for each transaction.
• **Upload inventory details** in the settings panel.
• **Track category sales** to see which segments grow fastest.

**Priority:** Medium
**Expected Impact:** Clear product metrics and inventory optimization insights.

### Key Takeaway
Log specific product names in transaction records to identify underperforming items.`;
    }
    return `### Short Answer
"${growth.weakProducts[0].product}" is your lowest performing product, yielding ₹${growth.weakProducts[0].revenue.toLocaleString()}.

### Recommended Actions
• **Bundle it in a combo deal** with your best-seller "${growth.topProducts[0]?.product || 'top product'}".
• **Highlight it on social media** with a dedicated promo discount.
• **Review customer ratings** to check for potential quality issues.

**Priority:** Medium
**Expected Impact:** Cleared slow-moving stock and higher total ticket size.

### Key Takeaway
Bundle your slow-selling "${growth.weakProducts[0].product}" with popular items to clear inventory.`;
    }

  return `### Short Answer
Focus on re-engaging quiet customers who haven't visited your business in over 60 days.

### Recommended Actions
• **Review your automation page** to activate ready-made reminder drafts.
• **Add missing digital details** like Facebook or website links.
• **Record daily sales** regularly to keep your metrics fresh.

**Priority:** Medium
**Expected Impact:** Higher retention rate and predictable month-on-month sales.

### Key Takeaway
Enable automated email templates to reach inactive clients automatically.`;
}
