import { Customer, Sale, Mission } from "@prisma/client";

export interface ImpactEstimate {
  projectedImpact: number;
  projectedImpactBasis: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateMissionImpact(
  mission: Mission,
  sales: Sale[],
  customers: Customer[]
): ImpactEstimate {
  const titleLower = mission.title.toLowerCase();
  const descLower = (mission.description || "").toLowerCase();
  const textToSearch = titleLower + " " + descLower;

  // 1. Compute baseline metrics
  const totalRevenue = sales.reduce((acc, s) => acc + s.amount, 0);
  const totalSalesCount = sales.length;
  const aov = totalSalesCount > 0 ? Math.round(totalRevenue / totalSalesCount) : 500; // default AOV = ₹500

  // Monthly revenue (last 30 days)
  const now = Date.now();
  const salesLast30d = sales.filter((s) => now - new Date(s.date).getTime() <= 30 * DAY_MS);
  const revenueLast30d = salesLast30d.reduce((acc, s) => acc + s.amount, 0) || totalRevenue || 15000; // default monthly revenue = ₹15,000

  // Inactive customers (no purchase in 60+ days)
  const inactiveCustomers = customers.filter((c) => {
    if (!c.lastPurchaseAt) return false;
    return now - new Date(c.lastPurchaseAt).getTime() > 60 * DAY_MS;
  });
  const inactiveCount = inactiveCustomers.length;

  // Weak products check
  // Group sales by product to find product revenues
  const productRevenue = new Map<string, number>();
  for (const s of sales) {
    const key = s.product || "Unlabeled";
    productRevenue.set(key, (productRevenue.get(key) || 0) + s.amount);
  }
  const sortedProducts = [...productRevenue.entries()]
    .map(([product, revenue]) => ({ product, revenue }))
    .sort((a, b) => a.revenue - b.revenue); // weakest first

  // Heuristic 1: Inactive Customer Re-engagement
  if (
    textToSearch.includes("inactive") ||
    textToSearch.includes("re-engage") ||
    textToSearch.includes("win-back") ||
    textToSearch.includes("churn") ||
    textToSearch.includes("haven't purchased") ||
    textToSearch.includes("over 60 days")
  ) {
    const match = textToSearch.match(/(\d+)\s+customer/);
    const targetCount = match ? parseInt(match[1], 10) : (inactiveCount || 1);
    const winBackRate = 0.2; // 20% win-back rate assumption
    const impact = Math.round(targetCount * aov * winBackRate);
    return {
      projectedImpact: impact,
      projectedImpactBasis: `${targetCount} inactive customer${targetCount > 1 ? "s" : ""} × ₹${aov.toLocaleString()} avg order × 20% win-back rate`,
    };
  }

  // Heuristic 2: Weak/Underperforming Product Optimization
  if (
    textToSearch.includes("underperforming") ||
    textToSearch.includes("weak product") ||
    textToSearch.includes("product performance")
  ) {
    let productName = "Weak product";
    let productSales = 5000;

    for (const [prod, rev] of productRevenue.entries()) {
      if (prod !== "Unlabeled" && textToSearch.includes(prod.toLowerCase())) {
        productName = prod;
        productSales = Math.round(rev / 12) || 5000;
        break;
      }
    }
    
    if (productName === "Weak product" && sortedProducts.length > 0) {
      productName = sortedProducts[0].product;
      productSales = Math.round(sortedProducts[0].revenue / 12) || 5000;
    }

    const optimizationLift = 0.15; // 15% lift assumption
    const impact = Math.round(productSales * optimizationLift);
    return {
      projectedImpact: impact,
      projectedImpactBasis: `"${productName}" estimated monthly sales (₹${productSales.toLocaleString()}) × 15% optimization lift`,
    };
  }

  // Heuristic 3: Revenue Trend Recovery
  if (
    textToSearch.includes("revenue is down") ||
    textToSearch.includes("revenue trend") ||
    textToSearch.includes("sales velocity") ||
    textToSearch.includes("revenue fell")
  ) {
    const recoveryRate = 0.05; // 5% recovery assumption
    const impact = Math.round(revenueLast30d * recoveryRate);
    return {
      projectedImpact: impact,
      projectedImpactBasis: `₹${revenueLast30d.toLocaleString()} monthly revenue × 5% recovery of recent sales decline`,
    };
  }

  // Heuristic 4: Digital Presence / Google Business / Social Media
  if (
    textToSearch.includes("google business") ||
    textToSearch.includes("instagram") ||
    textToSearch.includes("facebook") ||
    textToSearch.includes("digital presence") ||
    textToSearch.includes("website") ||
    textToSearch.includes("linkedin") ||
    textToSearch.includes("digital maturity") ||
    textToSearch.includes("missing channel")
  ) {
    const newAcquisitions = 2; // 2 new customers/month
    const impact = Math.round(newAcquisitions * aov);
    return {
      projectedImpact: impact,
      projectedImpactBasis: `${newAcquisitions} new monthly customer acquisitions × ₹${aov.toLocaleString()} avg order`,
    };
  }

  // Heuristic 5: Default general improvement
  const generalImprovementRate = 0.02; // 2% efficiency improvement
  const impact = Math.max(1000, Math.round(revenueLast30d * generalImprovementRate));
  return {
    projectedImpact: impact,
    projectedImpactBasis: `₹${revenueLast30d.toLocaleString()} monthly revenue × 2% general efficiency improvement`,
  };
}
