"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";

interface CustomerUploadModalProps {
  onClose: () => void;
  businessId: string;
  onSuccess: (msg: string) => void;
  onStartAnalysis: () => void;
}

export default function CustomerUploadModal({
  onClose,
  businessId,
  onSuccess,
  onStartAnalysis,
}: CustomerUploadModalProps) {
  const [activeModalTab, setActiveModalTab] = React.useState<"upload" | "manual" | "statistics">("upload");
  const [uploadType, setUploadType] = React.useState<"customer" | "sales">("customer");
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = React.useState<File | null>(null);

  // Manual Customer Form
  const [customerForm, setCustomerForm] = React.useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    notes: "",
    product: "",
    productCategory: "",
    quantity: 1,
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "UPI",
  });

  // Manual Stats Form
  const [manualStatsForm, setManualStatsForm] = React.useState({
    totalCustomers: 150,
    newCustomers: 35,
    repeatCustomers: 65,
    customerGrowthPct: 15,
    monthlySales: 450000,
    revenueTrendPct: 12,
    averageOrderValue: 1200,
    customerLifetimeValue: 3500,
    topProduct1: "Filter Coffee",
    topProduct1Revenue: 180000,
    topProduct2: "Cold Brew",
    topProduct2Revenue: 120000,
    topProduct3: "Retail Beans",
    topProduct3Revenue: 90000,
    lowRiskCount: 85,
    mediumRiskCount: 45,
    highRiskCount: 20,
    vipCount: 25,
    vipRevenue: 180000,
    loyalCount: 50,
    loyalRevenue: 150000,
    newCount: 37,
    newRevenue: 80000,
    lostCount: 38,
    lostRevenue: 40000,
  });

  // Handle file uploads
  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileToUpload || !businessId) return;

    const fd = new FormData();
    fd.append("file", fileToUpload);
    setUploadStatus("Processing file upload...");

    try {
      await api.postForm<{ recordsProcessed: number }>(
        `/api/customers/upload/${businessId}/${uploadType}`,
        fd
      );
      setFileToUpload(null);
      setUploadStatus(null);
      onSuccess(`Imported successfully. Processing analysis in background.`);
      onStartAnalysis();
      onClose();
    } catch (err) {
      setUploadStatus(err instanceof ApiError ? err.message : "Upload failed");
    }
  }

  // Handle manual customer saving
  async function handleManualCustomerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    if (!customerForm.name.trim()) {
      setUploadStatus("Customer Name is required");
      return;
    }

    setUploadStatus("Saving Customer...");

    try {
      await api.post<{ customer: any }>("/api/customers", {
        businessId,
        name: customerForm.name,
        phone: customerForm.phone || null,
        email: customerForm.email || null,
        city: customerForm.city || null,
        notes: customerForm.notes || null,
        product: customerForm.product || null,
        productCategory: customerForm.productCategory || null,
        quantity: Number(customerForm.quantity) || 1,
        amount: Number(customerForm.amount) || 0,
        date: customerForm.date || null,
        paymentMethod: customerForm.paymentMethod || null,
      });

      setUploadStatus(null);
      onSuccess("Customer added successfully.");
      onStartAnalysis();
      onClose();
    } catch (err) {
      setUploadStatus(err instanceof ApiError ? err.message : "Failed to save customer");
    }
  }

  // Handle manual statistics summaries
  async function handleManualStatsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;

    setUploadStatus("Generating AI Report...");

    const formattedData = {
      totalCustomers: Number(manualStatsForm.totalCustomers),
      newCustomers: Number(manualStatsForm.newCustomers),
      repeatCustomers: Number(manualStatsForm.repeatCustomers),
      customerGrowthPct: Number(manualStatsForm.customerGrowthPct),
      monthlySales: Number(manualStatsForm.monthlySales),
      revenueTrendPct: Number(manualStatsForm.revenueTrendPct),
      averageOrderValue: Number(manualStatsForm.averageOrderValue),
      customerLifetimeValue: Number(manualStatsForm.customerLifetimeValue),
      topProducts: [
        { product: manualStatsForm.topProduct1, revenue: Number(manualStatsForm.topProduct1Revenue) },
        { product: manualStatsForm.topProduct2, revenue: Number(manualStatsForm.topProduct2Revenue) },
        { product: manualStatsForm.topProduct3, revenue: Number(manualStatsForm.topProduct3Revenue) },
      ],
      segments: [
        {
          name: "VIP",
          count: Number(manualStatsForm.vipCount),
          revenue: Number(manualStatsForm.vipRevenue),
          percentage: Math.round((Number(manualStatsForm.vipCount) / Number(manualStatsForm.totalCustomers)) * 100),
          description: "VIP Spenders",
        },
        {
          name: "Loyal Customers",
          count: Number(manualStatsForm.loyalCount),
          revenue: Number(manualStatsForm.loyalRevenue),
          percentage: Math.round((Number(manualStatsForm.loyalCount) / Number(manualStatsForm.totalCustomers)) * 100),
          description: "Repeat buyers",
        },
        {
          name: "New Active",
          count: Number(manualStatsForm.newCount),
          revenue: Number(manualStatsForm.newRevenue),
          percentage: Math.round((Number(manualStatsForm.newCount) / Number(manualStatsForm.totalCustomers)) * 100),
          description: "Single-order active",
        },
        {
          name: "At Risk / Churned",
          count: Number(manualStatsForm.lostCount),
          revenue: Number(manualStatsForm.lostRevenue),
          percentage: Math.round((Number(manualStatsForm.lostCount) / Number(manualStatsForm.totalCustomers)) * 100),
          description: "Inactive segment",
        },
      ],
      churnRisk: {
        lowRiskCount: Number(manualStatsForm.lowRiskCount),
        mediumRiskCount: Number(manualStatsForm.mediumRiskCount),
        highRiskCount: Number(manualStatsForm.highRiskCount),
      },
    };

    try {
      await api.post<{ success: boolean; report: any }>(
        `/api/customers/manual/${businessId}`,
        formattedData
      );
      setUploadStatus(null);
      onSuccess("Customer insights generated successfully.");
      onClose();
    } catch (err) {
      setUploadStatus(err instanceof ApiError ? err.message : "Failed to generate report");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
          onClick={onClose}
          title="Close Dialog"
        >
          <X size={18} />
        </button>

        {/* Modal Tabs */}
        <div className="flex gap-4 mb-6 border-b border-zinc-150 dark:border-zinc-850 pb-3 text-xs font-semibold">
          <button
            className={`pb-1.5 border-b-2 transition-all ${
              activeModalTab === "upload" ? "border-accent text-accent" : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            }`}
            onClick={() => {
              setActiveModalTab("upload");
              setUploadStatus(null);
            }}
          >
            Upload File (CSV/Excel)
          </button>
          <button
            className={`pb-1.5 border-b-2 transition-all ${
              activeModalTab === "manual" ? "border-accent text-accent" : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            }`}
            onClick={() => {
              setActiveModalTab("manual");
              setUploadStatus(null);
            }}
          >
            Manual Customer Entry
          </button>
          <button
            className={`pb-1.5 border-b-2 transition-all ${
              activeModalTab === "statistics" ? "border-accent text-accent" : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            }`}
            onClick={() => {
              setActiveModalTab("statistics");
              setUploadStatus(null);
            }}
          >
            Manual Dashboard Stats
          </button>
        </div>

        {/* Tab Content 1: File Upload */}
        {activeModalTab === "upload" && (
          <div>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-5">
              Select whether you are importing your Customers List or Sales History, and choose your CSV or Excel file.
            </p>

            <div className="flex gap-4 mb-6 border-b border-zinc-150 dark:border-zinc-850 pb-2 text-[11px] font-semibold">
              <button
                className={`pb-1 border-b-2 ${uploadType === "customer" ? "border-accent text-accent" : "border-transparent text-zinc-400"}`}
                onClick={() => setUploadType("customer")}
              >
                Customers Contact List
              </button>
              <button
                className={`pb-1 border-b-2 ${uploadType === "sales" ? "border-accent text-accent" : "border-transparent text-zinc-400"}`}
                onClick={() => setUploadType("sales")}
              >
                Sales / Invoice History
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-accent/40 rounded-lg p-8 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-900/10">
                <label className="cursor-pointer block">
                  <span className="text-2xl block mb-2">📁</span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 block">Click to select CSV or Excel file</span>
                  <span className="text-xs text-zinc-400 mt-1 block">Supported extensions: .csv, .xlsx, .xls</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                  />
                </label>
                {fileToUpload && (
                  <p className="text-accent text-xs font-semibold mt-4">
                    Selected: {fileToUpload.name} ({(fileToUpload.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {uploadStatus && (
                <p className="text-xs text-emerald-600 bg-emerald-50/20 border border-emerald-500/20 p-3 rounded-md">
                  {uploadStatus}
                </p>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!fileToUpload || !!uploadStatus?.includes("Processing")}>
                  {uploadStatus?.includes("Processing") ? "Processing..." : "Import File"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab Content 2: Manual Customer Entry Form */}
        {activeModalTab === "manual" && (
          <form onSubmit={handleManualCustomerSubmit} className="grid grid-cols-2 gap-4 text-left">
            <div className="col-span-2">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-3">
                Manually add a customer transaction. If the customer exists (phone/email match), this sale will be appended to their timeline.
              </p>
            </div>

            <div className="col-span-2 border-b border-zinc-150 dark:border-zinc-850 pb-1 mt-1">
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider">Customer Details</p>
            </div>

            <div className="col-span-2">
              <Label>Customer Name *</Label>
              <Input
                type="text"
                required
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                placeholder="e.g. Anjali Menon"
              />
            </div>

            <div>
              <Label>Phone Number</Label>
              <Input
                type="text"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                placeholder="e.g. anjali@example.com"
              />
            </div>

            <div className="col-span-2">
              <Label>City</Label>
              <Input
                type="text"
                value={customerForm.city}
                onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                placeholder="e.g. Kochi"
              />
            </div>

            <div className="col-span-2">
              <Label>Notes / Preferences</Label>
              <Textarea
                value={customerForm.notes}
                onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                placeholder="e.g. Prefers light roast, pays with UPI..."
                className="min-h-[60px]"
              />
            </div>

            <div className="col-span-2 border-b border-zinc-150 dark:border-zinc-850 pb-1 mt-3">
              <p className="text-[10px] font-bold text-accent2 uppercase tracking-wider">Purchase Transaction</p>
            </div>

            <div>
              <Label>Product Purchased</Label>
              <Input
                type="text"
                value={customerForm.product}
                onChange={(e) => setCustomerForm({ ...customerForm, product: e.target.value })}
                placeholder="e.g. Filter Coffee pack"
              />
            </div>

            <div>
              <Label>Product Category</Label>
              <Input
                type="text"
                value={customerForm.productCategory}
                onChange={(e) => setCustomerForm({ ...customerForm, productCategory: e.target.value })}
                placeholder="e.g. Coffee retail"
              />
            </div>

            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={customerForm.quantity}
                onChange={(e) => setCustomerForm({ ...customerForm, quantity: Number(e.target.value) || 1 })}
              />
            </div>

            <div>
              <Label>Purchase Amount (₹)</Label>
              <Input
                type="number"
                min={0}
                value={customerForm.amount}
                onChange={(e) => setCustomerForm({ ...customerForm, amount: Number(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={customerForm.date}
                onChange={(e) => setCustomerForm({ ...customerForm, date: e.target.value })}
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select
                value={customerForm.paymentMethod}
                onChange={(e) => setCustomerForm({ ...customerForm, paymentMethod: e.target.value })}
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="NetBanking">Net Banking</option>
              </Select>
            </div>

            {uploadStatus && (
              <div className="col-span-2 text-xs text-zinc-850 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-md mt-2">
                {uploadStatus}
              </div>
            )}

            <div className="col-span-2 flex justify-end gap-2 mt-4 border-t border-zinc-150 dark:border-zinc-850 pt-4">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={!!uploadStatus?.includes("Saving")}>
                Save Customer
              </Button>
            </div>
          </form>
        )}

        {/* Tab Content 3: Manual Stats Summary Entry */}
        {activeModalTab === "statistics" && (
          <form onSubmit={handleManualStatsSubmit} className="grid grid-cols-2 gap-4 text-left">
            <div className="col-span-2">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-3">
                Manually override cached dashboard statistics and generate a custom AI Customer Intelligence report without uploading files.
              </p>
            </div>

            <div className="col-span-2 border-b border-zinc-150 dark:border-zinc-850 pb-1">
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider">General Cohorts</p>
            </div>
            <div>
              <Label>Total Customers</Label>
              <Input
                type="number"
                value={manualStatsForm.totalCustomers}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, totalCustomers: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>New Customers (30d)</Label>
              <Input
                type="number"
                value={manualStatsForm.newCustomers}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, newCustomers: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Repeat Customers</Label>
              <Input
                type="number"
                value={manualStatsForm.repeatCustomers}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, repeatCustomers: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Customer Growth (%)</Label>
              <Input
                type="number"
                value={manualStatsForm.customerGrowthPct}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, customerGrowthPct: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Monthly Revenue (₹)</Label>
              <Input
                type="number"
                value={manualStatsForm.monthlySales}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, monthlySales: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Revenue Trend (%)</Label>
              <Input
                type="number"
                value={manualStatsForm.revenueTrendPct}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, revenueTrendPct: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Average Order Value (₹)</Label>
              <Input
                type="number"
                value={manualStatsForm.averageOrderValue}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, averageOrderValue: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Customer Lifetime Value (₹)</Label>
              <Input
                type="number"
                value={manualStatsForm.customerLifetimeValue}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, customerLifetimeValue: Number(e.target.value) })}
              />
            </div>

            {/* Churn Risk */}
            <div className="col-span-2 border-b border-zinc-150 dark:border-zinc-850 pb-1 mt-2">
              <p className="text-[10px] font-bold text-warn uppercase tracking-wider">Churn Risk Distribution</p>
            </div>
            <div>
              <Label>Active (Low Risk)</Label>
              <Input
                type="number"
                value={manualStatsForm.lowRiskCount}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, lowRiskCount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Quiet 30-60d (Medium Risk)</Label>
              <Input
                type="number"
                value={manualStatsForm.mediumRiskCount}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, mediumRiskCount: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <Label>Quiet 60d+ (High Risk / Churned)</Label>
              <Input
                type="number"
                value={manualStatsForm.highRiskCount}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, highRiskCount: Number(e.target.value) })}
              />
            </div>

            {/* Segments */}
            <div className="col-span-2 border-b border-zinc-150 dark:border-zinc-850 pb-1 mt-2">
              <p className="text-[10px] font-bold text-accent2 uppercase tracking-wider">Segments Counts</p>
            </div>
            <div>
              <Label>VIP Count</Label>
              <Input
                type="number"
                value={manualStatsForm.vipCount}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, vipCount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>VIP Revenue (₹)</Label>
              <Input
                type="number"
                value={manualStatsForm.vipRevenue}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, vipRevenue: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Loyal Count</Label>
              <Input
                type="number"
                value={manualStatsForm.loyalCount}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, loyalCount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Loyal Revenue (₹)</Label>
              <Input
                type="number"
                value={manualStatsForm.loyalRevenue}
                onChange={(e) => setManualStatsForm({ ...manualStatsForm, loyalRevenue: Number(e.target.value) })}
              />
            </div>

            {uploadStatus && (
              <div className="col-span-2 text-xs text-zinc-850 dark:text-zinc-200 bg-zinc-55/20 border border-zinc-200 dark:border-zinc-800 p-3 rounded-md mt-2">
                {uploadStatus}
              </div>
            )}

            <div className="col-span-2 flex justify-end gap-2 mt-4 border-t border-zinc-150 dark:border-zinc-850 pt-4">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={!!uploadStatus?.includes("Generating")}>
                Generate Report
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
