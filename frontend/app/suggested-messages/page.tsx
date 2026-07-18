"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { AutomationDraft } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/spinner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, CheckCircle2, XCircle, Search, Sparkles, Send, Check } from "lucide-react";

// Lazy load the Edit and Tone/Regenerate modals to minimize main JS bundle size
const MessageEditModal = dynamic(() => import("@/components/MessageEditModal"), {
  loading: () => (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[90%] max-w-lg bg-white/70 dark:bg-zinc-950/75 border border-zinc-200/40 dark:border-zinc-900/50 backdrop-blur-xl rounded-[24px] p-6 space-y-6 shadow-premium text-left">
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-32 w-full rounded-[16px]" />
        <div className="flex gap-2 justify-end">
          <Skeleton className="h-9 w-20 rounded-[12px]" />
          <Skeleton className="h-9 w-24 rounded-[12px]" />
        </div>
      </div>
    </div>
  ),
});

const MessageRegenerateModal = dynamic(() => import("@/components/MessageRegenerateModal"), {
  loading: () => (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[90%] max-w-lg bg-white/70 dark:bg-zinc-950/75 border border-zinc-200/40 dark:border-zinc-900/50 backdrop-blur-xl rounded-[24px] p-6 space-y-6 shadow-premium text-left">
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-32 w-full rounded-[16px]" />
        <div className="flex gap-2 justify-end">
          <Skeleton className="h-9 w-20 rounded-[12px]" />
          <Skeleton className="h-9 w-24 rounded-[12px]" />
        </div>
      </div>
    </div>
  ),
});

