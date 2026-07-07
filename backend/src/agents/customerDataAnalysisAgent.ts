import { prisma } from "../lib/prisma";
import { generateGroundedText, isAiEnabled } from "../services/gemini";
import { Customer, Sale, Product } from "@prisma/client";

export interface CustomerSegment {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
  description: string;
}

export interface ChurnRiskMetric {
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
}

export interface ProductPerformance {
  product: string;
  revenue: number;
  unitsSold: number;
}

export interface MonthlyRevenue {
  month: string; // e.g. "Jun 2026"
  revenue: number;
}

export interface CustomerDataAnalysis {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
  averageOrderValue: number;
  averageCLV: number;
  customerGrowthPct: number;
  segments: CustomerSegment[];
  churnRisk: ChurnRiskMetric;
  monthlyRevenue: MonthlyRevenue[];
  topProducts: ProductPerformance[];
  weakProducts: ProductPerformance[];
  geographicTrends: { region: string; count: number; revenue: number }[];
  missingDataSummary: { field: string; missingCount: number; percentage: number }[];
}

export interface CustomerIntelligenceReport {
  executiveSummary: string;
  customerHealthScore: number;
  revenueAnalysis: string;
  salesTrends: string;
  customerSegmentsInfo: string;
  productPerformanceInfo: string;
  highValueCustomers: { name: string; email: string | null; phone: string | null; ltv: number }[];
  churnRiskInfo: string;
  growthOpportunities: string;
  recommendedMarketingCampaigns: { name: string; target: string; channel: string; message: string }[];
  aiRecommendations: string[];
  suggestedAutomations: { type: string; trigger: string; template: string }[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function runCustomerDataAnalysis(businessId: string): Promise<{
  analysis: CustomerDataAnalysis;
  report: CustomerIntelligenceReport;
}> {
  // Load data
  const customers = await prisma.customer.findMany({
    where: { businessId },
    include: { sales: true },
  });
  const sales = await prisma.sale.findMany({
    where: { businessId },
  });
  const products = await prisma.product.findMany({
    where: { businessId },
  });
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });

  // 1. Clean inconsistent data and detect missing values
  const missingDataSummary = detectMissingData(customers);
  const cleanedCustomers = cleanCustomerData(customers);

  // 2. Compute basic metrics
  const totalCustomers = cleanedCustomers.length;
  const now = new Date();

