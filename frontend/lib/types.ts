export interface Business {
  id: string;
  name: string;
  industry: string;
  category?: string | null;
  location?: string | null;
  employees?: string | null;
  yearsInBusiness?: string | null;
  products?: string | null;
  services?: string | null;
  avgDailySales?: number | null;
  avgMonthlyRevenue?: number | null;
  googleBusiness?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  website?: string | null;
  whatsappBiz?: string | null;
  linkedin?: string | null;
  goals?: string | null;
  discoveryComplete: boolean;
}

export interface RoadmapStep {
  step: string;
  why: string;
}

export interface AssessmentResult {
  exists?: boolean;
  hasEnoughData: boolean;
  readinessScore?: number | null;
  confidenceScore?: number | null;
  digitalMaturity?: number | null;
  growthScore?: number | null;
  strengths?: string[];
  weaknesses?: string[];
  missingAssets?: string[];
  recommendedFirstAction?: string | null;
  roadmap?: RoadmapStep[];
  missingInfoExplanation?: string | null;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  reasoning: string;
  priority: "high" | "medium" | "low" | string;
  status: string;
  createdAt: string;
  projectedImpact?: number;
  projectedImpactBasis?: string;
}

export interface DashboardPayload {
  businessName: string;
  hasEnoughData: boolean;
  missingInfoExplanation?: string;
  missingAssets?: string[];
  roadmap?: RoadmapStep[];
  readinessScore?: number;
  growthScore?: number;
  digitalMaturity?: number;
  strengths?: string[];
  weaknesses?: string[];
  revenueOpportunity?: string;
  risks?: string[];
  businessStory?: string[];
  todaysMissions?: Mission[];
  customerAlerts?: { id: string; name: string; lastPurchaseAt: string | null; message: string }[];
  automationSuggestionCount?: number;
  advancedMetrics?: {
    totalCustomers: number;
    newCustomers: number;
    repeatCustomers: number;
    customerGrowthPct: number;
    monthlySales: number;
    revenueTrendPct: number;
    topProducts: { name: string; revenue: number }[];
    customerSegments: { name: string; count: number }[];
    churnRiskCount: number;
    averageOrderValue: number;
    customerLifetimeValue: number;
    aiBusinessInsights: string[];
    recommendedNextActions: string[];
    lastReportId?: string | null;
  } | null;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  notes?: string | null;
  lifetimeValue: number;
  lastPurchaseAt?: string | null;
  inactive?: boolean;
  nextOpportunity?: string;
  createdAt?: string;
  leadStatus?: string | null;
  sales?: {
    id: string;
    amount: number;
    product?: string | null;
    productCategory?: string | null;
    quantity?: number | null;
    paymentMethod?: string | null;
    notes?: string | null;
    date: string;
  }[];
}

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Insight {
  id: string;
  category: string;
  narrative: string;
  createdAt: string;
}

export interface AutomationDraft {
  id: string;
  type: string;
  targetCustomerId?: string | null;
  subject?: string | null;
  content: string;
  reasoning: string;
  status: string;
  createdAt: string;
  customer?: Customer | null;
  category?: string | null;
  reason?: string | null;
  confidence?: string | null;
  approvedAt?: string | null;
}
