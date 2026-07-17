"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { Insight, DashboardPayload } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  TrendingUp,
  Globe,
  Users,
  Target,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CATEGORY_LABEL: Record<string, string> = {
  revenue: "Revenue Growth",
  digital: "Digital Footprint",
  customers: "Retention & Loyalty",
  competitive: "Market Positioning",
};

const CATEGORY_ICONS: Record<string, any> = {
  revenue: TrendingUp,
  digital: Globe,
  customers: Users,
  competitive: Target,
};

const CATEGORY_COLORS: Record<string, string> = {
  revenue: "border-l-[var(--accent2)] dark:border-l-[var(--accent2)]",
  digital: "border-l-blue-500 dark:border-l-blue-500",
  customers: "border-l-[var(--accent)] dark:border-l-[var(--accent)]",
  competitive: "border-l-[var(--warn)] dark:border-l-[var(--warn)]",
};

const CATEGORY_BG_ICONS: Record<string, string> = {
  revenue: "text-emerald-500 bg-emerald-500/[0.04]",
  digital: "text-blue-500 bg-blue-500/[0.04]",
  customers: "text-indigo-500 bg-indigo-500/[0.04]",
  competitive: "text-amber-500 bg-amber-500/[0.04]",
};

export default function InsightsPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  // React Query: Fetch insights
  const { data: insightsPayload, isLoading: fetchLoading } = useQuery({
    queryKey: ["insights", businessId],
    queryFn: () => api.get<{ insights: Insight[] }>(`/api/insights/${businessId}`),
    enabled: !!businessId,
  });

  // React Query: Fetch dashboard payload for sparklines
  const { data: dashboardData } = useQuery<DashboardPayload>({
    queryKey: ["dashboard", businessId],
    queryFn: () => api.get<DashboardPayload>(`/api/dashboard/${businessId}`),
    enabled: !!businessId,
  });

  const insights = insightsPayload?.insights || [];
  const loading = sessionLoading || fetchLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const adv = dashboardData?.advancedMetrics;
  const hasAdvanced = !!adv;

  // Stagger variants
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

  return (
    <AppShell>
      <div className="mb-8 text-left">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1 text-zinc-900 dark:text-zinc-50">Insights</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Personalized business intelligence pairing strategic narratives with visual metrics.
        </p>
      </div>

      {insights.length === 0 ? (
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <Card className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 shadow-premium bg-zinc-50/[0.01]">
            <Sparkles className="text-zinc-400 mx-auto mb-3" size={24} />
            <p className="text-xs font-semibold">No Insights Generated Yet</p>
            <p className="text-[10px] text-zinc-450 mt-1 max-w-sm mx-auto leading-relaxed">
              Run a Business Assessment scan from the Discovery onboarding flow once you have configured digital profiles, customers, or sales logs.
            </p>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={shouldReduceMotion ? {} : "hidden"}
          animate="visible"
          variants={containerVariants}
          className="flex flex-col gap-6"
        >
          {insights.map((insight, idx) => {
            const Icon = CATEGORY_ICONS[insight.category] || Sparkles;
            const borderCol = CATEGORY_COLORS[insight.category] || "border-l-zinc-300";
            const iconStyle = CATEGORY_BG_ICONS[insight.category] || "text-zinc-500 bg-zinc-50";

            return (
              <motion.div
                key={insight.id}
                variants={itemVariants}
                whileHover={shouldReduceMotion ? {} : { y: -3, scale: 1.01 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
                className="w-full"
              >
                <Card
                  className={`border-t border-r border-b border-l-4 ${borderCol} border-zinc-200 dark:border-zinc-800 hover:border-accent/35 transition-all duration-300 shadow-card hover:shadow-premium bg-white dark:bg-zinc-950 text-left`}
                >
                  <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                    <div className="flex-1 space-y-2">
                      {(() => {
                        const hasPipe = insight.narrative.includes(" | ");
                        const [title, description] = hasPipe
                          ? insight.narrative.split(" | ")
                          : [CATEGORY_LABEL[insight.category] || "Business Observation", insight.narrative];
                        return (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className={`p-1.5 rounded shrink-0 ${iconStyle}`}>
                                <Icon size={12} />
                              </div>
                              <span className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                                {title}
                              </span>
                              <Badge variant="secondary" className="text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5">
                                {CATEGORY_LABEL[insight.category] || insight.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-zinc-555 dark:text-zinc-400 font-medium leading-relaxed max-w-3xl pl-7">
                              {description}
                            </p>
                          </>
                        );
                      })()}
                    </div>

                    {/* Micro Visual Indicators & Sparklines */}
                    {mounted && (
                      <div className="shrink-0 self-stretch sm:self-auto flex items-center justify-end pl-7 sm:pl-0">
                        {insight.category === "revenue" && (
                          hasAdvanced && adv.monthlyRevenue?.length ? (
                            <motion.div
                              initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.3 }}
                              className="w-24 h-10 border border-zinc-100 dark:border-zinc-900 rounded p-1 flex items-center bg-zinc-50/[0.01]"
                            >
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={adv.monthlyRevenue}>
                                  <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="var(--accent2)"
                                    strokeWidth={1.5}
                                    dot={false}
                                    isAnimationActive={!shouldReduceMotion}
                                    animationDuration={800}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </motion.div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                              <ArrowUpRight size={12} />
                              <span>Trending Up</span>
                            </div>
                          )
                        )}

                        {insight.category === "digital" && (
                          dashboardData?.digitalMaturity !== undefined ? (
                            <motion.div
                              initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.3 }}
                              className="w-10 h-10 relative flex items-center justify-center bg-zinc-50/[0.01] rounded"
                            >
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={[
                                      { value: dashboardData.digitalMaturity },
                                      { value: 100 - dashboardData.digitalMaturity }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={11}
                                    outerRadius={15}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                    stroke="none"
                                    isAnimationActive={!shouldReduceMotion}
                                    animationDuration={800}
                                  >
                                    <Cell fill="#3b82f6" />
                                    <Cell fill="rgba(228, 228, 231, 0.1)" />
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                              <span className="absolute text-[8px] font-bold text-zinc-900 dark:text-zinc-100">
                                {dashboardData.digitalMaturity}%
                              </span>
                            </motion.div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] text-blue-500 font-bold bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20">
                              <Globe size={12} />
                              <span>Profiles Set</span>
                            </div>
                          )
                        )}

                        {insight.category === "customers" && (
                          hasAdvanced && adv.segments && adv.segments.length ? (
                            (() => {
                              const segments = adv.segments;
                              const total = segments.reduce((acc: number, s: any) => acc + s.count, 0) || 1;
                              return (
                                <motion.div
                                  initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
                                  whileInView={{ opacity: 1, scale: 1 }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 0.3 }}
                                  className="w-24 flex flex-col gap-1 text-right"
                                >
                                  <div className="h-2 w-full flex gap-0.5 rounded overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                                    {segments.map((seg: any, sIdx: number) => {
                                      const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-red-500"];
                                      const pct = Math.max(5, Math.round((seg.count / total) * 100));
                                      return (
                                        <div
                                          key={sIdx}
                                          className={colors[sIdx % colors.length]}
                                          style={{ width: `${pct}%` }}
                                          title={`${seg.name}: ${seg.count}`}
                                        />
                                      );
                                    })}
                                  </div>
                                  <span className="text-[8px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">Cohort Balance</span>
                                </motion.div>
                              );
                            })()
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] text-indigo-500 font-bold bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20">
                              <CheckCircle2 size={12} />
                              <span>Active Stats</span>
                            </div>
                          )
                        )}

                        {insight.category === "competitive" && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                            <ArrowUpRight size={12} />
                            <span>Competitive Advantage</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AppShell>
  );
}