  // New customers: first purchase in the last 30 days, or created in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newCustomers = cleanedCustomers.filter((c) => {
    const firstSale = c.sales.reduce(
      (oldest: Date | null, s) => (!oldest || new Date(s.date) < oldest ? new Date(s.date) : oldest),
      null
    );
    return firstSale && firstSale >= thirtyDaysAgo;
  }).length;

  const repeatCustomers = cleanedCustomers.filter((c) => c.sales.length > 1).length;
  const repeatCustomerRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

  const totalRevenue = sales.reduce((acc, s) => acc + s.amount, 0);
  const averageOrderValue = sales.length > 0 ? Math.round((totalRevenue / sales.length) * 100) / 100 : 0;
  const averageCLV = totalCustomers > 0 ? Math.round((totalRevenue / totalCustomers) * 100) / 100 : 0;

  // Customer Growth: customers registered this month vs previous
  const customersCreatedThisMonth = cleanedCustomers.filter((c) => new Date(c.createdAt) >= thirtyDaysAgo).length;
  const customersCreatedBefore = totalCustomers - customersCreatedThisMonth;
  const customerGrowthPct =
    customersCreatedBefore > 0 ? Math.round((customersCreatedThisMonth / customersCreatedBefore) * 100) : 0;

  // 3. Customer Segmentation
  const vipThresholdLtv = getVipThreshold(cleanedCustomers);
  const segments = segmentCustomers(cleanedCustomers, vipThresholdLtv);

  // 4. Churn Risk (High Risk: inactive > 60 days, Medium: 30-60 days, Low: < 30 days)
  const churnRisk = calculateChurnRisk(cleanedCustomers);

  // 5. Monthly Revenue Trends
  const monthlyRevenue = calculateMonthlyRevenue(sales);

  // 6. Product Performance
  const { topProducts, weakProducts } = calculateProductPerformance(sales, products);

  // 7. Geographic Trends (parse phone country code or email domains)
  const geographicTrends = calculateGeographicTrends(cleanedCustomers);

  const analysis: CustomerDataAnalysis = {
    totalCustomers,
    newCustomers,
    repeatCustomers,
    repeatCustomerRate,
    averageOrderValue,
    averageCLV,
    customerGrowthPct,
    segments,
    churnRisk,
    monthlyRevenue,
    topProducts,
    weakProducts,
    geographicTrends,
    missingDataSummary,
  };

  // 8. Generate Report (with AI or deterministic fallback)
  const report = await generateReport(business.name, analysis, cleanedCustomers);

  // 9. Store Results in Database
  await prisma.customerAnalytics.upsert({
    where: { businessId },
    create: { businessId, dataJson: JSON.stringify(analysis) },
    update: { dataJson: JSON.stringify(analysis) },
  });

  await prisma.salesAnalytics.upsert({
    where: { businessId },
    create: { businessId, dataJson: JSON.stringify(analysis) },
    update: { dataJson: JSON.stringify(analysis) },
  });

  const generatedReport = await prisma.generatedReport.create({
    data: {
      businessId,
      type: "customer_intelligence",
      title: `${business.name} Customer Intelligence Report`,
      summary: report.executiveSummary,
      contentJson: JSON.stringify(report),
    },
  });

  // Calculate composite DashboardMetrics
  const dashboardMetricsJson = JSON.stringify({
    totalCustomers,
    newCustomers,
    repeatCustomers,
    customerGrowthPct,
    monthlySales: sales.filter((s) => new Date(s.date) >= thirtyDaysAgo).reduce((acc, s) => acc + s.amount, 0),
    revenueTrendPct: calculateRevenueTrendPct(sales),
    topProducts: topProducts.map((p) => ({ name: p.product, revenue: p.revenue })),
    customerSegments: segments.map((s) => ({ name: s.name, count: s.count })),
    churnRiskCount: churnRisk.highRiskCount,
    averageOrderValue,
    customerLifetimeValue: averageCLV,
    aiBusinessInsights: [
      `Repeat customer rate is at ${repeatCustomerRate}%, indicating ${
        repeatCustomerRate > 40 ? "strong customer loyalty" : "opportunities to improve retention"
      }.`,
      `${churnRisk.highRiskCount} customer(s) are at high risk of churn (inactive for 60+ days).`,
      topProducts.length > 0
        ? `Your best selling product is "${topProducts[0].product}" bringing in ₹${topProducts[0].revenue.toLocaleString()}.`
        : "No products sold yet.",
    ],
    recommendedNextActions: [
      churnRisk.highRiskCount > 0
        ? `Launch a re-engagement campaign for your ${churnRisk.highRiskCount} churned customers.`
        : "Set up a welcome sequence for new customers.",
      repeatCustomerRate < 30 ? "Offer a loyalty discount code on the second purchase." : "Upsell VIP customers with bundling options.",
    ],
    lastReportId: generatedReport.id,
  });

  await prisma.dashboardMetrics.upsert({
    where: { businessId },
    create: { businessId, metricsJson: dashboardMetricsJson },
    update: { metricsJson: dashboardMetricsJson },
  });

  return { analysis, report };
}

function detectMissingData(customers: (Customer & { sales: Sale[] })[]) {
  let missingEmail = 0;
  let missingPhone = 0;
  let missingNotes = 0;

  for (const c of customers) {
    if (!c.email || c.email.trim() === "") missingEmail++;
    if (!c.phone || c.phone.trim() === "") missingPhone++;
    if (!c.notes || c.notes.trim() === "") missingNotes++;
  }

  const count = customers.length;
  return [
    { field: "Email Address", missingCount: missingEmail, percentage: count > 0 ? Math.round((missingEmail / count) * 100) : 0 },
    { field: "Phone Number", missingCount: missingPhone, percentage: count > 0 ? Math.round((missingPhone / count) * 100) : 0 },
    { field: "Customer Notes", missingCount: missingNotes, percentage: count > 0 ? Math.round((missingNotes / count) * 100) : 0 },
  ];
}

function cleanCustomerData(customers: (Customer & { sales: Sale[] })[]) {
  return customers.map((c) => {
    // Basic cleaning: trim whitespaces, format emails
    return {
      ...c,
      name: c.name.trim(),
      email: c.email ? c.email.trim().toLowerCase() : null,
      phone: c.phone ? c.phone.trim() : null,
    };
  });
}