export default function SuggestedMessagesPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const queryClient = useQueryClient();

  // Search & Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("draft"); // Default to draft (Pending)
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Expandable row state
  const [expandedDrafts, setExpandedDrafts] = useState<Record<string, boolean>>({});

  // Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDraft, setEditingDraft] = useState<AutomationDraft | null>(null);

  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratingDraft, setRegeneratingDraft] = useState<AutomationDraft | null>(null);

  // Popup warning state
  const [showPopupWarning, setShowPopupWarning] = useState(false);
  const [popupUrl, setPopupUrl] = useState("");

  // React Query: Fetch suggestions
  const { data: suggestionsPayload, isLoading: fetchLoading } = useQuery({
    queryKey: ["suggested-messages", businessId],
    queryFn: () => api.get<{ drafts: AutomationDraft[] }>(`/api/automation/${businessId}/suggestions`),
    enabled: !!businessId,
  });

  const drafts = suggestionsPayload?.drafts || [];

  // React Query Mutation: Generate Suggestions
  const generateSuggestionsMutation = useMutation({
    mutationFn: () => api.post<{ drafts: AutomationDraft[] }>(`/api/automation/${businessId}/generate-suggestions`),
    onSuccess: (data) => {
      queryClient.setQueryData(["suggested-messages", businessId], data);
      setSelectedIds([]);
    },
  });

  // React Query Mutation: Status changes with optimistic update
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const res = await api.patch<{ draft: AutomationDraft }>(`/api/automation/${id}`, { status });
      return res.draft;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["suggested-messages", businessId] });
      const previousData = queryClient.getQueryData<{ drafts: AutomationDraft[] }>(["suggested-messages", businessId]);

      if (previousData) {
        queryClient.setQueryData(["suggested-messages", businessId], {
          drafts: previousData.drafts.map((d) =>
            d.id === id ? { ...d, status, approvedAt: status === "approved" ? new Date().toISOString() : null } : d
          ),
        });
      }
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["suggested-messages", businessId], context.previousData);
      }
      alert("Failed to update status.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggested-messages", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", businessId] });
    },
  });

  // React Query Mutation: Save Edit with optimistic updates
  const editMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await api.patch<{ draft: AutomationDraft }>(`/api/automation/${id}`, { content });
      return res.draft;
    },
    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({ queryKey: ["suggested-messages", businessId] });
      const previousData = queryClient.getQueryData<{ drafts: AutomationDraft[] }>(["suggested-messages", businessId]);

      if (previousData) {
        queryClient.setQueryData(["suggested-messages", businessId], {
          drafts: previousData.drafts.map((d) => (d.id === id ? { ...d, content } : d)),
        });
      }
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["suggested-messages", businessId], context.previousData);
      }
      alert("Failed to save changes.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggested-messages", businessId] });
    },
  });

  // React Query Mutation: Tone rewrite / regenerate
  const regenerateMutation = useMutation({
    mutationFn: async ({ id, style }: { id: string; style: string }) => {
      const res = await api.post<{ draft: AutomationDraft }>(`/api/automation/draft/${id}/regenerate`, { style });
      return res.draft;
    },
    onSuccess: (newDraft) => {
      queryClient.setQueryData(["suggested-messages", businessId], {
        drafts: drafts.map((d) => (d.id === newDraft.id ? newDraft : d)),
      });
      setShowRegenerateModal(false);
      setRegeneratingDraft(null);
    },
    onError: () => {
      alert("Failed to rewrite message.");
    },
  });

  // React Query Mutation: Bulk actions
  const bulkMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: "approved" | "rejected" }) => {
      await api.post(`/api/automation/${businessId}/bulk-update`, { ids, status });
    },
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: ["suggested-messages", businessId] });
      const previousData = queryClient.getQueryData<{ drafts: AutomationDraft[] }>(["suggested-messages", businessId]);

      if (previousData) {
        queryClient.setQueryData(["suggested-messages", businessId], {
          drafts: previousData.drafts.map((d) =>
            ids.includes(d.id)
              ? { ...d, status, approvedAt: status === "approved" ? new Date().toISOString() : null }
              : d
          ),
        });
      }
      setSelectedIds([]);
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["suggested-messages", businessId], context.previousData);
      }
      alert("Failed to update items in bulk.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggested-messages", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", businessId] });
    },
  });

  // Direct Send Launch Handler
  async function handleSendWhatsApp(draft: AutomationDraft) {
    const phone = draft.customer?.phone;
    if (!phone) {
      alert("This customer has no phone number on file. Edit their profile to add one before sending.");
      return;
    }

    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      cleaned = "91" + cleaned;
    }

    const encoded = encodeURIComponent(draft.content);
    const url = `https://wa.me/${cleaned}?text=${encoded}`;
    const win = window.open(url, "_blank");

    // Instantly approve draft locally to feel fast
    statusMutation.mutate({ id: draft.id, status: "approved" });

    if (!win) {
      setPopupUrl(url);
      setShowPopupWarning(true);
    }
  }

  // Row selection helpers
  function handleSelectRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll(filtered: AutomationDraft[]) {
    const filteredDraftIds = filtered.map((d) => d.id);
    const allSelected = filteredDraftIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredDraftIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredDraftIds])));
    }
  }

  function formatRelativeTime(dateStr: string) {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return "Yesterday";
    return `${diffDay} days ago`;
  }

  // Memoized derived stats (stops recalculations on key actions)
  const stats = useMemo(() => {
    const totalPendingCount = drafts.filter((d) => d.status === "draft").length;
    const totalApprovedCount = drafts.filter((d) => d.status === "approved").length;
    const totalRejectedCount = drafts.filter((d) => d.status === "rejected").length;
    const generatedTodayCount = drafts.filter((d) => {
      const today = new Date();
      const dDate = new Date(d.createdAt);
      return (
        dDate.getDate() === today.getDate() &&
        dDate.getMonth() === today.getMonth() &&
        dDate.getFullYear() === today.getFullYear()
      );
    }).length;

    return {
      totalPendingCount,
      totalApprovedCount,
      totalRejectedCount,
      generatedTodayCount,
    };
  }, [drafts]);

  // Memoized filter/search pipeline (stops rendering delays)
  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      const term = search.toLowerCase();
      const nameMatch = d.customer?.name?.toLowerCase().includes(term) ?? false;
      const phoneMatch = d.customer?.phone?.includes(term) ?? false;
      const matchesSearch = !term || nameMatch || phoneMatch;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "draft" && d.status === "draft") ||
        (statusFilter === "approved" && d.status === "approved") ||
        (statusFilter === "rejected" && d.status === "rejected");

      const matchesCategory =
        categoryFilter === "all" ||
        (d.category && d.category.toLowerCase() === categoryFilter.toLowerCase());

      let matchesDate = true;
      const nowTime = Date.now();
      const draftTime = new Date(d.createdAt).getTime();
      if (dateFilter === "today") {
        const today = new Date();
        const draftDate = new Date(d.createdAt);
        matchesDate =
          draftDate.getDate() === today.getDate() &&
          draftDate.getMonth() === today.getMonth() &&
          draftDate.getFullYear() === today.getFullYear();
      } else if (dateFilter === "week") {
        matchesDate = nowTime - draftTime <= 7 * 24 * 60 * 60 * 1000;
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    });
  }, [drafts, search, statusFilter, categoryFilter, dateFilter]);

  const allFilteredSelected = useMemo(() => {
    return (
      filteredDrafts.length > 0 &&
      filteredDrafts.map((d) => d.id).every((id) => selectedIds.includes(id))
    );
  }, [filteredDrafts, selectedIds]);

  const loading = sessionLoading || fetchLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Toast Warning for browser blockers */}
      {showPopupWarning && (
        <div className="fixed bottom-5 right-5 z-50 bg-amber-500 text-zinc-900 font-semibold p-4 rounded shadow-premium border border-amber-600/30 animate-fade-in flex flex-col gap-2 max-w-sm text-left">
          <p className="text-xs">⚠️ WhatsApp web window was blocked by your browser settings.</p>
          <Button
            size="sm"
            onClick={() => setShowPopupWarning(false)}
          >
            <a href={popupUrl} target="_blank" rel="noopener noreferrer">
              Launch WhatsApp Manually
            </a>
          </Button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1">AI Suggested Messages</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">
            AI analyzes your CRM and recommends personalized customer messages that you can review and send manually via WhatsApp.
          </p>
        </div>
        <Button
          onClick={() => generateSuggestionsMutation.mutate()}
          isLoading={generateSuggestionsMutation.isPending}
          className="flex items-center gap-1.5"
        >
          <Sparkles size={14} /> Generate Suggestions
        </Button>
      </div>

      {/* Analytics Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-2xl font-display font-semibold text-accent">{stats.totalPendingCount}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Pending Drafts</p>
        </Card>
        <Card className="p-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-2xl font-display font-semibold text-accent2">{stats.totalApprovedCount}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Approved Suggestions</p>
        </Card>
        <Card className="p-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-2xl font-display font-semibold text-red-500">{stats.totalRejectedCount}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Rejected Suggestions</p>
        </Card>
        <Card className="p-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-2xl font-display font-semibold text-amber-500">{stats.generatedTodayCount}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Generated Today</p>
        </Card>
      </div>

      {/* Filter and search parameters */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex flex-col lg:flex-row gap-3 bg-white dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-premium">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              className="input pl-8"
              placeholder="Search by customer name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <select
              className="flex h-9 rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Pending (Drafts)</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              className="flex h-9 rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="follow-up">Follow-up</option>
              <option value="reminder">Reminder</option>
              <option value="site visit">Site Visit</option>
              <option value="payment">Payment</option>
              <option value="greeting">Greetings</option>
              <option value="re-engagement">Re-engagement</option>
              <option value="thank-you">Thank-you</option>
            </select>

            <select
              className="flex h-9 rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating control bar for multi-checks */}
      {selectedIds.length > 0 && (
        <Card className="border border-zinc-250 dark:border-zinc-800 p-4 mb-4 flex items-center justify-between shadow-premium animate-fade-in">
          <div className="flex items-center gap-2">
            <Badge>{selectedIds.length}</Badge>
            <span className="text-xs font-semibold">items selected</span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => bulkMutation.mutate({ ids: selectedIds, status: "approved" })}
              className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 text-xs"
              size="sm"
            >
              <Check size={14} /> Approve Selected
            </Button>
            <Button
              onClick={() => bulkMutation.mutate({ ids: selectedIds, status: "rejected" })}
              variant="outline"
              className="border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-650 flex items-center gap-1 text-xs"
              size="sm"
            >
              <XCircle size={14} /> Reject Selected
            </Button>
          </div>
        </Card>
      )}

      {/* Suggested Messages table vs cards rendering block */}
      {filteredDrafts.length === 0 ? (
        <Card className="p-12 text-center max-w-xl mx-auto my-8 flex flex-col items-center gap-4 border border-zinc-200 dark:border-zinc-800 shadow-premium">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-650 dark:text-zinc-400 text-lg animate-float">
            ✨
          </div>
          <div>
            <h3 className="font-semibold text-base mb-1">Everything looks good!</h3>
            <p className="text-zinc-550 dark:text-zinc-450 text-xs leading-relaxed max-w-sm">
              No customers currently require follow-up. Click &quot;Generate Suggestions&quot; to analyze your CRM and trigger new outreach opportunities.
            </p>
          </div>
          <Button
            onClick={() => generateSuggestionsMutation.mutate()}
            isLoading={generateSuggestionsMutation.isPending}
            size="sm"
          >
            Generate Suggestions
          </Button>
        </Card>
      ) : (
        <>
          <Card className="hidden md:block overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-premium">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left min-w-[1250px]">
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-900/10 text-xs">
                    <th className="w-12 py-3.5 px-5">
                      <input
                        type="checkbox"
                        className="rounded border-zinc-250 bg-white dark:bg-zinc-900 text-zinc-900 focus:ring-zinc-950"
                        checked={allFilteredSelected}
                        onChange={() => toggleSelectAll(filteredDrafts)}
                      />
                    </th>
                    <th className="py-3.5 px-5">Customer</th>
                    <th className="py-3.5 px-5">Phone Number</th>
                    <th className="py-3.5 px-5">Lead Status</th>
                    <th className="py-3.5 px-5">Category</th>
                    <th className="py-3.5 px-5 min-w-[220px] max-w-xs">Reason</th>
                    <th className="py-3.5 px-5">Confidence</th>
                    <th className="py-3.5 px-5 min-w-[320px]">AI Suggested Message</th>
                    <th className="py-3.5 px-5 min-w-[220px] max-w-xs">AI Explanation</th>
                    <th className="py-3.5 px-5">Generated</th>
                    <th className="text-right py-3.5 px-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/10">
                  {filteredDrafts.map((d) => {
                    const leadStatus = d.customer?.leadStatus || "New";
                    const isExpanded = expandedDrafts[d.id] || false;

                    let statusVariant: "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline" = "secondary";
                    if (leadStatus === "Closed Won") statusVariant = "success";
                    else if (leadStatus === "Closed Lost") statusVariant = "destructive";
                    else if (leadStatus === "Interested" || leadStatus === "Negotiation") statusVariant = "default";
                    else if (leadStatus === "Follow-up Required" || leadStatus === "Site Visit Scheduled") statusVariant = "warning";

                    let confidenceColor = "text-amber-500";
                    if (d.confidence === "High") {
                      confidenceColor = "text-emerald-500";
                    } else if (d.confidence === "Low") {
                      confidenceColor = "text-zinc-450 dark:text-zinc-500";
                    }

                    return (
                      <tr key={d.id} className="hover:bg-zinc-50/20 dark:hover:bg-zinc-900/10 transition-colors">
                        <td className="py-4 px-5">
                          <input
                            type="checkbox"
                            className="rounded border-zinc-250 bg-white dark:bg-zinc-900 text-zinc-900 focus:ring-zinc-950"
                            checked={selectedIds.includes(d.id)}
                            onChange={() => handleSelectRow(d.id)}
                          />
                        </td>
                        <td className="font-semibold py-4 px-5">
                          {d.customer ? (
                            <Link href={`/customers/${d.customer.id}`} className="hover:underline text-accent">
                              {d.customer.name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="text-xs py-4 px-5">{d.customer?.phone || "—"}</td>
                        <td className="py-4 px-5">
                          <Badge variant={statusVariant}>{leadStatus}</Badge>
                        </td>
                        <td className="py-4 px-5">
                          <Badge variant="secondary" className="uppercase text-[9px] font-semibold">{d.category || "general"}</Badge>
                        </td>
                        <td className="text-xs text-zinc-500 py-4 px-5 min-w-[220px] max-w-xs leading-normal">{d.reason || d.reasoning || "—"}</td>
                        <td className={`font-bold text-xs py-4 px-5 ${confidenceColor}`}>{d.confidence || "Medium"}</td>
                        <td className="text-xs font-mono max-w-sm py-4 px-5 min-w-[320px] leading-normal">
                          <div 
                            onClick={() => setExpandedDrafts((prev) => ({ ...prev, [d.id]: !isExpanded }))}
                            className="cursor-pointer"
                          >
                            <p className={`whitespace-pre-wrap ${!isExpanded ? "line-clamp-2" : ""}`}>{d.content}</p>
                            <p className="text-[9px] text-accent mt-1.5 font-bold hover:underline">
                              {isExpanded ? "Show Less ▲" : "Click to Expand Message ▼"}
                            </p>
                          </div>
                        </td>
                        <td className="text-xs text-zinc-500 italic min-w-[220px] max-w-xs py-4 px-5 leading-normal">{d.reasoning || "—"}</td>
                        <td className="text-[10px] text-zinc-400 whitespace-nowrap py-4 px-5">{formatRelativeTime(d.createdAt)}</td>
                        <td className="text-right py-4 px-5">
                          <div className="flex gap-1 justify-end">
                            {d.status === "draft" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5 text-[11px]"
                                  onClick={() => {
                                    setEditingDraft(d);
                                    setShowEditModal(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5 text-[11px]"
                                  onClick={() => {
                                    setRegeneratingDraft(d);
                                    setShowRegenerateModal(true);
                                  }}
                                >
                                  Tone
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5 text-[11px] text-red-500 border-red-500/20 hover:bg-red-500/10"
                                  onClick={() => statusMutation.mutate({ id: d.id, status: "rejected" })}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              className="h-8 px-3 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white font-semibold flex items-center gap-1"
                              onClick={() => handleSendWhatsApp(d)}
                            >
                              <Send size={10} /> {d.status === "approved" ? "Re-open" : "Send"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile Cards List View */}
          <div className="md:hidden flex flex-col gap-4 text-left">
            {filteredDrafts.map((d) => {
              const leadStatus = d.customer?.leadStatus || "New";
              const isExpanded = expandedDrafts[d.id] || false;

              let statusVariant: "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline" = "secondary";
              if (leadStatus === "Closed Won") statusVariant = "success";
              else if (leadStatus === "Closed Lost") statusVariant = "destructive";
              else if (leadStatus === "Interested" || leadStatus === "Negotiation") statusVariant = "default";
              else if (leadStatus === "Follow-up Required" || leadStatus === "Site Visit Scheduled") statusVariant = "warning";

              let confidenceColor = "text-amber-500";
              if (d.confidence === "High") {
                confidenceColor = "text-emerald-500";
              } else if (d.confidence === "Low") {
                confidenceColor = "text-zinc-450 dark:text-zinc-500";
              }

              return (
                <Card key={d.id} className="p-5 flex flex-col gap-3 relative border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-premium">
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-150 dark:border-zinc-850/50 pb-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        className="rounded border-zinc-250 bg-white dark:bg-zinc-900 text-zinc-900 focus:ring-zinc-950 w-4 h-4"
                        checked={selectedIds.includes(d.id)}
                        onChange={() => handleSelectRow(d.id)}
                      />
                      <div>
                        {d.customer ? (
                          <Link href={`/customers/${d.customer.id}`} className="font-semibold text-sm hover:underline block leading-tight text-accent">
                            {d.customer.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-sm block leading-tight">—</span>
                        )}
                        <span className="text-xs text-zinc-400 block mt-0.5">{d.customer?.phone || "—"}</span>
                      </div>
                    </div>
                    <Badge variant={statusVariant}>{leadStatus}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-1">
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase tracking-wider block mb-0.5">Category</span>
                      <div>
                        <Badge variant="secondary" className="text-[9px] font-semibold">{d.category || "General"}</Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase tracking-wider block mb-0.5">Confidence</span>
                      <span className={`font-semibold text-xs ${confidenceColor}`}>{d.confidence || "Medium"}</span>
                    </div>
                  </div>

                  <div className="text-xs">
                    <span className="text-[9px] text-zinc-450 uppercase tracking-wider block mb-0.5">Reason for Suggestion</span>
                    <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">{d.reason || d.reasoning || "—"}</p>
                  </div>

                  <div className="text-xs bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded border border-zinc-250/50 dark:border-zinc-800">
                    <span className="text-[9px] text-accent font-bold uppercase tracking-wider block mb-1">AI Suggested Message</span>
                    <div 
                      onClick={() => setExpandedDrafts((prev) => ({ ...prev, [d.id]: !isExpanded }))}
                      className="cursor-pointer"
                    >
                      <p className={`text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words ${!isExpanded ? "line-clamp-3" : ""}`}>
                        {d.content}
                      </p>
                      <p className="text-[9px] text-accent mt-2 font-bold hover:underline">
                        {isExpanded ? "Show Less ▲" : "Click to Expand Message ▼"}
                      </p>
                    </div>
                  </div>

                  {d.reasoning && (
                    <div className="text-xs border-l-2 border-accent/40 pl-2.5">
                      <span className="text-[9px] text-accent font-semibold uppercase tracking-wider block">AI Explanation</span>
                      <p className="text-zinc-500 leading-relaxed">{d.reasoning}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-zinc-150 dark:border-zinc-850/50 pt-3.5 mt-1">
                    <span className="text-[10px] text-zinc-400">Generated: {formatRelativeTime(d.createdAt)}</span>
                    <div className="flex gap-1.5 justify-end">
                      {d.status === "draft" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-[11px]"
                            onClick={() => {
                              setEditingDraft(d);
                              setShowEditModal(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-[11px]"
                            onClick={() => {
                              setRegeneratingDraft(d);
                              setShowRegenerateModal(true);
                            }}
                          >
                            Tone
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-[11px] text-red-500 border-red-500/20 hover:bg-red-500/5"
                            onClick={() => statusMutation.mutate({ id: d.id, status: "rejected" })}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => handleSendWhatsApp(d)}
                        className="h-8 px-3.5 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white font-semibold flex items-center gap-1 self-end"
                      >
                        <Send size={10} />
                        {d.status === "approved" ? "Re-open" : "Send"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Dynamic Edit modal */}
      {showEditModal && editingDraft && (
        <MessageEditModal
          initialContent={editingDraft.content}
          onClose={() => {
            setShowEditModal(false);
            setEditingDraft(null);
          }}
          onSubmit={(content) => editMessageMutation.mutate({ id: editingDraft.id, content })}
        />
      )}

      {/* Dynamic Regenerate modal */}
      {showRegenerateModal && regeneratingDraft && (
        <MessageRegenerateModal
          onClose={() => {
            setShowRegenerateModal(false);
            setRegeneratingDraft(null);
          }}
          onSubmit={(style) => regenerateMutation.mutate({ id: regeneratingDraft.id, style })}
          isPending={regenerateMutation.isPending}
        />
      )}
    </AppShell>
  );
}
