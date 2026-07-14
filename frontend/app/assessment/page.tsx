"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { AssessmentResult } from "@/lib/types";

function ScoreRing({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="card p-5 text-center">
      <p className="text-3xl font-display font-semibold text-accent">{value ?? "—"}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  );
}

export default function AssessmentPage() {
  const router = useRouter();
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.post<AssessmentResult>(`/api/assessment/${businessId}/run`);
        setResult(res);
      } catch (err) {
        setError("Could not run the assessment. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [businessId]);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-3 text-muted">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p>Running your Business Assessment…</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center text-danger">
        {error || "Something went wrong."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base text-ink">
      <div className="max-w-3xl mx-auto px-6 py-14">
        <p className="text-sm text-accent font-medium mb-1">Business Assessment</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">
          {result.hasEnoughData ? "Here's where your business stands" : "We need a bit more to work with"}
        </h1>

        {!result.hasEnoughData ? (
          <div className="card p-7 mt-6">
            <p className="text-ink leading-relaxed mb-5">{result.missingInfoExplanation}</p>

            <p className="text-sm font-medium text-muted mb-2">What's missing and why it matters</p>
            <ul className="flex flex-col gap-2 mb-6">
              {result.missingAssets?.map((m) => (
                <li key={m} className="flex items-start gap-2 text-sm">
                  <span className="text-warn mt-0.5">●</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm font-medium text-muted mb-2">What to do first</p>
            <ol className="flex flex-col gap-3">
              {result.roadmap?.map((r, i) => (
                <li key={i} className="text-sm">
                  <span className="text-accent font-medium">{i + 1}. {r.step}</span>
                  <p className="text-muted mt-0.5 ml-4">{r.why}</p>
                </li>
              ))}
            </ol>

            <div className="flex gap-3 mt-7">
              <Link href="/discovery" className="btn-primary">Add more business info</Link>
              <Link href="/dashboard" className="btn-secondary">Continue anyway</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-muted mb-6 leading-relaxed">
              Based on the information you&apos;ve shared, here&apos;s an honest read on your business readiness.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <ScoreRing label="Readiness" value={result.readinessScore} />
              <ScoreRing label="Confidence" value={result.confidenceScore} />
              <ScoreRing label="Digital Maturity" value={result.digitalMaturity} />
              <ScoreRing label="Growth Score" value={result.growthScore} />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="card p-5">
                <p className="text-sm font-medium text-accent2 mb-2">Strengths</p>
                <ul className="flex flex-col gap-2 text-sm">
                  {(result.strengths?.length ? result.strengths : ["Not enough data to identify strengths yet."]).map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div className="card p-5">
                <p className="text-sm font-medium text-warn mb-2">Weaknesses</p>
                <ul className="flex flex-col gap-2 text-sm">
                  {(result.weaknesses?.length ? result.weaknesses : ["No major weaknesses detected yet."]).map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="card p-5 mb-6">
              <p className="text-sm font-medium text-muted mb-2">Recommended first action</p>
              <p className="text-ink leading-relaxed">{result.recommendedFirstAction}</p>
            </div>

            <div className="card p-5 mb-8">
              <p className="text-sm font-medium text-muted mb-3">Roadmap</p>
              <ol className="flex flex-col gap-3">
                {result.roadmap?.map((r, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{i + 1}. {r.step}</span>
                    <p className="text-muted mt-0.5 ml-4">{r.why}</p>
                  </li>
                ))}
              </ol>
            </div>

            <Link href="/dashboard" className="btn-primary text-base px-6 py-3">Go to Dashboard</Link>
          </>
        )}
      </div>
    </div>
  );
}