function getVipThreshold(customers: any[]): number {
  if (customers.length === 0) return 0;
  const ltvs = customers.map((c) => c.lifetimeValue).sort((a, b) => a - b);
  // VIP threshold at 85th percentile
  const index = Math.floor(ltvs.length * 0.85);
  return ltvs[index] || 0;
}

function segmentCustomers(customers: any[], vipThreshold: number): CustomerSegment[] {
  let vipCount = 0;
  let vipRevenue = 0;
  let loyalCount = 0;
  let loyalRevenue = 0;
  let newCount = 0;
  let newRevenue = 0;
  let lostCount = 0;
  let lostRevenue = 0;

  const now = Date.now();
  const thirtyDaysAgo = 30 * 24 * 60 * 60 * 1000;

  for (const c of customers) {
    const isInactive = c.lastPurchaseAt ? now - new Date(c.lastPurchaseAt).getTime() > thirtyDaysAgo : true;

    if (c.lifetimeValue >= vipThreshold && c.lifetimeValue > 0) {
      vipCount++;
      vipRevenue += c.lifetimeValue;
    } else if (c.sales.length >= 2) {
      loyalCount++;
      loyalRevenue += c.lifetimeValue;
    } else if (c.sales.length === 1 && !isInactive) {
      newCount++;
      newRevenue += c.lifetimeValue;
    } else {
      lostCount++;
      lostRevenue += c.lifetimeValue;
    }
  }

  const totalCount = customers.length || 1;
  return [
    {
      name: "VIP",
      count: vipCount,
      revenue: vipRevenue,
      percentage: Math.round((vipCount / totalCount) * 100),
      description: "High spending customers (top 15% of business spenders).",
    },
    {
      name: "Loyal Customers",
      count: loyalCount,
      revenue: loyalRevenue,
      percentage: Math.round((loyalCount / totalCount) * 100),
      description: "Repeat customers with 2+ purchases who aren't VIPs.",
    },
    {
      name: "New Active",
      count: newCount,
      revenue: newRevenue,
      percentage: Math.round((newCount / totalCount) * 100),
      description: "Single-purchase customers active within the last 30 days.",
    },
    {
      name: "At Risk / Churned",
      count: lostCount,
      revenue: lostRevenue,
      percentage: Math.round((lostCount / totalCount) * 100),
      description: "Inactive customers who haven't made a purchase recently.",
    },
  ];
}

function calculateChurnRisk(customers: any[]): ChurnRiskMetric {
  let lowRisk = 0;
  let mediumRisk = 0;
  let highRisk = 0;

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const sixtyDays = 60 * 24 * 60 * 60 * 1000;

  for (const c of customers) {
    if (!c.lastPurchaseAt) {
      highRisk++;
      continue;
    }
    const age = now - new Date(c.lastPurchaseAt).getTime();
    if (age <= thirtyDays) {
      lowRisk++;
    } else if (age <= sixtyDays) {
      mediumRisk++;
    } else {
      highRisk++;
    }
  }

  return {
    lowRiskCount: lowRisk,
    mediumRiskCount: mediumRisk,
    highRiskCount: highRisk,
  };
}

function calculateMonthlyRevenue(sales: Sale[]): MonthlyRevenue[] {
  const groups: Record<string, number> = {};
  for (const s of sales) {
    const d = new Date(s.date);
    if (isNaN(d.getTime())) continue;
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    groups[key] = (groups[key] || 0) + s.amount;
  }

  return Object.entries(groups).map(([month, revenue]) => ({
    month,
    revenue: Math.round(revenue * 100) / 100,
  }));
}

function calculateProductPerformance(sales: Sale[], products: Product[]) {
  const revenueMap: Record<string, number> = {};
  const unitsMap: Record<string, number> = {};

  for (const s of sales) {
    const key = s.product || "Unlabeled";
    revenueMap[key] = (revenueMap[key] || 0) + s.amount;
    unitsMap[key] = (unitsMap[key] || 0) + 1;
  }

  const list = Object.keys(revenueMap).map((product) => ({
    product,
    revenue: revenueMap[product],
    unitsSold: unitsMap[product] || 0,
  }));

  const sorted = list.sort((a, b) => b.revenue - a.revenue);

  return {
    topProducts: sorted.slice(0, 5),
    weakProducts: sorted.length > 5 ? sorted.slice(-3).reverse() : sorted.slice(2).reverse(),
  };
}

