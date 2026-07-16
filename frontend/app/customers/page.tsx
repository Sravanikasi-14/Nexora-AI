"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api, ApiError } from "@/lib/api";
import { Customer } from "@/lib/types";

// Types for Customer Analytics Report
interface MarketingCampaign {
  name: string;
  target: string;
  channel: string;
  message: string;
}

interface SuggestedAutomation {
  type: string;
  trigger: string;
  template: string;
}

interface CustomerReport {
  executiveSummary: string;
  customerHealthScore: number;
  revenueAnalysis: string;
  salesTrends: string;
  customerSegmentsInfo: string;
  productPerformanceInfo: string;
  highValueCustomers: { name: string; email: string | null; phone: string | null; ltv: number }[];
  churnRiskInfo: string;
  growthOpportunities: string;
  recommendedMarketingCampaigns: MarketingCampaign[];
  aiRecommendations: string[];
  suggestedAutomations: SuggestedAutomation[];
}

export default function CustomerAnalysticsPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Panels State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Modal Tab State: "upload" | "manual" | "statistics"
  const [activeModalTab, setActiveModalTab] = useState<"upload" | "manual" | "statistics">("upload");
  
  // File Upload State
  const [uploadType, setUploadType] = useState<"customer" | "sales">("customer");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  // Latest Report State
  const [latestReport, setLatestReport] = useState<CustomerReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Search & Filtering State
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortField, setSortField] = useState<"name" | "ltv" | "orders" | "lastPurchase">("ltv");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // AI background analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reusable Manual Customer Entry form state
  const [customerForm, setCustomerForm] = useState({
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

  // Manual dashboard stats entry state
  const [manualStatsForm, setManualStatsForm] = useState({
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
    vipCount: 22,
    vipRevenue: 150000,
    loyalCount: 50,
    loyalRevenue: 180000,
    newCount: 40,
    newRevenue: 80000,
    lostCount: 38,
    lostRevenue: 40000,
  });

  useEffect(() => {
    if (!businessId) return;
    fetchCustomers();
    fetchLatestReport();
    checkInitialAnalysisStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function fetchCustomers() {
    setLoading(true);
    api
      .get<{ customers: Customer[] }>(`/api/customers/business/${businessId}`)
      .then((res) => setCustomers(res.customers))
      .finally(() => setLoading(false));
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  }

  function fetchLatestReport() {
    if (!businessId) return;
    setReportLoading(true);
    api
      .get<{ report: any }>(`/api/customers/reports/${businessId}/latest`)
      .then((res) => {
        if (res.report) {
          setLatestReport(res.report.content);
        }
      })
      .catch(() => setLatestReport(null))
      .finally(() => setReportLoading(false));
  }

  async function checkInitialAnalysisStatus() {
    try {
      const res = await api.get<{ running: boolean }>(`/api/customers/analysis-status/${businessId}`);
      if (res.running) {
        startPolling();
      }
    } catch (e) {}
  }

  // Polls analysis status in the background
  function startPolling() {
    setIsAnalyzing(true);
    let attempts = 0;
    const pollId = setInterval(async () => {
      attempts++;
      try {
        const res = await api.get<{ running: boolean }>(`/api/customers/analysis-status/${businessId}`);
        if (!res.running || attempts > 15) {
          clearInterval(pollId);
          setIsAnalyzing(false);
          fetchCustomers();
          fetchLatestReport();
          showToast("Customer insights generated successfully.");
        }
      } catch (err) {
        clearInterval(pollId);
        setIsAnalyzing(false);
      }
    }, 2000);
  }

  // Handle uploading CSV/Excel
  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileToUpload || !businessId) return;

    const fd = new FormData();
    fd.append("file", fileToUpload);
    setUploadStatus("Processing file upload...");

    try {
      const res = await api.postForm<{ recordsProcessed: number }>(
        `/api/customers/upload/${businessId}/${uploadType}`,
        fd
      );
      setFileToUpload(null);
      setUploadStatus(null);
      setShowUploadModal(false);
      
      showToast(`Customer added successfully.`);
      startPolling();
    } catch (err) {
      setUploadStatus(err instanceof ApiError ? err.message : "Upload failed");
    }
  }

  // Handle saving customer manually (smooth daily checkout flow)
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

      // Clear form
      setCustomerForm({
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

      setUploadStatus(null);
      setShowUploadModal(false);
      
      showToast("Customer added successfully.");
      startPolling();
    } catch (err) {
      setUploadStatus(err instanceof ApiError ? err.message : "Failed to save customer");
    }
  }

  // Handle manual dashboard statistics submission
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
        { name: "VIP", count: Number(manualStatsForm.vipCount), revenue: Number(manualStatsForm.vipRevenue), percentage: Math.round((Number(manualStatsForm.vipCount) / Number(manualStatsForm.totalCustomers)) * 100), description: "VIP Spenders" },
        { name: "Loyal Customers", count: Number(manualStatsForm.loyalCount), revenue: Number(manualStatsForm.loyalRevenue), percentage: Math.round((Number(manualStatsForm.loyalCount) / Number(manualStatsForm.totalCustomers)) * 100), description: "Repeat buyers" },
        { name: "New Active", count: Number(manualStatsForm.newCount), revenue: Number(manualStatsForm.newRevenue), percentage: Math.round((Number(manualStatsForm.newCount) / Number(manualStatsForm.totalCustomers)) * 100), description: "Single-order active" },
        { name: "At Risk / Churned", count: Number(manualStatsForm.lostCount), revenue: Number(manualStatsForm.lostRevenue), percentage: Math.round((Number(manualStatsForm.lostCount) / Number(manualStatsForm.totalCustomers)) * 100), description: "Inactive segment" },
      ],
      churnRisk: {
        lowRiskCount: Number(manualStatsForm.lowRiskCount),
        mediumRiskCount: Number(manualStatsForm.mediumRiskCount),
        highRiskCount: Number(manualStatsForm.highRiskCount),
      }
    };

    try {
      await api.post<{ success: boolean; report: any }>(
        `/api/customers/manual/${businessId}`,
        formattedData
      );
      setUploadStatus(null);
      setShowUploadModal(false);
      
      showToast("Customer insights generated successfully.");
      fetchCustomers();
      fetchLatestReport();
    } catch (err) {
      setUploadStatus(err instanceof ApiError ? err.message : "Manual calculation failed");
    }
  }

  // Built-in CSV templates downloader
  function downloadCsvTemplate(type: string) {
    let headers = "";
    let sampleData = "";
    let filename = "";

    if (type === "customer") {
      headers = "name,phone,email,city,notes";
      sampleData = "Anjali Menon,+91 90000 00001,anjali@example.com,Kochi,Loves filter coffee and retail beans\nRavi Kumar,+91 90000 00002,ravi@example.com,Kochi,Daily breakfast repeat guest\nSneha Pillai,+91 90000 00003,sneha@example.com,Bangalore,High-value catering customer";
      filename = "customer_data_template.csv";
    } else if (type === "sales") {
      headers = "customer_name,amount,product,category,quantity,payment_method,notes,date";
      sampleData = "Anjali Menon,450,Filter Coffee,Beverages,3,UPI,Regular coffee trip,2026-07-05\nRavi Kumar,650,Pastries Pack,Food,1,Cash,,2026-07-04\nSneha Pillai,2400,Catering Kit,Catering,2,Card,Event hosting order,2026-06-25";
      filename = "sales_data_template.csv";
    } else if (type === "orders") {
      headers = "order_id,customer_name,amount,product,date,status";
      sampleData = "ORD-001,Anjali Menon,450,Filter Coffee,2026-07-05,completed\nORD-002,Ravi Kumar,650,Pastries Pack,2026-07-04,completed\nORD-003,Sneha Pillai,2400,Catering,2026-06-25,completed";
      filename = "orders_data_template.csv";
    } else if (type === "inventory") {
      headers = "name,sku,category,price,stock,units_sold";
      sampleData = "Filter Coffee Beans,COF-FIL-01,Coffee,450,150,380\nCold Brew Pitcher,COF-COL-02,Coffee,1200,30,85\nCinnamon Pastry,COF-PAS-03,Food,180,40,640";
      filename = "inventory_data_template.csv";
    }

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + "\n" + sampleData);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Derive client-side stats
  const totalRevenue = customers.reduce((acc, c) => acc + c.lifetimeValue, 0);
  const activeCount = customers.filter((c) => !c.inactive).length;
  const repeatCount = customers.filter((c) => (c.sales?.length ?? 0) > 1).length;
  const avgOrderValue = customers.length > 0 ? Math.round(totalRevenue / (customers.reduce((acc, c) => acc + (c.sales?.length ?? 0), 0) || 1)) : 0;
  
  // Segments derivation
  const derivedVipCount = customers.filter((c) => c.lifetimeValue >= 2000).length;
  const derivedLoyalCount = customers.filter((c) => (c.sales?.length ?? 0) >= 2 && c.lifetimeValue < 2000).length;
  const derivedNewCount = customers.filter((c) => (c.sales?.length ?? 0) === 1 && !c.inactive).length;
  const derivedChurnedCount = customers.filter((c) => c.inactive).length;

  // Sorting and filtering customers list
  const filteredCustomers = customers
    .filter((c) => {
      const matchQuery =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
        (c.phone && c.phone.includes(search)) ||
        (c.city && c.city.toLowerCase().includes(search.toLowerCase()));
      
      // Derive segment
      let segment = "lost";
      if (c.lifetimeValue >= 2000) segment = "vip";
      else if ((c.sales?.length ?? 0) >= 2) segment = "loyal";
      else if ((c.sales?.length ?? 0) === 1 && !c.inactive) segment = "new";

      const matchSegment = segmentFilter === "all" || segment === segmentFilter;
      const matchRisk =
        riskFilter === "all" ||
        (riskFilter === "high" && c.inactive) ||
        (riskFilter === "medium" && !c.inactive && c.lastPurchaseAt && Date.now() - new Date(c.lastPurchaseAt).getTime() > 30 * 86400000) ||
        (riskFilter === "low" && !c.inactive && (!c.lastPurchaseAt || Date.now() - new Date(c.lastPurchaseAt).getTime() <= 30 * 86400000));

      return matchQuery && matchSegment && matchRisk;
    })
    .sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === "orders") {
        valA = a.sales?.length ?? 0;
        valB = b.sales?.length ?? 0;
      } else if (sortField === "lastPurchase") {
        valA = a.lastPurchaseAt ? new Date(a.lastPurchaseAt).getTime() : 0;
        valB = b.lastPurchaseAt ? new Date(b.lastPurchaseAt).getTime() : 0;
      } else if (sortField === "name") {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else {
        valA = a.lifetimeValue;
        valB = b.lifetimeValue;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  function toggleSort(field: "name" | "ltv" | "orders" | "lastPurchase") {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  if (sessionLoading || loading) {
    return <AppShell><div className="text-muted">Loading Customer Analystics panel…</div></AppShell>;
  }

  return (
    <AppShell>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-accent2 text-base text-xs font-semibold px-4 py-3 rounded-xl shadow-lg border border-accent2/30 animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* AI Analyzing banner */}
      {isAnalyzing && (
        <div className="bg-accent2/10 border border-accent2/25 rounded-2xl p-4 mb-6 flex items-center justify-between text-xs text-accent2 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent2 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent2"></span>
            </span>
            <span className="font-medium">AI is generating customer insights in the background. Your charts and recommendation cards will refresh automatically...</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1">Customer Analystics</h1>
          <p className="text-muted text-sm font-medium">Unified CRM, predictive churn models, and marketing campaign recommendations.</p>
        </div>
        <div className="flex gap-2">
          {latestReport && (
            <button className="btn-secondary" onClick={() => setShowReportModal(true)}>
              ★ AI Intelligence Report
            </button>
          )}
          <button className="btn-primary" onClick={() => {
            setActiveModalTab("upload");
            setShowUploadModal(true);
          }}>
            + Add Customer Data
          </button>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="card p-5">
          <p className="text-2xl font-display font-semibold text-accent">{customers.length}</p>
          <p className="text-xs text-muted mt-1">Total Customers</p>
        </div>
        <div className="card p-5">
          <p className="text-2xl font-display font-semibold text-accent2">{activeCount}</p>
          <p className="text-xs text-muted mt-1">Active Buyers</p>
        </div>
        <div className="card p-5">
          <p className="text-2xl font-display font-semibold text-warn">{repeatCount}</p>
          <p className="text-xs text-muted mt-1">Repeat Cohort</p>
        </div>
        <div className="card p-5">
          <p className="text-2xl font-display font-semibold">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">Total Spent</p>
        </div>
        <div className="card p-5">
          <p className="text-2xl font-display font-semibold">₹{avgOrderValue.toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">Average Order Value</p>
        </div>
      </div>

      {/* SVG Analytics Charts */}
      {customers.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* Segments Distribution */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-1">Your Customer Groups</h3>
            <p className="text-[10px] text-muted mb-4 leading-normal">
              <strong>What it means:</strong> Groups your customer base into VIPs, Repeaters, New Active, and Quiet buyers.<br/>
              <strong>Why it matters:</strong> Allows you to target different groups with tailored outreach (e.g. VIP rewards vs re-engagement).<br/>
              <strong>What action to take:</strong> Check your &quot;AI Suggested Messages&quot; page to start re-engaging quiet customers.
            </p>
            <div className="flex flex-col gap-3">
              {[
                { name: "VIP Segment (LTV ≥ ₹2k)", count: derivedVipCount, color: "bg-accent", pct: Math.round((derivedVipCount / (customers.length || 1)) * 100) },
                { name: "Loyal Cohort (2+ Orders)", count: derivedLoyalCount, color: "bg-accent2", pct: Math.round((derivedLoyalCount / (customers.length || 1)) * 100) },
                { name: "New Active (1 Order, Active)", count: derivedNewCount, color: "bg-warn", pct: Math.round((derivedNewCount / (customers.length || 1)) * 100) },
                { name: "At Risk / Churned (Inactive)", count: derivedChurnedCount, color: "bg-danger", pct: Math.round((derivedChurnedCount / (customers.length || 1)) * 100) },
              ].map((seg) => (
                <div key={seg.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">{seg.name}</span>
                    <span className="font-medium">{seg.count} ({seg.pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden">
                    <div className={`h-full ${seg.color}`} style={{ width: `${seg.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Retention Donut */}
          <div className="card p-5 flex flex-col items-center justify-between text-center">
            <div className="text-left w-full">
              <h3 className="text-sm font-semibold mb-1">Cohort Retention</h3>
              <p className="text-[10px] text-muted leading-normal">
                <strong>What it means:</strong> The percentage of your customer base who have purchased more than once.<br/>
                <strong>Why it matters:</strong> Returning customers spend more on average and cost significantly less to market to.<br/>
                <strong>What action to take:</strong> Offer a small discount on their second transaction to build a return habit.
              </p>
            </div>
            <div className="relative w-32 h-32 flex items-center justify-center my-3">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#181f27" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#2fd6a8"
                  strokeWidth="10"
                  strokeDasharray={`${Math.round(2 * Math.PI * 40)}`}
                  strokeDashoffset={`${Math.round(2 * Math.PI * 40 * (1 - (repeatCount / (customers.length || 1))))}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-display font-semibold text-accent2">
                  {Math.round((repeatCount / (customers.length || 1)) * 100)}%
                </span>
                <span className="text-[10px] text-muted">Repeat Rate</span>
              </div>
            </div>
            <p className="text-xs text-muted max-w-[200px] leading-snug">
              {repeatCount} of your buyers have completed multiple purchase transactions.
            </p>
          </div>

          {/* Churn Risk Donut */}
          <div className="card p-5 flex flex-col items-center justify-between text-center">
            <div className="text-left w-full">
              <h3 className="text-sm font-semibold mb-1">Customers You May Lose Soon</h3>
              <p className="text-[10px] text-muted leading-normal">
                <strong>What it means:</strong> Customers who haven&apos;t completed a purchase transaction in 60+ days.<br/>
                <strong>Why it matters:</strong> Quiet customers represent potential loss of business if not re-engaged promptly.<br/>
                <strong>What action to take:</strong> Send a direct WhatsApp reminder or a loyalty coupon to bring them back.
              </p>
            </div>
            <div className="relative w-32 h-32 flex items-center justify-center my-3">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#181f27" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#f0655a"
                  strokeWidth="10"
                  strokeDasharray={`${Math.round(2 * Math.PI * 40)}`}
                  strokeDashoffset={`${Math.round(2 * Math.PI * 40 * (1 - (derivedChurnedCount / (customers.length || 1))))}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-display font-semibold text-danger">
                  {Math.round((derivedChurnedCount / (customers.length || 1)) * 100)}%
                </span>
                <span className="text-[10px] text-muted">High Risk</span>
              </div>
            </div>
            <p className="text-xs text-muted max-w-[200px] leading-snug">
              {derivedChurnedCount} customers are currently inactive (no purchase in 60+ days).
            </p>
          </div>
        </div>
      )}

      {/* Empty State Callout */}
      {customers.length === 0 && (
        <div className="card p-8 text-center max-w-2xl mx-auto mb-6">
          <p className="text-ink font-semibold mb-2">No Customer Datasets Uploaded</p>
          <p className="text-muted text-sm mb-6 leading-relaxed">
            Format your customer lists or sales spreadsheets using the downloadable templates below, or click to add customer purchase events manually.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            <button className="btn-secondary text-xs" onClick={() => downloadCsvTemplate("customer")}>
              ↓ Customer CSV
            </button>
            <button className="btn-secondary text-xs" onClick={() => downloadCsvTemplate("sales")}>
              ↓ Sales CSV
            </button>
            <button className="btn-secondary text-xs" onClick={() => downloadCsvTemplate("orders")}>
              ↓ Orders CSV
            </button>
            <button className="btn-secondary text-xs" onClick={() => downloadCsvTemplate("inventory")}>
              ↓ Inventory CSV
            </button>
          </div>

          <div className="flex gap-2 justify-center">
            <button className="btn-primary" onClick={() => {
              setActiveModalTab("upload");
              setShowUploadModal(true);
            }}>
              Upload CSV/Excel
            </button>
            <button className="btn-secondary" onClick={() => {
              setActiveModalTab("manual");
              setShowUploadModal(true);
            }}>
              Add Customer Manually
            </button>
          </div>
        </div>
      )}

      {/* Main Customers List */}
      {customers.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface p-4 border border-border rounded-2xl shadow-card">
            <div className="flex-1">
              <input
                className="input text-sm py-2"
                placeholder="Search by name, email, phone or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <select
                className="input py-2 px-3 text-xs w-auto"
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
              >
                <option value="all">All Customer Groups</option>
                <option value="vip">VIP Segment</option>
                <option value="loyal">Loyal Cohort</option>
                <option value="new">New Active</option>
                <option value="lost">Churned/At Risk</option>
              </select>

              <select
                className="input py-2 px-3 text-xs w-auto"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
              >
                <option value="all">All Churn Risk</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-muted border-b border-border bg-surface2/30 text-xs">
                    <th className="px-5 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort("name")}>
                      Name {sortField === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="px-5 py-3 font-medium">Contact Details</th>
                    <th className="px-5 py-3 font-medium">City</th>
                    <th className="px-5 py-3 font-medium cursor-pointer select-none text-center" onClick={() => toggleSort("orders")}>
                      Orders {sortField === "orders" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="px-5 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort("ltv")}>
                      Total Spend {sortField === "ltv" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="px-5 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort("lastPurchase")}>
                      Last Purchase {sortField === "lastPurchase" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="px-5 py-3 font-medium">Segment</th>
                    <th className="px-5 py-3 font-medium">CLV & Risk</th>
                    <th className="px-5 py-3 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => {
                      // Segment calculation
                      let segment = { name: "Churned", color: "bg-danger/15 text-danger" };
                      if (c.lifetimeValue >= 2000) {
                        segment = { name: "VIP", color: "bg-accent/15 text-accent" };
                      } else if ((c.sales?.length ?? 0) >= 2) {
                        segment = { name: "Loyal", color: "bg-accent2/15 text-accent2" };
                      } else if ((c.sales?.length ?? 0) === 1 && !c.inactive) {
                        segment = { name: "New", color: "bg-warn/15 text-warn" };
                      }

                      // Churn risk derivation
                      const riskScore = c.inactive ? 85 : c.lastPurchaseAt && Date.now() - new Date(c.lastPurchaseAt).getTime() > 30 * 86400000 ? 45 : 15;
                      const riskLabel = riskScore >= 70 ? "High" : riskScore >= 40 ? "Medium" : "Low";
                      const riskColor = riskScore >= 70 ? "text-danger" : riskScore >= 40 ? "text-warn" : "text-accent2";

                      return (
                        <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface2/30">
                          <td className="px-5 py-4 font-medium">{c.name}</td>
                          <td className="px-5 py-4 text-xs text-muted">
                            <p>{c.email || "—"}</p>
                            <p>{c.phone || "—"}</p>
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-ink">{c.city || "—"}</td>
                          <td className="px-5 py-4 text-center">{c.sales?.length ?? 0}</td>
                          <td className="px-5 py-4 font-semibold">₹{c.lifetimeValue.toLocaleString()}</td>
                          <td className="px-5 py-4 text-xs text-muted">
                            {c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`pill ${segment.color} text-[10px]`}>{segment.name}</span>
                          </td>
                          <td className="px-5 py-4 text-xs">
                            <p className="font-medium">CLV: ₹{Math.round(c.lifetimeValue / ((c.sales?.length ?? 0) || 1)).toLocaleString()}</p>
                            <p className="mt-0.5">Risk: <span className={`font-semibold ${riskColor}`}>{riskLabel} ({riskScore})</span></p>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link href={`/customers/${c.id}`} className="text-accent text-xs font-semibold hover:underline">
                              Profile →
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-muted">
                        No customer profiles match the current filter search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CSV/Excel Template Downloads inside main page footer when data exists */}
      {customers.length > 0 && (
        <div className="card p-5 mt-6 border-dashed">
          <p className="font-semibold text-sm mb-3">CSV / Excel Templates Generator</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => downloadCsvTemplate("customer")}>
              ↓ Customer List Template
            </button>
            <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => downloadCsvTemplate("sales")}>
              ↓ Sales History Template
            </button>
            <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => downloadCsvTemplate("orders")}>
              ↓ Orders Template
            </button>
            <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => downloadCsvTemplate("inventory")}>
              ↓ Inventory Template
            </button>
          </div>
        </div>
      )}

      {/* 1. UPLOAD & DATA ENTRY MODAL (TABS FOR FILE UPLOAD OR MANUAL ENTRY) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-muted hover:text-ink text-lg"
              onClick={() => {
                setShowUploadModal(false);
                setUploadStatus(null);
              }}
            >
              ✕
            </button>

            {/* Modal Tabs */}
            <div className="flex gap-4 mb-6 border-b border-border pb-3 text-sm">
              <button
                className={`font-semibold pb-1.5 border-b-2 transition ${activeModalTab === "upload" ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"}`}
                onClick={() => {
                  setActiveModalTab("upload");
                  setUploadStatus(null);
                }}
              >
                Upload File (CSV/Excel)
              </button>
              <button
                className={`font-semibold pb-1.5 border-b-2 transition ${activeModalTab === "manual" ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"}`}
                onClick={() => {
                  setActiveModalTab("manual");
                  setUploadStatus(null);
                }}
              >
                Manual Customer Entry
              </button>
              <button
                className={`font-semibold pb-1.5 border-b-2 transition ${activeModalTab === "statistics" ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"}`}
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
                <p className="text-muted text-sm mb-5">
                  Select whether you are importing your Customers List or Sales History, and choose your CSV or Excel file.
                </p>

                <div className="flex gap-4 mb-6 border-b border-border pb-3 text-xs">
                  <button
                    className={`font-semibold pb-1 border-b-2 ${uploadType === "customer" ? "border-accent text-accent" : "border-transparent text-muted"}`}
                    onClick={() => setUploadType("customer")}
                  >
                    Customers Contact List
                  </button>
                  <button
                    className={`font-semibold pb-1 border-b-2 ${uploadType === "sales" ? "border-accent text-accent" : "border-transparent text-muted"}`}
                    onClick={() => setUploadType("sales")}
                  >
                    Sales / Invoice History
                  </button>
                </div>

                <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
                  <div className="border-2 border-dashed border-border hover:border-accent/40 rounded-xl p-8 text-center cursor-pointer transition">
                    <label className="cursor-pointer block">
                      <span className="text-2xl block mb-2">📁</span>
                      <span className="text-sm font-medium text-ink block">Click to select CSV or Excel file</span>
                      <span className="text-xs text-muted mt-1 block">Supported extensions: .csv, .xlsx, .xls</span>
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
                    <p className="text-xs text-accent2 bg-accent2/10 p-3 rounded-xl border border-accent2/25">{uploadStatus}</p>
                  )}

                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={() => {
                        setShowUploadModal(false);
                        setFileToUpload(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary text-sm" disabled={!fileToUpload || uploadStatus?.includes("Processing")}>
                      {uploadStatus?.includes("Processing") ? "Processing..." : "Import File"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab Content 2: Manual Customer Entry Form (CRM checkout style) */}
            {activeModalTab === "manual" && (
              <form onSubmit={handleManualCustomerSubmit} className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-muted text-xs mb-3">
                    Manually add a customer transaction. If the customer exists (phone/email match), this sale will be appended to their timeline.
                  </p>
                </div>
                
                {/* Contact Fields */}
                <div className="col-span-2 border-b border-border pb-1">
                  <p className="text-xs font-semibold text-accent uppercase tracking-wider">Customer Details</p>
                </div>
                
                <div className="col-span-2">
                  <label className="label">Customer Name *</label>
                  <input
                    type="text"
                    required
                    className="input py-2 text-sm"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    placeholder="e.g. Anjali Menon"
                  />
                </div>
                
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="text"
                    className="input py-2 text-sm"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
                
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    className="input py-2 text-sm"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    placeholder="e.g. anjali@example.com"
                  />
                </div>

                <div>
                  <label className="label">City</label>
                  <input
                    type="text"
                    className="input py-2 text-sm"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                    placeholder="e.g. Kochi"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="label">Notes / Preferences</label>
                  <textarea
                    className="input py-2 text-sm min-h-[50px]"
                    value={customerForm.notes}
                    onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                    placeholder="e.g. Prefers light roast, pays with UPI..."
                  />
                </div>

                {/* Purchase Fields */}
                <div className="col-span-2 border-b border-border pb-1 mt-2">
                  <p className="text-xs font-semibold text-accent2 uppercase tracking-wider">Purchase Transaction</p>
                </div>

                <div>
                  <label className="label">Product Purchased</label>
                  <input
                    type="text"
                    className="input py-2 text-sm"
                    value={customerForm.product}
                    onChange={(e) => setCustomerForm({ ...customerForm, product: e.target.value })}
                    placeholder="e.g. Filter Coffee pack"
                  />
                </div>

                <div>
                  <label className="label">Product Category</label>
                  <input
                    type="text"
                    className="input py-2 text-sm"
                    value={customerForm.productCategory}
                    onChange={(e) => setCustomerForm({ ...customerForm, productCategory: e.target.value })}
                    placeholder="e.g. Coffee retail"
                  />
                </div>

                <div>
                  <label className="label">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    className="input py-2 text-sm"
                    value={customerForm.quantity}
                    onChange={(e) => setCustomerForm({ ...customerForm, quantity: Number(e.target.value) || 1 })}
                  />
                </div>

                <div>
                  <label className="label">Purchase Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    className="input py-2 text-sm"
                    value={customerForm.amount}
                    onChange={(e) => setCustomerForm({ ...customerForm, amount: Number(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="label">Purchase Date</label>
                  <input
                    type="date"
                    className="input py-2 text-sm"
                    value={customerForm.date}
                    onChange={(e) => setCustomerForm({ ...customerForm, date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Payment Method</label>
                  <select
                    className="input py-2 text-sm"
                    value={customerForm.paymentMethod}
                    onChange={(e) => setCustomerForm({ ...customerForm, paymentMethod: e.target.value })}
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="NetBanking">Net Banking</option>
                  </select>
                </div>

                {uploadStatus && (
                  <div className="col-span-2 text-xs text-accent2 bg-accent2/10 p-3 rounded-xl border border-accent2/25 mt-2">
                    {uploadStatus}
                  </div>
                )}

                <div className="col-span-2 flex justify-end gap-2 mt-4 border-t border-border pt-4">
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => setShowUploadModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-sm" disabled={uploadStatus?.includes("Saving")}>
                    {uploadStatus?.includes("Saving") ? "Saving..." : "Save Customer"}
                  </button>
                </div>
              </form>
            )}

            {/* Tab Content 3: Manual Stats Summary Entry */}
            {activeModalTab === "statistics" && (
              <form onSubmit={handleManualStatsSubmit} className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-muted text-xs mb-3">
                    Manually override cached dashboard statistics and generate a custom AI Customer Intelligence report without uploading files.
                  </p>
                </div>

                <div className="col-span-2 border-b border-border pb-1">
                  <p className="text-xs font-semibold text-accent uppercase tracking-wider">General Cohorts</p>
                </div>
                <div>
                  <label className="label">Total Customers</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.totalCustomers}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, totalCustomers: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">New Customers (30d)</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.newCustomers}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, newCustomers: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Repeat Customers</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.repeatCustomers}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, repeatCustomers: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Customer Growth (%)</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.customerGrowthPct}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, customerGrowthPct: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Monthly Revenue (₹)</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.monthlySales}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, monthlySales: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Revenue Trend (%)</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.revenueTrendPct}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, revenueTrendPct: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Average Order Value (₹)</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.averageOrderValue}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, averageOrderValue: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Customer Lifetime Value (₹)</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.customerLifetimeValue}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, customerLifetimeValue: Number(e.target.value) })}
                  />
                </div>

                {/* Churn Risk */}
                <div className="col-span-2 border-b border-border pb-1 mt-2">
                  <p className="text-xs font-semibold text-warn uppercase tracking-wider">Churn Risk Distribution</p>
                </div>
                <div>
                  <label className="label">Active (Low Risk)</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.lowRiskCount}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, lowRiskCount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Quiet 30-60d (Medium Risk)</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.mediumRiskCount}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, mediumRiskCount: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Quiet 60d+ (High Risk / Churned)</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.highRiskCount}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, highRiskCount: Number(e.target.value) })}
                  />
                </div>

                {/* Segments */}
                <div className="col-span-2 border-b border-border pb-1 mt-2">
                  <p className="text-xs font-semibold text-accent2 uppercase tracking-wider">Segments Counts</p>
                </div>
                <div>
                  <label className="label">VIP Count</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.vipCount}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, vipCount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">VIP Revenue (₹)</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.vipRevenue}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, vipRevenue: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Loyal Count</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.loyalCount}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, loyalCount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Loyal Revenue (₹)</label>
                  <input
                    type="number"
                    className="input py-2 text-sm"
                    value={manualStatsForm.loyalRevenue}
                    onChange={(e) => setManualStatsForm({ ...manualStatsForm, loyalRevenue: Number(e.target.value) })}
                  />
                </div>

                {uploadStatus && (
                  <div className="col-span-2 text-xs text-accent2 bg-accent2/10 p-3 rounded-xl border border-accent2/25 mt-2">
                    {uploadStatus}
                  </div>
                )}

                <div className="col-span-2 flex justify-end gap-2 mt-4 border-t border-border pt-4">
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => setShowUploadModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-sm" disabled={uploadStatus?.includes("Generating")}>
                    {uploadStatus?.includes("Generating") ? "Generating..." : "Generate AI Report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 2. CUSTOMER INTELLIGENCE AI REPORT MODAL */}
      {showReportModal && latestReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-2xl h-screen rounded-none border-l border-border p-6 overflow-y-auto flex flex-col justify-between relative shadow-2xl bg-base animate-slide-in">
            {/* Close */}
            <button
              className="absolute top-6 right-6 text-muted hover:text-ink text-lg"
              onClick={() => setShowReportModal(false)}
            >
              ✕
            </button>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="pill bg-accent/15 text-accent text-[10px]">AI Report</span>
                <span className="text-xs text-muted">Customer Intelligence</span>
              </div>
              <h2 className="font-display text-2xl font-semibold mb-6">Customer Intelligence Report</h2>

              {/* Health Summary */}
              <div className="mb-6 p-4 rounded-xl bg-surface border border-border">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-semibold text-accent uppercase tracking-wider">Executive Summary</h4>
                  <div className="flex items-center gap-1.5 text-xs text-accent2">
                    <span className="w-2 h-2 rounded-full bg-accent2" />
                    <span>Health Score: {latestReport.customerHealthScore}/100</span>
                  </div>
                </div>
                <p className="text-sm text-ink leading-relaxed">{latestReport.executiveSummary}</p>
                <div className="mt-2 text-xs text-muted italic">
                  Explanation: Your business customer health score reflects your retention rates, active database sizes, and VIP cohorts stability.
                </div>
              </div>

              {/* Narratives */}
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Revenue & Cohort Analysis</h4>
                  <p className="text-sm text-muted leading-relaxed">{latestReport.revenueAnalysis}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Segmentation Profile</h4>
                  <p className="text-sm text-muted leading-relaxed">{latestReport.customerSegmentsInfo}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Product & Demand Performance</h4>
                  <p className="text-sm text-muted leading-relaxed">{latestReport.productPerformanceInfo}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Churn Risks Analysis</h4>
                  <p className="text-sm text-muted leading-relaxed">{latestReport.churnRiskInfo}</p>
                </div>
              </div>

              {/* VIP cohort */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-accent2 uppercase tracking-wider mb-2">Top Value Customer Cohort</h4>
                <div className="border border-border rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface2/40 border-b border-border text-muted">
                        <th className="px-4 py-2">Customer</th>
                        <th className="px-4 py-2">Contact Details</th>
                        <th className="px-4 py-2">LTV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestReport.highValueCustomers?.map((cust, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 font-medium">{cust.name}</td>
                          <td className="px-4 py-2 text-muted">{cust.email || cust.phone || "—"}</td>
                          <td className="px-4 py-2 font-semibold">₹{cust.ltv.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Marketing Recommendations */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-warn uppercase tracking-wider mb-2">Recommended Marketing Campaigns</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {latestReport.recommendedMarketingCampaigns?.map((camp, i) => (
                    <div key={i} className="border border-border rounded-xl p-3 bg-surface text-xs flex flex-col gap-1">
                      <p className="font-semibold text-ink">{camp.name}</p>
                      <p className="text-muted"><span className="font-medium text-accent">Target:</span> {camp.target} | <span className="font-medium text-accent2">Channel:</span> {camp.channel}</p>
                      <p className="text-[11px] text-muted italic mt-1 bg-surface2/30 p-2 rounded-lg border border-border">
                        &quot;{camp.message}&quot;
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Strategic Recommendations</h4>
                <ul className="flex flex-col gap-2 text-xs">
                  {latestReport.aiRecommendations?.map((rec, i) => (
                    <li key={i} className="flex gap-2 text-muted">
                      <span className="text-accent">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggested Automations */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-accent2 uppercase tracking-wider mb-2">Suggested Automations</h4>
                <div className="flex flex-col gap-2">
                  {latestReport.suggestedAutomations?.map((aut, i) => (
                    <div key={i} className="border border-border rounded-xl p-3 bg-surface text-xs flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-accent2">{aut.type}</span>
                        <span className="text-[10px] text-muted">Trigger: {aut.trigger}</span>
                      </div>
                      <p className="text-[11px] text-muted italic mt-1 bg-surface2/30 p-2 rounded-lg border border-border">
                        Template: &quot;{aut.template}&quot;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-8 flex justify-end">
              <button className="btn-secondary" onClick={() => setShowReportModal(false)}>
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
