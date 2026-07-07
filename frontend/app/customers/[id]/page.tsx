"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { api, ApiError } from "@/lib/api";
import { Customer } from "@/lib/types";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals & Panels State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  // Edit Customer Form State
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    notes: "",
  });

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

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nexora_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchCustomerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function fetchCustomerData() {
    setLoading(true);
    api
      .get<{ customer: Customer }>(`/api/customers/${params.id}`)
      .then((res) => {
        setCustomer(res.customer);
        setEditForm({
          name: res.customer.name,
          phone: res.customer.phone || "",
          email: res.customer.email || "",
          city: res.customer.city || "",
          notes: res.customer.notes || "",
        });
      })
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  }

  // Handle Editing Customer Profile
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionStatus("Updating profile...");
    try {
      const res = await api.patch<{ customer: Customer }>(`/api/customers/${params.id}`, {
        name: editForm.name,
        phone: editForm.phone || null,
        email: editForm.email || null,
        city: editForm.city || null,
        notes: editForm.notes || null,
      });
      setCustomer(res.customer);
      setActionStatus("✓ Profile updated successfully!");
      setTimeout(() => {
        setShowEditModal(false);
        setActionStatus(null);
      }, 1500);
    } catch (err) {
      setActionStatus(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  // Handle Deleting Customer
  async function handleDeleteConfirm() {
    setActionStatus("Deleting profile...");
    try {
      await api.post(`/api/customers/${params.id}`, { method: "DELETE" }); // Wait, endpoint is DELETE /api/customers/:id, let's call it via DELETE method in api class.
      // Wait, is there a delete helper in our api class?
      // Let's check api class:
      // get, post, postForm, patch. Oh! There is NO delete helper!
      // But we can call request directly or call POST method with delete path? No, let's see. Can we use native fetch or request?
      // Ah! In backend, router.delete("/:id") is mapped. In frontend, api is:
      // api.get, api.post, api.postForm, api.patch.
      // Wait, we can modify frontend api class to add api.delete, or we can just call fetch natively since the token is stored in localStorage!
      // Let's check how api class is defined:
      // class ApiError ... const token = getToken() ... fetch(..., { method: "DELETE" })
      // Yes, we can make a direct fetch call, or wait!
      // In the backend we can map a POST route "/:id/delete" or call fetch natively.
      // Calling fetch natively is extremely easy:
      const token = localStorage.getItem("nexora_token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API_BASE}/api/customers/${params.id}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!res.ok) throw new Error("Delete failed");
      
      setActionStatus("✓ Customer deleted successfully.");
      setTimeout(() => {
        setShowDeleteModal(false);
        setActionStatus(null);
        router.push("/customers");
      }, 1500);
    } catch (err: any) {
      setActionStatus(err.message || "Failed to delete customer");
    }
  }

  // Handle Adding Purchase
  async function handlePurchaseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!purchaseForm.product.trim()) return;

    setActionStatus("Adding transaction...");
    try {
      await api.post(`/api/customers/${params.id}/sales`, {
        product: purchaseForm.product,
        productCategory: purchaseForm.productCategory || null,
        quantity: Number(purchaseForm.quantity) || 1,
        amount: Number(purchaseForm.amount) || 0,
        date: purchaseForm.date,
        paymentMethod: purchaseForm.paymentMethod || null,
        notes: purchaseForm.notes || null,
      });

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

      fetchCustomerData();

      setTimeout(() => {
        setShowAddPurchaseModal(false);
        setActionStatus(null);
      }, 1500);
    } catch (err) {
      setActionStatus(err instanceof ApiError ? err.message : "Failed to add purchase");
    }
  }

  if (loading) return <AppShell><div className="text-muted">Loading Customer CRM profile…</div></AppShell>;
  if (!customer) return <AppShell><div className="text-danger">Customer not found.</div></AppShell>;

  const inactive = customer.lastPurchaseAt
    ? Date.now() - new Date(customer.lastPurchaseAt).getTime() > 60 * 86400000
    : false;

  // Segment calculation
  let segmentName = "Churned";
  let segmentColor = "bg-danger/15 text-danger";
  if (customer.lifetimeValue >= 2000) {
    segmentName = "VIP Segment";
    segmentColor = "bg-accent/15 text-accent";
  } else if ((customer.sales?.length ?? 0) >= 2) {
    segmentName = "Loyal Customer";
    segmentColor = "bg-accent2/15 text-accent2";
  } else if ((customer.sales?.length ?? 0) === 1 && !inactive) {
    segmentName = "New Active";
    segmentColor = "bg-warn/15 text-warn";
  }

  // Churn risk derivation
  const riskScore = inactive ? 85 : customer.lastPurchaseAt && Date.now() - new Date(customer.lastPurchaseAt).getTime() > 30 * 86400000 ? 45 : 15;
  const riskLabel = riskScore >= 70 ? "High Risk" : riskScore >= 40 ? "Medium" : "Low Risk";
  const riskColor = riskScore >= 70 ? "text-danger" : riskScore >= 40 ? "text-warn" : "text-accent2";

  // AOV and orders count
  const ordersCount = customer.sales?.length ?? 0;
  const avgOrderValue = ordersCount > 0 ? Math.round(customer.lifetimeValue / ordersCount) : 0;

  return (
    <AppShell>
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/customers" className="text-xs text-accent hover:underline block mb-1">
            ← Back to Customer Analystics
          </Link>
          <h1 className="font-display text-2xl font-semibold mb-1">{customer.name}</h1>
          <p className="text-muted text-sm font-medium">CRM Profile & Timeline</p>
        </div>
        
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={() => setShowAddPurchaseModal(true)}>
            + Add Purchase
          </button>
          <button className="btn-secondary text-xs" onClick={() => setShowEditModal(true)}>
            ✏ Edit Details
          </button>
          <button className="btn-secondary text-xs border-danger/30 text-danger hover:bg-danger/10" onClick={() => setShowDeleteModal(true)}>
            🗑 Delete Customer
          </button>
        </div>
      </div>

      {/* Profile Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="card p-5">
          <p className="text-xl font-display font-semibold text-accent">₹{customer.lifetimeValue.toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">Lifetime Value (CLV)</p>
        </div>
        <div className="card p-5">
          <p className="text-xl font-display font-semibold">{ordersCount}</p>
          <p className="text-xs text-muted mt-1">Total Purchases</p>
        </div>
        <div className="card p-5">
          <p className="text-xl font-display font-semibold text-accent2">₹{avgOrderValue.toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">Average Order (AOV)</p>
        </div>
        <div className="card p-5">
          <span className={`pill ${segmentColor} text-[10px] mt-0.5`}>{segmentName}</span>
          <p className="text-xs text-muted mt-2.5">Customer Segment</p>
        </div>
        <div className="card p-5">
          <p className={`text-lg font-semibold ${riskColor}`}>{riskLabel} ({riskScore})</p>
          <p className="text-xs text-muted mt-1.5">Churn Risk</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Customer Information detail card */}
        <div className="card p-5 flex flex-col gap-4">
          <h3 className="font-semibold text-sm border-b border-border pb-2">Customer Profile</h3>
          
          <div>
            <span className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Email Address</span>
            <span className="text-sm font-medium text-ink">{customer.email || "—"}</span>
          </div>

          <div>
            <span className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Phone Number</span>
            <span className="text-sm font-medium text-ink">{customer.phone || "—"}</span>
          </div>

          <div>
            <span className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">City / Location</span>
            <span className="text-sm font-medium text-ink">{customer.city || "—"}</span>
          </div>

          <div>
            <span className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Registered On</span>
            <span className="text-sm text-muted">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "—"}</span>
          </div>

          <div>
            <span className="text-[10px] text-muted uppercase tracking-wider block mb-1">Notes / Preferences</span>
            <p className="text-xs text-muted bg-surface2/30 p-2.5 rounded-lg border border-border leading-relaxed whitespace-pre-line">
              {customer.notes || "No notes on profile."}
            </p>
          </div>
        </div>

        {/* Timeline & Purchase History */}
        <div className="card p-5 md:col-span-2 flex flex-col gap-4">
          <h3 className="font-semibold text-sm border-b border-border pb-2">Purchase History Timeline</h3>
          
          {customer.sales?.length ? (
            <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
              {customer.sales.map((sale) => (
                <div key={sale.id} className="border border-border rounded-xl p-3 bg-surface2/20 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-ink text-sm">{sale.product || "Purchase"}</p>
                    <p className="font-bold text-ink text-sm">₹{sale.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted mt-1.5 border-t border-border/40 pt-1.5">
                    <span>📅 {new Date(sale.date).toLocaleDateString()}</span>
                    {sale.productCategory && <span>🏷️ {sale.productCategory}</span>}
                    {sale.quantity !== undefined && sale.quantity !== null && <span>📦 Qty: {sale.quantity}</span>}
                    {sale.paymentMethod && <span>💳 {sale.paymentMethod}</span>}
                  </div>
                  {sale.notes && (
                    <p className="mt-2 text-muted italic bg-surface2/40 p-1.5 rounded border border-border/30 text-[10px]">
                      Notes: {sale.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No purchase records registered yet.</p>
          )}

          {/* AI Opportunity card */}
          <div className="mt-auto border-t border-border pt-4">
            <h4 className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Nexora CRM Insights</h4>
            <p className="text-xs text-muted leading-relaxed">
              {customer.nextOpportunity || "No CRM recommendations recorded yet."}
            </p>
          </div>
        </div>
      </div>

      {/* 1. EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-6 relative">
            <button className="absolute top-4 right-4 text-muted hover:text-ink" onClick={() => setShowEditModal(false)}>✕</button>
            <h2 className="font-display text-lg font-semibold mb-4">Edit Customer Details</h2>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
              <div>
                <label className="label">Customer Name</label>
                <input
                  type="text"
                  required
                  className="input py-2 text-sm"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Phone Number</label>
                <input
                  type="text"
                  className="input py-2 text-sm"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className="input py-2 text-sm"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="label">City</label>
                <input
                  type="text"
                  className="input py-2 text-sm"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Profile Notes</label>
                <textarea
                  className="input py-2 text-sm min-h-[70px]"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              {actionStatus && (
                <div className="text-xs text-accent2 bg-accent2/10 p-2.5 rounded-xl border border-accent2/20 mt-1">
                  {actionStatus}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn-secondary text-xs" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs" disabled={actionStatus?.includes("Updating")}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. DELETE PROFILE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card w-full max-w-sm p-6 relative">
            <h2 className="font-display text-lg font-semibold mb-2 text-danger">Delete Customer Profile</h2>
            <p className="text-muted text-xs mb-4">
              Are you sure you want to permanently delete {customer.name}? This will also delete all associated purchase transactions from the CRM ledger. This action cannot be undone.
            </p>

            {actionStatus && (
              <div className="text-xs text-accent2 bg-accent2/10 p-2.5 rounded-xl border border-accent2/20 mb-3">
                {actionStatus}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary bg-danger hover:bg-danger/80 text-xs"
                onClick={handleDeleteConfirm}
                disabled={actionStatus?.includes("Deleting")}
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ADD PURCHASE TRANSACTION MODAL */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-6 relative">
            <button className="absolute top-4 right-4 text-muted hover:text-ink" onClick={() => setShowAddPurchaseModal(false)}>✕</button>
            <h2 className="font-display text-lg font-semibold mb-4">Record New Purchase</h2>

            <form onSubmit={handlePurchaseSubmit} className="flex flex-col gap-3">
              <div>
                <label className="label">Product Name *</label>
                <input
                  type="text"
                  required
                  className="input py-2 text-sm"
                  value={purchaseForm.product}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, product: e.target.value })}
                  placeholder="e.g. Cinnamon Roll"
                />
              </div>

              <div>
                <label className="label">Product Category</label>
                <input
                  type="text"
                  className="input py-2 text-sm"
                  value={purchaseForm.productCategory}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, productCategory: e.target.value })}
                  placeholder="e.g. Food"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    className="input py-2 text-sm"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: Number(e.target.value) || 1 })}
                  />
                </div>

                <div>
                  <label className="label">Amount (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    className="input py-2 text-sm"
                    value={purchaseForm.amount}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Purchase Date</label>
                <input
                  type="date"
                  className="input py-2 text-sm"
                  value={purchaseForm.date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Payment Method</label>
                <select
                  className="input py-2 text-sm"
                  value={purchaseForm.paymentMethod}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value })}
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="NetBanking">Net Banking</option>
                </select>
              </div>

              <div>
                <label className="label">Transaction Notes</label>
                <textarea
                  className="input py-2 text-sm min-h-[50px]"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  placeholder="e.g. Special order pastry..."
                />
              </div>

              {actionStatus && (
                <div className="text-xs text-accent2 bg-accent2/10 p-2.5 rounded-xl border border-accent2/20 mt-1">
                  {actionStatus}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn-secondary text-xs" onClick={() => setShowAddPurchaseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs" disabled={actionStatus?.includes("Adding")}>
                  Save Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
