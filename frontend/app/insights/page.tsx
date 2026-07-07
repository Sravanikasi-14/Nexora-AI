"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { Insight } from "@/lib/types";

const CATEGORY_LABEL: Record<string, string> = {
  revenue: "Revenue",
  digital: "Digital Presence",
  customers: "Customers",
  competitive: "Competitive",
};

export default function InsightsPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    api.get<{ insights: Insight[] }>(`/api/insights/${businessId}`).then((res) => setInsights(res.insights)).finally(() => setLoading(false));
  }, [businessId]);

  if (sessionLoading || loading) return <AppShell><div className="text-muted">Loading insights…</div></AppShell>;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold mb-1">Insights</h1>
      <p className="text-muted mb-7">Instead of charts, Nexora tells you the story behind your numbers.</p>

      {insights.length === 0 ? (
        <div className="card p-6 text-muted">
          No insights yet — run a Business Assessment from Discovery once you&apos;ve added digital presence, customer, or sales data.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {insights.map((i) => (
            <div key={i.id} className="card p-5">
              <span className="pill bg-surface2 text-accent text-[10px] mb-2">{CATEGORY_LABEL[i.category] || i.category}</span>
              <p className="text-sm leading-relaxed">{i.narrative}</p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
