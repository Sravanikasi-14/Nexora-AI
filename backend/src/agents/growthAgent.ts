import { Customer, Sale } from "@prisma/client";
import { CustomerDataAnalysis } from "./customerDataAnalysisAgent";

export interface GrowthReport {
  hasSalesData: boolean;
  totalRevenueTracked: number;
  revenueLast30d: number;
  revenuePrior30d: number;
  revenueTrendPct: number | null;
  repeatCustomerRate: number | null; // % of customers with >1 purchase
  inactiveCustomers: Customer[]; // no purchase in 60+ days
  topProducts: { product: string; revenue: number }[];
  weakProducts: { product: string; revenue: number }[];
  growthScore: number | null; // 0-100 composite, null if no data
  revenueOpportunity: string;
  risks: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function analyzeGrowth(
  sales: Sale[],
  customers: (Customer & { sales?: Sale[] })[],
  customerAnalysis?: CustomerDataAnalysis
): GrowthReport {
  if (sales.length === 0) {
    return {
      hasSalesData: false,
      totalRevenueTracked: 0,
      revenueLast30d: 0,
      revenuePrior30d: 0,
      revenueTrendPct: null,
      repeatCustomerRate: null,
      inactiveCustomers: [],
      topProducts: [],
      weakProducts: [],
      growthScore: null,
      revenueOpportunity:
        "No sales data uploaded yet, so revenue opportunity cannot be calculated. Upload a sales or invoice CSV to unlock this.",
      risks: [],
    };
  }

  const now = Date.now();
  const last30 = sales.filter((s) => now - new Date(s.date).getTime() <= 30 * DAY_MS);
  const prior30 = sales.filter((s) => {
    const age = now - new Date(s.date).getTime();
    return age > 30 * DAY_MS && age <= 60 * DAY_MS;
  });

  const sum = (arr: Sale[]) => arr.reduce((acc, s) => acc + s.amount, 0);
  const revenueLast30d = sum(last30);
  const revenuePrior30d = sum(prior30);
  const totalRevenueTracked = sum(sales);

  const revenueTrendPct =
    revenuePrior30d > 0 ? Math.round(((revenueLast30d - revenuePrior30d) / revenuePrior30d) * 100) : null;

  // Repeat customer rate
  const customersWithSales = customers.filter((c) => (c.sales?.length ?? 0) > 0);
  const repeaters = customersWithSales.filter((c) => (c.sales?.length ?? 0) > 1);
  const repeatCustomerRate =
    customersWithSales.length > 0 ? Math.round((repeaters.length / customersWithSales.length) * 100) : null;

  // Inactive customers: no purchase in 60+ days
  const inactiveCustomers = customers.filter((c) => {
    if (!c.lastPurchaseAt) return false;
    return now - new Date(c.lastPurchaseAt).getTime() > 60 * DAY_MS;
  });

  // Product performance
  const productRevenue = new Map<string, number>();
  for (const s of sales) {
    const key = s.product || "Unlabeled";
    productRevenue.set(key, (productRevenue.get(key) || 0) + s.amount);
  }
  const sortedProducts = [...productRevenue.entries()]
    .map(([product, revenue]) => ({ product, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
  const topProducts = sortedProducts.slice(0, 3);
  const weakProducts = sortedProducts.slice(-3).reverse();

  // Growth score: composite of trend (weighted), repeat rate, inactivity ratio
  let growthScore = 50;
  if (revenueTrendPct !== null) growthScore += Math.max(-25, Math.min(25, revenueTrendPct / 2));
  if (repeatCustomerRate !== null) growthScore += (repeatCustomerRate - 50) / 4;
  if (customers.length > 0) {
    const inactivityRatio = inactiveCustomers.length / customers.length;
    growthScore -= inactivityRatio * 20;
  }
  growthScore = Math.max(0, Math.min(100, Math.round(growthScore)));

  const risks: string[] = [];
  if (revenueTrendPct !== null && revenueTrendPct < 0) {
    risks.push(`Revenue is down ${Math.abs(revenueTrendPct)}% versus the prior 30 days.`);
  }
  if (inactiveCustomers.length > 0) {
    risks.push(`${inactiveCustomers.length} customer(s) haven't purchased in over 60 days.`);
  }
  if (customerAnalysis && customerAnalysis.churnRisk.highRiskCount > 0) {
    risks.push(`Churn risk: ${customerAnalysis.churnRisk.highRiskCount} customer(s) are in high-risk inactivity status.`);
  }
  if (weakProducts.length > 0 && weakProducts[0].revenue < (topProducts[0]?.revenue ?? 0) * 0.1) {
    risks.push(`"${weakProducts[0].product}" is significantly underperforming your top product.`);
  }

  const vipSegment = customerAnalysis?.segments.find((s) => s.name === "VIP");
  const revenueOpportunity =
    customerAnalysis && vipSegment && vipSegment.count > 0
      ? `Your VIP customers represent ${vipSegment.count} buyers contributing ₹${vipSegment.revenue.toLocaleString()} in revenue. Nurturing this segment with exclusive offers represents a high-value opportunity.`
      : inactiveCustomers.length > 0
      ? `Re-engaging your ${inactiveCustomers.length} inactive customer(s) is the fastest available revenue opportunity — they've already bought from you once.`
      : repeatCustomerRate !== null && repeatCustomerRate < 30
      ? "Repeat purchase rate is low. A structured follow-up or loyalty nudge could meaningfully increase revenue per customer."
      : "Current customer base is engaged. Growth opportunity likely lies in acquisition rather than retention.";

  return {
    hasSalesData: true,
    totalRevenueTracked,
    revenueLast30d,
    revenuePrior30d,
    revenueTrendPct,
    repeatCustomerRate,
    inactiveCustomers,
    topProducts,
    weakProducts,
    growthScore,
    revenueOpportunity,
    risks,
  };
}