function calculateGeographicTrends(customers: any[]) {
  const regions: Record<string, { count: number; revenue: number }> = {};

  for (const c of customers) {
    let region = "Domestic / Unknown";
    if (c.phone) {
      if (c.phone.startsWith("+91")) region = "India";
      else if (c.phone.startsWith("+1")) region = "North America";
      else if (c.phone.startsWith("+44")) region = "United Kingdom";
      else if (c.phone.startsWith("+971")) region = "UAE";
    }

    if (!regions[region]) regions[region] = { count: 0, revenue: 0 };
    regions[region].count++;
    regions[region].revenue += c.lifetimeValue;
  }

  return Object.entries(regions).map(([region, data]) => ({
    region,
    count: data.count,
    revenue: Math.round(data.revenue * 100) / 100,
  }));
}

function calculateRevenueTrendPct(sales: Sale[]): number {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const last30 = sales.filter((s) => now - new Date(s.date).getTime() <= 30 * DAY_MS);
  const prior30 = sales.filter((s) => {
    const age = now - new Date(s.date).getTime();
    return age > 30 * DAY_MS && age <= 60 * DAY_MS;
  });

  const sum30 = last30.reduce((acc, s) => acc + s.amount, 0);
  const sumPrior = prior30.reduce((acc, s) => acc + s.amount, 0);

  if (sumPrior === 0) return 0;
  return Math.round(((sum30 - sumPrior) / sumPrior) * 100);
}

