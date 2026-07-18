"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { Mission } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function MissionsPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const queryClient = useQueryClient();

  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ amount: number; title: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // React Query: Mutation to re-run business assessment inline
  const reRunAssessmentMutation = useMutation({
    mutationFn: () => api.post(`/api/assessment/${businessId}/run`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", businessId] });
    },
    onError: (err: any) => {
      alert("Failed to re-run assessment: " + (err?.message || "Please check your network and try again."));
    }
  });


  // React Query: Fetch missions data
  const { data: missionsPayload, isLoading: fetchLoading } = useQuery({
    queryKey: ["missions", businessId],
    queryFn: () => api.get<{ missions: Mission[] }>(`/api/missions/${businessId}`),
    enabled: !!businessId,
  });

  const missions = missionsPayload?.missions || [];

  // React Query: Mutation for status updates with optimistic rendering
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch<{ mission: Mission }>(`/api/missions/${id}`, { status });
      return res.mission;
    },
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["missions", businessId] });

      // Snapshot current cache value
      const previousData = queryClient.getQueryData<{ missions: Mission[] }>(["missions", businessId]);

      // Optimistically update lists
      if (previousData) {
        queryClient.setQueryData(["missions", businessId], {
          missions: previousData.missions.map((m) =>
            m.id === id ? { ...m, status } : m
          ),
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on failure
      if (context?.previousData) {
        queryClient.setQueryData(["missions", businessId], context.previousData);
      }
      alert("Failed to update status.");
    },
    onSuccess: (updatedMission, { status }) => {
      if (status === "done" && updatedMission.projectedImpact) {
        setCelebration({
          amount: updatedMission.projectedImpact,
          title: updatedMission.title,
        });
        setTimeout(() => setCelebration(null), 5000);
      }
      // Invalidate queries to sync with backend ledger
      queryClient.invalidateQueries({ queryKey: ["missions", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", businessId] });
    },
  });

  // Derived calculations (Memoized to prevent render calculations overhead)
  const { pending, done, totalPendingImpact } = useMemo(() => {
    const pendingList = missions.filter((m) => m.status === "pending");
    const doneList = missions.filter((m) => m.status !== "pending");
    const impact = pendingList.reduce((sum, m) => sum + (m.projectedImpact || 0), 0);

    return {
      pending: pendingList,
      done: doneList,
      totalPendingImpact: impact,
    };
  }, [missions]);

  const loading = sessionLoading || fetchLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <Skeleton className="h-24 w-full" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1">Growth Missions</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">Prioritized actions, generated from your latest business assessment.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reRunAssessmentMutation.mutate()}
          disabled={reRunAssessmentMutation.isPending}
          className="text-xs font-semibold self-start sm:self-auto border-zinc-350 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 transition-all duration-200"
        >
          {reRunAssessmentMutation.isPending ? "Scanning..." : "Re-run Assessment"}
        </Button>
      </div>

      {/* Target Growth Sum Running Total */}
      {pending.length > 0 && totalPendingImpact > 0 && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-md p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-white rounded-full p-2 shrink-0 flex items-center justify-center font-bold text-sm w-9 h-9">
              📈
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-150 text-sm">Target Growth Potential</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">Complete pending missions to unlock this projected monthly revenue.</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-450 font-display">+₹{totalPendingImpact.toLocaleString()}/month</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">if all pending missions are completed</p>
          </div>
        </div>
      )}

      {pending.length === 0 ? (
        <Card className="p-8 text-center flex flex-col items-center gap-4 mb-6 max-w-xl mx-auto mt-6 border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 text-2xl animate-float">
            🎉
          </div>
          <div>
            <h3 className="font-semibold text-base mb-1">All Missions Accomplished!</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
              You have completed or cleared all pending growth missions. Trigger a new business assessment scan to generate fresh strategic growth goals right here.
            </p>
          </div>
          <Button
            onClick={() => reRunAssessmentMutation.mutate()}
            disabled={reRunAssessmentMutation.isPending}
            className="mt-1 font-semibold"
          >
            {reRunAssessmentMutation.isPending ? "Generating New Missions..." : "Generate New Growth Missions"}
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-4 mb-8">
          {pending.map((m) => {
            const isExpanded = expandedMissionId === m.id;
            return (
              <Card key={m.id} className="p-5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-premium">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 text-left">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant={m.priority === "high" ? "destructive" : "warning"}>
                        {m.priority} Priority
                      </Badge>
                      <p className="font-semibold text-ink text-sm md:text-base leading-snug">{m.title}</p>
                      {m.projectedImpact && (
                        <button
                          onClick={() => setExpandedMissionId(isExpanded ? null : m.id)}
                          className="pill bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 text-[10px] font-bold py-0.5 px-2 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                          title="Click to view projected monthly revenue basis"
                        >
                          +₹{m.projectedImpact.toLocaleString()}/mo
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">
                      <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">Recommendation:</strong> {m.reasoning}
                    </p>

                    {isExpanded && m.projectedImpactBasis && (
                      <div className="mt-3 bg-emerald-500/5 border border-emerald-500/10 rounded p-3.5 text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150 font-medium">
                        <span className="font-semibold block mb-1 text-emerald-600">Projected Revenue Impact Basis:</span>
                        {m.projectedImpactBasis}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 w-full md:w-auto md:shrink-0 mt-2 md:mt-0 justify-end sm:justify-start">
                    <Button
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs flex-1 md:flex-initial"
                      onClick={() => updateStatusMutation.mutate({ id: m.id, status: "done" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Mark Done
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex-1 md:flex-initial"
                      onClick={() => updateStatusMutation.mutate({ id: m.id, status: "dismissed" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Done/Dismissed collapsible panel */}
      {done.length > 0 && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs font-bold flex items-center gap-1.5 transition-all select-none"
          >
            <span>{showHistory ? "▲ Hide" : "▼ Show"} Completion History ({done.length} item{done.length !== 1 && "s"})</span>
          </Button>

          {showHistory && (
            <div className="flex flex-col gap-2.5 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {done.map((m) => {
                const isCompleted = m.status === "done";
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between border rounded-md p-3.5 bg-white dark:bg-zinc-950 opacity-75 ${
                      isCompleted ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-450" : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
                        isCompleted ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
                      }`}>
                        {isCompleted ? "✓" : "✕"}
                      </span>
                      <span className="font-semibold text-ink text-xs sm:text-sm">{m.title}</span>
                    </div>
                    <Badge variant={isCompleted ? "success" : "secondary"}>
                      {m.status === "done" ? "Completed" : "Dismissed"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Celebration Toast */}
      {celebration && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white p-5 rounded-md border border-emerald-500/30 shadow-2xl flex flex-col gap-1.5 max-w-sm animate-in slide-in-from-right-10 fade-in duration-300 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-wider flex items-center gap-1">
              🎉 Growth Unlocked!
            </span>
            <button className="text-zinc-400 hover:text-white text-xs p-1" onClick={() => setCelebration(null)}>✕</button>
          </div>
          <p className="text-xs font-semibold leading-snug">{celebration.title}</p>
          <p className="text-xs text-zinc-350 mt-1 border-t border-zinc-800 pt-2 flex items-center justify-between font-medium">
            <span>Projected impact added:</span>
            <span className="text-emerald-400 font-bold text-sm">+₹{celebration.amount.toLocaleString()}/mo</span>
          </p>
        </div>
      )}
    </AppShell>
  );
}
