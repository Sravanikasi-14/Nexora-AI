"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api, ApiError } from "@/lib/api";
import { Customer } from "@/lib/types";
import { getDeepLink } from "@/lib/deepLinks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner, Skeleton } from "@/components/ui/spinner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });

  // Modals & Panels State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  // Win-Back drafting states
  const [drafting, setDrafting] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<any>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [savingApproval, setSavingApproval] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [popupFallbackUrl, setPopupFallbackUrl] = useState<string | null>(null);
  const [popupFallbackLabel, setPopupFallbackLabel] = useState<string>("");

  // React Query: Fetch customer details
  const { data: customer, isLoading: detailsLoading } = useQuery<Customer | null>({
    queryKey: ["customer", params.id],
    queryFn: async () => {
      const res = await api.get<{ customer: Customer }>(`/api/customers/${params.id}`);
      return res.customer;
    },
    enabled: !!params.id && !!businessId,
  });

  // Edit Customer Form State
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    notes: "",
    leadStatus: "",
  });

  // Sync edit form with fetched data
  useEffect(() => {
    if (customer) {
      setEditForm({
        name: customer.name,
        phone: customer.phone || "",
        email: customer.email || "",
        city: customer.city || "",
        notes: customer.notes || "",
        leadStatus: customer.leadStatus || "New",
      });
    }
  }, [customer]);

  // Add Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState({
    product: "",
    productCategory: "",
    quantity: 1,
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "UPI",
    notes: "",
  });

  // TanStack Query Mutation: Edit Customer with Optimistic Update
  const editMutation = useMutation({
    mutationFn: async (updatedFields: typeof editForm) => {
      const res = await api.patch<{ customer: Customer }>(`/api/customers/${params.id}`, {
        name: updatedFields.name,
        phone: updatedFields.phone || null,
        email: updatedFields.email || null,
        city: updatedFields.city || null,
        notes: updatedFields.notes || null,
        leadStatus: updatedFields.leadStatus || null,
      });
      return res.customer;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["customer", params.id] });
      const previousCustomer = queryClient.getQueryData<Customer>(["customer", params.id]);

      if (previousCustomer) {
        queryClient.setQueryData<Customer>(["customer", params.id], {
          ...previousCustomer,
          ...newData,
        });
      }
      return { previousCustomer };
    },
    onError: (err, newData, context) => {
      if (context?.previousCustomer) {
        queryClient.setQueryData(["customer", params.id], context.previousCustomer);
      }
      setActionStatus(err instanceof Error ? err.message : "Update failed");
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["customer", params.id], data);
      queryClient.invalidateQueries({ queryKey: ["customers", businessId] });
      setActionStatus("✓ Profile updated successfully!");
      setTimeout(() => {
        setShowEditModal(false);
        setActionStatus(null);
      }, 1200);
    },
  });

  // TanStack Query Mutation: Add Purchase with Optimistic Update
  const purchaseMutation = useMutation({
    mutationFn: async (newSale: typeof purchaseForm) => {
      const res = await api.post<{ sale: any }>(`/api/customers/${params.id}/sales`, {
        product: newSale.product,
        productCategory: newSale.productCategory || null,
        quantity: Number(newSale.quantity) || 1,
        amount: Number(newSale.amount) || 0,
        date: newSale.date,
        paymentMethod: newSale.paymentMethod || null,
        notes: newSale.notes || null,
      });
      return res.sale;
    },
    onMutate: async (newSale) => {
      await queryClient.cancelQueries({ queryKey: ["customer", params.id] });
      const previousCustomer = queryClient.getQueryData<Customer>(["customer", params.id]);

      if (previousCustomer) {
        const optimisticSale = {
          id: Math.random().toString(),
          product: newSale.product,
          productCategory: newSale.productCategory,
          quantity: newSale.quantity,
          amount: newSale.amount,
          date: newSale.date,
          paymentMethod: newSale.paymentMethod,
          notes: newSale.notes,
        };
        const updatedSales = [...(previousCustomer.sales || []), optimisticSale];
        const updatedLtv = previousCustomer.lifetimeValue + newSale.amount;

        queryClient.setQueryData<Customer>(["customer", params.id], {
          ...previousCustomer,
          lifetimeValue: updatedLtv,
          sales: updatedSales,
          lastPurchaseAt: newSale.date,
        });
      }
      return { previousCustomer };
    },
    onError: (err, newSale, context) => {
      if (context?.previousCustomer) {
        queryClient.setQueryData(["customer", params.id], context.previousCustomer);
      }
      setActionStatus(err instanceof Error ? err.message : "Failed to add purchase");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", params.id] });
      queryClient.invalidateQueries({ queryKey: ["customers", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", businessId] });
      setActionStatus("✓ Purchase added successfully!");
      setPurchaseForm({
        product: "",
        productCategory: "",
        quantity: 1,
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        paymentMethod: "UPI",
        notes: "",
      });
      setTimeout(() => {
        setShowAddPurchaseModal(false);
        setActionStatus(null);
      }, 1200);
    },
  });

  // Handle Editing Customer Profile
  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionStatus("Updating profile...");
    editMutation.mutate(editForm);
  }

  // Handle Deleting Customer (Instant response UI redirect)
  async function handleDeleteConfirm() {
    setActionStatus("Deleting profile...");
    try {
      const token = localStorage.getItem("nexora_token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      
      // We immediately trigger visual redirection for instant perceived speed
      router.push("/customers");

      fetch(`${API_BASE}/api/customers/${params.id}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["customers", businessId] });
        queryClient.invalidateQueries({ queryKey: ["dashboard", businessId] });
      });
    } catch (err: any) {
      alert(err.message || "Failed to delete customer");
    }
  }

  // Handle Adding Purchase
  function handlePurchaseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!purchaseForm.product.trim()) return;
    setActionStatus("Adding transaction...");
    purchaseMutation.mutate(purchaseForm);
  }

  // Handle Winback Message
  async function handleDraftWinBackMessage() {
    setDrafting(true);
    setDraftError(null);
    setPopupFallbackUrl(null);
    setPopupFallbackLabel("");
    try {
      const res = await api.post<{ draft: any }>("/api/automation/draft", {
        customerId: params.id,
        type: "whatsapp",
      });
      setGeneratedDraft(res.draft);
      setShowDraftModal(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate win-back draft");
    } finally {
      setDrafting(false);
    }
  }

  async function handleApproveDraft() {
    if (!generatedDraft || !customer) return;

    const linkInfo = getDeepLink(generatedDraft, customer);
    if (linkInfo.error) {
      setDraftError(linkInfo.error);
      return;
    }

    let win: Window | null = null;
    const isProtocolHandler = linkInfo.url && (linkInfo.url.startsWith("mailto:") || linkInfo.url.startsWith("sms:"));

    if (linkInfo.url) {
      if (isProtocolHandler) {
        window.location.href = linkInfo.url;
      } else {
        win = window.open("", "_blank");
      }
    }

    setSavingApproval(true);
    setDraftError(null);
    setPopupFallbackUrl(null);
    setPopupFallbackLabel("");

    try {
      const res = await api.patch<{ draft: any }>(`/api/automation/${generatedDraft.id}`, { status: "approved" });
      setGeneratedDraft(res.draft);
      if (linkInfo.url) {
        if (!isProtocolHandler) {
          if (win) {
            win.location.href = linkInfo.url;
          } else {
            setPopupFallbackUrl(linkInfo.url);
            setPopupFallbackLabel(`Click here to open in ${linkInfo.channelLabel}`);
          }
        }
      }
    } catch (err) {
      if (win) {
        try {
          win.close();
        } catch (_) {}
      }
      alert(err instanceof Error ? err.message : "Failed to approve draft");
    } finally {
      setSavingApproval(false);
    }
  }

  async function handleMarkAsSent() {
    if (!generatedDraft) return;
    setSavingApproval(true);
    try {
      await api.patch(`/api/automation/${generatedDraft.id}`, { status: "sent" });
      setShowDraftModal(false);
      setGeneratedDraft(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to mark as sent");
    } finally {
      setSavingApproval(false);
    }
  }

  async function handleDiscardDraft() {
    if (!generatedDraft) return;
    setSavingApproval(true);
    try {
      await api.patch(`/api/automation/${generatedDraft.id}`, { status: "rejected" });
      setShowDraftModal(false);
      setGeneratedDraft(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject draft");
    } finally {
      setSavingApproval(false);
    }
  }

  // HighlightGrounding Facts for AI Transparency
  const inactive = customer?.lastPurchaseAt
    ? Date.now() - new Date(customer.lastPurchaseAt).getTime() > 60 * 86400000
    : false;

  const daysSinceLastPurchase = customer?.lastPurchaseAt
    ? Math.floor((Date.now() - new Date(customer.lastPurchaseAt).getTime()) / 86400000)
    : null;

  const getHighlightedContent = (content: string) => {
    if (!customer) return content;
    const firstName = customer.name.split(" ")[0];
    const namePart = customer.name;
    const ltvStr = customer.lifetimeValue.toString();
    const ltvFormatted = customer.lifetimeValue.toLocaleString();
    const daysStr = daysSinceLastPurchase?.toString() || "0";

    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    let html = escapeHtml(content);

    const nameRegex = new RegExp(`\\b(${escapeHtml(namePart)}|${escapeHtml(firstName)})\\b`, "gi");
    html = html.replace(nameRegex, '<span class="bg-accent/20 border-b-2 border-accent px-1 font-semibold text-accent" title="Fact: Customer Name">$1</span>');

    const ltvRegex = new RegExp(`(₹\\s*${escapeHtml(ltvFormatted)}|₹\\s*${escapeHtml(ltvStr)}|\\b${escapeHtml(ltvStr)}\\b)`, "g");
    html = html.replace(ltvRegex, '<span class="bg-emerald-500/20 border-b-2 border-emerald-500 px-1 font-semibold text-emerald-600" title="Fact: Lifetime Value">$1</span>');

    const daysRegex = new RegExp(`(\\b${escapeHtml(daysStr)}\\b\\s*days|\\b${escapeHtml(daysStr)}\\b)`, "g");
    html = html.replace(daysRegex, '<span class="bg-amber-500/20 border-b-2 border-amber-500 px-1 font-semibold text-amber-600" title="Fact: Inactivity Gap">$1</span>');

    return <div dangerouslySetInnerHTML={{ __html: html }} className="text-sm leading-relaxed whitespace-pre-line text-ink" />;
  };

  const loading = sessionLoading || detailsLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-6 w-1/4" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-9 w-1/3" />
            <Skeleton className="h-9 w-1/4" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 md:col-span-2" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!customer) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <p className="text-red-500 font-semibold mb-2">Customer Profile Not Found</p>
          <Link href="/customers">
            <Button variant="outline" size="sm">Back to CRM List</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  // Segment calculation
  let segmentName = "Churned";
  let segmentVariant: "default" | "secondary" | "destructive" | "success" | "warning" = "destructive";
  if (customer.lifetimeValue >= 2000) {
    segmentName = "VIP Segment";
    segmentVariant = "default";
  } else if ((customer.sales?.length ?? 0) >= 2) {
    segmentName = "Loyal Customer";
    segmentVariant = "success";
  } else if ((customer.sales?.length ?? 0) === 1 && !inactive) {
    segmentName = "New Active";
    segmentVariant = "warning";
  }

  // Churn risk derivation
  const riskScore = inactive ? 85 : customer.lastPurchaseAt && Date.now() - new Date(customer.lastPurchaseAt).getTime() > 30 * 86400000 ? 45 : 15;
  const riskLabel = riskScore >= 70 ? "High Risk" : riskScore >= 40 ? "Medium" : "Low Risk";
  const riskColor = riskScore >= 70 ? "text-red-500 animate-pulse" : riskScore >= 40 ? "text-amber-500" : "text-emerald-500";

  // AOV and orders count
  const ordersCount = customer.sales?.length ?? 0;
  const avgOrderValue = ordersCount > 0 ? Math.round(customer.lifetimeValue / ordersCount) : 0;

  return (
    <AppShell>
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/customers" className="text-xs text-accent hover:underline block mb-1">
            ← Back to Customer Analytics
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold mb-1">{customer.name}</h1>
            {inactive && (
              <Badge variant="destructive" className="animate-pulse">
                ⚠️ At risk — hasn&apos;t returned
              </Badge>
            )}
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">CRM Profile & Timeline</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          {inactive && (
            <Button
              size="sm"
              onClick={handleDraftWinBackMessage}
              disabled={drafting}
            >
              {drafting ? "Drafting Win-back..." : "💬 Draft win-back message"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowAddPurchaseModal(true)}>
            + Add Purchase
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            ✏ Edit Details
          </Button>
          <Button variant="outline" size="sm" className="border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-650" onClick={() => setShowDeleteModal(true)}>
            🗑 Delete
          </Button>
        </div>
      </div>

      {/* Profile Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Card className="p-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-lg font-display font-semibold text-accent">₹{customer.lifetimeValue.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Lifetime Value (CLV)</p>
        </Card>
        <Card className="p-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-lg font-display font-semibold text-zinc-900 dark:text-zinc-100">{ordersCount}</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Total Purchases</p>
        </Card>
        <Card className="p-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-lg font-display font-semibold text-accent2">₹{avgOrderValue.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Average Order (AOV)</p>
        </Card>
        <Card className="p-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <div>
            <Badge variant={segmentVariant} className="text-[9px] px-1.5 py-0 mt-0.5">{segmentName}</Badge>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Customer Segment</p>
        </Card>
        <Card className="p-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className={`text-sm font-bold ${riskColor}`}>{riskLabel} ({riskScore})</p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Churn Risk</p>
        </Card>
        <Card className="p-4 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-sm font-semibold">
            {daysSinceLastPurchase !== null ? `${daysSinceLastPurchase} days` : "Never"}
          </p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Last Purchase Gap</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Customer Information detail card */}
        <Card className="p-5 flex flex-col gap-4">
          <h3 className="font-semibold text-xs border-b border-zinc-150 dark:border-zinc-850 pb-2">Customer Profile</h3>
          
          <div>
            <span className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block mb-0.5">Email Address</span>
            <span className="text-xs font-semibold">{customer.email || "—"}</span>
          </div>

          <div>
            <span className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block mb-0.5">Phone Number</span>
            <span className="text-xs font-semibold">{customer.phone || "—"}</span>
          </div>

          <div>
            <span className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block mb-0.5">City / Location</span>
            <span className="text-xs font-semibold">{customer.city || "—"}</span>
          </div>

          <div>
            <span className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block mb-0.5">Lead Status</span>
            <div>
              <Badge variant={
                customer.leadStatus === "Closed Won" ? "success" :
                customer.leadStatus === "Closed Lost" ? "destructive" :
                customer.leadStatus === "Interested" || customer.leadStatus === "Negotiation" ? "default" : "secondary"
              }>
                {customer.leadStatus || "New"}
              </Badge>
            </div>
          </div>

          <div>
            <span className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block mb-0.5">Registered On</span>
            <span className="text-xs text-zinc-500">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "—"}</span>
          </div>

          <div>
            <span className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block mb-1">Notes / Preferences</span>
            <p className="text-xs text-zinc-650 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5 rounded border border-zinc-200 dark:border-zinc-800 leading-relaxed whitespace-pre-line">
              {customer.notes || "No notes on profile."}
            </p>
          </div>
        </Card>

        {/* Timeline & Purchase History */}
        <Card className="p-5 md:col-span-2 flex flex-col gap-4">
          <h3 className="font-semibold text-xs border-b border-zinc-150 dark:border-zinc-850 pb-2">Purchase History Timeline</h3>
          
          {customer.sales?.length ? (
            <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
              {customer.sales.map((sale) => (
                <div key={sale.id} className="border border-zinc-200 dark:border-zinc-800 rounded-md p-3.5 bg-zinc-50/50 dark:bg-zinc-900/10 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">{sale.product || "Purchase"}</p>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">₹{sale.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-zinc-450 dark:text-zinc-500 mt-1.5 border-t border-zinc-150 dark:border-zinc-850/50 pt-1.5">
                    <span>📅 {new Date(sale.date).toLocaleDateString()}</span>
                    {sale.productCategory && <span>🏷️ {sale.productCategory}</span>}
                    {sale.quantity !== undefined && sale.quantity !== null && <span>📦 Qty: {sale.quantity}</span>}
                    {sale.paymentMethod && <span>💳 {sale.paymentMethod}</span>}
                  </div>
                  {sale.notes && (
                    <p className="mt-2 text-zinc-500 italic bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-800 text-[10px]">
                      Notes: {sale.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-550 py-4">No purchase records registered yet.</p>
          )}

          {/* AI Opportunity card */}
          <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">Nexora CRM Insights</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              {customer.nextOpportunity || "No CRM recommendations recorded yet."}
            </p>
          </div>
        </Card>
      </div>

      {/* 1. EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-md p-6 relative border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
            <button className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50" onClick={() => setShowEditModal(false)}>✕</button>
            <h2 className="font-display text-sm font-semibold mb-4">Edit Customer Details</h2>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3 text-left">
              <div>
                <Label>Customer Name</Label>
                <Input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Phone Number</Label>
                <Input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>

              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              <div>
                <Label>City</Label>
                <Input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>

              <div>
                <Label>Lead Status</Label>
                <Select
                  value={editForm.leadStatus}
                  onChange={(e) => setEditForm({ ...editForm, leadStatus: e.target.value })}
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Site Visit Scheduled">Site Visit Scheduled</option>
                  <option value="Follow-up Required">Follow-up Required</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
                </Select>
              </div>

              <div>
                <Label>Profile Notes</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="min-h-[70px]"
                />
              </div>

              {actionStatus && (
                <div className="text-xs text-emerald-650 bg-emerald-50/20 border border-emerald-500/20 p-2.5 rounded mt-1">
                  {actionStatus}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={editMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 2. DELETE PROFILE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-sm p-6 relative border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
            <h2 className="font-display text-sm font-semibold mb-2 text-red-500">Delete Customer Profile</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-4">
              Are you sure you want to permanently delete {customer.name}? This will also delete all associated purchase transactions from the CRM ledger. This action cannot be undone.
            </p>

            {actionStatus && (
              <div className="text-xs text-accent2 bg-accent2/10 p-2.5 rounded-md mb-3">
                {actionStatus}
              </div>
            )}

            <div className="flex justify-end gap-2 text-xs">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-500 hover:bg-red-600 text-white font-semibold"
                onClick={handleDeleteConfirm}
              >
                Delete Profile
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 3. ADD PURCHASE TRANSACTION MODAL */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-md p-6 relative border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
            <button className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50" onClick={() => setShowAddPurchaseModal(false)}>✕</button>
            <h2 className="font-display text-sm font-semibold mb-4">Record New Purchase</h2>

            <form onSubmit={handlePurchaseSubmit} className="flex flex-col gap-3 text-left">
              <div>
                <Label>Product Name *</Label>
                <Input
                  type="text"
                  required
                  value={purchaseForm.product}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, product: e.target.value })}
                  placeholder="e.g. Cinnamon Roll"
                />
              </div>

              <div>
                <Label>Product Category</Label>
                <Input
                  type="text"
                  value={purchaseForm.productCategory}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, productCategory: e.target.value })}
                  placeholder="e.g. Food"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: Number(e.target.value) || 1 })}
                  />
                </div>

                <div>
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    min={0}
                    required
                    value={purchaseForm.amount}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={purchaseForm.date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select
                  value={purchaseForm.paymentMethod}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value })}
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="NetBanking">Net Banking</option>
                </Select>
              </div>

              <div>
                <Label>Transaction Notes</Label>
                <Textarea
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  placeholder="e.g. Special order pastry..."
                  className="min-h-[50px]"
                />
              </div>

              {actionStatus && (
                <div className="text-xs text-emerald-650 bg-emerald-50/20 border border-emerald-500/20 p-2.5 rounded mt-1">
                  {actionStatus}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddPurchaseModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={purchaseMutation.isPending}>
                  Save Purchase
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 4. AI WIN-BACK MESSAGE DRAFT MODAL */}
      {showDraftModal && generatedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-2xl p-6 relative flex flex-col gap-5 border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
            <button
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 text-sm p-1 rounded-full"
              onClick={() => {
                setShowDraftModal(false);
                setGeneratedDraft(null);
              }}
              disabled={savingApproval}
            >
              ✕
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-900 to-zinc-650 dark:from-zinc-100 dark:to-zinc-400 flex items-center justify-center font-bold text-white dark:text-zinc-900 text-sm shrink-0 shadow-premium">
                ✨
              </div>
              <div className="flex-1 flex justify-between items-start gap-4 text-left">
                <div>
                  <h2 className="font-display text-sm font-semibold leading-tight">
                    Nexora Outreach Draft
                  </h2>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs">
                    Grounded customer outreach drafted via Google Gemini.
                  </p>
                </div>
                <div>
                  {generatedDraft.status === "approved" ? (
                    <Badge variant="success">
                      Approved — opened in {getDeepLink(generatedDraft, customer).channelLabel}
                    </Badge>
                  ) : (
                    <Badge variant="warning">
                      Draft
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-5 gap-4 text-left">
              {/* Draft Output Box */}
              <div className="md:col-span-3 flex flex-col gap-2">
                <span className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase tracking-wider font-semibold">Message Preview (WhatsApp)</span>
                <div className="bg-emerald-500/5 p-4 rounded border border-emerald-500/20 relative flex flex-col gap-3 min-h-[140px] justify-between">
                  <div className="absolute top-2.5 right-3 flex items-center gap-1 text-[9px] text-emerald-600 bg-emerald-500/10 py-0.5 px-2 rounded-full font-bold">
                    <span>🟢 Grounded</span>
                  </div>
                  <div className="mt-2">
                    {getHighlightedContent(generatedDraft.content)}
                  </div>
                </div>
              </div>

              {/* Grounding Facts List */}
              <div className="md:col-span-2 flex flex-col gap-3 bg-zinc-50/50 dark:bg-zinc-900/10 p-4 rounded border border-zinc-200 dark:border-zinc-800">
                <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider">CRM Grounding Data</h4>
                <p className="text-[9px] text-zinc-500 dark:text-zinc-450 leading-relaxed">
                  These verified facts from the CRM database were highlighted in the draft to avoid AI hallucination.
                </p>
                <div className="flex flex-col gap-2.5 text-xs pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">👤 Name</span>
                    <span className="font-semibold underline decoration-accent decoration-2">{customer.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">💰 Lifetime Value</span>
                    <span className="font-semibold text-emerald-600 underline decoration-emerald-500 decoration-2">₹{customer.lifetimeValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">📅 Last Purchase</span>
                    <span className="font-semibold underline decoration-amber-500 decoration-2">
                      {customer.lastPurchaseAt ? new Date(customer.lastPurchaseAt).toLocaleDateString() : "Never"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">⏳ Inactivity Gap</span>
                    <span className="font-semibold text-amber-600 underline decoration-amber-500 decoration-2">
                      {daysSinceLastPurchase} days
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {generatedDraft.reasoning && (
              <div className="border-l-2 border-accent/40 pl-3 text-left">
                <span className="text-[9px] text-accent font-semibold uppercase tracking-wider block mb-0.5">Consultant Nudge</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{generatedDraft.reasoning}</p>
              </div>
            )}

            {popupFallbackUrl && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded text-xs text-zinc-850 dark:text-zinc-100 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                <span>⚠️ The popup window was blocked by your browser.</span>
                <a
                  href={popupFallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-xs px-3 py-1 font-semibold whitespace-nowrap"
                  onClick={() => {
                    setPopupFallbackUrl(null);
                    setPopupFallbackLabel("");
                  }}
                >
                  {popupFallbackLabel || "Open Link"}
                </a>
              </div>
            )}

            {draftError && (
              <p className="text-xs text-red-500 font-semibold bg-red-500/5 p-2.5 rounded border border-red-500/10 text-left">
                ⚠️ {draftError}
              </p>
            )}

            <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              {generatedDraft.status === "draft" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDiscardDraft}
                    disabled={savingApproval}
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApproveDraft}
                    disabled={savingApproval}
                  >
                    {savingApproval ? "Approving..." : "Approve"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDraftModal(false);
                      setGeneratedDraft(null);
                    }}
                    disabled={savingApproval}
                  >
                    Close
                  </Button>
                  {getDeepLink(generatedDraft, customer).url && (
                    <a
                      href={getDeepLink(generatedDraft, customer).url || "#"}
                      target={getDeepLink(generatedDraft, customer).url?.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="border-accent/20 hover:bg-accent/5 text-accent">
                        Open in {getDeepLink(generatedDraft, customer).channelLabel}
                      </Button>
                    </a>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleMarkAsSent}
                    disabled={savingApproval}
                  >
                    {savingApproval ? "Updating..." : "Mark as Sent"}
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
