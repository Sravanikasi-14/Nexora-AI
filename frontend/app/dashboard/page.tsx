"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { DashboardPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton, Spinner } from "@/components/ui/spinner";

import { useQuery } from "@tanstack/react-query";
import {
  Award,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  ShoppingBag,
  Eye,
  MessageSquare,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Database,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

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
  const { business, businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [showReportModal, setShowReportModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Compute Funnel/Stage completion states
  const pipelineStages = useMemo(() => {
    if (!business || !data) return [];
    
    return [
      {
        id: 1,
        name: "Discovery Onboarding",
        description: "Input core industry parameters",
        status: business.discoveryComplete ? "completed" : "active",
      },
      {
        id: 2,
        name: "Strategy Audit Scan",
        description: "Calculate readiness score",
        status: data.hasEnoughData ? "completed" : business.discoveryComplete ? "active" : "pending",
      },
      {
        id: 3,
        name: "Actionable Missions",
        description: "Execute high priority tasks",
        status: (data.todaysMissions?.length ?? 0) > 0 ? "active" : data.hasEnoughData ? "completed" : "pending",
      },
      {
        id: 4,
        name: "Growth Intelligence",
        description: "Track sales and user retention",
        status: data.advancedMetrics ? "completed" : "pending",
      },
    ];
  }, [business, data]);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
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
            <span className="text-[10px] text-zinc-450 dark:text-zinc-550 uppercase font-bold tracking-wider block mb-2">Required actions to unlock dashboard</span>
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

  const adv = data.advancedMetrics;
  const hasAdvanced = !!adv;

  // Readiness Dial gauge setup
  const readinessValue = data.readinessScore || 0;
  const readinessChartData = [
    { value: readinessValue },
    { value: 100 - readinessValue },
  ];

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="font-display text-2xl font-semibold">Good to see you, {data.businessName}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">Analytics and Decision Intelligence overview.</p>
        </div>
        <div className="flex gap-2">
          {hasAdvanced && latestReport && (
            <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs font-semibold" onClick={() => setShowReportModal(true)}>
              <Eye size={14} /> View CRM Report
            </Button>
          )}
          <Link href="/database">
            <Button size="sm" variant="secondary" className="flex items-center gap-1.5 text-xs font-semibold">
              <Database size={14} /> Raw Database
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Recommendation Bar */}
      <div className="mb-6 relative rounded-xl overflow-hidden border border-accent/20 bg-gradient-to-r from-accent/10 to-indigo-500/[0.03] dark:from-accent/15 dark:to-indigo-500/[0.01] p-6 shadow-glow text-left flex flex-col lg:flex-row gap-6 items-start justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="bg-accent/20 text-accent font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={10} /> AI Recommendation Feed
            </span>
            <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold uppercase tracking-wider">Strategic Priority</span>
          </div>
          <h2 className="text-lg font-semibold tracking-tight leading-snug">
            Unlock Projected monthly revenue of <span className="text-emerald-500 font-bold font-display">₹{data.todaysMissions?.reduce((s, m) => s + (m.projectedImpact || 0), 0).toLocaleString() || "0"}</span>
          </h2>
          <p className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed font-medium">
            <strong>Priority Strategy:</strong> {data.revenueOpportunity}
          </p>
        </div>

        <div className="lg:w-64 w-full bg-white/45 dark:bg-[#111827]/40 border border-zinc-200/60 dark:border-white/5 rounded-xl p-4 shadow-sm flex flex-col justify-between self-stretch shrink-0 gap-3">
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Outreach Suggestions</span>
          <p className="text-[11px] text-zinc-500 leading-snug">Win back inactive customers via automated template campaigns.</p>
          <Link href="/suggested-messages" className="w-full">
            <Button size="sm" className="w-full text-xs font-semibold flex items-center justify-between">
              <span>Review Outreach ({data.automationSuggestionCount || 0})</span>
              <ArrowRight size={12} />
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. At-A-Glance Stat Cards (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-left">
        {[
          {
            label: "Total Customers",
            value: hasAdvanced && adv ? adv.totalCustomers : "—",
            desc: hasAdvanced && adv ? `+${adv.customerGrowthPct}% Registration Growth` : "Not enough data",
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-500/[0.04]",
          },
          {
            label: "Monthly Sales",
            value: hasAdvanced && adv ? `₹${adv.monthlySales.toLocaleString()}` : "—",
            desc: hasAdvanced && adv ? `${adv.revenueTrendPct >= 0 ? "+" : ""}${adv.revenueTrendPct}% vs Prev. Month` : "Not enough data",
            icon: DollarSign,
            color: hasAdvanced && adv && adv.revenueTrendPct >= 0 ? "text-emerald-500" : "text-rose-500",
            bg: "bg-emerald-500/[0.04]",
          },
          {
            label: "Repeat Customer Rate",
            value: hasAdvanced && adv && adv.totalCustomers > 0 ? `${Math.round((adv.repeatCustomers / adv.totalCustomers) * 100)}%` : "—",
            desc: hasAdvanced && adv && adv.totalCustomers > 0 && Math.round((adv.repeatCustomers / adv.totalCustomers) * 100) >= 40 ? "Loyalty: Healthy" : "Loyalty: Needs attention",
            icon: Activity,
            color: "text-amber-500",
            bg: "bg-amber-500/[0.04]",
          },

          {
            label: "Average Order Value",
            value: hasAdvanced && adv ? `₹${Math.round(adv.averageOrderValue).toLocaleString()}` : "—",
            desc: hasAdvanced && adv ? `₹${Math.round(adv.customerLifetimeValue).toLocaleString()} avg spent/buyer` : "Not enough data",
            icon: ShoppingBag,
            color: "text-indigo-500",
            bg: "bg-indigo-500/[0.04]",
          },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <Card key={i} className="border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950 p-4 flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-550 uppercase tracking-wider font-bold">{c.label}</span>
                <div className={`p-1.5 rounded ${c.color} ${c.bg}`}>
                  <Icon size={14} />
                </div>
              </div>
              <div>
                <p className="text-xl font-bold font-display tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">{c.value}</p>
                <p className="text-[9px] text-zinc-450 dark:text-zinc-500 mt-1 truncate leading-none font-semibold">{c.desc}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 2. Funnel/Stage pipeline progression */}
      <Card className="p-6 mb-6 text-left">
        <CardHeader className="p-0 pb-3 border-b border-zinc-150 dark:border-zinc-850">
          <CardTitle className="text-sm font-semibold">Your Growth Journey pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {pipelineStages.map((stage) => {
              const isCompleted = stage.status === "completed";
              const isActive = stage.status === "active";
              return (
                <div
                  key={stage.id}
                  className={`border rounded-lg p-4 transition-all duration-200 flex flex-col justify-between min-h-[100px] ${
                    isCompleted
                      ? "border-emerald-500/20 bg-emerald-500/[0.01]"
                      : isActive
                      ? "border-accent bg-accent/5 ring-1 ring-accent/20 animate-pulse-subtle"
                      : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 text-zinc-400"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Step 0{stage.id}</span>
                    {isCompleted ? (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    ) : isActive ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 animate-ping" />
                    ) : (
                      <HelpCircle size={14} className="text-zinc-500 shrink-0" />
                    )}
                  </div>
                  <div className="mt-2 text-left">
                    <p className={`text-xs font-semibold ${isActive ? "text-accent" : isCompleted ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400"}`}>
                      {stage.name}
                    </p>
                    <p className="text-[9px] text-zinc-450 mt-1 leading-normal font-medium">{stage.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. Deep Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Readiness Gauge (Radial Chart) */}
        <Card className="p-6 flex flex-col justify-between">
          <CardHeader className="p-0 pb-3 border-b border-zinc-150 dark:border-zinc-850">
            <CardTitle className="text-sm font-semibold">Business Growth Readiness</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4 flex-1 flex flex-col items-center justify-center relative min-h-[180px]">
            {mounted ? (
              <div className="relative w-40 h-28 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={readinessChartData}
                      cx="50%"
                      cy="100%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={60}
                      outerRadius={75}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="rgba(113, 113, 122, 0.15)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Absolute score display inside center of arc */}
                <div className="absolute bottom-0 text-center flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-display text-zinc-900 dark:text-zinc-50">{readinessValue}%</span>
                  <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-bold">Readiness Score</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-32 flex items-center justify-center"><Spinner size="sm" /></div>
            )}
            
            <div className="text-center text-[10px] text-zinc-500 mt-4 max-w-[240px] leading-relaxed mx-auto font-medium">
              Readiness is evaluated from overall completeness, active integration channels, and client activity trends.
            </div>
          </CardContent>
        </Card>

        {/* Historical Revenue Trend (Line Chart) */}
        <Card className="p-6 lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="p-0 pb-3 border-b border-zinc-150 dark:border-zinc-850 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Monthly Sales Trend</CardTitle>
            <Badge variant="secondary" className="text-[9px]">PAST BILLINGS</Badge>
          </CardHeader>
          <CardContent className="p-0 pt-4 flex-1 flex flex-col justify-center min-h-[200px]">
            {hasAdvanced && adv?.monthlyRevenue?.length ? (
              mounted ? (
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={adv.monthlyRevenue} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                      <XAxis dataKey="month" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v.toLocaleString()}`} />
                      <Tooltip 
                        formatter={(v) => [`₹${Number(v).toLocaleString()}`, "Revenue"]} 
                        contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "6px" }} 
                        labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontWeight: "bold" }} 
                        itemStyle={{ color: "#3b82f6", fontSize: "11px", fontWeight: "semibold" }} 
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="w-full h-48 flex items-center justify-center"><Spinner size="sm" /></div>
              )
            ) : (
              /* Honest empty state with skeleton design */
              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50/[0.02] min-h-[180px] text-center">
                <AlertTriangle size={20} className="text-zinc-400 mb-2" />
                <p className="text-xs font-semibold text-zinc-500">Sales Trend Unavailable</p>
                <p className="text-[10px] text-zinc-450 leading-relaxed mt-1 max-w-xs mx-auto">
                  No monthly billing logs were detected. Upload a recent Sales or Invoice CSV to plot your revenue growth trend curve.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Segment Distribution (Bar Chart) */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-3 border-b border-zinc-150 dark:border-zinc-850">
            <CardTitle className="text-sm font-semibold">Loyalty Segments</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4 flex flex-col justify-center min-h-[220px]">
            {hasAdvanced && adv?.segments?.length ? (
              mounted ? (
                <div className="w-full h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={adv.segments} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip 
                        formatter={(v) => [v, "Customers"]} 
                        contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "6px" }} 
                        labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontWeight: "bold" }} 
                        itemStyle={{ color: "#10b981", fontSize: "11px", fontWeight: "semibold" }} 
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {adv.segments.map((entry: any, index: number) => {
                          const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="w-full h-44 flex items-center justify-center"><Spinner size="sm" /></div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50/[0.02] min-h-[180px] text-center">
                <Users size={20} className="text-zinc-400 mb-2" />
                <p className="text-xs font-semibold text-zinc-500">Segments Unavailable</p>
                <p className="text-[10px] text-zinc-450 leading-relaxed mt-1 max-w-xs mx-auto">
                  No segment counts computed. Add customer records with purchase history to parse loyalty cohorts.
                </p>
              </div>
            )}
            
            {hasAdvanced && adv?.segments?.length && (
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 justify-center">
                {adv.segments.map((s: any, idx: number) => {
                  const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-red-500"];
                  return (
                    <div key={s.name} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                      <span className={`w-2 h-2 rounded-full ${colors[idx % colors.length]}`} />
                      <span>{s.name} ({s.count})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Strategic Priorities & Churn Warnings */}
        <Card className="p-6 lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="p-0 pb-3 border-b border-zinc-150 dark:border-zinc-850 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Today&apos;s Active Missions</CardTitle>
            <Badge variant="success" className="text-[9px]">RECOMMENDED</Badge>
          </CardHeader>
          <CardContent className="p-0 pt-4 flex-1 flex flex-col justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
              {data.todaysMissions?.length ? (
                data.todaysMissions.slice(0, 4).map((m) => (
                  <div key={m.id} className="border border-zinc-200/80 dark:border-zinc-800/85 rounded p-3.5 bg-zinc-50/20 dark:bg-zinc-900/10 flex flex-col justify-between gap-2 text-left">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Badge variant={m.priority === "high" ? "destructive" : "warning"} className="text-[9px] font-bold">
                          {m.priority}
                        </Badge>
                        {m.projectedImpact && (
                          <span className="text-[9px] font-bold text-emerald-500">+₹{m.projectedImpact}/mo impact</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-150 leading-snug">{m.title}</p>
                    </div>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-normal line-clamp-2" title={m.reasoning}>
                      {m.reasoning}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-450 italic py-6 text-center sm:col-span-2">
                  No active missions found. Run a new Business Scan.
                </p>
              )}
            </div>
            
            <Link href="/missions" className="w-full">
              <Button variant="outline" size="sm" className="w-full text-xs font-semibold flex items-center justify-between">
                <span>Navigate to Growth Missions Checklist</span>
                <ArrowRight size={12} />
              </Button>
            </Link>
          </CardContent>
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
