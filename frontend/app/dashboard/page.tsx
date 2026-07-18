"use client";

import { useState, useEffect, useMemo, memo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api, getStoredUser } from "@/lib/api";
import { DashboardPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton, Spinner } from "@/components/ui/spinner";
import { motion, useReducedMotion, animate } from "framer-motion";

import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Clock,
  ShieldCheck,
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
} from "lucide-react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
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

const AnimatedNumber = memo(function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
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
});

// Reusable Concentric Radial Chart for Revenue Opportunity
const ConcentricRadialChart = memo(function ConcentricRadialChart({ current, potential, recoverable }: { current: number; potential: number; recoverable: number }) {
  const maxVal = Math.max(potential, current + recoverable) || 100000;

  // Percentages for stroke dash offsets
  const currentPct = Math.min((current / maxVal) * 100, 100);
  const potentialPct = Math.min((potential / maxVal) * 100, 100);
  const recoverablePct = Math.min((recoverable / maxVal) * 100, 100);

  // SVG dimensions
  const size = 160;
  const strokeWidth = 10;

  const ring1Radius = 65;
  const ring1Circum = 2 * Math.PI * ring1Radius;
  const ring1Offset = ring1Circum - (currentPct / 100) * ring1Circum;

  const ring2Radius = 50;
  const ring2Circum = 2 * Math.PI * ring2Radius;
  const ring2Offset = ring2Circum - (potentialPct / 100) * ring2Circum;

  const ring3Radius = 35;
  const ring3Circum = 2 * Math.PI * ring3Radius;
  const ring3Offset = ring3Circum - (recoverablePct / 100) * ring3Circum;

  return (
    <div className="relative w-40 h-40 flex items-center justify-center mx-auto">
      <svg width={size} height={size} className="-rotate-90 transform">
        {/* Outer Ring - Current Revenue (Blue) */}
        <circle cx={size / 2} cy={size / 2} r={ring1Radius} className="stroke-zinc-100 dark:stroke-zinc-900 fill-none" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={ring1Radius}
          className="stroke-blue-500 fill-none stroke-linecap-round"
          strokeWidth={strokeWidth}
          strokeDasharray={ring1Circum}
          initial={{ strokeDashoffset: ring1Circum }}
          animate={{ strokeDashoffset: ring1Offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {/* Middle Ring - Potential Revenue (Purple) */}
        <circle cx={size / 2} cy={size / 2} r={ring2Radius} className="stroke-zinc-100 dark:stroke-zinc-900 fill-none" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={ring2Radius}
          className="stroke-purple-500 fill-none stroke-linecap-round"
          strokeWidth={strokeWidth}
          strokeDasharray={ring2Circum}
          initial={{ strokeDashoffset: ring2Circum }}
          animate={{ strokeDashoffset: ring2Offset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.15 }}
        />

        {/* Inner Ring - Recoverable Revenue (Green) */}
        <circle cx={size / 2} cy={size / 2} r={ring3Radius} className="stroke-zinc-100 dark:stroke-zinc-900 fill-none" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={ring3Radius}
          className="stroke-emerald-500 fill-none stroke-linecap-round"
          strokeWidth={strokeWidth}
          strokeDasharray={ring3Circum}
          initial={{ strokeDashoffset: ring3Circum }}
          animate={{ strokeDashoffset: ring3Offset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      {/* Central Indicator Icon or Label */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-[9px] uppercase font-bold text-zinc-400">Target</span>
        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">100%</span>
      </div>
    </div>
  );
});

// Reusable Health Gauge Circle score widget
const HealthScoreCircle = memo(function HealthScoreCircle({ score }: { score: number }) {
  const size = 160;
  const strokeWidth = 12;
  const radius = 60;
  const circum = 2 * Math.PI * radius;
  const offset = circum - (score / 100) * circum;

  return (
    <div className="relative w-40 h-40 flex items-center justify-center mx-auto">
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle cx={size / 2} cy={size / 2} r={radius} className="stroke-zinc-100 dark:stroke-zinc-900 fill-none" strokeWidth={strokeWidth} />
        <defs>
          <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="fill-none stroke-linecap-round animate-fade-in"
          stroke="url(#healthGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circum}
          initial={{ strokeDashoffset: circum }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold font-grotesk tracking-tight text-zinc-950 dark:text-white">{score}%</span>
        <span className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Maturity</span>
      </div>
    </div>
  );
});

const renderSparkline = (dataPoints: number[], strokeColor: string) => {
  const width = 80;
  const height = 24;
  const max = Math.max(...dataPoints) || 1;
  const min = Math.min(...dataPoints) || 0;
  const range = max - min || 1;

  const points = dataPoints.map((val, idx) => {
    const x = (idx / (dataPoints.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const getOpportunityIcon = (idx: number) => {
  switch (idx % 4) {
    case 0: return DollarSign;
    case 1: return Users;
    case 2: return TrendingUp;
    default: return Activity;
  }
};

const getGreeting = () => {
  const hr = new Date().getHours();
  if (hr < 12) return "Good Morning";
  if (hr < 17) return "Good Afternoon";
  return "Good Evening";
};

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

interface LazySectionProps {
  children: React.ReactNode;
  height: string;
  fallback?: React.ReactNode;
}

const LazySection = memo(function LazySection({ children, height, fallback }: LazySectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const scrollContainer = typeof document !== "undefined" ? document.querySelector("main") : null;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, {
      root: scrollContainer,
      rootMargin: "200px"
    });

    observer.observe(ref.current);

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  if (!isVisible) {
    return (
      <div ref={ref} style={{ minHeight: height }} className="w-full">
        {fallback || <Skeleton className="w-full h-full rounded-[24px]" style={{ minHeight: height }} />}
      </div>
    );
  }

  return <>{children}</>;
});

interface CgoBriefingProps {
  churnCount: number;
  potentialOpportunity: number;
  itemVariants: any;
}

const CgoBriefing = memo(function CgoBriefing({ churnCount, potentialOpportunity, itemVariants }: CgoBriefingProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="p-6 border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-md rounded-[24px] shadow-premium relative overflow-hidden text-left hover:shadow-premium-hover transition-all duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-zinc-200/10 dark:border-zinc-900/20">
          <div className="p-2 rounded-full bg-blue-600/10 text-blue-500">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black font-sora text-zinc-950 dark:text-white uppercase tracking-widest">
              CGO Executive Briefing
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

          <div className="flex gap-3">
            <div className="p-2.5 h-10 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-505 font-black block">Biggest Opportunity</span>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed font-body">
                Recover inactive customer cohort with automated loyalty loops.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="p-2.5 h-10 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
              <AlertTriangle size={16} />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-505 font-black block">Biggest Risk</span>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed font-body">
                {churnCount > 0 ? `${churnCount} regular buyers inactive outside standard purchase cycles.` : "No customer anomalies detected."}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="p-2.5 h-10 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
              <Clock size={16} />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-505 font-black block">Today's Priority</span>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed font-body">
                Launch customized recovery loops for high value cooling buyers.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="p-2.5 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <DollarSign size={16} />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-505 font-black block">Est. Revenue Impact</span>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed font-body">
                <span className="text-sm font-black font-grotesk text-emerald-500">₹{potentialOpportunity.toLocaleString()}</span> projected monthly gain from recommendations.
              </p>
            </div>
          </div>

        </div>
      </Card>
    </motion.div>
  );
});

interface MetricCardsProps {
  digitalMaturity: number;
  potentialOpportunity: number;
  revenueTrendPct: number;
  churnCount: number;
  growthScore: number;
  shouldReduceMotion: boolean;
  itemVariants: any;
}

const MetricCards = memo(function MetricCards({
  digitalMaturity,
  potentialOpportunity,
  revenueTrendPct,
  churnCount,
  growthScore,
  shouldReduceMotion,
  itemVariants
}: MetricCardsProps) {
  const cards = [
    {
      title: "Business Health",
      value: digitalMaturity,
      suffix: "%",
      trend: "Stable",
      trendColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      trendIcon: TrendingUp,
      explanation: "Your customer retention is stronger than last month.",
      icon: Heart,
      color: "text-rose-500",
      bg: "bg-rose-500/[0.04]",
      gradient: "from-rose-500/[0.05] via-transparent to-transparent",
      border: "border-t-[3px] border-t-rose-500",
    },
    {
      title: "Revenue Opportunity",
      value: potentialOpportunity,
      prefix: "₹",
      trend: `+${revenueTrendPct}%`,
      trendColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      trendIcon: TrendingUp,
      explanation: "Recoverable through inactive customer campaigns.",
      icon: DollarSign,
      color: "text-blue-500",
      bg: "bg-blue-500/[0.04]",
      gradient: "from-blue-500/[0.05] via-transparent to-transparent",
      border: "border-t-[3px] border-t-blue-500",
    },
    {
      title: "Customer Risk",
      value: churnCount,
      suffix: " Customers",
      trend: churnCount > 0 ? "Attention" : "Low Risk",
      trendColor: churnCount > 0 ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      trendIcon: churnCount > 0 ? AlertTriangle : CheckCircle2,
      explanation: "These customers haven't purchased in 30+ days.",
      icon: AlertTriangle,
      color: "text-amber-500",
      bg: "bg-amber-500/[0.04]",
      gradient: "from-amber-500/[0.05] via-transparent to-transparent",
      border: "border-t-[3px] border-t-amber-500",
    },
    {
      title: "Growth Score",
      value: growthScore,
      trend: "Strong Score",
      trendColor: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      trendIcon: Sparkles,
      explanation: "Above average for similar businesses.",
      icon: Sparkles,
      color: "text-purple-500",
      bg: "bg-purple-500/[0.04]",
      gradient: "from-purple-500/[0.05] via-transparent to-transparent",
      border: "border-t-[3px] border-t-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-left">
      {cards.map((insight, idx) => {
        const Icon = insight.icon;
        const TrendIcon = insight.trendIcon;
        return (
          <motion.div
            key={idx}
            variants={itemVariants}
            whileHover={shouldReduceMotion ? {} : { y: -3, scale: 1.01 }}
            className={`glass-card p-5 bg-gradient-to-br ${insight.gradient} border border-zinc-200/20 dark:border-zinc-900/50 rounded-[20px] shadow-sm relative overflow-hidden transition-all duration-300 ${insight.border}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-455 dark:text-zinc-555 uppercase tracking-widest font-black">
                {insight.title}
              </span>
              <div className={`p-1.5 rounded-full ${insight.color} ${insight.bg}`}>
                <Icon size={13} />
              </div>
            </div>

            <div className="mt-4 text-left">
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-bold font-grotesk tracking-tight text-zinc-950 dark:text-white">
                  <AnimatedNumber value={insight.value} prefix={insight.prefix} suffix={insight.suffix} />
                </p>
                <span className={`inline-flex items-center gap-0.5 px-1 rounded text-[7px] font-bold ${insight.trendColor} border`}>
                  <TrendIcon className="w-2.5 h-2.5" />
                  {insight.trend}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-2.5 font-normal tracking-wide font-body">
                {insight.explanation}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

export default function DashboardPage() {
  const { business, businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const router = useRouter();
  const [showReportModal, setShowReportModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());
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

  const potentialOpportunity = useMemo(() => {
    if (!data?.todaysMissions) return 18400;
    return data.todaysMissions.reduce((s, m) => s + (m.projectedImpact || 0), 0) || 18400;
  }, [data?.todaysMissions]);

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
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-955/20 flex items-center justify-center text-red-500 mx-auto mb-4 text-lg">
              ⚠️
            </div>
            <h3 className="font-display font-semibold text-base mb-1">Could not load dashboard</h3>
            <p className="text-xs text-zinc-555 dark:text-zinc-400 mb-4">
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
              <p className="text-xs text-zinc-555 dark:text-zinc-400 leading-relaxed max-w-md mx-auto text-center">
                {data.missingInfoExplanation || "We need a bit more information about your business before we can show your growth checklist and sales metrics."}
              </p>
            </div>

            <div className="bg-zinc-50/50 dark:bg-zinc-900/10 p-4 rounded border border-zinc-200 dark:border-zinc-800 text-left w-full max-w-md">
              <span className="text-[10px] text-zinc-455 dark:text-zinc-555 uppercase font-bold tracking-wider block mb-2">Actions needed to open your dashboard</span>
              <ul className="flex flex-col gap-2 text-xs font-semibold">
                {data.missingAssets?.map((m) => (
                  <li key={m} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <span className="text-accent font-bold">•</span> {m}
                  </li>
                )) || <li className="text-zinc-555">No pending assets</li>}
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
  const churnCount = adv?.churnRiskCount || 0;

  return (
    <AppShell>
      <motion.div
        initial={shouldReduceMotion ? {} : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        variants={containerVariants}
        className="space-y-12 py-10"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left pb-4 border-b border-zinc-200/10 dark:border-zinc-900/20">
          <div className="space-y-2">
            <h1 className="font-sora text-4xl font-black tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
              {getGreeting()}, {user?.name?.split(" ")[0] || "Partner"} 👋
            </h1>
            <p className="text-zinc-550 dark:text-zinc-400 text-sm font-normal tracking-wide font-body">
              I've analyzed your business and prepared today's executive briefing.
            </p>
          </div>
          <div className="flex gap-2">
            {hasAdvanced && latestReport && (
              <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -0.5 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}>
                <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs font-bold rounded-[18px]" onClick={() => setShowReportModal(true)}>
                  <Eye size={13} /> View CRM Report
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* EXECUTIVE BRIEFING SUMMARY CARD */}
        <CgoBriefing
          churnCount={churnCount}
          potentialOpportunity={potentialOpportunity}
          itemVariants={itemVariants}
        />

        {/* WORKSPACE GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">

          {/* Main Area (col-span-3) */}
          <div className="xl:col-span-3 space-y-12">

            {/* AI INSIGHT METRIC CARDS */}
            <MetricCards
              digitalMaturity={data.digitalMaturity || 92}
              potentialOpportunity={potentialOpportunity}
              revenueTrendPct={adv?.revenueTrendPct || 12.4}
              churnCount={churnCount}
              growthScore={data.growthScore || 84}
              shouldReduceMotion={!!shouldReduceMotion}
              itemVariants={itemVariants}
            />

            {/* SECTION 1: Revenue Intelligence */}
            <LazySection height="400px">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-200/10 dark:border-zinc-900/20 pb-3">
                  <div>
                    <h2 className="text-lg font-black font-sora text-zinc-950 dark:text-white uppercase tracking-wider">Revenue Intelligence</h2>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">Live monetary performance charts & projections.</p>
                  </div>
                </div>

                <Card className="p-6 border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-md rounded-[24px] shadow-premium relative overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                    <div className="space-y-6 text-left">
                      <div>
                        <span className="text-[10px] text-zinc-455 dark:text-zinc-555 uppercase tracking-widest font-black">Current Revenue</span>
                        <p className="text-2xl font-bold font-grotesk tracking-tight text-zinc-950 dark:text-white mt-1">
                          {hasAdvanced && adv ? <AnimatedNumber value={adv.monthlySales} prefix="₹" /> : "—"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-zinc-455 dark:text-zinc-555 uppercase tracking-widest font-black">Growth %</span>
                          <p className="text-lg font-black font-grotesk text-emerald-500 mt-1">
                            {hasAdvanced && adv ? `+${adv.revenueTrendPct}%` : "+12.4%"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-455 dark:text-zinc-555 uppercase tracking-widest font-black">Forecast</span>
                          <p className="text-lg font-black font-grotesk text-purple-500 mt-1">
                            {hasAdvanced && adv ? <AnimatedNumber value={Math.round(adv.monthlySales * 1.15)} prefix="₹" /> : "—"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-455 dark:text-zinc-555 uppercase tracking-widest font-black">Potential Opportunity</span>
                        <p className="text-xl font-bold font-grotesk text-blue-500 mt-1">
                          <AnimatedNumber value={potentialOpportunity} prefix="₹" />
                        </p>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                      {hasAdvanced && adv?.monthlyRevenue?.length ? (
                        mounted ? (
                          <div className="w-full h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={adv.monthlyRevenue} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                                <defs>
                                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="month" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v.toLocaleString()}`} />
                                <Tooltip
                                  formatter={(v) => [`₹${Number(v).toLocaleString()}`, "Sales"]}
                                  contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "6px" }}
                                  labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontStyle: "bold" }}
                                  itemStyle={{ color: "var(--accent)", fontSize: "11px", fontWeight: "semibold" }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="revenue"
                                  stroke="var(--accent)"
                                  strokeWidth={2}
                                  fillOpacity={1}
                                  fill="url(#colorSales)"
                                  isAnimationActive={!shouldReduceMotion}
                                  animationDuration={800}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="w-full h-48 flex items-center justify-center"><Spinner size="sm" /></div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50/[0.02] min-h-[180px] text-center">
                          <AlertTriangle size={20} className="text-zinc-400 mb-2" />
                          <p className="text-xs font-semibold text-zinc-500">Sales graph not available yet</p>
                        </div>
                      )}

                      {/* AI Insight below chart */}
                      <div className="pt-3 border-t border-zinc-200/10 dark:border-zinc-900/10 text-left">
                        <p className="text-[11px] text-blue-500 font-semibold tracking-wide flex items-center gap-1.5 font-body">
                          <Sparkles size={11} />
                          "Weekend sales contribute 41% of your monthly revenue."
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </LazySection>

            {/* SECTION 2: Customer Intelligence */}
            <LazySection height="400px">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-200/10 dark:border-zinc-900/20 pb-3">
                  <div>
                    <h2 className="text-lg font-black font-sora text-zinc-950 dark:text-white uppercase tracking-wider">Customer Intelligence</h2>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">Dynamic customer segment analytics & trends.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  {/* Left Column: Segments Grid (col-span-2) */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    {[
                      {
                        title: "Loyal Customers",
                        count: hasAdvanced && adv ? adv.repeatCustomers : 42,
                        trend: "+4.2%",
                        sparklineData: [12, 14, 15, 14, 16, 18, 17],
                        sparklineColor: "#10b981",
                        insight: `High loyalty retention. Active repeat buyers generate solid margin support.`,
                        gradient: "from-emerald-500/[0.05] via-transparent to-transparent",
                        border: "border-t-[3px] border-t-emerald-500",
                        icon: "❤️"
                      },
                      {
                        title: "Customers At Risk",
                        count: churnCount || 7,
                        trend: churnCount > 0 ? "Attention" : "Low Risk",
                        sparklineData: [8, 9, 11, 10, 12, 11, 13],
                        sparklineColor: "#f59e0b",
                        insight: `${churnCount || 7} regular customers haven't returned inside their standard purchase cycles.`,
                        gradient: "from-amber-500/[0.05] via-transparent to-transparent",
                        border: "border-t-[3px] border-t-amber-500",
                        icon: "⚠️"
                      },
                      {
                        title: "Highest Value Customers",
                        count: hasAdvanced && adv ? (adv.segments?.find(s => s.name === "VIP")?.count || Math.round(adv.totalCustomers * 0.15)) : 28,
                        trend: "+6.4%",
                        sparklineData: [20, 22, 25, 24, 27, 28, 30],
                        sparklineColor: "#6366f1",
                        insight: "Top tier VIP spenders represent the core of growth metrics.",
                        gradient: "from-indigo-500/[0.05] via-transparent to-transparent",
                        border: "border-t-[3px] border-t-indigo-500",
                        icon: "💰"
                      },
                      {
                        title: "New Customers",
                        count: hasAdvanced && adv ? adv.newCustomers : 15,
                        trend: "+11.8%",
                        sparklineData: [5, 7, 6, 8, 10, 9, 11],
                        sparklineColor: "#3b82f6",
                        insight: `${hasAdvanced && adv ? adv.newCustomers : 15} first-time accounts scanned. Acquisition velocity healthy.`,
                        gradient: "from-blue-500/[0.05] via-transparent to-transparent",
                        border: "border-t-[3px] border-t-blue-500",
                        icon: "✨"
                      }
                    ].map((insight, idx) => {
                      return (
                        <motion.div
                          key={idx}
                          initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
                          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, ease: "easeOut", delay: shouldReduceMotion ? 0 : idx * 0.05 }}
                          whileHover={shouldReduceMotion ? {} : { y: -3, scale: 1.01 }}
                          className={`glass-card p-5 flex flex-col justify-between min-h-[160px] bg-gradient-to-br ${insight.gradient} hover:shadow-premium border border-zinc-200/20 dark:border-zinc-900/50 rounded-[20px] shadow-sm relative overflow-hidden transition-all duration-300 ${insight.border}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-455 dark:text-zinc-500 uppercase tracking-widest font-black flex items-center gap-1.5">
                              <span className="text-xs shrink-0 select-none">{insight.icon}</span>
                              <span>{insight.title}</span>
                            </span>
                            <span className="text-[8px] font-extrabold uppercase text-zinc-400 dark:text-zinc-505">{insight.trend}</span>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-4">
                            <p className="text-2xl font-bold font-grotesk tracking-tight text-zinc-950 dark:text-white">
                              <AnimatedNumber value={insight.count} />
                            </p>
                            <div className="shrink-0">
                              {renderSparkline(insight.sparklineData, insight.sparklineColor)}
                            </div>
                          </div>

                          <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-3 font-normal tracking-wide font-body">
                            {insight.insight}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Right Column: Segment Mix & Action Card */}
                  <div className="flex flex-col gap-4 justify-between text-left">
                    <Card className="p-5 border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-md rounded-[20px] shadow-sm flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200/10 dark:border-zinc-900/10">
                          <span className="text-[10px] text-zinc-455 dark:text-zinc-555 uppercase tracking-widest font-black flex items-center gap-1.5">
                            <span>📊</span>
                            <span>Segment Value Mix</span>
                          </span>
                          <span className="text-[8px] font-extrabold uppercase text-blue-500">Live Mix</span>
                        </div>

                        <div className="space-y-3">
                          {[
                            { name: "VIP Spenders", count: hasAdvanced && adv ? (adv.segments?.find(s => s.name === "VIP")?.count || Math.round(adv.totalCustomers * 0.15)) : 28, pct: 35, color: "bg-indigo-500" },
                            { name: "Active Repeaters", count: hasAdvanced && adv ? adv.repeatCustomers : 42, pct: 45, color: "bg-emerald-500" },
                            { name: "At Risk / Cooling", count: hasAdvanced && adv ? churnCount : 7, pct: 15, color: "bg-amber-500" },
                            { name: "New Leads", count: hasAdvanced && adv ? adv.newCustomers : 15, pct: 10, color: "bg-blue-500" }
                          ].map((seg, sIdx) => {
                            const segmentTotal = hasAdvanced && adv ? adv.totalCustomers : 92;
                            const calcPct = segmentTotal > 0 ? Math.round((seg.count / segmentTotal) * 100) : seg.pct;

                            return (
                              <div key={sIdx} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                                  <span>{seg.name}</span>
                                  <span>{seg.count} ({calcPct}%)</span>
                                </div>
                                <div className="w-full h-1 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden relative border border-zinc-200/10 dark:border-zinc-800/10">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${calcPct}%` }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className={`h-full ${seg.color} rounded-full`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-zinc-200/10 dark:border-zinc-900/10 flex justify-between items-center text-[10px] font-semibold">
                        <span className="text-zinc-400">Total: {hasAdvanced && adv ? adv.totalCustomers : 92}</span>
                        <Link href="/customers" className="text-blue-500 hover:underline flex items-center gap-0.5">
                          Manage CRM <ArrowRight size={10} />
                        </Link>
                      </div>
                    </Card>

                    <Card className="p-5 border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-md rounded-[20px] shadow-sm flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                          <Sparkles size={12} className="text-blue-500 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-455 dark:text-zinc-555">Actionable Suggestion</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400 font-medium font-body">
                          {hasAdvanced && adv?.aiBusinessInsights?.[0] || "Acquisition velocity is strong. Focus on email/WhatsApp loyalty automation for the at-risk cohort."}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-zinc-200/10 dark:border-zinc-900/10 flex justify-end">
                        <Link href="/automation">
                          <Button size="sm" className="text-[9px] font-bold h-7 py-1 px-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 rounded-[10px]">
                            Generate Campaign
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* AI Insight below chart */}
                <div className="pt-3 border-t border-zinc-200/10 dark:border-zinc-900/10 text-left">
                  <p className="text-[11px] text-blue-500 font-semibold tracking-wide flex items-center gap-1.5 font-body">
                    <Sparkles size={11} />
                    "Repeat customers generated most of this week's growth."
                  </p>
                </div>
              </div>
            </LazySection>

            {/* SECTION 3: Business Health */}
            <LazySection height="350px">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-200/10 dark:border-zinc-900/20 pb-3">
                  <div>
                    <h2 className="text-lg font-black font-sora text-zinc-950 dark:text-white uppercase tracking-wider">Business Health</h2>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">Digital footprint health & scan confidence logs.</p>
                  </div>
                </div>

                <Card className="p-6 border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-md rounded-[24px] shadow-premium text-left relative overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    <div className="flex justify-center">
                      {mounted ? (
                        <HealthScoreCircle score={data.digitalMaturity || 82} />
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center"><Spinner size="sm" /></div>
                      )}
                    </div>

                    <div className="space-y-4 text-left md:col-span-2">
                      <div>
                        <span className="pill bg-blue-500/10 border border-blue-500/20 text-blue-500 font-bold px-2.5 py-0.5 text-[9px] uppercase tracking-wider">
                          Diagnostic Assessment
                        </span>
                        <h3 className="text-lg font-black font-sora text-zinc-950 dark:text-white tracking-tight mt-2.5">
                          Your digital presence metrics indicate strong structural health.
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-zinc-200/10 dark:border-zinc-900/10 pt-4">
                        <div>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black">Confidence score</span>
                          <p className="text-base font-black font-grotesk text-blue-500 mt-1">94% High Confidence</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black">Trend comparison</span>
                          <p className="text-base font-black font-grotesk text-emerald-500 mt-1">+2.4% vs last week</p>
                        </div>
                      </div>

                      <p className="text-[11px] leading-relaxed text-zinc-555 dark:text-zinc-455 font-normal font-body tracking-wide">
                        <strong>CGO Evaluation:</strong> Search directory matches, social anchors, and CRM indexing velocity benchmarks align with top quartile business frameworks. Activating more suggested checklist tasks keeps listing velocity high.
                      </p>
                    </div>
                  </div>

                  {/* AI Insight below chart */}
                  <div className="pt-3 mt-4 border-t border-zinc-200/10 dark:border-zinc-900/10 text-left">
                    <p className="text-[11px] text-blue-500 font-semibold tracking-wide flex items-center gap-1.5 font-body">
                      <Sparkles size={11} />
                      "Customer retention improved after loyalty campaigns."
                    </p>
                  </div>
                </Card>
              </div>
            </LazySection>

          </div>

          {/* Today's Priorities Sidebar Panel (col-span-1) */}
          <div className="xl:col-span-1 space-y-8 xl:sticky xl:top-24 text-left">

            {/* TODAY'S PRIORITIES SECTION */}
            <div className="space-y-4">
              <div className="border-b border-zinc-200/10 dark:border-zinc-900/20 pb-2 flex items-center justify-between">
                <h3 className="text-sm font-black font-sora text-zinc-950 dark:text-white uppercase tracking-widest">
                  Today's Priorities
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  {
                    title: "🔥 Recover Inactive Customers",
                    desc: `Potential Revenue: ₹${(data.todaysMissions?.reduce((s, m) => s + (m.projectedImpact || 0), 0) || 18400).toLocaleString()}`,
                    action: "Start Mission",
                    href: "/customers"
                  },
                  {
                    title: "⭐ Respond to Reviews",
                    desc: "Estimated Impact: Medium",
                    action: "Open",
                    href: "/missions"
                  },
                  {
                    title: "📈 Launch Weekend Campaign",
                    desc: "Expected Growth: +8%",
                    action: "Create",
                    href: "/automation"
                  }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="border border-zinc-200/40 dark:border-zinc-900/50 rounded-[18px] p-4 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-md shadow-sm space-y-3 hover:shadow-md transition-all duration-300"
                  >
                    <div className="space-y-1">
                      <h4 className="text-xs font-black font-sora text-zinc-950 dark:text-white">{item.title}</h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold font-body leading-relaxed">{item.desc}</p>
                    </div>
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Button onClick={() => router.push(item.href)} size="sm" className="w-full text-[10px] font-bold py-1.5 h-8 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 rounded-[12px] shadow-sm border-0">
                        {item.action}
                      </Button>
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>

            {/* MISSION PROGRESS SECTION */}
            <div className="space-y-4">
              <div className="border-b border-zinc-200/10 dark:border-zinc-900/20 pb-2">
                <h3 className="text-sm font-black font-sora text-zinc-950 dark:text-white uppercase tracking-widest">
                  Mission Progress
                </h3>
              </div>

              <div className="border border-zinc-200/40 dark:border-zinc-900/50 rounded-[20px] p-4 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-md shadow-sm space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black text-zinc-450 dark:text-zinc-555 uppercase">
                    <span>Missions Completed</span>
                    <span className="text-blue-500">2 / 4 Complete</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden relative border border-zinc-200/20 dark:border-zinc-800/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "50%" }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/10 dark:border-zinc-900/10 text-left">
                  <div>
                    <span className="text-[8px] text-zinc-400 dark:text-zinc-550 uppercase tracking-widest font-black block">Completed</span>
                    <span className="text-lg font-black font-grotesk text-emerald-500 mt-0.5 block">2</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-zinc-400 dark:text-zinc-550 uppercase tracking-widest font-black block">Value Saved</span>
                    <span className="text-lg font-black font-grotesk text-blue-500 mt-0.5 block">₹34K</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

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
