"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { AutomationDraft } from "@/lib/types";
import { MessageSquare, RefreshCw, CheckCircle2, XCircle, Search, Edit3, Sparkles, Send, Check } from "lucide-react";

export default function SuggestedMessagesPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [drafts, setDrafts] = useState<AutomationDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Search & Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("draft"); // Default to draft (Pending)
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Expandable row state
  const [expandedDrafts, setExpandedDrafts] = useState<Record<string, boolean>>({});

  // Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDraft, setEditingDraft] = useState<AutomationDraft | null>(null);
  const [editContent, setEditContent] = useState("");

  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratingDraft, setRegeneratingDraft] = useState<AutomationDraft | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("Friendlier");
  const [regenerating, setRegenerating] = useState(false);

  // Popup warning state
  const [showPopupWarning, setShowPopupWarning] = useState(false);
  const [popupUrl, setPopupUrl] = useState("");

  useEffect(() => {
    if (!businessId) return;
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function fetchSuggestions() {
    setLoading(true);
    api.get<{ drafts: AutomationDraft[] }>(`/api/automation/${businessId}/suggestions`)
      .then((res) => {
        setDrafts(res.drafts || []);
      })
      .finally(() => setLoading(false));
  }

  async function handleGenerateSuggestions() {
    if (!businessId) return;
    setGenerating(true);
    try {
      const res = await api.post<{ drafts: AutomationDraft[] }>(`/api/automation/${businessId}/generate-suggestions`);
      setDrafts(res.drafts || []);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      alert("Failed to generate suggested drafts.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDraft) return;
    try {
      await api.patch(`/api/automation/${editingDraft.id}`, { content: editContent });
      setDrafts(prev => prev.map(d => d.id === editingDraft.id ? { ...d, content: editContent } : d));
      setShowEditModal(false);
      setEditingDraft(null);
    } catch (err) {
      alert("Failed to save changes.");
    }
  }

  async function handleRegenerateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!regeneratingDraft) return;
    setRegenerating(true);
    try {
      const res = await api.post<{ draft: AutomationDraft }>(`/api/automation/draft/${regeneratingDraft.id}/regenerate`, {
        style: selectedStyle
      });
      setDrafts(prev => prev.map(d => d.id === regeneratingDraft.id ? res.draft : d));
      setShowRegenerateModal(false);
      setRegeneratingDraft(null);
    } catch (err) {
      alert("Failed to rewrite message.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleStatusChange(id: string, status: "approved" | "rejected") {
    try {
      const res = await api.patch<{ draft: AutomationDraft }>(`/api/automation/${id}`, { status });
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, status, approvedAt: res.draft.approvedAt } : d));
      setSelectedIds(prev => prev.filter(x => x !== id));
    } catch (err) {
      alert("Failed to update status.");
    }
  }

  async function handleBulkUpdate(status: "approved" | "rejected") {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      await api.post(`/api/automation/${businessId}/bulk-update`, { ids: selectedIds, status });
      setDrafts(prev =>
        prev.map(d =>
          selectedIds.includes(d.id)
            ? { ...d, status, approvedAt: status === "approved" ? new Date().toISOString() : null }
            : d
        )
      );
      setSelectedIds([]);
    } catch (err) {
      alert("Failed to update items in bulk.");
    } finally {
      setBulkLoading(false);
    }
  }

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

    try {
      const res = await api.patch<{ draft: AutomationDraft }>(`/api/automation/${draft.id}`, { status: "approved" });
      setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, status: "approved", approvedAt: res.draft.approvedAt } : d));

      if (!win) {
        setPopupUrl(url);
        setShowPopupWarning(true);
      }
    } catch (err) {
      console.error(err);
      alert("Draft launched in WhatsApp, but status update failed.");
    }
  }

  function handleSelectRow(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll(filtered: AutomationDraft[]) {
    const filteredDraftIds = filtered.map(d => d.id);
    const allSelected = filteredDraftIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredDraftIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredDraftIds])));
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

  // Derive stats
  const totalPendingCount = drafts.filter(d => d.status === "draft").length;
  const totalApprovedCount = drafts.filter(d => d.status === "approved").length;
  const totalRejectedCount = drafts.filter(d => d.status === "rejected").length;
  const generatedTodayCount = drafts.filter(d => {
    const today = new Date();
    const dDate = new Date(d.createdAt);
    return (
      dDate.getDate() === today.getDate() &&
      dDate.getMonth() === today.getMonth() &&
      dDate.getFullYear() === today.getFullYear()
    );
  }).length;

  // Filter pipeline
  const filteredDrafts = drafts.filter(d => {
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

  const allFilteredSelected =
    filteredDrafts.length > 0 &&
    filteredDrafts.map(d => d.id).every(id => selectedIds.includes(id));

  if (sessionLoading || loading) {
    return (
      <AppShell>
        <div className="text-muted">Loading suggestions panel…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Toast Warning for browser blockers */}
      {showPopupWarning && (
        <div className="fixed bottom-5 right-5 z-50 bg-warn text-slate-900 font-semibold px-5 py-4 rounded-xl shadow-lg border border-warn/30 animate-fade-in flex flex-col gap-2 max-w-sm">
          <p className="text-xs">⚠️ WhatsApp web window was blocked by your browser settings.</p>
          <a
            href={popupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary bg-slate-900 text-white text-[11px] px-3 py-1.5 font-bold text-center self-start"
            onClick={() => setShowPopupWarning(false)}
          >
            Launch WhatsApp Manually
          </a>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1">AI Suggested Messages</h1>
          <p className="text-muted text-sm font-medium">
            AI analyzes your CRM and recommends personalized customer messages that you can review and send manually via WhatsApp.
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2 shadow-md shadow-accent/15"
          onClick={handleGenerateSuggestions}
          disabled={generating}
        >
          <Sparkles size={16} className={generating ? "animate-spin" : ""} />
          {generating ? "Generating Suggestions..." : "Generate Suggestions"}
        </button>
      </div>

      {/* Analytics Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-5 relative overflow-hidden group hover:border-accent/40 transition-colors">
          <p className="text-2xl font-display font-semibold text-accent">{totalPendingCount}</p>
          <p className="text-xs text-muted mt-1">Pending Drafts</p>
          <div className="absolute top-4 right-4 text-accent/10">
            <MessageSquare size={24} />
          </div>
        </div>
        <div className="card p-5 relative overflow-hidden group hover:border-accent2/40 transition-colors">
          <p className="text-2xl font-display font-semibold text-accent2">{totalApprovedCount}</p>
          <p className="text-xs text-muted mt-1">Approved Suggestions</p>
          <div className="absolute top-4 right-4 text-accent2/10">
            <CheckCircle2 size={24} />
          </div>
        </div>
        <div className="card p-5 relative overflow-hidden group hover:border-danger/40 transition-colors">
          <p className="text-2xl font-display font-semibold text-danger">{totalRejectedCount}</p>
          <p className="text-xs text-muted mt-1">Rejected Suggestions</p>
          <div className="absolute top-4 right-4 text-danger/10">
            <XCircle size={24} />
          </div>
        </div>
        <div className="card p-5 relative overflow-hidden group hover:border-warn/40 transition-colors">
          <p className="text-2xl font-display font-semibold text-warn">{generatedTodayCount}</p>
          <p className="text-xs text-muted mt-1">Generated Today</p>
          <div className="absolute top-4 right-4 text-warn/10">
            <Sparkles size={24} />
          </div>
        </div>
      </div>

      {/* Filter and search parameters */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex flex-col lg:flex-row gap-3 bg-surface p-4 border border-border rounded-2xl shadow-card">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3.5 text-muted/50" size={16} />
            <input
              className="input text-xs pl-10 py-3"
              placeholder="Search by customer name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className="input py-2 px-3 text-xs w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Pending (Drafts)</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              className="input py-2 px-3 text-xs w-auto"
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
              className="input py-2 px-3 text-xs w-auto"
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
        <div className="bg-surface border border-accent/20 rounded-xl p-4 mb-4 flex items-center justify-between shadow-card animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold">
              {selectedIds.length}
            </span>
            <span className="text-xs font-medium">items selected</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkUpdate("approved")}
              className="btn-primary py-1.5 px-4 text-xs font-semibold flex items-center gap-1.5 bg-accent2 hover:bg-accent2/90"
              disabled={bulkLoading}
            >
              <Check size={14} />
              Approve Selected
            </button>
            <button
              onClick={() => handleBulkUpdate("rejected")}
              className="btn-secondary py-1.5 px-4 text-xs font-semibold flex items-center gap-1.5 border-danger/30 text-danger hover:bg-danger/10"
              disabled={bulkLoading}
            >
              <XCircle size={14} />
              Reject Selected
            </button>
          </div>
        </div>
      )}

      {/* Suggested Messages table vs cards rendering block */}
      {filteredDrafts.length === 0 ? (
        <div className="card p-12 text-center max-w-xl mx-auto my-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-base mb-1 text-ink">✨ Everything looks good!</h3>
            <p className="text-muted text-xs leading-relaxed max-w-sm">
              No customers currently require follow-up. Click &quot;Generate Suggestions&quot; to analyze your CRM and trigger new outreach opportunities.
            </p>
          </div>
          <button
            className="btn-primary text-xs"
            onClick={handleGenerateSuggestions}
            disabled={generating}
          >
            {generating ? "Analyzing CRM..." : "Generate Suggestions"}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View (Displays on screen sizes md and above) */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-muted border-b border-border bg-surface2/30 text-xs">
                    <th className="px-5 py-3 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-border bg-surface2 text-accent focus:ring-accent"
                        checked={allFilteredSelected}
                        onChange={() => toggleSelectAll(filteredDrafts)}
                      />
                    </th>
                    <th className="px-5 py-3 font-medium min-w-[150px]">Customer</th>
                    <th className="px-5 py-3 font-medium min-w-[140px]">Phone Number</th>
                    <th className="px-5 py-3 font-medium min-w-[130px]">Lead Status</th>
                    <th className="px-5 py-3 font-medium min-w-[110px]">Category</th>
                    <th className="px-5 py-3 font-medium min-w-[170px]">Reason</th>
                    <th className="px-5 py-3 font-medium min-w-[105px]">Confidence</th>
                    <th className="px-5 py-3 font-medium min-w-[300px]">AI Suggested Message</th>
                    <th className="px-5 py-3 font-medium min-w-[200px]">AI Explanation</th>
                    <th className="px-5 py-3 font-medium min-w-[100px]">Generated</th>
                    <th className="px-5 py-3 font-medium text-right min-w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrafts.map((d) => {
                    const leadStatus = d.customer?.leadStatus || "New";
                    const isExpanded = expandedDrafts[d.id] || false;

                    let statusColor = "bg-muted/15 text-muted";
                    if (leadStatus === "Closed Won") statusColor = "bg-emerald-500/15 text-emerald-400";
                    else if (leadStatus === "Closed Lost") statusColor = "bg-danger/15 text-danger";
                    else if (leadStatus === "Interested" || leadStatus === "Negotiation") statusColor = "bg-accent2/15 text-accent2";
                    else if (leadStatus === "Follow-up Required" || leadStatus === "Site Visit Scheduled") statusColor = "bg-warn/15 text-warn";

                    let catColor = "bg-accent/10 text-accent border border-accent/20";
                    if (d.category?.toLowerCase() === "payment") catColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                    else if (d.category?.toLowerCase() === "site visit") catColor = "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
                    else if (d.category?.toLowerCase() === "greeting") catColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                    else if (d.category?.toLowerCase() === "thank-you") catColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";

                    let confidenceStars = "★★☆";
                    let confidenceColor = "text-warn";
                    if (d.confidence === "High") {
                      confidenceStars = "★★★";
                      confidenceColor = "text-accent2";
                    } else if (d.confidence === "Low") {
                      confidenceStars = "★☆☆";
                      confidenceColor = "text-muted";
                    }

                    return (
                      <tr
                        key={d.id}
                        className="border-b border-border last:border-0 hover:bg-surface2/20 transition-colors align-top"
                      >
                        <td className="px-5 py-4">
                          <input
                            type="checkbox"
                            className="rounded border-border bg-surface2 text-accent focus:ring-accent"
                            checked={selectedIds.includes(d.id)}
                            onChange={() => handleSelectRow(d.id)}
                          />
                        </td>
                        <td className="px-5 py-4 font-semibold text-ink whitespace-nowrap">
                          {d.customer ? (
                            <Link
                              href={`/customers/${d.customer.id}`}
                              className="hover:underline hover:text-accent"
                            >
                              {d.customer.name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted whitespace-nowrap">
                          {d.customer?.phone || "—"}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`pill ${statusColor} text-[10px] font-semibold`}>
                            {leadStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`pill text-[10px] ${catColor}`}>
                            {d.category || "General"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-muted break-words leading-relaxed">
                          {d.reason || d.reasoning || "—"}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap font-display">
                          <span className={`font-semibold text-xs ${confidenceColor}`}>
                            {d.confidence || "Medium"} ({confidenceStars})
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-ink">
                          <div
                            className="cursor-pointer bg-base/40 p-2.5 rounded-lg border border-border/40 hover:border-accent/30 transition-all select-none"
                            onClick={() =>
                              setExpandedDrafts(prev => ({ ...prev, [d.id]: !isExpanded }))
                            }
                          >
                            <p className={`leading-relaxed whitespace-pre-wrap break-words ${!isExpanded ? "line-clamp-3" : ""}`}>
                              {d.content}
                            </p>
                            <p className="text-[10px] text-accent mt-1.5 font-bold hover:underline">
                              {isExpanded ? "Show Less ▲" : "Click to Expand Message ▼"}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-muted leading-relaxed">
                          {d.reasoning || "—"}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted whitespace-nowrap">
                          {formatRelativeTime(d.createdAt)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {d.status === "draft" && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingDraft(d);
                                    setEditContent(d.content);
                                    setShowEditModal(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-surface hover:bg-surface2 text-muted hover:text-accent border border-border transition-colors"
                                  title="Edit Draft"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    setRegeneratingDraft(d);
                                    setSelectedStyle("Friendlier");
                                    setShowRegenerateModal(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-surface hover:bg-surface2 text-muted hover:text-accent border border-border transition-colors"
                                  title="Regenerate/Rewrite"
                                >
                                  <RefreshCw size={14} />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(d.id, "rejected")}
                                  className="p-1.5 rounded-lg bg-surface hover:bg-surface2 text-muted hover:text-danger border border-border transition-colors"
                                  title="Reject suggestion"
                                >
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleSendWhatsApp(d)}
                              className="btn-primary text-xs py-1.5 px-3 font-semibold flex items-center gap-1 leading-none shadow-sm"
                              style={{ backgroundColor: "var(--accent2)" }}
                              title="Send via WhatsApp"
                            >
                              <Send size={12} />
                              {d.status === "approved" ? "Re-open" : "Send"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards List View (Displays on screen sizes below md) */}
          <div className="md:hidden flex flex-col gap-4">
            {filteredDrafts.map((d) => {
              const leadStatus = d.customer?.leadStatus || "New";
              const isExpanded = expandedDrafts[d.id] || false;

              let statusColor = "bg-muted/15 text-muted";
              if (leadStatus === "Closed Won") statusColor = "bg-emerald-500/15 text-emerald-400";
              else if (leadStatus === "Closed Lost") statusColor = "bg-danger/15 text-danger";
              else if (leadStatus === "Interested" || leadStatus === "Negotiation") statusColor = "bg-accent2/15 text-accent2";
              else if (leadStatus === "Follow-up Required" || leadStatus === "Site Visit Scheduled") statusColor = "bg-warn/15 text-warn";

              let catColor = "bg-accent/10 text-accent border border-accent/20";
              if (d.category?.toLowerCase() === "payment") catColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
              else if (d.category?.toLowerCase() === "site visit") catColor = "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
              else if (d.category?.toLowerCase() === "greeting") catColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
              else if (d.category?.toLowerCase() === "thank-you") catColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";

              let confidenceStars = "★★☆";
              let confidenceColor = "text-warn";
              if (d.confidence === "High") {
                confidenceStars = "★★★";
                confidenceColor = "text-accent2";
              } else if (d.confidence === "Low") {
                confidenceStars = "★☆☆";
                confidenceColor = "text-muted";
              }

              return (
                <div key={d.id} className="card p-5 flex flex-col gap-3 relative border border-border bg-surface">
                  <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        className="rounded border-border bg-surface2 text-accent focus:ring-accent w-4 h-4"
                        checked={selectedIds.includes(d.id)}
                        onChange={() => handleSelectRow(d.id)}
                      />
                      <div>
                        {d.customer ? (
                          <Link href={`/customers/${d.customer.id}`} className="font-semibold text-ink text-sm hover:underline block leading-tight">
                            {d.customer.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-ink text-sm block leading-tight">—</span>
                        )}
                        <span className="text-xs text-muted block mt-0.5">{d.customer?.phone || "—"}</span>
                      </div>
                    </div>
                    <span className={`pill ${statusColor} text-[9px] font-semibold uppercase shrink-0`}>
                      {leadStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-1">
                    <div>
                      <span className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Category</span>
                      <span className={`pill text-[9px] ${catColor}`}>{d.category || "General"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Confidence</span>
                      <span className={`font-semibold text-xs ${confidenceColor}`}>{d.confidence || "Medium"} ({confidenceStars})</span>
                    </div>
                  </div>

                  <div className="text-xs">
                    <span className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Reason for Suggestion</span>
                    <p className="text-muted leading-relaxed font-medium">{d.reason || d.reasoning || "—"}</p>
                  </div>

                  <div className="text-xs bg-base/40 p-3 rounded-xl border border-border/40">
                    <span className="text-[10px] text-accent font-bold uppercase tracking-wider block mb-1">AI Suggested Message</span>
                    <div 
                      onClick={() => setExpandedDrafts(prev => ({ ...prev, [d.id]: !isExpanded }))}
                      className="cursor-pointer"
                    >
                      <p className={`text-ink leading-relaxed whitespace-pre-wrap break-words ${!isExpanded ? "line-clamp-3" : ""}`}>
                        {d.content}
                      </p>
                      <p className="text-[9px] text-accent mt-2 font-bold hover:underline">
                        {isExpanded ? "Show Less ▲" : "Click to Expand Message ▼"}
                      </p>
                    </div>
                  </div>

                  {d.reasoning && (
                    <div className="text-xs border-l-2 border-accent/40 pl-2.5">
                      <span className="text-[10px] text-accent font-semibold uppercase tracking-wider block">AI Explanation</span>
                      <p className="text-muted leading-relaxed">{d.reasoning}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/40 pt-3.5 mt-1">
                    <span className="text-[10px] text-muted">Generated: {formatRelativeTime(d.createdAt)}</span>
                    <div className="flex gap-1.5 justify-end">
                      {d.status === "draft" && (
                        <>
                          <button
                            onClick={() => {
                              setEditingDraft(d);
                              setEditContent(d.content);
                              setShowEditModal(true);
                            }}
                            className="btn-secondary py-1 px-3 text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setRegeneratingDraft(d);
                              setSelectedStyle("Friendlier");
                              setShowRegenerateModal(true);
                            }}
                            className="btn-secondary py-1 px-3 text-xs font-semibold"
                          >
                            Tone
                          </button>
                          <button
                            onClick={() => handleStatusChange(d.id, "rejected")}
                            className="btn-secondary py-1 px-3 text-xs font-semibold text-danger border-danger/20 hover:bg-danger/5"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleSendWhatsApp(d)}
                        className="btn-primary py-1 px-4 text-xs font-semibold flex items-center gap-1.5 self-end"
                        style={{ backgroundColor: "var(--accent2)" }}
                      >
                        <Send size={12} />
                        {d.status === "approved" ? "Re-open" : "Send"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Edit modal */}
      {showEditModal && editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card w-full max-w-lg p-6 relative">
            <button
              className="absolute top-4 right-4 text-muted hover:text-ink text-lg"
              onClick={() => {
                setShowEditModal(false);
                setEditingDraft(null);
              }}
            >
              ✕
            </button>
            <h2 className="font-display text-lg font-semibold mb-4">Edit AI Suggested Message</h2>
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div>
                <label className="label">Message Content</label>
                <textarea
                  className="input py-2.5 text-sm min-h-[160px]"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDraft(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Regenerate modal */}
      {showRegenerateModal && regeneratingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card w-full max-w-sm p-6 relative">
            <button
              className="absolute top-4 right-4 text-muted hover:text-ink text-lg"
              onClick={() => {
                setShowRegenerateModal(false);
                setRegeneratingDraft(null);
              }}
            >
              ✕
            </button>
            <h2 className="font-display text-lg font-semibold mb-4">Regenerate outreach draft</h2>
            <form onSubmit={handleRegenerateSubmit} className="flex flex-col gap-4">
              <div>
                <label className="label">Choose rewriting tone style</label>
                <select
                  className="input py-2 text-sm"
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                >
                  <option value="Friendlier">😊 Friendlier (Warm & Conversational)</option>
                  <option value="More Professional">💼 More Professional (Formal & Polite)</option>
                  <option value="Shorter">⚡ Shorter (Concise & Direct)</option>
                  <option value="More Persuasive">🔥 More Persuasive (Stronger Call-To-Action)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => {
                    setShowRegenerateModal(false);
                    setRegeneratingDraft(null);
                  }}
                  disabled={regenerating}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs" disabled={regenerating}>
                  {regenerating ? "Rewriting..." : "Regenerate Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
