"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { Mission } from "@/lib/types";

export default function MissionsPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ amount: number; title: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    api.get<{ missions: Mission[] }>(`/api/missions/${businessId}`)
      .then((res) => setMissions(res.missions || []))
      .finally(() => setLoading(false));
  }, [businessId]);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await api.patch<{ mission: Mission }>(`/api/missions/${id}`, { status });
      const updatedMission = res.mission;

      if (status === "done" && updatedMission.projectedImpact) {
        setCelebration({
          amount: updatedMission.projectedImpact,
          title: updatedMission.title,
        });
        setTimeout(() => setCelebration(null), 5000);
      }

      setMissions((m) => m.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (err) {
      alert("Failed to update status.");
    }
  }

  if (sessionLoading || loading) {
    return (
      <AppShell>
        <div className="text-muted">Loading missions…</div>
      </AppShell>
    );
  }

  const pending = missions.filter((m) => m.status === "pending");
  const done = missions.filter((m) => m.status !== "pending");
  const totalPendingImpact = pending.reduce((sum, m) => sum + (m.projectedImpact || 0), 0);

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold mb-1">Growth Missions</h1>
      <p className="text-muted text-sm mb-6">Prioritized actions, generated from your latest business assessment.</p>

      {/* Target Growth Sum Running Total */}
      {pending.length > 0 && totalPendingImpact > 0 && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-white rounded-full p-2 shrink-0 flex items-center justify-center font-bold text-sm w-9 h-9">
              📈
            </div>
            <div>
              <h4 className="font-semibold text-ink text-sm">Target Growth Potential</h4>
              <p className="text-muted text-xs">Complete pending missions to unlock this projected monthly revenue.</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-xl font-bold text-emerald-600 font-display">+₹{totalPendingImpact.toLocaleString()}/month</p>
            <p className="text-[10px] text-muted font-medium">if all pending missions are completed</p>
          </div>
        </div>
      )}

      {pending.length === 0 ? (
        <div className="card p-8 text-center flex flex-col items-center gap-4 mb-6 max-w-xl mx-auto mt-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 text-3xl animate-bounce">
            🎉
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">All Missions Accomplished!</h3>
            <p className="text-sm text-muted leading-relaxed">
              You have successfully completed or cleared all pending growth missions. Run a new business assessment from the Discovery panel to scan for fresh revenue-generation opportunities.
            </p>
          </div>
          <Link href="/discovery" className="btn-secondary text-xs px-4 py-2 mt-1">
            Go to Discovery Assessment
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mb-8">
          {pending.map((m) => {
            const isExpanded = expandedMissionId === m.id;
            return (
              <div key={m.id} className="card p-5 border border-border hover:border-accent/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`pill text-[9px] font-bold uppercase ${
                        m.priority === "high"
                          ? "bg-danger/15 text-danger"
                          : m.priority === "medium"
                          ? "bg-warn/15 text-warn"
                          : "bg-surface2 text-muted"
                      }`}>
                        {m.priority} Priority
                      </span>
                      <p className="font-semibold text-ink text-sm md:text-base">{m.title}</p>
                      {m.projectedImpact && (
                        <button
                          onClick={() => setExpandedMissionId(isExpanded ? null : m.id)}
                          className="pill bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold py-0.5 px-2 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                          title="Click to view projected monthly revenue basis"
                        >
                          +₹{m.projectedImpact.toLocaleString()}/mo
                        </button>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-muted leading-relaxed">
                      <strong className="text-ink font-semibold">Recommendation:</strong> {m.reasoning}
                    </p>

                    {isExpanded && m.projectedImpactBasis && (
                      <div className="mt-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3.5 text-xs text-emerald-700 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150">
                        <span className="font-semibold block mb-1 text-emerald-600">Projected Revenue Impact Basis:</span>
                        {m.projectedImpactBasis}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 w-full md:w-auto md:shrink-0 mt-2 md:mt-0 justify-end sm:justify-start">
                    <button
                      className="btn-primary text-xs py-1.5 px-4 font-semibold shadow-sm flex-1 md:flex-initial"
                      style={{ backgroundColor: "var(--accent2)" }}
                      onClick={() => updateStatus(m.id, "done")}
                    >
                      Mark Done
                    </button>
                    <button
                      className="btn-secondary text-xs py-1.5 px-4 font-semibold border-border flex-1 md:flex-initial"
                      onClick={() => updateStatus(m.id, "dismissed")}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Done/Dismissed collapsible panel */}
      {done.length > 0 && (
        <div className="border-t border-border/40 pt-6 mt-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-accent hover:underline font-bold flex items-center gap-1.5 bg-surface2/10 border border-border/30 rounded-xl px-4 py-2 hover:bg-surface2/25 transition-all select-none"
          >
            <span>{showHistory ? "▲ Hide" : "▼ Show"} Completion History ({done.length} item{done.length !== 1 && "s"})</span>
          </button>

          {showHistory && (
            <div className="flex flex-col gap-2.5 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {done.map((m) => {
                const isCompleted = m.status === "done";
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between border rounded-xl p-3 bg-surface opacity-75 ${
                      isCompleted ? "border-emerald-500/20 text-emerald-600" : "border-border/30 text-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
                        isCompleted ? "bg-emerald-500/10 text-emerald-500" : "bg-surface2 text-muted/70"
                      }`}>
                        {isCompleted ? "✓" : "✕"}
                      </span>
                      <span className="font-semibold text-ink text-xs sm:text-sm">{m.title}</span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase pill ${
                      isCompleted ? "bg-emerald-500/10 text-emerald-500" : "bg-muted/10 text-muted"
                    }`}>
                      {m.status === "done" ? "Completed" : "Dismissed"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Celebration Toast */}
      {celebration && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white p-5 rounded-2xl border border-emerald-500/30 shadow-2xl flex flex-col gap-1.5 max-w-sm animate-in slide-in-from-right-10 fade-in duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
              🎉 Growth Unlocked!
            </span>
            <button className="text-muted hover:text-white text-xs p-1" onClick={() => setCelebration(null)}>✕</button>
          </div>
          <p className="text-sm font-semibold leading-snug">{celebration.title}</p>
          <p className="text-xs text-slate-300 mt-1 border-t border-slate-800 pt-2 flex items-center justify-between">
            <span>Projected impact added:</span>
            <span className="text-emerald-400 font-bold text-sm">+₹{celebration.amount.toLocaleString()}/mo</span>
          </p>
        </div>
      )}
    </AppShell>
  );
}