async function generateReport(
  businessName: string,
  analysis: CustomerDataAnalysis,
  customers: any[]
): Promise<CustomerIntelligenceReport> {
  const topSpenders = [...customers]
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
    .slice(0, 3)
    .map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      ltv: c.lifetimeValue,
    }));

  const baseReport: CustomerIntelligenceReport = {
    executiveSummary: `This Customer Intelligence Report analyzes ${analysis.totalCustomers} customers and ₹${analysis.averageOrderValue.toLocaleString()} average order value for ${businessName}. Overall retention rate is at ${analysis.repeatCustomerRate}%, with a healthy loyal base representing ${analysis.segments.find(s=>s.name==="Loyal Customers")?.count || 0} customer(s).`,
    customerHealthScore: Math.round((analysis.repeatCustomerRate * 0.6) + (Math.max(0, 100 - (analysis.churnRisk.highRiskCount / (analysis.totalCustomers || 1)) * 100) * 0.4)),
    revenueAnalysis: `A total customer base of ${analysis.totalCustomers} has generated an average Customer Lifetime Value of ₹${analysis.averageCLV.toLocaleString()}. VIP customer segmentation represents ${analysis.segments.find(s=>s.name==="VIP")?.count || 0} customer(s) accounting for ₹${(analysis.segments.find(s=>s.name==="VIP")?.revenue || 0).toLocaleString()} in revenue.`,
    salesTrends: `Monthly sales show ${analysis.monthlyRevenue.length} recorded billing periods. Your top selling product by revenue is "${analysis.topProducts[0]?.product || "N/A"}" followed by "${analysis.topProducts[1]?.product || "N/A"}".`,
    customerSegmentsInfo: `Your customer base breaks down into: VIPs (${analysis.segments.find(s=>s.name==="VIP")?.count || 0}), Loyal repeat buyers (${analysis.segments.find(s=>s.name==="Loyal Customers")?.count || 0}), and New active customers (${analysis.segments.find(s=>s.name==="New Active")?.count || 0}).`,
    productPerformanceInfo: `The top performing product is "${analysis.topProducts[0]?.product || "N/A"}" (₹${(analysis.topProducts[0]?.revenue || 0).toLocaleString()}). Product optimization efforts should focus on low performing items like "${analysis.weakProducts[0]?.product || "N/A"}".`,
    highValueCustomers: topSpenders,
    churnRiskInfo: `We detected ${analysis.churnRisk.highRiskCount} customers in the churned category (>60 days inactive) and ${analysis.churnRisk.mediumRiskCount} customers at medium risk of churning (30-60 days inactive).`,
    growthOpportunities: `Re-engaging inactive VIPs and improving the repeat purchase rate from ${analysis.repeatCustomerRate}% to 45% represent the largest growth levers for the business.`,
    recommendedMarketingCampaigns: [
      {
        name: "VIP Appreciation Reward",
        target: "VIP Customers",
        channel: "Email/WhatsApp",
        message: `Hi [Name], we want to say thank you for being a top supporter of ${businessName}. Here is an exclusive 15% discount for your next visit!`,
      },
      {
        name: "Win-Back Outreach",
        target: "Inactive Customers",
        channel: "WhatsApp",
        message: `Hi [Name], we haven't seen you in a while at ${businessName}. We've got some fresh arrivals and would love to offer you a free treat on us. Come by this week!`,
      },
    ],
    aiRecommendations: [
      "Improve customer contact details collection by asking for email/phone at checkout.",
      "Bundle your worst performing products with your best sellers to clear inventory.",
      "Send a feedback questionnaire to customers immediately after their first purchase.",
    ],
    suggestedAutomations: [
      {
        type: "WhatsApp",
        trigger: "Customer becomes inactive (60 days since last purchase)",
        template: "We miss you at {{businessName}}! Enjoy 10% off your next purchase.",
      },
      {
        type: "Email",
        trigger: "Customer completes their 3rd order",
        template: "Thank you for being loyal! You've been upgraded to our VIP tier.",
      },
    ],
  };

  if (!isAiEnabled()) {
    return baseReport;
  }

  // AI-enhanced report phrasing
  const enhancedSummary = await generateGroundedText({
    system: "You are an expert SMB consultant. Your goal is to write a highly compelling, professional Executive Summary for a Customer Intelligence Report. Avoid fluff and keep facts strictly grounded in the numbers provided.",
    groundingFacts: { businessName, analysis, topSpenders },
    instruction: "Write a 3-5 sentence Executive Summary highlighting customer health, segments, churn risks, and top opportunities.",
    maxTokens: 500,
  });

  const enhancedCampaigns = await generateGroundedText({
    system: "You are a creative copywriter. You devise high-converting marketing campaigns based on customer segmentation data.",
    groundingFacts: { businessName, analysis },
    instruction: "Generate exactly two specific marketing campaigns. Return them in JSON format matching this array shape: [{\"name\":\"Campaign Name\",\"target\":\"Target Segment\",\"channel\":\"Email or WhatsApp\",\"message\":\"Outreach text template\"}]. Output ONLY valid JSON array text, no markdown codeblocks.",
    maxTokens: 500,
  });

  const enhancedRecs = await generateGroundedText({
    system: "You are a strategic business growth consultant. You generate actionable, data-backed next steps.",
    groundingFacts: { businessName, analysis },
    instruction: "List exactly three specific, actionable recommendations for this business to grow sales or customer retention. One sentence per recommendation. Return as a plain string with one recommendation per line.",
    maxTokens: 400,
  });

  if (enhancedSummary) baseReport.executiveSummary = enhancedSummary.trim();
  
  if (enhancedCampaigns) {
    try {
      const cleanJson = enhancedCampaigns.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        baseReport.recommendedMarketingCampaigns = parsed.slice(0, 2);
      }
    } catch (e) {
      console.error("[CustomerAgent] Failed parsing campaigns AI output", e);
    }
  }

  if (enhancedRecs) {
    const lines = enhancedRecs.split("\n").map(l => l.trim().replace(/^\d+\.\s*/, "").replace(/^-\s*/, "")).filter(Boolean);
    if (lines.length >= 3) {
      baseReport.aiRecommendations = lines.slice(0, 3);
    }
  }

  return baseReport;
}

