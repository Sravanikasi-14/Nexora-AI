"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { AssessmentResult } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion, animate } from "framer-motion";

// Local AnimatedNumber component to animate rating scores
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

  return <span>{prefix}{displayVal}{suffix}</span>;
}

function ScoreRing({ label, value, index }: { label: string; value: number | null | undefined; index: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : index * 0.05 }}
      whileHover={shouldReduceMotion ? {} : { y: -3, scale: 1.01 }}
      className="w-full"
    >
      <Card className="p-5 text-center border border-zinc-200 dark:border-zinc-800 shadow-card hover:shadow-premium transition-all duration-300 bg-white dark:bg-zinc-950">
        <p className="text-3xl font-display font-bold text-accent">
          {value !== null && value !== undefined ? (
            <AnimatedNumber value={value} />
          ) : (
            "—"
          )}
        </p>
        <p className="text-[10px] text-zinc-550 dark:text-zinc-500 mt-1 uppercase tracking-wider font-bold">{label}</p>
      </Card>
    </motion.div>
  );
}

export default function AssessmentPage() {
  const router = useRouter();
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const shouldReduceMotion = useReducedMotion();

  // React Query: Fetch or trigger Assessment run
  const { data: result, isLoading: assessmentLoading, error: fetchError } = useQuery<AssessmentResult>({
    queryKey: ["assessment", businessId],
    queryFn: () => api.post<AssessmentResult>(`/api/assessment/${businessId}/run`),
    enabled: !!businessId,
    staleTime: 1000 * 60 * 30, // 30 minutes cache duration
  });

  const loading = sessionLoading || assessmentLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-500">
        <div className="w-8 h-8 border-2 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Running your Business Assessment…</p>
      </div>
    );
  }

  if (fetchError || !result) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-3 text-red-500 font-semibold text-sm">
        <p>Could not run the assessment. Please try again.</p>
        <Link href="/discovery">
          <Button variant="outline" size="sm">Go Back to Discovery</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="text-left"
        >
          <p className="text-xs text-accent font-bold uppercase tracking-wider mb-1">Business Assessment</p>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
            {result.hasEnoughData ? "Here's where your business stands" : "We need a bit more to work with"}
          </h1>
        </motion.div>

        {!result.hasEnoughData ? (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.05 }}
          >
            <Card className="p-7 mt-6 border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950 text-left">
              <p className="text-sm text-zinc-800 dark:text-zinc-250 leading-relaxed mb-6 font-medium">{result.missingInfoExplanation}</p>

              <div className="mb-6">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">What&apos;s missing and why it matters</p>
                <ul className="flex flex-col gap-2.5 text-xs text-zinc-800 dark:text-zinc-250 font-semibold">
                  {result.missingAssets?.map((m, idx) => (
                    <motion.li
                      initial={shouldReduceMotion ? {} : { opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: shouldReduceMotion ? 0 : idx * 0.05 }}
                      key={m}
                      className="flex items-start gap-2"
                    >
                      <span className="text-amber-500 mt-0.5">●</span>
                      <span>{m}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="mb-6 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">What to do first</p>
                <ol className="flex flex-col gap-4 text-xs font-semibold">
                  {result.roadmap?.map((r, i) => (
                    <motion.li
                      initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : i * 0.05 }}
                      key={i}
                    >
                      <span className="text-accent font-bold">{i + 1}. {r.step}</span>
                      <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 ml-4 font-medium leading-relaxed">{r.why}</p>
                    </motion.li>
                  ))}
                </ol>
              </div>

              <div className="flex gap-3 mt-8 border-t border-zinc-150 dark:border-zinc-850 pt-5">
                <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}>
                  <Link href="/discovery">
                    <Button size="sm" className="shadow-md hover:shadow-premium transition duration-300">Add more business info</Button>
                  </Link>
                </motion.div>
                <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.02 }} whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}>
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm" className="shadow-sm">Continue anyway</Button>
                  </Link>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <div className="text-left mt-6 space-y-8">
            <motion.p
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed"
            >
              Based on the information you&apos;ve shared, here&apos;s an honest read on your business readiness.
            </motion.p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ScoreRing label="Readiness" value={result.readinessScore} index={0} />
              <ScoreRing label="Confidence" value={result.confidenceScore} index={1} />
              <ScoreRing label="Digital Maturity" value={result.digitalMaturity} index={2} />
              <ScoreRing label="Growth Score" value={result.growthScore} index={3} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="w-full"
              >
                <Card className="p-6 border-l-4 border-l-[var(--accent2)] border-t border-r border-b border-zinc-200 dark:border-zinc-800 shadow-card bg-white dark:bg-zinc-950 h-full">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-3">Strengths</p>
                  <ul className="flex flex-col gap-3 text-xs text-zinc-800 dark:text-zinc-250 font-medium leading-relaxed">
                    {(result.strengths?.length ? result.strengths : ["Not enough data to identify strengths yet."]).map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
              
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.15 }}
                className="w-full"
              >
                <Card className="p-6 border-l-4 border-l-[var(--warn)] border-t border-r border-b border-zinc-200 dark:border-zinc-800 shadow-card bg-white dark:bg-zinc-950 h-full">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-3">Weaknesses</p>
                  <ul className="flex flex-col gap-3 text-xs text-zinc-800 dark:text-zinc-250 font-medium leading-relaxed">
                    {(result.weaknesses?.length ? result.weaknesses : ["No major weaknesses detected yet."]).map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            </div>

            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.2 }}
            >
              <Card className="p-6 border border-accent/20 bg-gradient-to-r from-accent/10 to-indigo-500/[0.03] dark:from-accent/15 dark:to-indigo-500/[0.01] shadow-glow">
                <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">Recommended first action</p>
                <p className="text-xs leading-relaxed font-bold text-zinc-900 dark:text-zinc-100">{result.recommendedFirstAction}</p>
              </Card>
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.25 }}
            >
              <Card className="p-6 border border-zinc-200 dark:border-zinc-800 shadow-card bg-white dark:bg-zinc-950">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-4">Roadmap</p>
                <ol className="flex flex-col gap-4 text-xs font-semibold">
                  {result.roadmap?.map((r, i) => (
                    <li key={i} className="text-left">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{i + 1}. {r.step}</span>
                      <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 ml-4 font-medium leading-relaxed">{r.why}</p>
                    </li>
                  ))}
                </ol>
              </Card>
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              className="w-full inline-block text-left pt-2"
            >
              <Link href="/dashboard">
                <Button size="lg" className="px-8 shadow-md hover:shadow-premium transition duration-300">Go to Dashboard</Button>
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
