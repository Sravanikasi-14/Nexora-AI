"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { DashboardPayload } from "@/lib/types";

// Types for Customer Analytics Report
interface MarketingCampaign {
  name: string;
  target: string;
  channel: string;
  message: string;
}

interface SuggestedAutomation {
  type: string;
  trigger: string;
  template: string;
}

interface CustomerReport {
  executiveSummary: string;
  customerHealthScore: number;
  revenueAnalysis: string;
  salesTrends: string;
  customerSegmentsInfo: string;
  productPerformanceInfo: string;
  highValueCustomers: { name: string; email: string | null; phone: string | null; ltv: number }[];
  churnRiskInfo: string;
  growthOpportunities: string;
  recommendedMarketingCampaigns: MarketingCampaign[];
  aiRecommendations: string[];
  suggestedAutomations: SuggestedAutomation[];
}

export default function DashboardPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  
  // AI report modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [latestReport, setLatestReport] = useState<CustomerReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    api
      .get<DashboardPayload>(`/api/dashboard/${businessId}`)
      .then((res) => {
        setData(res);
        if (res.advancedMetrics?.lastReportId) {
          fetchLatestReport();
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function fetchLatestReport() {
    if (!businessId) return;
    setReportLoading(true);
    api
      .get<{ report: any }>(`/api/customers/reports/${businessId}/latest`)
      .then((res) => {
        if (res.report) {
          setLatestReport(res.report.content);
        }
      })
      .catch(() => setLatestReport(null))
      .finally(() => setReportLoading(false));
  }

  if (sessionLoading || loading) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-surface2 rounded-xl w-1/3 mb-1" />
          <div className="h-4 bg-surface2 rounded-xl w-1/4 mb-7" />
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-4 h-24 bg-surface" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5 h-64 bg-surface" />
            <div className="card p-5 h-64 bg-surface" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="card p-8 text-center flex flex-col items-center gap-4 max-w-md mx-auto mt-12">
          <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center text-danger text-xl">
            ⚠️
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Failed to load Dashboard</h3>
            <p className="text-sm text-muted">We encountered an error loading your business dashboard payload. Please try again later.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data.hasEnoughData) {
    return (
      <AppShell>
        <h1 className="font-display text-2xl font-semibold mb-1">Welcome to {data.businessName}</h1>
        <p className="text-muted text-sm mb-7">Setup your business profile to activate Nexora AI insights.</p>
        
        <div className="card p-8 max-w-2xl text-center flex flex-col items-center gap-5 mx-auto mt-8">
           <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-3xl animate-float">
             📊
           </div>
           <div>
             <h2 className="text-xl font-semibold mb-2">Analyzing your Business Readiness</h2>
             <p className="text-sm text-muted leading-relaxed max-w-md mx-auto">
               {data.missingInfoExplanation || "Nexora needs a bit more data before it can generate your strategic growth roadmap and metrics dashboard."}
             </p>
           </div>

           <div className="bg-[#12161A] p-4 rounded-xl border border-white/5 text-left w-full max-w-md">
             <span className="text-[10px] text-accent uppercase font-bold tracking-wider block mb-2">Required items to unlock dashboard</span>
             <ul className="flex flex-col gap-1.5 text-sm">
               {data.missingAssets?.map((m) => (
                 <li key={m} className="flex items-center gap-2 text-ink">
                   <span className="text-accent">•</span> {m}
                 </li>
               )) || <li className="text-muted">No pending assets</li>}
             </ul>
           </div>

           <Link href="/customers" className="btn-primary px-8 mt-2">
             Configure & Add Customer Data
           </Link>
        </div>
      </AppShell>
    );
  }

  const hasAdvanced = !!data.advancedMetrics;
  const adv = data.advancedMetrics;

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-semibold">Good to see you, {data.businessName}</h1>
        {hasAdvanced && latestReport && (
          <button className="btn-secondary text-xs" onClick={() => setShowReportModal(true)}>
            ★ View Customer Intelligence Report
          </button>
        )}
      </div>
      <p className="text-muted mb-7 text-sm">Here&apos;s what deserves your attention today.</p>

      {/* Advanced metrics or standard metrics grid */}
      {hasAdvanced && adv ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="card p-4">
            <p className="text-xl font-display font-semibold text-accent">{adv.totalCustomers}</p>
            <p className="text-[10px] text-muted mt-1">Total Customers</p>
            <span className="text-[9px] text-accent2 font-semibold">+{adv.customerGrowthPct}% growth</span>
            <div className="text-[8px] text-muted mt-2 border-t border-border/40 pt-1">Total unique buyers.</div>
          </div>
          <div className="card p-4">
            <p className="text-xl font-display font-semibold text-accent2">₹{adv.monthlySales.toLocaleString()}</p>
            <p className="text-[10px] text-muted mt-1">Monthly Sales</p>
            <span className={`text-[9px] font-semibold ${adv.revenueTrendPct >= 0 ? "text-accent2" : "text-danger"}`}>
              {adv.revenueTrendPct >= 0 ? "▲" : "▼"} {Math.abs(adv.revenueTrendPct)}% trend
            </span>
            <div className="text-[8px] text-muted mt-2 border-t border-border/40 pt-1">Sales in last 30d.</div>
          </div>
          <div className="card p-4">
            <p className="text-xl font-display font-semibold text-warn">₹{adv.customerLifetimeValue.toLocaleString()}</p>
            <p className="text-[10px] text-muted mt-1">Lifetime Value (CLV)</p>
            <div className="text-[8px] text-muted mt-5 border-t border-border/40 pt-1">Average buyer lifetime value.</div>
          </div>
          <div className="card p-4">
            <p className="text-xl font-display font-semibold">₹{adv.averageOrderValue.toLocaleString()}</p>
            <p className="text-[10px] text-muted mt-1">Average Order (AOV)</p>
            <div className="text-[8px] text-muted mt-5 border-t border-border/40 pt-1">Mean spent per order transaction.</div>
          </div>
          <div className="card p-4">
            <p className="text-xl font-display font-semibold text-danger">{adv.churnRiskCount}</p>
            <p className="text-[10px] text-muted mt-1">High Churn Risk</p>
            <div className="text-[8px] text-muted mt-5 border-t border-border/40 pt-1">Quiet buyers (60d+ silent).</div>
          </div>
          <div className="card p-4">
            <p className="text-xl font-display font-semibold text-accent">{data.digitalMaturity}</p>
            <p className="text-[10px] text-muted mt-1">Your Online Business Health</p>
            <div className="text-[8px] text-muted mt-2 border-t border-border/40 pt-1">Channels visibility presence score.</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card p-5">
            <p className="text-2xl font-display font-semibold text-accent">{data.readinessScore}</p>
            <p className="text-xs text-muted mt-1">Business Readiness</p>
            <div className="text-[10px] text-muted mt-2">Overall baseline scorecard of your business health.</div>
          </div>
          <div className="card p-5">
            <p className="text-2xl font-display font-semibold text-accent2">{data.growthScore ?? "—"}</p>
            <p className="text-xs text-muted mt-1">Growth Score</p>
            <div className="text-[10px] text-muted mt-2">Measures your recent revenue and customer retention.</div>
          </div>
          <div className="card p-5">
            <p className="text-2xl font-display font-semibold">{data.digitalMaturity}</p>
            <p className="text-xs text-muted mt-1">Your Online Business Health</p>
            <div className="text-[10px] text-muted mt-2">Online footprint score based on active social networks.</div>
          </div>
          <div className="card p-5">
            <p className="text-2xl font-display font-semibold text-warn">{data.risks?.length ?? 0}</p>
            <p className="text-xs text-muted mt-1">Potential Risks</p>
            <div className="text-[10px] text-muted mt-2">Operational or churn risks that deserve attention.</div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Missions Card */}
        <div className="card p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-sm">Today&apos;s Missions</p>
            <Link href="/missions" className="text-xs text-accent">View all</Link>
          </div>
          <p className="text-[10px] text-muted mb-4">Recommended tasks suggested by AI to improve customer retention and revenue.</p>
          {data.todaysMissions?.length ? (
            <ul className="flex flex-col gap-3">
              {data.todaysMissions.slice(0, 4).map((m) => (
                <li key={m.id} className="border border-border rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`pill ${m.priority === "high" ? "bg-danger/15 text-danger" : "bg-warn/15 text-warn"}`}>{m.priority}</span>
                    <p className="text-sm font-medium">{m.title}</p>
                  </div>
                  <p className="text-xs text-muted">{m.reasoning}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No missions right now — you&apos;re on track.</p>
          )}
        </div>

        {/* Opportunities/Actions Card */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <p className="font-semibold text-sm mb-1">Revenue Opportunity</p>
            <p className="text-[10px] text-muted mb-3">AI identified high-value action to unlock immediate sales.</p>
            <p className="text-xs text-muted leading-relaxed mb-4">{data.revenueOpportunity}</p>
          </div>
          
          {hasAdvanced && adv?.recommendedNextActions?.length && (
            <div>
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Recommended Next Actions</p>
              <ul className="flex flex-col gap-2 text-xs text-muted">
                {adv.recommendedNextActions.map((act, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span>•</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Segments and Top Products Section if Advanced metrics are available */}
      {hasAdvanced && adv && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-1">Your Customer Groups</h3>
            <p className="text-[10px] text-muted mb-4">
              <strong>What it means:</strong> Visualizes how your customer base is grouped based on LTV and order counts.<br/>
              <strong>Why it matters:</strong> Helps you distinguish high-value VIPs from churned quiet customers to prioritize campaign budgets.<br/>
              <strong>What action to take:</strong> Check the &quot;Tasks You Can Automate&quot; page to prepare loyalty or re-engagement coupons.
            </p>
            <div className="flex flex-col gap-3">
              {adv.customerSegments.map((seg, i) => {
                const colors = ["bg-accent", "bg-accent2", "bg-warn", "bg-danger"];
                const color = colors[i % colors.length];
                const pct = Math.round((seg.count / (adv.totalCustomers || 1)) * 100);
                return (
                  <div key={seg.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted">{seg.name}</span>
                      <span className="font-medium">{seg.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden">
                      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-1">Your Best and Worst Selling Products</h3>
            <p className="text-[10px] text-muted mb-4">
              <strong>What it means:</strong> Ranks your products and services by total revenue contribution.<br/>
              <strong>Why it matters:</strong> Identifies which offerings drive the bulk of your cash flow versus underperforming items.<br/>
              <strong>What action to take:</strong> Consider offering the lower-ranked items in bundles with your best sellers.
            </p>
            <div className="flex flex-col gap-3 text-sm">
              {adv.topProducts?.length ? (
                adv.topProducts.map((p, i) => (
                  <div key={p.name} className="flex justify-between items-center border-b border-border last:border-0 pb-2.5 last:pb-0">
                    <span className="text-muted">{i+1}. {p.name}</span>
                    <span className="font-semibold text-ink">₹{p.revenue.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted">No product performance data generated yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stories / Alerts Grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <p className="font-semibold text-sm mb-1">Business Story</p>
          <p className="text-[10px] text-muted mb-3">AI compiled insights summarizing your digital presence and customer health trends.</p>
          <ul className="flex flex-col gap-2 text-sm text-muted">
            {hasAdvanced && adv?.aiBusinessInsights?.length ? (
              adv.aiBusinessInsights.map((insight, i) => <li key={i}>• {insight}</li>)
            ) : (
              data.businessStory?.map((s, i) => <li key={i}>• {s}</li>)
            )}
          </ul>
        </div>
        <div className="card p-5">
          <p className="font-semibold text-sm mb-1">Customer Alerts</p>
          <p className="text-[10px] text-muted mb-3">Important follow-ups flagged for quiet or at-risk customers.</p>
          {data.customerAlerts?.length ? (
            <ul className="flex flex-col gap-2 text-sm">
              {data.customerAlerts.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between">
                  <span>{c.message}</span>
                  <Link href={`/customers/${c.id}`} className="text-accent text-xs">View</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No customer alerts right now.</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/chat" className="card p-5 hover:border-accent/40 transition block">
          <p className="font-semibold text-sm mb-1">Quick AI Chat</p>
          <p className="text-xs text-muted mb-2">Connect with your AI chief growth consultant regarding employees adjustments or sales simulations.</p>
          <p className="text-xs text-accent">Ask &quot;What if I reduce my employee count by 2?&quot; →</p>
        </Link>
        <Link href="/suggested-messages" className="card p-5 hover:border-accent/40 transition block">
          <p className="font-semibold text-sm mb-1">AI Suggested Messages</p>
          <p className="text-xs text-muted mb-2">Review AI-prepared personalized WhatsApp messages to follow up with customers.</p>
          <p className="text-xs text-accent">{data.automationSuggestionCount ?? 0} suggested message(s) ready for review →</p>
        </Link>
      </div>

      {/* Customer Report Drawer Modal */}
      {showReportModal && latestReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-2xl h-screen rounded-none border-l border-border p-6 overflow-y-auto flex flex-col justify-between relative shadow-2xl bg-base">
            <button
              className="absolute top-6 right-6 text-muted hover:text-ink text-lg"
              onClick={() => setShowReportModal(false)}
            >
              ✕
            </button>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="pill bg-accent/15 text-accent text-[10px]">AI Report</span>
                <span className="text-xs text-muted">Customer Intelligence</span>
              </div>
              <h2 className="font-display text-2xl font-semibold mb-6">Customer Intelligence Report</h2>

              {/* Executive Summary */}
              <div className="mb-6 p-4 rounded-xl bg-surface border border-border">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-semibold text-accent uppercase tracking-wider">Executive Summary</h4>
                  <div className="flex items-center gap-1.5 text-xs text-accent2">
                    <span className="w-2 h-2 rounded-full bg-accent2" />
                    <span>Health Score: {latestReport.customerHealthScore}/100</span>
                  </div>
                </div>
                <p className="text-sm text-ink leading-relaxed">{latestReport.executiveSummary}</p>
                <div className="mt-2 text-xs text-muted italic">
                  Explanation: Your business customer health score reflects your retention rates, active database sizes, and VIP cohorts stability.
                </div>
              </div>

              {/* Data Insights */}
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Revenue & Cohort Analysis</h4>
                  <p className="text-sm text-muted leading-relaxed">{latestReport.revenueAnalysis}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Customer Segmentation Narrative</h4>
                  <p className="text-sm text-muted leading-relaxed">{latestReport.customerSegmentsInfo}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Product Demand Performance</h4>
                  <p className="text-sm text-muted leading-relaxed">{latestReport.productPerformanceInfo}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Churn Risks Analysis</h4>
                  <p className="text-sm text-muted leading-relaxed">{latestReport.churnRiskInfo}</p>
                </div>
              </div>

              {/* VIP / High Value List */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-accent2 uppercase tracking-wider mb-2">Top Value Customer Cohort</h4>
                <div className="border border-border rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface2/40 border-b border-border text-muted">
                        <th className="px-4 py-2">Customer</th>
                        <th className="px-4 py-2">Contact</th>
                        <th className="px-4 py-2">LTV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestReport.highValueCustomers?.map((cust, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 font-medium">{cust.name}</td>
                          <td className="px-4 py-2 text-muted">{cust.email || cust.phone || "—"}</td>
                          <td className="px-4 py-2 font-semibold">₹{cust.ltv.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Marketing Campaigns */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-warn uppercase tracking-wider mb-2">Recommended Marketing Campaigns</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {latestReport.recommendedMarketingCampaigns?.map((camp, i) => (
                    <div key={i} className="border border-border rounded-xl p-3 bg-surface text-xs flex flex-col gap-1">
                      <p className="font-semibold text-ink">{camp.name}</p>
                      <p className="text-muted"><span className="font-medium text-accent">Target:</span> {camp.target} | <span className="font-medium text-accent2">Channel:</span> {camp.channel}</p>
                      <p className="text-[11px] text-muted italic mt-1 bg-surface2/30 p-2 rounded-lg border border-border">
                        &quot;{camp.message}&quot;
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Strategic Recommendations</h4>
                <ul className="flex flex-col gap-2 text-xs">
                  {latestReport.aiRecommendations?.map((rec, i) => (
                    <li key={i} className="flex gap-2 text-muted">
                      <span className="text-accent">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggested Automations */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-accent2 uppercase tracking-wider mb-2">Suggested Automations</h4>
                <div className="flex flex-col gap-2">
                  {latestReport.suggestedAutomations?.map((aut, i) => (
                    <div key={i} className="border border-border rounded-xl p-3 bg-surface text-xs flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-accent2">{aut.type}</span>
                        <span className="text-[10px] text-muted">Trigger: {aut.trigger}</span>
                      </div>
                      <p className="text-[11px] text-muted italic mt-1 bg-surface2/30 p-2 rounded-lg border border-border">
                        Template: &quot;{aut.template}&quot;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-8 flex justify-end">
              <button className="btn-secondary" onClick={() => setShowReportModal(false)}>
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