export async function runCustomerManualAnalysis(
  businessId: string,
  metrics: {
    totalCustomers: number;
    newCustomers: number;
    repeatCustomers: number;
    customerGrowthPct: number;
    monthlySales: number;
    revenueTrendPct: number;
    averageOrderValue: number;
    customerLifetimeValue: number;
    topProducts: { product: string; revenue: number }[];
    segments: { name: string; count: number; revenue: number; percentage: number; description: string }[];
    churnRisk: { lowRiskCount: number; mediumRiskCount: number; highRiskCount: number };
  }
): Promise<{
  analysis: CustomerDataAnalysis;
  report: CustomerIntelligenceReport;
}> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  
  const analysis: CustomerDataAnalysis = {
    totalCustomers: metrics.totalCustomers,
    newCustomers: metrics.newCustomers,
    repeatCustomers: metrics.repeatCustomers,
    repeatCustomerRate: metrics.totalCustomers > 0 ? Math.round((metrics.repeatCustomers / metrics.totalCustomers) * 100) : 0,
    averageOrderValue: metrics.averageOrderValue,
    averageCLV: metrics.customerLifetimeValue,
    customerGrowthPct: metrics.customerGrowthPct,
    segments: metrics.segments.map((s) => ({
      name: s.name,
      count: s.count,
      revenue: s.revenue,
      percentage: s.percentage,
      description: s.description,
    })),
    churnRisk: {
      lowRiskCount: metrics.churnRisk.lowRiskCount,
      mediumRiskCount: metrics.churnRisk.mediumRiskCount,
      highRiskCount: metrics.churnRisk.highRiskCount,
    },
    monthlyRevenue: [
      { month: "Current Month", revenue: metrics.monthlySales },
    ],
    topProducts: metrics.topProducts.map((p) => ({
      product: p.product,
      revenue: p.revenue,
      unitsSold: Math.round(p.revenue / (metrics.averageOrderValue || 1)),
    })),
    weakProducts: [],
    geographicTrends: [],
    missingDataSummary: [],
  };

  // Mock top spenders for manual report visualization
  const mockSpenders = metrics.topProducts.map((p, i) => ({
    name: `High Value Customer ${i + 1}`,
    email: `customer${i + 1}@example.com`,
    phone: null,
    ltv: p.revenue,
  }));

  const report = await generateReport(business.name, analysis, mockSpenders);

  // Store Results
  await prisma.customerAnalytics.upsert({
    where: { businessId },
    create: { businessId, dataJson: JSON.stringify(analysis) },
    update: { dataJson: JSON.stringify(analysis) },
  });

  await prisma.salesAnalytics.upsert({
    where: { businessId },
    create: { businessId, dataJson: JSON.stringify(analysis) },
    update: { dataJson: JSON.stringify(analysis) },
  });

  const generatedReport = await prisma.generatedReport.create({
    data: {
      businessId,
      type: "customer_intelligence",
      title: `${business.name} Customer Intelligence Report`,
      summary: report.executiveSummary,
      contentJson: JSON.stringify(report),
    },
  });

  // Calculate composite DashboardMetrics
  const dashboardMetricsJson = JSON.stringify({
    totalCustomers: metrics.totalCustomers,
    newCustomers: metrics.newCustomers,
    repeatCustomers: metrics.repeatCustomers,
    customerGrowthPct: metrics.customerGrowthPct,
    monthlySales: metrics.monthlySales,
    revenueTrendPct: metrics.revenueTrendPct,
    topProducts: metrics.topProducts.map((p) => ({ name: p.product, revenue: p.revenue })),
    customerSegments: metrics.segments.map((s) => ({ name: s.name, count: s.count })),
    churnRiskCount: metrics.churnRisk.highRiskCount,
    averageOrderValue: metrics.averageOrderValue,
    customerLifetimeValue: metrics.customerLifetimeValue,
    aiBusinessInsights: [
      `Repeat customer rate is at ${analysis.repeatCustomerRate}%, indicating ${
        analysis.repeatCustomerRate > 40 ? "strong customer loyalty" : "opportunities to improve retention"
      }.`,
      `${metrics.churnRisk.highRiskCount} customer(s) are at high risk of churn.`,
    ],
    recommendedNextActions: [
      metrics.churnRisk.highRiskCount > 0
        ? `Launch a re-engagement campaign for your ${metrics.churnRisk.highRiskCount} churned customers.`
        : "Set up a welcome sequence for new customers.",
    ],
    lastReportId: generatedReport.id,
  });

  await prisma.dashboardMetrics.upsert({
    where: { businessId },
    create: { businessId, metricsJson: dashboardMetricsJson },
    update: { metricsJson: dashboardMetricsJson },
  });

  // Update Business discoveryComplete and Assessment to ensure dashboard is unlocked
  await prisma.business.update({
    where: { id: businessId },
    data: { discoveryComplete: true },
  });

  // Upsert basic assessment so the dashboard can load
  await prisma.assessment.upsert({
    where: { businessId },
    create: {
      businessId,
      hasEnoughData: true,
      readinessScore: 70,
      confidenceScore: 80,
      digitalMaturity: 60,
      growthScore: 70,
      missingAssetsJson: JSON.stringify([]),
      strengthsJson: JSON.stringify(["Established customer stats base."]),
      weaknessesJson: JSON.stringify([]),
      recommendedFirstAction: "Nurture your repeat customers and review high churn risks.",
      roadmapJson: JSON.stringify([{ step: "Set up target loyalty outreach", why: "Repeat customers are the highest leverage." }]),
      missingInfoExplanation: null,
    },
    update: {
      hasEnoughData: true,
    },
  });

  return { analysis, report };
}
