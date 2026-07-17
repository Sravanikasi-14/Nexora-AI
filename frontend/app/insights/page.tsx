"use client";

import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { Insight } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { useQuery } from "@tanstack/react-query";

const CATEGORY_LABEL: Record<string, string> = {
  revenue: "Revenue",
  digital: "Digital Presence",
  customers: "Customers",
  competitive: "Competitive",
};

export default function InsightsPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });

  // React Query: Fetch and cache insights metadata
  const { data: insightsPayload, isLoading: fetchLoading } = useQuery({
    queryKey: ["insights", businessId],
    queryFn: () => api.get<{ insights: Insight[] }>(`/api/insights/${businessId}`),
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

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold mb-1">Insights</h1>
      <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-7">Instead of charts, Nexora tells you the story behind your numbers.</p>

      {insights.length === 0 ? (
        <Card className="p-6 text-center border border-zinc-200 dark:border-zinc-800 text-zinc-500 shadow-premium">
          No insights yet — run a Business Assessment from Discovery once you&apos;ve added digital presence, customer, or sales data.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {insights.map((i) => (
            <Card key={i.id} className="p-5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-premium text-left">
              <div className="mb-2">
                <Badge variant="secondary">{CATEGORY_LABEL[i.category] || i.category}</Badge>
              </div>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">{i.narrative}</p>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
