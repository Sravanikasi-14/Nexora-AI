"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { AssessmentResult } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function ScoreRing({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <Card className="p-5 text-center border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
      <p className="text-3xl font-display font-semibold text-accent">{value ?? "—"}</p>
      <p className="text-xs text-zinc-550 dark:text-zinc-450 mt-1 font-medium">{label}</p>
    </Card>
  );
}

export default function AssessmentPage() {
  const router = useRouter();
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });

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
      <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-3 text-zinc-500">
        <div className="w-8 h-8 border-2 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Running your Business Assessment…</p>
      </div>
    );
  }

  if (fetchError || !result) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-3 text-red-500 font-semibold text-sm">
        <p>Could not run the assessment. Please try again.</p>
        <Link href="/discovery">
          <Button variant="outline" size="sm">Go Back to Discovery</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base text-zinc-900 dark:text-zinc-50">
      <div className="max-w-3xl mx-auto px-6 py-14">
        <p className="text-xs text-accent font-bold uppercase tracking-wider mb-1">Business Assessment</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-2 text-left">
          {result.hasEnoughData ? "Here's where your business stands" : "We need a bit more to work with"}
        </h1>

        {!result.hasEnoughData ? (
          <Card className="p-7 mt-6 border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950 text-left">
            <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed mb-5">{result.missingInfoExplanation}</p>

            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">What&apos;s missing and why it matters</p>
            <ul className="flex flex-col gap-2 mb-6 text-xs text-zinc-850 dark:text-zinc-200 font-semibold">
              {result.missingAssets?.map((m) => (
                <li key={m} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">●</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>

            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">What to do first</p>
            <ol className="flex flex-col gap-3 text-xs">
              {result.roadmap?.map((r, i) => (
                <li key={i}>
                  <span className="text-accent font-bold">{i + 1}. {r.step}</span>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 ml-4 font-medium">{r.why}</p>
                </li>
              ))}
            </ol>

            <div className="flex gap-3 mt-7 border-t border-zinc-150 dark:border-zinc-850 pt-4">
              <Link href="/discovery">
                <Button size="sm">Add more business info</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">Continue anyway</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="text-left">
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-6 leading-relaxed">
              Based on the information you&apos;ve shared, here&apos;s an honest read on your business readiness.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <ScoreRing label="Readiness" value={result.readinessScore} />
              <ScoreRing label="Confidence" value={result.confidenceScore} />
              <ScoreRing label="Digital Maturity" value={result.digitalMaturity} />
              <ScoreRing label="Growth Score" value={result.growthScore} />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <Card className="p-5 border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Strengths</p>
                <ul className="flex flex-col gap-2 text-xs text-zinc-850 dark:text-zinc-250 font-medium">
                  {(result.strengths?.length ? result.strengths : ["Not enough data to identify strengths yet."]).map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5 border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Weaknesses</p>
                <ul className="flex flex-col gap-2 text-xs text-zinc-850 dark:text-zinc-250 font-medium">
                  {(result.weaknesses?.length ? result.weaknesses : ["No major weaknesses detected yet."]).map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card className="p-5 mb-6 border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Recommended first action</p>
              <p className="text-xs leading-relaxed font-semibold text-zinc-800 dark:text-zinc-200">{result.recommendedFirstAction}</p>
            </Card>

            <Card className="p-5 mb-8 border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Roadmap</p>
              <ol className="flex flex-col gap-3 text-xs font-medium">
                {result.roadmap?.map((r, i) => (
                  <li key={i}>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{i + 1}. {r.step}</span>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 ml-4">{r.why}</p>
                  </li>
                ))}
              </ol>
            </Card>

            <Link href="/dashboard">
              <Button size="lg" className="px-6">Go to Dashboard</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
