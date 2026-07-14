import { DigitalPresenceReport } from "./digitalPresenceAgent";
import { GrowthReport } from "./growthAgent";
import { generateGroundedText } from "../services/gemini";

export interface InsightItem {
  category: "revenue" | "digital" | "customers" | "competitive";
  narrative: string;
}

function templateInsights(growth: GrowthReport, digital: DigitalPresenceReport, customerAnalysis?: any): InsightItem[] {
  const items: InsightItem[] = [];

  if (growth.hasSalesData) {
    if (growth.revenueTrendPct !== null) {
      items.push({
        category: "revenue",
        narrative:
          growth.revenueTrendPct >= 0
            ? `Revenue rose ${growth.revenueTrendPct}% over the last 30 days compared to the prior period, driven by ₹${growth.revenueLast30d.toLocaleString()} in tracked sales.`
            : `Revenue fell ${Math.abs(growth.revenueTrendPct)}% over the last 30 days compared to the prior period. This is worth investigating before it compounds.`,
      });
    }
    if (growth.topProducts.length > 0) {
      items.push({
        category: "revenue",
        narrative: `"${growth.topProducts[0].product}" is your strongest performer, generating ₹${growth.topProducts[0].revenue.toLocaleString()} in tracked revenue.`,
      });
    }
    if (customerAnalysis) {
      const vip = customerAnalysis.segments?.find((s: any) => s.name === "VIP");
      if (vip && vip.count > 0) {
        items.push({
          category: "customers",
          narrative: `VIP segment represents ${vip.count} customer(s) who account for ₹${vip.revenue.toLocaleString()} in sales.`,
        });
      }
      if (customerAnalysis.churnRisk?.highRiskCount > 0) {
        items.push({
          category: "customers",
          narrative: `${customerAnalysis.churnRisk.highRiskCount} customer(s) are flagged as high risk of churn due to inactivity.`,
        });
      }
    } else {
      if (growth.inactiveCustomers.length > 0) {
        items.push({
          category: "customers",
          narrative: `${growth.inactiveCustomers.length} customer(s) have gone quiet for 60+ days. Re-engagement here is typically cheaper than acquiring new customers.`,
        });
      }
    }
    if (growth.repeatCustomerRate !== null) {
      items.push({
        category: "customers",
        narrative: `${growth.repeatCustomerRate}% of your customers have purchased more than once, which is your current repeat-business baseline.`,
      });
    }
  } else {
    items.push({
      category: "revenue",
      narrative:
        "No sales data has been uploaded yet, so revenue trends can't be reported. Upload a sales or invoice CSV to unlock this story.",
    });
  }

  if (digital.maturityScore > 0) {
    items.push({
      category: "digital",
      narrative: `Digital presence covers ${digital.channels.filter((c) => c.present).length} of ${digital.channels.length} tracked channels. ${digital.recommendation}`,
    });
  } else {
    items.push({
      category: "digital",
      narrative: "No digital channels are connected yet, so digital engagement trends can't be reported.",
    });
  }

  return items;
}

export async function generateInsights(
  growth: GrowthReport,
  digital: DigitalPresenceReport,
  businessName: string,
  customerAnalysis?: any
): Promise<InsightItem[]> {
  const base = templateInsights(growth, digital, customerAnalysis);

  // Try to upgrade phrasing/synthesis with Gemini, strictly grounded in the
  // same computed facts. If unavailable or it fails, the deterministic
  // template insights above are returned as-is.
  const enhanced = await generateGroundedText({
    system:
      "You rewrite structured business insight bullets into a short, clear, consultant-style narrative for a small business owner. Never introduce numbers or facts not present in the data.",
    groundingFacts: { businessName, growth, digital, customerAnalysis },
    instruction: `Rewrite these ${base.length} insight bullets into a slightly more natural, consultant-style tone, one per line, same order, same categories, same underlying facts. Do not add new claims. Return plain lines only, no numbering, no markdown.`,
    maxTokens: 500,
  });

  if (!enhanced) return base;

  const lines = enhanced.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length !== base.length) return base; // safety: fall back if shape mismatches
  return base.map((item, i) => ({ ...item, narrative: lines[i] }));
}
