"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { DashboardPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { Award, TrendingUp, TrendingDown, Users, DollarSign, Activity, ShoppingBag, Eye, MessageSquare, ArrowRight, Sparkles, AlertTriangle } from "lucide-react";

// Lazy load the customer report drawer to minimize bundle size
const CustomerReportDrawer = dynamic(() => import("@/components/CustomerReportDrawer"), {
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/45 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-screen p-6 bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [showReportModal, setShowReportModal] = useState(false);

  // React Query: Fetch dashboard payload
  const { data, isLoading: dashboardLoading, error } = useQuery<DashboardPayload>({
    queryKey: ["dashboard", businessId],
    queryFn: () => api.get<DashboardPayload>(`/api/dashboard/${businessId}`),
    enabled: !!businessId,
  });

  // React Query: Fetch latest customer report
  const { data: latestReport } = useQuery<any>({
    queryKey: ["latest-report", businessId],
    queryFn: async () => {
      const res = await api.get<{ report: any }>(`/api/customers/reports/${businessId}/latest`);
      return res.report ? res.report.content : null;
    },
    enabled: !!businessId && !!data?.advancedMetrics?.lastReportId,
  });

  const loading = sessionLoading || dashboardLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full p-6 text-center shadow-premium border border-zinc-200 dark:border-zinc-800">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/20 flex items-center justify-center text-red-500 mx-auto mb-4 text-lg">
              ⚠️
            </div>
            <h3 className="font-display font-semibold text-base mb-1">Failed to load Dashboard</h3>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-4">
              We encountered an error loading your business dashboard payload. Please check your connection.
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!data.hasEnoughData) {
    return (
      <AppShell>
        <div className="mb-6 text-left">
          <h1 className="font-display text-2xl font-semibold">Welcome, {data.businessName}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">Configure your business profiles to activate Nexora CGO analytics.</p>
        </div>
        
        <Card className="p-8 max-w-2xl text-center flex flex-col items-center gap-5 mx-auto mt-8 border border-zinc-250 dark:border-zinc-850 shadow-premium bg-white dark:bg-zinc-950 text-left">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-650 dark:text-zinc-400 text-lg animate-float">
            📊
          </div>
          <div>
            <h2 className="text-base font-semibold mb-2 text-center">Analyzing Business Readiness</h2>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed max-w-md mx-auto text-center">
              {data.missingInfoExplanation || "Nexora needs a bit more data before it can generate your growth checklist and metrics dashboard."}
            </p>
          </div>

          <div className="bg-zinc-50/50 dark:bg-zinc-900/10 p-4 rounded border border-zinc-200 dark:border-zinc-800 text-left w-full max-w-md">
            <span className="text-[10px] text-zinc-450 dark:text-zinc-500 uppercase font-bold tracking-wider block mb-2">Required actions to unlock dashboard</span>
            <ul className="flex flex-col gap-2 text-xs font-semibold">
              {data.missingAssets?.map((m) => (
                <li key={m} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <span className="text-accent font-bold">•</span> {m}
                </li>
              )) || <li className="text-zinc-500">No pending assets</li>}
            </ul>
          </div>

          <Link href="/customers" className="mt-2 w-full max-w-xs">
            <Button className="w-full">
              Configure & Add Customer Data
            </Button>
          </Link>
        </Card>
      </AppShell>
    );
  }

  const hasAdvanced = !!data.advancedMetrics;
  const adv = data.advancedMetrics;

  return (
    <AppShell>
      {/* Bento Layout Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="font-display text-2xl font-semibold">Good to see you, {data.businessName}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">Here is what deserves your attention today.</p>
        </div>
        {hasAdvanced && latestReport && (
          <Button size="sm" variant="outline" className="flex items-center gap-1.5" onClick={() => setShowReportModal(true)}>
            <Eye size={14} /> View AI CRM Report
          </Button>
        )}
      </div>

      {/* FIRST PRIORITY: AI Hero Section (Answers: "What should I do today?") */}
      <div className="mb-8 relative rounded-xl overflow-hidden border border-accent/20 bg-gradient-to-r from-accent/10 to-indigo-500/[0.03] dark:from-accent/15 dark:to-indigo-500/[0.01] p-6 shadow-glow text-left flex flex-col lg:flex-row gap-6 items-start justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-accent/20 text-accent dark:text-accent font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={10} /> AI Growth Feed
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Today&apos;s Focus Recommendation</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight leading-snug">
              Unlock Projected monthly revenue of <span className="text-emerald-500 font-bold font-display">₹{data.todaysMissions?.reduce((s, m) => s + (m.projectedImpact || 0), 0).toLocaleString() || "0"}</span>
            </h2>
            <p className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed font-medium">
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">Key Recommendation:</strong> {data.revenueOpportunity}
            </p>
          </div>

          {/* AI business narrative points */}
          <div className="grid md:grid-cols-2 gap-4 border-t border-zinc-200/50 dark:border-white/10 pt-4 mt-2">
            <div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-2">Trend Summary</span>
              <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                {hasAdvanced && adv?.aiBusinessInsights?.length ? (
                  adv.aiBusinessInsights.slice(0, 2).map((insight, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-accent">•</span>
                      <span>{insight}</span>
                    </li>
                  ))
                ) : (
                  data.businessStory?.slice(0, 2).map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-accent">•</span>
                      <span>{s}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            
            {hasAdvanced && adv?.recommendedNextActions?.length && (
              <div>
                <span className="text-[9px] text-accent font-bold uppercase tracking-wider block mb-2">Immediate Next Actions</span>
                <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                  {adv.recommendedNextActions.slice(0, 2).map((act, i) => (
                    <li key={i} className="flex gap-1.5 items-start">
                      <span className="text-accent font-bold">⚫</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-72 w-full bg-white/45 dark:bg-[#111827]/40 border border-zinc-200/60 dark:border-white/5 rounded-xl p-4 shadow-sm flex flex-col justify-between self-stretch shrink-0 gap-4">
          <div>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">CGO Assistant Shortcuts</span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">Run live predictions or test staff adjustments directly with Nexora.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/chat">
              <Button size="sm" className="w-full text-xs font-semibold flex items-center justify-between">
                <span>Start Predictions Chat</span>
                <ArrowRight size={12} />
              </Button>
            </Link>
            <Link href="/suggested-messages">
              <Button size="sm" variant="outline" className="w-full text-xs font-semibold flex items-center justify-between">
                <span>Outreach campaigns ({data.automationSuggestionCount || 0})</span>
                <MessageSquare size={12} />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* SECOND PRIORITY: Bento Grid Analytics & Details Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
        
        {/* Bento Grid Cell 1: Core Performance Indicators */}
        <Card className="p-6 lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-3">
            <div>
              <h3 className="font-semibold text-sm">Business Health Scorecard</h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Core parameters parsed from customer orders and digital channels.</p>
            </div>
            <Badge variant="secondary">LATEST</Badge>
          </div>
          
          {hasAdvanced && adv ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-550 uppercase tracking-wider font-bold block mb-1">Customers</span>
                <p className="text-lg font-semibold font-display">{adv.totalCustomers}</p>
                <Badge variant="success" className="text-[8px] font-bold mt-1 px-1 py-0">+{adv.customerGrowthPct}% growth</Badge>
              </div>
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-555 uppercase tracking-wider font-bold block mb-1">Monthly Revenue</span>
                <p className="text-lg font-semibold font-display">₹{adv.monthlySales.toLocaleString()}</p>
                <Badge variant={adv.revenueTrendPct >= 0 ? "success" : "destructive"} className="text-[8px] font-bold mt-1 px-1 py-0">
                  {adv.revenueTrendPct >= 0 ? "+" : ""}{adv.revenueTrendPct}% trend
                </Badge>
              </div>
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-555 uppercase tracking-wider font-bold block mb-1">Lifetime Value (CLV)</span>
                <p className="text-lg font-semibold font-display">₹{adv.customerLifetimeValue.toLocaleString()}</p>
                <span className="text-[9px] text-zinc-400 block mt-1">Average spent/buyer</span>
              </div>
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-555 uppercase tracking-wider font-bold block mb-1">Average Order (AOV)</span>
                <p className="text-lg font-semibold font-display">₹{adv.averageOrderValue.toLocaleString()}</p>
                <span className="text-[9px] text-zinc-400 block mt-1">Mean spent/invoice</span>
              </div>
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-555 uppercase tracking-wider font-bold block mb-1">High Churn Risk</span>
                <p className="text-lg font-semibold font-display text-red-500">{adv.churnRiskCount}</p>
                <span className="text-[9px] text-zinc-400 block mt-1">Silent buyers (60d+)</span>
              </div>
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-555 uppercase tracking-wider font-bold block mb-1">Digital Maturity</span>
                <p className="text-lg font-semibold font-display">{data.digitalMaturity}</p>
                <span className="text-[9px] text-zinc-400 block mt-1">Active social reach</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded">
                <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold block">Readiness Score</span>
                <p className="text-lg font-semibold font-display mt-1">{data.readinessScore}</p>
              </div>
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded">
                <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold block">Growth Score</span>
                <p className="text-lg font-semibold font-display mt-1">{data.growthScore ?? "—"}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Bento Grid Cell 2: Quick Outreach / Customer Alert list */}
        <Card className="p-6 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Churn Alerts</h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Urgent follow-ups suggested for at-risk accounts.</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-56 pr-1 space-y-2 scrollbar-thin">
            {data.customerAlerts?.length ? (
              data.customerAlerts.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-900 last:border-0 pb-2 last:pb-0">
                  <div className="flex items-start gap-1.5 max-w-[80%]">
                    <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-zinc-650 dark:text-zinc-350 leading-snug">{c.message}</span>
                  </div>
                  <Link href={`/customers/${c.id}`}>
                    <Button variant="link" size="sm" className="h-auto p-0 font-bold text-xs text-accent">View</Button>
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-450 italic py-6 text-center">No quiet accounts detected.</p>
            )}
          </div>

          <Link href="/suggested-messages" className="w-full">
            <Button variant="outline" size="sm" className="w-full text-xs font-semibold flex items-center justify-between">
              <span>View Outreach Campaigns</span>
              <MessageSquare size={12} />
            </Button>
          </Link>
        </Card>

        {/* Bento Grid Cell 3: Today's Priorities / Active Growth Missions */}
        <Card className="p-6 md:col-span-2">
          <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-3 mb-4">
            <div>
              <h3 className="font-semibold text-sm">Recommended Growth Missions</h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Actions calculated by strategic intelligence engine.</p>
            </div>
            <Link href="/missions" className="text-xs font-semibold text-accent hover:underline">View all</Link>
          </div>

          {data.todaysMissions?.length ? (
            <div className="grid md:grid-cols-2 gap-3.5">
              {data.todaysMissions.slice(0, 4).map((m) => (
                <div key={m.id} className="border border-zinc-200/80 dark:border-zinc-800/85 rounded p-3 bg-zinc-50/20 dark:bg-zinc-900/10 flex flex-col justify-between gap-2 text-left">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant={m.priority === "high" ? "destructive" : "warning"}>{m.priority}</Badge>
                      {m.projectedImpact && (
                        <span className="text-[9px] font-bold text-emerald-500">+₹{m.projectedImpact}/mo</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-150 leading-snug">{m.title}</p>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal line-clamp-2" title={m.reasoning}>{m.reasoning}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-450 italic py-12 text-center">All missions completed! Run discovery scan again.</p>
          )}
        </Card>

        {/* Bento Grid Cell 4: Strategic Groups Segmentation */}
        {hasAdvanced && adv && (
          <Card className="p-6 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Customer Loyalty Segments</h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Categorization metrics based on lifetime invoice counts.</p>
            </div>

            <div className="space-y-3.5 flex-1">
              {adv.customerSegments.map((seg, i) => {
                const colors = ["bg-accent", "bg-emerald-500", "bg-amber-500", "bg-red-500"];
                const color = colors[i % colors.length];
                const pct = Math.round((seg.count / (adv.totalCustomers || 1)) * 100);
                return (
                  <div key={seg.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-500 dark:text-zinc-405">{seg.name}</span>
                      <span className="text-zinc-900 dark:text-zinc-150">{seg.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Bento Grid Cell 5: Best & Worst Products revenue rankings */}
        {hasAdvanced && adv && (
          <Card className="p-6">
            <div className="border-b border-zinc-150 dark:border-zinc-850 pb-3 mb-4">
              <h3 className="font-semibold text-sm">Revenue contribution by Product</h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Products contribution rankings calculated over 30d invoices.</p>
            </div>

            <div className="space-y-2.5 text-xs font-medium">
              {adv.topProducts?.length ? (
                adv.topProducts.map((p, i) => (
                  <div key={p.name} className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900/60 last:border-0 pb-2 last:pb-0">
                    <span className="text-zinc-650 dark:text-zinc-400 font-semibold">{i+1}. {p.name}</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-50">₹{p.revenue.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-450 italic text-center py-6">No sales transactions logged.</p>
              )}
            </div>
          </Card>
        )}

        {/* Bento Grid Cell 6: Business Story Narratives */}
        <Card className={`p-6 ${hasAdvanced ? "" : "lg:col-span-2"}`}>
          <div className="border-b border-zinc-150 dark:border-zinc-850 pb-3 mb-4">
            <h3 className="font-semibold text-sm">AI Strategic Audit</h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Daily business overview compiled by strategy memory agent.</p>
          </div>
          
          <div className="overflow-y-auto max-h-56 pr-1 space-y-3.5 scrollbar-thin text-xs text-zinc-650 dark:text-zinc-400 font-semibold leading-relaxed">
            {hasAdvanced && adv?.aiBusinessInsights?.length ? (
              adv.aiBusinessInsights.map((insight, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <span>{insight}</span>
                </div>
              ))
            ) : (
              data.businessStory?.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <span>{s}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Customer Report Drawer Modal */}
      {showReportModal && latestReport && (
        <CustomerReportDrawer
          report={latestReport}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </AppShell>
  );
}
