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
import { motion, useReducedMotion, animate } from "framer-motion";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  DollarSign,
  Activity,
  ShoppingBag,
  Eye,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Database,
  TrendingUp,
  TrendingDown,
  Minus,
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

// Reusable AnimatedNumber component using requestAnimationFrame/animate over 800ms
function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const shouldReduceMotion = useReducedMotion();
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayVal(value);
      return;
    }

    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate(latest) {
        setDisplayVal(Math.round(latest));
      }
    });

    return () => controls.stop();
  }, [value, shouldReduceMotion]);

  if (prefix === "₹") {
    return <span>₹{displayVal.toLocaleString()}</span>;
  }
  return <span>{prefix}{displayVal.toLocaleString()}{suffix}</span>;
}

export default function DashboardPage() {
  const { business, businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [showReportModal, setShowReportModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

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
        name: "1. Tell us about your business",
        description: "You shared your basic setup details.",
        status: business.discoveryComplete ? "completed" : "active",
      },
      {
        id: 2,
        name: "2. Scan your digital presence",
        description: "We checked how easy it is to find you online.",
        status: data.hasEnoughData ? "completed" : business.discoveryComplete ? "active" : "pending",
      },
      {
        id: 3,
        name: "3. Work on your checklist",
        description: "Complete your tasks to improve your business.",
        status: (data.todaysMissions?.length ?? 0) > 0 ? "active" : data.hasEnoughData ? "completed" : "pending",
      },
      {
        id: 4,
        name: "4. Track your performance",
        description: "See your sales and customer loyalty grow.",
        status: data.advancedMetrics ? "completed" : "pending",
      },
    ];
  }, [business, data]);

  // Motion variants for stagger elements
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
  };

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
            <h3 className="font-display font-semibold text-base mb-1">Could not load dashboard</h3>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-4">
              We had trouble getting your information. Please check your internet connection and try again.
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
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-6 text-left">
            <h1 className="font-display text-2xl font-semibold">Welcome, {data.businessName}!</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">Add some business information to activate your growth dashboard.</p>
          </div>
          
          <Card className="p-8 max-w-2xl text-center flex flex-col items-center gap-5 mx-auto mt-8 border border-zinc-250 dark:border-zinc-850 shadow-premium bg-white dark:bg-zinc-950">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-650 dark:text-zinc-400 text-lg animate-float">
              📊
            </div>
            <div>
              <h2 className="text-base font-semibold mb-2 text-center">Setting up your growth dashboard</h2>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed max-w-md mx-auto text-center">
                {data.missingInfoExplanation || "We need a bit more information about your business before we can show your growth checklist and sales metrics."}
              </p>
            </div>

            <div className="bg-zinc-50/50 dark:bg-zinc-900/10 p-4 rounded border border-zinc-200 dark:border-zinc-800 text-left w-full max-w-md">
              <span className="text-[10px] text-zinc-450 dark:text-zinc-550 uppercase font-bold tracking-wider block mb-2">Actions needed to open your dashboard</span>
              <ul className="flex flex-col gap-2 text-xs font-semibold">
                {data.missingAssets?.map((m) => (
                  <li key={m} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <span className="text-accent font-bold">•</span> {m}
                  </li>
                )) || <li className="text-zinc-550">No pending assets</li>}
              </ul>
            </div>

            <Link href="/customers" className="mt-2 w-full max-w-xs">
              <Button className="w-full">
                Upload my customer records
              </Button>
            </Link>
          </Card>
        </motion.div>
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
      <motion.div
        initial={shouldReduceMotion ? {} : "hidden"}
        animate="visible"
        variants={containerVariants}
        className="space-y-12 py-6"
      >
        {/* Top Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Welcome back, {data.businessName}!</h1>
            <p className="text-zinc-550 dark:text-zinc-400 text-sm">Here is how your business is doing today, explained in plain English.</p>
          </div>
          <div className="flex gap-2">
            {hasAdvanced && latestReport && (
              <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -0.5 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}>
                <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs font-semibold" onClick={() => setShowReportModal(true)}>
                  <Eye size={14} /> View CRM Report
                </Button>
              </motion.div>
            )}
            <Link href="/database">
              <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -0.5 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}>
                <Button size="sm" variant="secondary" className="flex items-center gap-1.5 text-xs font-semibold">
                  <Database size={14} /> Raw Database
                </Button>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        {/* Dominant Grid Redesign Pass: Dominant Growth Score Card (2/3 width) and Recommendation card (1/3 width) */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dominate centerpiece: Business Growth Score (Colspan 2) */}
          <Card className="lg:col-span-2 p-8 shadow-glow border border-accent/20 bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#1e1b4b] text-[#F8F9FA] flex flex-col md:flex-row gap-8 items-center justify-between relative overflow-hidden">
            {/* Subtle glow mesh lights overlay */}
            <div className="absolute top-[-30%] right-[-20%] w-[350px] h-[350px] bg-accent/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[250px] h-[250px] bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />
            
            <div className="flex-1 space-y-4 z-10 text-left">
              <span className="pill bg-accent/25 border border-accent/40 text-accent-foreground font-semibold px-3 py-1 text-[11px] tracking-wider uppercase">
                Active Assessment
              </span>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-white leading-tight">
                Your Business is Growth Ready
              </h2>
              <p className="text-zinc-300 text-xs leading-relaxed max-w-md">
                <strong>What this score means:</strong> This score shows how set up you are to find more customers. Connect more tools or complete daily tasks to raise this score.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center shrink-0 w-full md:w-56 bg-black/30 border border-white/5 p-6 rounded-2xl backdrop-blur-sm z-10 relative">
              {mounted ? (
                <div className="relative w-44 h-28 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={readinessChartData}
                        cx="50%"
                        cy="100%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={65}
                        outerRadius={80}
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={!shouldReduceMotion}
                        animationDuration={800}
                      >
                        <Cell fill="var(--accent)" />
                        <Cell fill="rgba(255, 255, 255, 0.08)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Absolute score display inside center of arc */}
                  <div className="absolute bottom-0 text-center flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold font-display text-white tracking-tight">
                      <AnimatedNumber value={readinessValue} suffix="%" />
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Growth readiness</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-32 flex items-center justify-center"><Spinner size="sm" /></div>
              )}
            </div>
          </Card>

          {/* AI Recommendation Card (Colspan 1) */}
          <Card className="p-6 border border-zinc-200 dark:border-zinc-800 shadow-card bg-white dark:bg-zinc-950 flex flex-col justify-between self-stretch shrink-0 gap-5 relative overflow-hidden">
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span className="bg-accent/15 text-accent border border-accent/20 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={10} /> AI Suggestion
                </span>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-550 font-bold uppercase tracking-wider">Priority</span>
              </div>
              <h3 className="text-base font-bold tracking-tight leading-snug text-zinc-900 dark:text-zinc-50">
                You could make an extra <span className="text-emerald-500 font-extrabold font-display"><AnimatedNumber value={data.todaysMissions?.reduce((s, m) => s + (m.projectedImpact || 0), 0) || 0} prefix="₹" /></span> every month
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                <strong>Strategy:</strong> {data.revenueOpportunity}
              </p>
            </div>
            
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900">
              <Link href="/suggested-messages" className="w-full">
                <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -0.5 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}>
                  <Button size="sm" className="w-full text-xs font-semibold flex items-center justify-between hover:shadow-premium shadow-md">
                    <span>See suggestions ({data.automationSuggestionCount || 0})</span>
                    <ArrowRight size={12} />
                  </Button>
                </motion.div>
              </Link>
            </div>
          </Card>
        </motion.div>

        {/* 1. At-A-Glance Stat Cards (KPIs with Sentiment state reinforcement & AnimatedNumbers) */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {[
            {
              label: "All Customers",
              value: hasAdvanced && adv ? <AnimatedNumber value={adv.totalCustomers} /> : "—",
              trend: hasAdvanced && adv ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <TrendingUp className="w-3 h-3" /> +{adv.customerGrowthPct}%
                </span>
              ) : null,
              desc: "signups this month",
              caption: "More people are signing up to buy from you — this helps your business grow.",
              icon: Users,
              color: "text-blue-500",
              bg: "bg-blue-500/[0.04]",
              accentBorder: "border-t-[3px] border-t-blue-500",
            },
            {
              label: "Sales This Month",
              value: hasAdvanced && adv ? <AnimatedNumber value={adv.monthlySales} prefix="₹" /> : "—",
              trend: hasAdvanced && adv ? (
                adv.revenueTrendPct >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <TrendingUp className="w-3 h-3" /> +{adv.revenueTrendPct}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    <TrendingDown className="w-3 h-3" /> {adv.revenueTrendPct}%
                  </span>
                )
              ) : null,
              desc: "vs last month",
              caption: "You are making more money compared to last month.",
              icon: DollarSign,
              color: hasAdvanced && adv && adv.revenueTrendPct >= 0 ? "text-emerald-500" : "text-rose-500",
              bg: "bg-emerald-500/[0.04]",
              accentBorder: hasAdvanced && adv && adv.revenueTrendPct >= 0 ? "border-t-[3px] border-t-emerald-500" : "border-t-[3px] border-t-rose-500",
            },
            {
              label: "Repeat Buyers",
              value: hasAdvanced && adv && adv.totalCustomers > 0 ? <AnimatedNumber value={Math.round((adv.repeatCustomers / adv.totalCustomers) * 100)} suffix="%" /> : "—",
              trend: hasAdvanced && adv && adv.totalCustomers > 0 ? (
                Math.round((adv.repeatCustomers / adv.totalCustomers) * 100) >= 40 ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Healthy
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    Needs work
                  </span>
                )
              ) : null,
              desc: "loyalty segment rating",
              caption: "Percentage of customers who bought from you more than once.",
              icon: Activity,
              color: "text-amber-500",
              bg: "bg-amber-500/[0.04]",
              accentBorder: hasAdvanced && adv && Math.round((adv.repeatCustomers / adv.totalCustomers) * 100) >= 40 ? "border-t-[3px] border-t-emerald-500" : "border-t-[3px] border-t-amber-500",
            },
            {
              label: "Average Spent per Visit",
              value: hasAdvanced && adv ? <AnimatedNumber value={Math.round(adv.averageOrderValue)} prefix="₹" /> : "—",
              trend: hasAdvanced && adv ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  Stable
                </span>
              ) : null,
              desc: `₹${hasAdvanced && adv ? Math.round(adv.customerLifetimeValue).toLocaleString() : 0} typical life value`,
              caption: "How much a customer typically buys during one visit.",
              icon: ShoppingBag,
              color: "text-indigo-500",
              bg: "bg-indigo-500/[0.04]",
              accentBorder: "border-t-[3px] border-t-indigo-500",
            },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={shouldReduceMotion ? {} : { y: -3, scale: 1.01 }}
                className={`border border-zinc-200 dark:border-zinc-800 shadow-card hover:shadow-premium bg-white dark:bg-zinc-950 p-5 rounded-xl flex flex-col justify-between min-h-[160px] hover:border-accent/40 transition duration-300 ${c.accentBorder}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-450 dark:text-zinc-550 uppercase tracking-wider font-bold">{c.label}</span>
                  <div className={`p-1.5 rounded ${c.color} ${c.bg}`}>
                    <Icon size={14} />
                  </div>
                </div>
                <div className="mt-2 text-left">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold font-display tracking-tight text-zinc-900 dark:text-zinc-50">{c.value}</p>
                    {c.trend}
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-450 mt-0.5 font-semibold">{c.desc}</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-900 text-[10px] text-zinc-400 dark:text-zinc-505 leading-snug">
                  {c.caption}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* 2. Growth Journey pipeline progression */}
        <motion.div variants={itemVariants}>
          <Card className="p-6 text-left shadow-card">
            <CardHeader className="p-0 pb-3 border-b border-zinc-150 dark:border-zinc-850">
              <CardTitle className="text-sm font-semibold">Your Growth Journey</CardTitle>
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
                          ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                          : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Step 0{stage.id}</span>
                        {isCompleted ? (
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        ) : isActive ? (
                          <div className="w-2 h-2 rounded-full bg-accent shrink-0 animate-ping" />
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
        </motion.div>

        {/* 3. Charts and Priorities Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          
          {/* Historical Revenue Trend (Line Chart) */}
          <motion.div 
            variants={itemVariants} 
            className="lg:col-span-2"
          >
            <Card className="p-6 h-full flex flex-col justify-between shadow-card">
              <CardHeader className="p-0 pb-3 border-b border-zinc-150 dark:border-zinc-850 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Your Sales Over Time</CardTitle>
                <Badge variant="secondary" className="text-[9px]">SALES HISTORY</Badge>
              </CardHeader>
              <CardContent className="p-0 pt-4 flex-1 flex flex-col justify-between min-h-[260px]">
                {hasAdvanced && adv?.monthlyRevenue?.length ? (
                  mounted ? (
                    <div className="space-y-4">
                      {/* Wrapped inside a motion scale container */}
                      <motion.div
                        initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                        className="w-full h-48"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={adv.monthlyRevenue} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                            <XAxis dataKey="month" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v.toLocaleString()}`} />
                            <Tooltip 
                              formatter={(v) => [`₹${Number(v).toLocaleString()}`, "Sales"]} 
                              contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "6px" }} 
                              labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontWeight: "bold" }} 
                              itemStyle={{ color: "#3b82f6", fontSize: "11px", fontWeight: "semibold" }} 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="revenue" 
                              stroke="var(--accent)" 
                              strokeWidth={2.5} 
                              dot={{ r: 4 }} 
                              activeDot={{ r: 6 }} 
                              isAnimationActive={!shouldReduceMotion}
                              animationDuration={800}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </motion.div>
                      <div className="text-[10px] text-zinc-550 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/20 p-2.5 rounded border border-zinc-150 dark:border-zinc-850">
                        <strong>What this chart means:</strong> This line shows your total sales each month. A rising line means you are successfully growing your business.
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center"><Spinner size="sm" /></div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50/[0.02] min-h-[180px] text-center">
                    <AlertTriangle size={20} className="text-zinc-400 mb-2" />
                    <p className="text-xs font-semibold text-zinc-500">Sales graph not available yet</p>
                    <p className="text-[10px] text-zinc-450 leading-relaxed mt-1 max-w-xs mx-auto">
                      No monthly billing logs were detected. Upload a recent Sales or Invoice CSV to plot your revenue growth trend curve.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Customer Segment Distribution (Bar Chart) */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 h-full flex flex-col justify-between shadow-card">
              <CardHeader className="p-0 pb-3 border-b border-zinc-150 dark:border-zinc-850">
                <CardTitle className="text-sm font-semibold">Your Customer Groups</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-4 flex-1 flex flex-col justify-between min-h-[260px]">
                {hasAdvanced && adv?.segments?.length ? (
                  mounted ? (
                    <div className="space-y-4">
                      {/* Wrapped inside a motion scale container */}
                      <motion.div
                        initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                        className="w-full h-36"
                      >
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
                            <Bar 
                              dataKey="count" 
                              radius={[4, 4, 0, 0]}
                              isAnimationActive={!shouldReduceMotion}
                              animationDuration={800}
                            >
                              {adv.segments.map((entry: any, index: number) => {
                                const colors = ["var(--accent)", "var(--accent2)", "var(--warn)", "var(--danger)"];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </motion.div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
                        {adv.segments.map((s: any, idx: number) => {
                          const colors = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-red-500"];
                          return (
                            <div key={s.name} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                              <span className={`w-2 h-2 rounded-full ${colors[idx % colors.length]}`} />
                              <span>{s.name} ({s.count})</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-[10px] text-zinc-550 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/20 p-2.5 rounded border border-zinc-150 dark:border-zinc-850">
                        <strong>Loyalty Grouping:</strong> Groups customers by how recently they bought. Green is active, red stopped buying.
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-44 flex items-center justify-center"><Spinner size="sm" /></div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50/[0.02] min-h-[180px] text-center">
                    <Users size={20} className="text-zinc-400 mb-2" />
                    <p className="text-xs font-semibold text-zinc-500">Customer groups not available yet</p>
                    <p className="text-[10px] text-zinc-450 leading-relaxed mt-1 max-w-xs mx-auto">
                      No groups computed yet. Add customer records with purchase history to see how loyal your buyers are.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Today's Active Tasks / Missions (Colspan 3 for clean visual layout) */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <Card className="p-6 h-full flex flex-col justify-between shadow-card">
              <CardHeader className="p-0 pb-3 border-b border-zinc-150 dark:border-zinc-850 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Your Tasks for Today</CardTitle>
                <Badge variant="success" className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">RECOMMENDED</Badge>
              </CardHeader>
              <CardContent className="p-0 pt-4 flex-1 flex flex-col justify-between gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  {data.todaysMissions?.length ? (
                    data.todaysMissions.slice(0, 4).map((m, idx) => {
                      // Visual sentiment states strip accents and icons
                      let sentimentBorder = "border-l-4 border-l-[var(--accent)]";
                      let sentimentBadge: "default" | "destructive" | "success" | "outline" | "secondary" | "warning" | "info" = "warning";
                      let sentimentBadgeText = "Do soon";

                      if (m.priority === "high") {
                        sentimentBorder = "border-l-4 border-l-[var(--danger)]";
                        sentimentBadge = "destructive";
                        sentimentBadgeText = "Urgent";
                      } else if (m.priority === "medium") {
                        sentimentBorder = "border-l-4 border-l-[var(--warn)]";
                        sentimentBadge = "warning";
                        sentimentBadgeText = "Important";
                      }

                      return (
                        <motion.div
                          key={m.id}
                          initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : idx * 0.05 }}
                          whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.01 }}
                          className={`border border-zinc-200 dark:border-zinc-800 rounded p-4 bg-zinc-50/20 dark:bg-zinc-900/10 flex flex-col justify-between gap-3 text-left hover:border-accent/30 shadow-sm hover:shadow-md transition duration-300 ${sentimentBorder}`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Badge variant={sentimentBadge} className="text-[9px] font-bold">
                                {sentimentBadgeText}
                              </Badge>
                              {m.projectedImpact && (
                                <span className="text-[9px] font-bold text-emerald-500">Could add ₹{m.projectedImpact}/mo</span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-150 leading-snug">{m.title}</p>
                          </div>
                          <p className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-normal line-clamp-2" title={m.reasoning}>
                            {m.reasoning}
                          </p>
                        </motion.div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-zinc-450 italic py-6 text-center sm:col-span-2">
                      No active tasks found. Run a new scan to get recommendations.
                    </p>
                  )}
                </div>
                
                <Link href="/missions" className="w-full mt-2">
                  <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.01 }} whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}>
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold flex items-center justify-between hover:shadow-premium shadow-sm">
                      <span>See your full growth checklist</span>
                      <ArrowRight size={12} />
                    </Button>
                  </motion.div>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </motion.div>

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
