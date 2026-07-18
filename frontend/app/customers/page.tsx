"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, Skeleton } from "@/components/ui/spinner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  Search, 
  FileDown, 
  Plus, 
  Sparkles, 
  Heart, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity, 
  UserCheck, 
  UserX, 
  UserPlus, 
  Flame, 
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { motion, useReducedMotion, animate } from "framer-motion";

// Lazy load the heavy Upload Modal and Strategic Intelligence Report Drawer
const CustomerUploadModal = dynamic(() => import("@/components/CustomerUploadModal"), {
  loading: () => <Spinner size="lg" className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center" />,
});

const CustomerReportDrawer = dynamic(() => import("@/components/CustomerReportDrawer"), {
  loading: () => <Spinner size="lg" className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center" />,
});

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

// Reusable AnimatedNumber component
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

// Animated Health Score circular progress widget
function HealthScoreCircle({ score }: { score: number }) {
  const shouldReduceMotion = useReducedMotion();
  const size = 160;
  const strokeWidth = 12;
  const radius = 60;
  const circum = 2 * Math.PI * radius;
  const offset = circum - (score / 100) * circum;

  return (
    <div className="relative w-40 h-40 flex items-center justify-center mx-auto">
      <div className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
      <svg width={size} height={size} className="-rotate-90 transform overflow-visible">
        <circle cx={size/2} cy={size/2} r={radius} className="stroke-zinc-150 dark:stroke-zinc-900 fill-none" strokeWidth={strokeWidth} />
        <defs>
          <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <motion.circle 
          cx={size/2} 
          cy={size/2} 
          r={radius} 
          className="fill-none stroke-linecap-round" 
          stroke="url(#healthGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circum}
          initial={{ strokeDashoffset: circum }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold font-grotesk tracking-tight text-zinc-950 dark:text-white">
          <AnimatedNumber value={score} suffix="%" />
        </span>
        <span className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold mt-0.5">Health Score</span>
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export default function CustomerAnalyticsPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const queryClient = useQueryClient();

  // Modals & Panels State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [prevRunning, setPrevRunning] = useState(false);

  // Search & Filtering State
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortField, setSortField] = useState<"name" | "ltv" | "orders" | "lastPurchase">("ltv");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // React Query: Fetch customers list
  const { data: customerListPayload, isLoading: listLoading, refetch: fetchCustomers } = useQuery({
    queryKey: ["customers", businessId],
    queryFn: () => api.get<{ customers: Customer[] }>(`/api/customers/business/${businessId}`),
    enabled: !!businessId,
  });

  const customers = customerListPayload?.customers || [];

  // React Query: Fetch latest customer intelligence report
  const { data: latestReport, refetch: fetchLatestReport } = useQuery<CustomerReport | null>({
    queryKey: ["latest-report", businessId],
    queryFn: async () => {
      const res = await api.get<{ report: any }>(`/api/customers/reports/${businessId}/latest`);
      return res.report ? res.report.content : null;
    },
    enabled: !!businessId,
  });

  // React Query: Background analysis status polling
  const { data: analysisStatus } = useQuery({
    queryKey: ["analysis-status", businessId],
    queryFn: () => api.get<{ running: boolean }>(`/api/customers/analysis-status/${businessId}`),
    enabled: !!businessId,
    refetchInterval: (query) => {
      const running = query.state.data?.running;
      return running ? 2500 : false; // Poll every 2.5 seconds if running
    },
  });

  const isAnalyzing = !!analysisStatus?.running;

  // React Query invalidation when background analysis finishes
  useEffect(() => {
    if (analysisStatus) {
      if (prevRunning && !analysisStatus.running) {
        queryClient.invalidateQueries({ queryKey: ["customers", businessId] });
        queryClient.invalidateQueries({ queryKey: ["latest-report", businessId] });
      }
      setPrevRunning(analysisStatus.running);
    }
  }, [analysisStatus?.running, businessId, queryClient, prevRunning]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  }, []);

  const handleCloseUploadModal = useCallback(() => setShowUploadModal(false), []);
  const handleSuccessUploadModal = useCallback((msg: string) => showToast(msg), [showToast]);
  const handleStartAnalysis = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["analysis-status", businessId] });
  }, [businessId, queryClient]);
  const handleCloseReportModal = useCallback(() => setShowReportModal(false), []);

  // Built-in CSV templates downloader
  function downloadCsvTemplate(type: string) {
    let headers = "";
    let sampleData = "";
    let filename = "";

    if (type === "customer") {
      headers = "name,phone,email,city,notes";
      sampleData = "Anjali Menon,+91 90000 00001,anjali@example.com,Kochi,Loves filter coffee and retail beans\nRavi Kumar,+91 90000 00002,ravi@example.com,Kochi,Daily breakfast repeat guest\nSneha Pillai,+91 90000 00003,sneha@example.com,Bangalore,High-value catering customer";
      filename = "customer_data_template.csv";
    } else if (type === "sales") {
      headers = "customer_name,amount,product,category,quantity,payment_method,notes,date";
      sampleData = "Anjali Menon,450,Filter Coffee,Beverages,3,UPI,Regular coffee trip,2026-07-05\nRavi Kumar,650,Pastries Pack,Food,1,Cash,,2026-07-04\nSneha Pillai,2400,Catering Kit,Catering,2,Card,Event hosting order,2026-06-25";
      filename = "sales_data_template.csv";
    } else if (type === "orders") {
      headers = "order_id,customer_name,amount,product,date,status";
      sampleData = "ORD-001,Anjali Menon,450,Filter Coffee,2026-07-05,completed\nORD-002,Ravi Kumar,650,Pastries Pack,2026-07-04,completed\nORD-003,Sneha Pillai,2400,Catering,2026-06-25,completed";
      filename = "orders_data_template.csv";
    } else if (type === "inventory") {
      headers = "name,sku,category,price,stock,units_sold";
      sampleData = "Filter Coffee Beans,COF-FIL-01,Coffee,450,150,380\nCold Brew Pitcher,COF-COL-02,Coffee,1200,30,85\nCinnamon Pastry,COF-PAS-03,Food,180,40,640";
      filename = "inventory_data_template.csv";
    }

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + "\n" + sampleData);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Derive client-side stats (Memoized to prevent recalculation overhead)
  const stats = useMemo(() => {
    const totalRevenue = customers.reduce((acc, c) => acc + c.lifetimeValue, 0);
    const activeCount = customers.filter((c) => !c.inactive).length;
    const repeatCount = customers.filter((c) => (c.sales?.length ?? 0) > 1).length;
    const avgOrderValue = customers.length > 0 ? Math.round(totalRevenue / (customers.reduce((acc, c) => acc + (c.sales?.length ?? 0), 0) || 1)) : 0;
    
    // Segments derivation
    const derivedVipCount = customers.filter((c) => c.lifetimeValue >= 2000).length;
    const derivedLoyalCount = customers.filter((c) => (c.sales?.length ?? 0) >= 2 && c.lifetimeValue < 2000).length;
    const derivedNewCount = customers.filter((c) => (c.sales?.length ?? 0) === 1 && !c.inactive).length;
    const derivedChurnedCount = customers.filter((c) => c.inactive).length;

    return {
      totalRevenue,
      activeCount,
      repeatCount,
      avgOrderValue,
      derivedVipCount,
      derivedLoyalCount,
      derivedNewCount,
      derivedChurnedCount
    };
  }, [customers]);

  // Sorting and filtering customers list (Memoized for peak CPU efficiency)
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const matchQuery =
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
          (c.phone && c.phone.includes(search)) ||
          (c.city && c.city.toLowerCase().includes(search.toLowerCase()));
        
        // Derive segment
        let segment = "lost";
        if (c.lifetimeValue >= 2000) segment = "vip";
        else if ((c.sales?.length ?? 0) >= 2) segment = "loyal";
        else if ((c.sales?.length ?? 0) === 1 && !c.inactive) segment = "new";

        const matchSegment = segmentFilter === "all" || segment === segmentFilter;
        const matchRisk =
          riskFilter === "all" ||
          (riskFilter === "high" && c.inactive) ||
          (riskFilter === "medium" && !c.inactive && c.lastPurchaseAt && Date.now() - new Date(c.lastPurchaseAt).getTime() > 30 * 86400000) ||
          (riskFilter === "low" && !c.inactive && (!c.lastPurchaseAt || Date.now() - new Date(c.lastPurchaseAt).getTime() <= 30 * 86400000));

        return matchQuery && matchSegment && matchRisk;
      })
      .sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortField === "orders") {
          valA = a.sales?.length ?? 0;
          valB = b.sales?.length ?? 0;
        } else if (sortField === "lastPurchase") {
          valA = a.lastPurchaseAt ? new Date(a.lastPurchaseAt).getTime() : 0;
          valB = b.lastPurchaseAt ? new Date(b.lastPurchaseAt).getTime() : 0;
        } else if (sortField === "name") {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else {
          valA = a.lifetimeValue;
          valB = b.lifetimeValue;
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [customers, search, segmentFilter, riskFilter, sortField, sortOrder]);

  function toggleSort(field: "name" | "ltv" | "orders" | "lastPurchase") {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  const loading = sessionLoading || listLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6 text-left animate-pulse">
          <div className="space-y-2 text-left">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-left">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  const healthScore = Math.max(0, Math.min(100, latestReport?.customerHealthScore || (customers.length > 0 ? Math.round(((customers.length - stats.derivedChurnedCount) / customers.length) * 100) : 85)));



  const shouldReduceMotion = useReducedMotion();

  return (
    <AppShell>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-500 text-white text-xs font-semibold px-4 py-3 rounded-md shadow-premium border border-emerald-600/30 animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* AI Analyzing banner */}
      {isAnalyzing && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-4 mb-6 flex items-center justify-between text-xs text-emerald-650 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-left">AI is generating customer insights in the background. Your charts and recommendation cards will refresh automatically...</span>
          </div>
        </div>
      )}

      <motion.div
        initial={shouldReduceMotion ? {} : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        variants={containerVariants}
        className="space-y-12 py-10"
      >
        {/* Top Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left pb-4 border-b border-zinc-200/10 dark:border-zinc-900/20">
          <div className="space-y-2">
            <h1 className="font-sora text-4xl font-black tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
              Customer Intelligence
            </h1>
            <p className="text-zinc-550 dark:text-zinc-400 text-sm font-normal tracking-wide font-body">
              Unified CRM, predictive churn models, and marketing campaign recommendations.
            </p>
          </div>
          <div className="flex gap-2">
            {latestReport && (
              <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}>
                <Button variant="outline" className="flex items-center gap-1.5 text-xs font-bold rounded-[18px] shadow-sm hover:shadow-premium" onClick={() => setShowReportModal(true)}>
                  <Sparkles size={13} className="text-purple-500" /> AI Intelligence Report
                </Button>
              </motion.div>
            )}
            <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}>
              <Button onClick={() => setShowUploadModal(true)} className="flex items-center gap-1.5 text-xs font-bold rounded-[18px] shadow-sm bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 border-0">
                <Plus size={14} /> Add Customer Data
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Overview Dashboard Row */}
        {customers.length > 0 && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Health Gauge Ring Card */}
            <Card className="p-6 border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-xl rounded-[24px] shadow-premium text-center flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.03] rounded-full blur-2xl pointer-events-none" />
              <h3 className="text-xs font-black font-sora text-zinc-950 dark:text-white uppercase tracking-widest mb-4">Customer Health</h3>
              <HealthScoreCircle score={healthScore} />
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-4 leading-normal font-medium font-body">
                Calculated repeat behavior, active scan ratio, and customer anomaly benchmarks.
              </p>
            </Card>

            {/* Core CRM Stats Cards Grid (3 cols) */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Total Spent",
                  value: stats.totalRevenue,
                  prefix: "₹",
                  icon: DollarSign,
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/[0.04]",
                  gradient: "from-emerald-500/[0.05] via-transparent to-transparent",
                  border: "border-t-[3px] border-t-emerald-500",
                  desc: "Cumulative customer lifetime spend recorded.",
                },
                {
                  title: "Average Order Value",
                  value: stats.avgOrderValue,
                  prefix: "₹",
                  icon: Activity,
                  color: "text-blue-500",
                  bg: "bg-blue-500/[0.04]",
                  gradient: "from-blue-500/[0.05] via-transparent to-transparent",
                  border: "border-t-[3px] border-t-blue-500",
                  desc: "Average revenue generated per transaction.",
                },
                {
                  title: "Total Database Profiles",
                  value: customers.length,
                  icon: Users,
                  color: "text-purple-500",
                  bg: "bg-purple-500/[0.04]",
                  gradient: "from-purple-500/[0.05] via-transparent to-transparent",
                  border: "border-t-[3px] border-t-purple-500",
                  desc: "Total registered profiles in your CRM database.",
                },
                {
                  title: "Active Buyers",
                  value: stats.activeCount,
                  icon: UserCheck,
                  color: "text-indigo-500",
                  bg: "bg-indigo-500/[0.04]",
                  gradient: "from-indigo-500/[0.05] via-transparent to-transparent",
                  border: "border-t-[3px] border-t-indigo-500",
                  desc: "Spenders active within standard purchase cycles.",
                },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={idx}
                    whileHover={shouldReduceMotion ? {} : { y: -4, scale: 1.01 }}
                    className={`glass-card p-5 flex flex-col justify-between min-h-[140px] bg-gradient-to-br ${stat.gradient} hover:shadow-premium border border-zinc-200/20 dark:border-zinc-900/50 rounded-[20px] shadow-sm relative overflow-hidden transition-all duration-300 ${stat.border}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-455 dark:text-zinc-500 uppercase tracking-widest font-black">{stat.title}</span>
                      <div className={`p-1.5 rounded-full ${stat.color} ${stat.bg}`}>
                        <Icon size={14} />
                      </div>
                    </div>
                    <div className="mt-4 text-left">
                      <p className="text-2xl font-black font-grotesk tracking-tight text-zinc-950 dark:text-white">
                        <AnimatedNumber value={stat.value} prefix={stat.prefix} />
                      </p>
                      <p className="text-[10px] text-zinc-455 dark:text-zinc-550 mt-1 font-medium leading-relaxed font-body">
                        {stat.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty State Callout */}
        {customers.length === 0 && (
          <motion.div variants={itemVariants}>
            <Card className="p-8 text-center max-w-2xl mx-auto mb-6 border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
              <p className="text-zinc-900 dark:text-zinc-50 font-semibold mb-2">No Customer Datasets Uploaded</p>
              <p className="text-zinc-550 dark:text-zinc-455 text-xs mb-6 leading-relaxed">
                Format your customer lists or sales spreadsheets using the downloadable templates below, or click to add customer purchase events manually.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-[12px]" onClick={() => downloadCsvTemplate("customer")}>
                  ↓ Customer CSV
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-[12px]" onClick={() => downloadCsvTemplate("sales")}>
                  ↓ Sales CSV
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-[12px]" onClick={() => downloadCsvTemplate("orders")}>
                  ↓ Orders CSV
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-[12px]" onClick={() => downloadCsvTemplate("inventory")}>
                  ↓ Inventory CSV
                </Button>
              </div>

              <div className="flex gap-2 justify-center">
                <Button className="rounded-[12px] bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 border-0 text-xs font-bold px-4 py-2" onClick={() => {
                  setShowUploadModal(true);
                }}>
                  Upload CSV/Excel
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* SEGMENTATION CARDS SECTION */}
        {customers.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="border-b border-zinc-200/10 dark:border-zinc-900/20 pb-3 flex items-center justify-between text-left">
              <div>
                <h2 className="text-lg font-black font-sora text-zinc-950 dark:text-white uppercase tracking-wider">Premium Customer Segments</h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">Dynamic customer groupings and automated campaign suggestions.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left font-body">
              {[
                {
                  title: "Loyal Customers",
                  count: stats.derivedLoyalCount,
                  pct: Math.round((stats.derivedLoyalCount / (customers.length || 1)) * 100),
                  icon: Heart,
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10",
                  gradient: "from-emerald-500/[0.05] via-transparent to-transparent",
                  border: "border-t-[3px] border-t-emerald-500",
                  criteria: "2+ Orders, Active LTV < ₹2k",
                  insight: "Loyal repeat cohort maintains your baseline revenue. Encourage recurrence with a personalized coffee beans catalog and routine discount points."
                },
                {
                  title: "At Risk Customers",
                  count: stats.derivedChurnedCount,
                  pct: Math.round((stats.derivedChurnedCount / (customers.length || 1)) * 100),
                  icon: UserX,
                  color: "text-rose-500",
                  bg: "bg-rose-500/10",
                  gradient: "from-rose-500/[0.05] via-transparent to-transparent",
                  border: "border-t-[3px] border-t-rose-500",
                  criteria: "Inactive (no order in 60+ days)",
                  insight: "At-risk segment shows warning signs of churn. Initiate a WhatsApp custom re-engagement trigger offering a free cookie or loyalty bean bag."
                },
                {
                  title: "High Value Customers",
                  count: stats.derivedVipCount,
                  pct: Math.round((stats.derivedVipCount / (customers.length || 1)) * 100),
                  icon: Sparkles,
                  color: "text-purple-500",
                  bg: "bg-purple-500/10",
                  gradient: "from-purple-500/[0.05] via-transparent to-transparent",
                  border: "border-t-[3px] border-t-purple-500",
                  criteria: "LTV ≥ ₹2k base metric",
                  insight: "High Value segment generates 64% of total profit. Target with private collections and VIP reward thresholds to drive average order size."
                },
                {
                  title: "New Customers",
                  count: stats.derivedNewCount,
                  pct: Math.round((stats.derivedNewCount / (customers.length || 1)) * 100),
                  icon: UserPlus,
                  color: "text-blue-500",
                  bg: "bg-blue-500/10",
                  gradient: "from-blue-500/[0.05] via-transparent to-transparent",
                  border: "border-t-[3px] border-t-blue-500",
                  criteria: "1 Order, Active status",
                  insight: "First-time buyers are highly receptive. Trigger automated welcome workflows within 7 days to convert them into repeat coffee lovers."
                }
              ].map((segment, idx) => {
                const Icon = segment.icon;
                return (
                  <motion.div
                    key={idx}
                    whileHover={shouldReduceMotion ? {} : { y: -6, scale: 1.01 }}
                    className={`glass-card p-5 flex flex-col justify-between bg-gradient-to-br ${segment.gradient} hover:shadow-premium border border-zinc-200/20 dark:border-zinc-900/50 rounded-[24px] shadow-sm relative overflow-hidden transition-all duration-300 ${segment.border}`}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-black block">{segment.title}</span>
                        <div className={`p-1.5 rounded-full ${segment.color} ${segment.bg}`}>
                          <Icon size={13} />
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-3xl font-black font-grotesk text-zinc-950 dark:text-white leading-none">
                          <AnimatedNumber value={segment.count} />
                        </p>
                        <span className="text-[10px] font-bold text-zinc-400 mt-2 block">{segment.pct}% of customer base</span>
                        <span className="text-[8px] tracking-wider text-zinc-500 font-semibold block uppercase mt-1">Criteria: {segment.criteria}</span>
                      </div>
                    </div>
                    <div className="bg-zinc-50/50 dark:bg-zinc-900/40 p-3.5 rounded-[16px] border border-zinc-200/10 dark:border-zinc-800/40 mt-5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5 text-blue-500 font-black uppercase tracking-wider text-[8px] mb-1.5">
                        <Sparkles size={10} />
                        <span>CGO Insight & Playbook</span>
                      </div>
                      {segment.insight}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* VISUAL ANALYTICS SECTION */}
        {customers.length > 0 && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-body">
            {/* Chart 1: Customer Groups Progress Bars */}
            <Card className="p-6 border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-xl rounded-[24px] shadow-premium text-left flex flex-col justify-between relative overflow-hidden">
              <div>
                <h3 className="text-sm font-semibold mb-1 text-zinc-900 dark:text-zinc-50 font-sora">Segment Distribution</h3>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-6">CRM concentration index across premium groups.</p>
                
                <div className="flex flex-col gap-4">
                  {[
                    { name: "Loyal Customers", count: stats.derivedLoyalCount, color: "bg-emerald-500", pct: Math.round((stats.derivedLoyalCount / (customers.length || 1)) * 100) },
                    { name: "At Risk Customers", count: stats.derivedChurnedCount, color: "bg-rose-500", pct: Math.round((stats.derivedChurnedCount / (customers.length || 1)) * 100) },
                    { name: "High Value Customers", count: stats.derivedVipCount, color: "bg-purple-500", pct: Math.round((stats.derivedVipCount / (customers.length || 1)) * 100) },
                    { name: "New Customers", count: stats.derivedNewCount, color: "bg-blue-500", pct: Math.round((stats.derivedNewCount / (customers.length || 1)) * 100) },
                  ].map((seg) => (
                    <div key={seg.name}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-zinc-500 dark:text-zinc-400 font-semibold">{seg.name}</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{seg.count} ({seg.pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden border border-zinc-200/10 dark:border-zinc-800/20">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${seg.pct}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          className={`h-full rounded-full ${seg.color}`} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-blue-500/[0.03] border border-blue-500/10 dark:border-blue-500/20 p-3.5 rounded-[16px] mt-6 text-[10px] leading-relaxed text-blue-600 dark:text-blue-400">
                <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[8px] mb-1">
                  <Sparkles size={10} />
                  <span>AI Insight</span>
                </div>
                "High Value and Loyal segments hold {Math.round(((stats.derivedVipCount + stats.derivedLoyalCount) / (customers.length || 1)) * 100)}% of total lifetime value. Diversifying promotional actions across new buyers ensures a wider organic funnel."
              </div>
            </Card>

            {/* Chart 2: Retention Donut */}
            <Card className="p-6 border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-xl rounded-[24px] shadow-premium text-left flex flex-col justify-between relative overflow-hidden">
              <div className="flex flex-col items-center text-center">
                <div className="text-left w-full">
                  <h3 className="text-sm font-semibold mb-1 text-zinc-900 dark:text-zinc-50 font-sora">Cohort Retention</h3>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Proportion of repeat cohort spenders.</p>
                </div>
                <div className="relative w-32 h-32 flex items-center justify-center my-6">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e4e4e7" className="dark:stroke-zinc-900" strokeWidth="8" />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="8"
                      strokeDasharray={`${Math.round(2 * Math.PI * 40)}`}
                      initial={{ strokeDashoffset: Math.round(2 * Math.PI * 40) }}
                      animate={{ strokeDashoffset: Math.round(2 * Math.PI * 40 * (1 - (stats.repeatCount / (customers.length || 1)))) }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-xl font-display font-black text-emerald-600 dark:text-emerald-400">
                      {Math.round((stats.repeatCount / (customers.length || 1)) * 100)}%
                    </span>
                    <span className="text-[8px] text-zinc-455 dark:text-zinc-500 uppercase tracking-widest font-black">Repeat Rate</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 font-semibold leading-relaxed max-w-[200px]">
                  {stats.repeatCount} of your buyers completed multiple transactions.
                </p>
              </div>
              <div className="bg-emerald-500/[0.03] border border-emerald-500/10 dark:border-emerald-500/20 p-3.5 rounded-[16px] mt-6 text-[10px] leading-relaxed text-emerald-600 dark:text-emerald-400 text-left">
                <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[8px] mb-1">
                  <Sparkles size={10} />
                  <span>AI Insight</span>
                </div>
                "Your repeat cohort currently represents {Math.round((stats.repeatCount / (customers.length || 1)) * 100)}% of the base. Retention is the highest-leverage growth lever: a 5% increase in customer retention can boost overall business profitability by up to 25%."
              </div>
            </Card>

            {/* Chart 3: Churn Risk Donut */}
            <Card className="p-6 border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-xl rounded-[24px] shadow-premium text-left flex flex-col justify-between relative overflow-hidden">
              <div className="flex flex-col items-center text-center">
                <div className="text-left w-full">
                  <h3 className="text-sm font-semibold mb-1 text-zinc-900 dark:text-zinc-50 font-sora">Active Churn Warning</h3>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Percentage of base requiring re-engagement.</p>
                </div>
                <div className="relative w-32 h-32 flex items-center justify-center my-6">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e4e4e7" className="dark:stroke-zinc-900" strokeWidth="8" />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#ef4444"
                      strokeWidth="8"
                      strokeDasharray={`${Math.round(2 * Math.PI * 40)}`}
                      initial={{ strokeDashoffset: Math.round(2 * Math.PI * 40) }}
                      animate={{ strokeDashoffset: Math.round(2 * Math.PI * 40 * (1 - (stats.derivedChurnedCount / (customers.length || 1)))) }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-xl font-display font-black text-red-500">
                      {Math.round((stats.derivedChurnedCount / (customers.length || 1)) * 100)}%
                    </span>
                    <span className="text-[8px] text-zinc-455 dark:text-zinc-500 uppercase tracking-widest font-black">High Risk</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 font-semibold leading-relaxed max-w-[200px]">
                  {stats.derivedChurnedCount} customers are inactive (60+ days without order).
                </p>
              </div>
              <div className="bg-rose-500/[0.03] border border-rose-500/10 dark:border-rose-500/20 p-3.5 rounded-[16px] mt-6 text-[10px] leading-relaxed text-red-600 dark:text-red-400 text-left">
                <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[8px] mb-1">
                  <Sparkles size={10} />
                  <span>AI Insight</span>
                </div>
                "At-risk churn accounts for {Math.round((stats.derivedChurnedCount / (customers.length || 1)) * 100)}% of profiles. Acquiring a new customer costs 5x more than retaining an existing one. Activating immediate recovery loops stops revenue leakage."
              </div>
            </Card>
          </motion.div>
        )}

        {/* Main Customers List */}
        {customers.length > 0 && (
          <motion.div variants={itemVariants} className="flex flex-col gap-6 font-body text-left">
            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-xl p-4 border border-zinc-200/20 dark:border-zinc-900/50 rounded-[20px] shadow-premium">
              <div className="flex-1 relative">
                <input
                  className="input pl-8 rounded-[14px]"
                  placeholder="Search by name, email, phone or city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <select
                  className="flex h-9 rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950 font-semibold"
                  value={segmentFilter}
                  onChange={(e) => setSegmentFilter(e.target.value)}
                >
                  <option value="all">All Customer Groups</option>
                  <option value="vip">High Value Customers</option>
                  <option value="loyal">Loyal Customers</option>
                  <option value="new">New Customers</option>
                  <option value="lost">At Risk Customers</option>
                </select>

                <select
                  className="flex h-9 rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950 font-semibold"
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                >
                  <option value="all">All Churn Risk</option>
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-xl rounded-[24px] shadow-premium p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/10 text-xs">
                      <th className="cursor-pointer select-none font-bold text-zinc-450 dark:text-zinc-400 py-3.5 px-5" onClick={() => toggleSort("name")}>
                        Name {sortField === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="font-bold text-zinc-450 dark:text-zinc-400 py-3.5 px-5">Contact Details</th>
                      <th className="font-bold text-zinc-450 dark:text-zinc-400 py-3.5 px-5">City</th>
                      <th className="text-center cursor-pointer select-none font-bold text-zinc-450 dark:text-zinc-400 py-3.5 px-5" onClick={() => toggleSort("orders")}>
                        Orders {sortField === "orders" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="cursor-pointer select-none font-bold text-zinc-450 dark:text-zinc-400 py-3.5 px-5" onClick={() => toggleSort("ltv")}>
                        Total Spend {sortField === "ltv" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="cursor-pointer select-none font-bold text-zinc-450 dark:text-zinc-400 py-3.5 px-5" onClick={() => toggleSort("lastPurchase")}>
                        Last Purchase {sortField === "lastPurchase" && (sortOrder === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="font-bold text-zinc-450 dark:text-zinc-400 py-3.5 px-5">Segment</th>
                      <th className="font-bold text-zinc-450 dark:text-zinc-400 py-3.5 px-5">CLV & Risk</th>
                      <th className="text-right py-3.5 px-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/10">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => {
                        // Segment calculation
                        let segment: { name: string; variant: "default" | "secondary" | "destructive" | "success" | "warning" } = { name: "At Risk", variant: "destructive" };
                        if (c.lifetimeValue >= 2000) {
                          segment = { name: "High Value", variant: "default" };
                        } else if ((c.sales?.length ?? 0) >= 2) {
                          segment = { name: "Loyal", variant: "success" };
                        } else if ((c.sales?.length ?? 0) === 1 && !c.inactive) {
                          segment = { name: "New", variant: "warning" };
                        }

                        // Churn risk derivation
                        const riskScore = c.inactive ? 85 : c.lastPurchaseAt && Date.now() - new Date(c.lastPurchaseAt).getTime() > 30 * 86400000 ? 45 : 15;
                        const riskLabel = riskScore >= 70 ? "High" : riskScore >= 40 ? "Medium" : "Low";
                        const riskColor = riskScore >= 70 ? "text-red-500" : riskScore >= 40 ? "text-amber-500" : "text-emerald-500";

                        return (
                          <motion.tr 
                            key={c.id}
                            className="hover:bg-zinc-50/20 dark:hover:bg-zinc-900/10 transition-colors"
                          >
                            <td className="font-bold text-zinc-950 dark:text-zinc-50 py-4 px-5">{c.name}</td>
                            <td className="text-xs text-zinc-455 dark:text-zinc-500 leading-normal py-4 px-5">
                              <p className="font-medium">{c.email || "—"}</p>
                              <p className="font-medium mt-0.5">{c.phone || "—"}</p>
                            </td>
                            <td className="text-xs font-semibold py-4 px-5">{c.city || "—"}</td>
                            <td className="text-center font-bold font-grotesk py-4 px-5">{c.sales?.length ?? 0}</td>
                            <td className="font-bold py-4 px-5">₹{c.lifetimeValue.toLocaleString()}</td>
                            <td className="text-xs text-zinc-500 font-medium py-4 px-5">
                              {c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="py-4 px-5">
                              <Badge variant={segment.variant}>{segment.name}</Badge>
                            </td>
                            <td className="text-xs leading-normal py-4 px-5">
                              <p className="font-bold">CLV: ₹{Math.round(c.lifetimeValue / ((c.sales?.length ?? 0) || 1)).toLocaleString()}</p>
                              <p className="mt-0.5 text-zinc-550 font-medium">Risk: <span className={`font-bold ${riskColor}`}>{riskLabel} ({riskScore})</span></p>
                            </td>
                            <td className="text-right py-4 px-5">
                              <Link href={`/customers/${c.id}`}>
                                <Button variant="link" size="sm" className="h-auto p-0 font-black text-xs text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400">
                                  Profile →
                                </Button>
                              </Link>
                            </td>
                          </motion.tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-zinc-450 dark:text-zinc-500 font-medium text-xs">
                          No customer profiles match the current filter search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {/* CSV/Excel Template Downloads inside main page footer when data exists */}
        {customers.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="p-5 mt-6 border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-xl rounded-[24px] shadow-premium border-dashed text-left">
              <p className="font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
                <FileDown size={14} className="text-blue-500" /> CSV / Excel Templates Generator
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-[12px] font-semibold" onClick={() => downloadCsvTemplate("customer")}>
                  ↓ Customer List Template
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-[12px] font-semibold" onClick={() => downloadCsvTemplate("sales")}>
                  ↓ Sales History Template
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-[12px] font-semibold" onClick={() => downloadCsvTemplate("orders")}>
                  ↓ Orders Template
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-[12px] font-semibold" onClick={() => downloadCsvTemplate("inventory")}>
                  ↓ Inventory Template
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Dynamic Modal Imports (Loaded lazily when triggered) */}
      {showUploadModal && (
        <CustomerUploadModal
          businessId={businessId || ""}
          onClose={handleCloseUploadModal}
          onSuccess={handleSuccessUploadModal}
          onStartAnalysis={handleStartAnalysis}
        />
      )}

      {showReportModal && latestReport && (
        <CustomerReportDrawer
          report={latestReport}
          onClose={handleCloseReportModal}
        />
      )}
    </AppShell>
  );
}
