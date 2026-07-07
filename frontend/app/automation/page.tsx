"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { AutomationDraft } from "@/lib/types";

export default function AutomationPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [drafts, setDrafts] = useState<AutomationDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    fetchDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function fetchDrafts() {
    api.get<{ drafts: AutomationDraft[] }>(`/api/automation/${businessId}`)
      .then((res) => setDrafts(res.drafts))
      .finally(() => setLoading(false));
  }

  async function generate() {
    if (!businessId) return;
    setGenerating(true);
    try {
      const res = await api.post<{ drafts: AutomationDraft[] }>(`/api/automation/${businessId}/generate`);
      setDrafts(res.drafts);
    } finally {
      setGenerating(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await api.patch(`/api/automation/${id}`, { status });
    setDrafts((d) => d.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  function startEditing(d: AutomationDraft) {
    setEditingId(d.id);
    setEditSubject(d.subject || "");
    setEditContent(d.content);
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    try {
      await api.patch(`/api/automation/${id}`, {
        subject: editSubject || null,
        content: editContent,
      });
      setDrafts((d) => d.map((x) => (x.id === id ? { ...x, subject: editSubject || null, content: editContent } : x)));
      setEditingId(null);
    } finally {
      setSavingEdit(false);
    }
  }

  if (sessionLoading || loading) return <AppShell><div className="text-muted">Loading automation drafts…</div></AppShell>;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1">Tasks You Can Automate</h1>
          <p className="text-muted text-sm font-medium">Outreach campaigns, WhatsApp prompts, and social templates to build customer loyalty.</p>
        </div>
        <button className="btn-primary" onClick={generate} disabled={generating}>
          {generating ? "Generating…" : "Generate drafts"}
        </button>
      </div>
      <p className="text-muted text-xs mb-7">
        Nexora never sends anything automatically. Review each draft below, customize the message, and click Approve when ready.
      </p>

      {drafts.length === 0 ? (
        <div className="card p-6 text-muted text-center max-w-xl mx-auto my-8">
          <p className="font-semibold text-sm mb-2 text-ink">No automation drafts prepared</p>
          <p className="text-xs mb-4">Click &quot;Generate drafts&quot; to have Nexora design 5 tailored campaigns for your business.</p>
          <button className="btn-primary text-xs mx-auto" onClick={generate} disabled={generating}>
            {generating ? "Generating drafts..." : "Generate drafts"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {drafts.map((d) => (
            <div key={d.id} className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="pill bg-accent/15 text-accent text-[10px] uppercase font-semibold">{d.type}</span>
                <span className={`pill text-[10px] font-semibold uppercase ${d.status === "approved" ? "bg-accent2/15 text-accent2" : d.status === "rejected" ? "bg-danger/15 text-danger" : "bg-warn/15 text-warn"}`}>
                  {d.status}
                </span>
              </div>

              {editingId === d.id ? (
                <div className="flex flex-col gap-3 border-t border-border pt-3 mt-1">
                  {d.type === "email" && (
                    <div>
                      <label className="label text-[10px] uppercase tracking-wider mb-1 font-semibold text-muted">Email Subject</label>
                      <input
                        className="input text-xs py-2"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <label className="label text-[10px] uppercase tracking-wider mb-1 font-semibold text-muted">Campaign Content</label>
                    <textarea
                      className="input text-xs py-2 min-h-[120px]"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="btn-primary text-xs px-3 py-1.5" onClick={() => saveEdit(d.id)} disabled={savingEdit}>
                      {savingEdit ? "Saving Changes..." : "Save Draft"}
                    </button>
                    <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  {d.subject && <p className="text-sm font-semibold mb-2 text-ink">Subject: {d.subject}</p>}
                  <p className="text-sm text-muted whitespace-pre-line mb-4 bg-surface2/10 p-3 rounded-xl border border-border/40">{d.content}</p>
                  
                  {/* Business consultant reasoning explanation */}
                  <div className="border-l-2 border-accent/40 pl-3 mb-4">
                    <span className="text-[10px] text-accent font-semibold uppercase tracking-wider block mb-0.5">Consultant Nudge</span>
                    <p className="text-xs text-muted leading-relaxed">{d.reasoning}</p>
                  </div>

                  <div className="flex gap-2 border-t border-border pt-3">
                    {d.status === "draft" && (
                      <>
                        <button className="btn-primary text-xs px-3.5 py-1.5" onClick={() => updateStatus(d.id, "approved")}>Approve</button>
                        <button className="btn-secondary text-xs px-3.5 py-1.5" onClick={() => startEditing(d)}>Edit Message</button>
                        <button className="btn-secondary text-xs px-3.5 py-1.5 text-danger border-danger/20 hover:bg-danger/5" onClick={() => updateStatus(d.id, "rejected")}>Dismiss</button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
