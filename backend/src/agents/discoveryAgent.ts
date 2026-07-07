import { Business } from "@prisma/client";

export interface DiscoverySignals {
  hasDigitalPresence: boolean;
  hasCustomerData: boolean;
  hasSalesData: boolean;
  hasProductData: boolean;
  hasGoals: boolean;
  filledFieldCount: number;
  totalOptionalFields: number;
  completenessPct: number;
}

const OPTIONAL_FIELDS: (keyof Business)[] = [
  "category",
  "location",
  "employees",
  "yearsInBusiness",
  "products",
  "services",
  "avgDailySales",
  "avgMonthlyRevenue",
  "googleBusiness",
  "instagram",
  "facebook",
  "website",
  "whatsappBiz",
  "linkedin",
  "goals",
];

export function evaluateDiscovery(
  business: Business,
  customerCount: number,
  salesCount: number,
  productCount: number
): DiscoverySignals {
  const filled = OPTIONAL_FIELDS.filter((f) => {
    const v = business[f];
    return v !== null && v !== undefined && v !== "";
  });

  return {
    hasDigitalPresence: !!(
      business.googleBusiness ||
      business.instagram ||
      business.facebook ||
      business.website ||
      business.whatsappBiz ||
      business.linkedin
    ),
    hasCustomerData: customerCount > 0,
    hasSalesData: salesCount > 0,
    hasProductData: productCount > 0 || !!business.products,
    hasGoals: !!business.goals,
    filledFieldCount: filled.length,
    totalOptionalFields: OPTIONAL_FIELDS.length,
    completenessPct: Math.round((filled.length / OPTIONAL_FIELDS.length) * 100),
  };
}

/**
 * The core product philosophy: Nexora refuses to fabricate a growth score,
 * business health, or charts when there simply isn't enough real business
 * information yet. This function decides that gate.
 */
export function hasEnoughDataForAssessment(signals: DiscoverySignals): boolean {
  // Require at least ONE real signal beyond bare business name/industry:
  // digital presence, customer data, or sales data.
  return signals.hasDigitalPresence || signals.hasCustomerData || signals.hasSalesData;
}

export function missingAssetsList(signals: DiscoverySignals): string[] {
  const missing: string[] = [];
  if (!signals.hasDigitalPresence) missing.push("Digital presence (Google Business, Instagram, Facebook, or Website)");
  if (!signals.hasCustomerData) missing.push("Customer data (contact list or CRM export)");
  if (!signals.hasSalesData) missing.push("Sales data (recent transactions or invoices)");
  if (!signals.hasProductData) missing.push("Product / service catalog");
  if (!signals.hasGoals) missing.push("Stated business goals");
  return missing;
}
