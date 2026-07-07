"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { Mission } from "@/lib/types";

export default function MissionsPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    api.get<{ missions: Mission[] }>(`/api/missions/${businessId}`).then((res) => setMissions(res.missions)).finally(() => setLoading(false));
  }, [businessId]);

  async function updateStatus(id: string, status: string) {
    await api.patch(`/api/missions/${id}`, { status });
    setMissions((m) => m.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  if (sessionLoading || loading) return <AppShell><div className="text-muted">Loading missions…</div></AppShell>;

  const pending = missions.filter((m) => m.status === "pending");
  const done = missions.filter((m) => m.status !== "pending");

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold mb-1">Growth Missions</h1>
      <p className="text-muted mb-7">Prioritized actions, generated from your latest business assessment.</p>

      {pending.length === 0 ? (
        <div className="card p-6 text-muted mb-6">No pending missions. Run a new assessment from Discovery to refresh these.</div>
      ) : (
        <div className="flex flex-col gap-3 mb-8">
          {pending.map((m) => (
            <div key={m.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`pill text-[10px] ${m.priority === "high" ? "bg-danger/15 text-danger" : m.priority === "medium" ? "bg-warn/15 text-warn" : "bg-surface2 text-muted"}`}>{m.priority}</span>
                    <p className="font-medium">{m.title}</p>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">Why: {m.reasoning}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => updateStatus(m.id, "done")}>Mark done</button>
                  <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => updateStatus(m.id, "dismissed")}>Dismiss</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <p className="text-sm font-medium text-muted mb-3">Completed / dismissed</p>
          <div className="flex flex-col gap-2">
            {done.map((m) => (
              <div key={m.id} className="text-sm text-muted flex items-center gap-2 px-1">
                <span>{m.status === "done" ? "✓" : "✕"}</span>
                <span className="line-through">{m.title}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
