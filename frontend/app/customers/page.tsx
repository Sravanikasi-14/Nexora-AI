"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner, Skeleton } from "@/components/ui/spinner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Search, FileDown, Plus } from "lucide-react";

// Lazy load the heavy Upload Modal and Strategic Intelligence Report Drawer
const CustomerUploadModal = dynamic(() => import("@/components/CustomerUploadModal"), {
  loading: () => <Spinner size="lg" className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center" />,
});

const CustomerReportDrawer = dynamic(() => import("@/components/CustomerReportDrawer"), {
  loading: () => <Spinner size="lg" className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center" />,
});

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

export default function CustomerAnalyticsPage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const queryClient = useQueryClient();

  // Modals & Panels State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filtering State
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortField, setSortField] = useState<"name" | "ltv" | "orders" | "lastPurchase">("ltv");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // React Query: Fetch customers list
  const { data: customerListPayload, isLoading: listLoading, refetch: fetchCustomers } = useQuery({
    queryKey: ["customers", businessId],
    queryFn: () => api.get<{ customers: Customer[] }>(`/api/customers/business/${businessId}`),
    enabled: !!businessId,
  });

  const customers = customerListPayload?.customers || [];

  // React Query: Fetch latest customer intelligence report
  const { data: latestReport, refetch: fetchLatestReport } = useQuery<CustomerReport | null>({
    queryKey: ["latest-report", businessId],
    queryFn: async () => {
      const res = await api.get<{ report: any }>(`/api/customers/reports/${businessId}/latest`);
      return res.report ? res.report.content : null;
    },
    enabled: !!businessId,
  });

  // React Query: Background analysis status polling
  const { data: analysisStatus } = useQuery({
    queryKey: ["analysis-status", businessId],
    queryFn: () => api.get<{ running: boolean }>(`/api/customers/analysis-status/${businessId}`),
    enabled: !!businessId,
    refetchInterval: (query) => {
      const running = query.state.data?.running;
      return running ? 2500 : false; // Poll every 2.5 seconds if running
    },
  });

  const isAnalyzing = !!analysisStatus?.running;

  // React Query invalidation when background analysis finishes
  useEffect(() => {
    if (analysisStatus && !analysisStatus.running) {
      queryClient.invalidateQueries({ queryKey: ["customers", businessId] });
      queryClient.invalidateQueries({ queryKey: ["latest-report", businessId] });
    }
  }, [analysisStatus?.running, businessId, queryClient]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
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

  // Derive client-side stats (Memoized to prevent recalculation overhead)
  const stats = useMemo(() => {
    const totalRevenue = customers.reduce((acc, c) => acc + c.lifetimeValue, 0);
    const activeCount = customers.filter((c) => !c.inactive).length;
    const repeatCount = customers.filter((c) => (c.sales?.length ?? 0) > 1).length;
    const avgOrderValue = customers.length > 0 ? Math.round(totalRevenue / (customers.reduce((acc, c) => acc + (c.sales?.length ?? 0), 0) || 1)) : 0;
    
    // Segments derivation
    const derivedVipCount = customers.filter((c) => c.lifetimeValue >= 2000).length;
    const derivedLoyalCount = customers.filter((c) => (c.sales?.length ?? 0) >= 2 && c.lifetimeValue < 2000).length;
    const derivedNewCount = customers.filter((c) => (c.sales?.length ?? 0) === 1 && !c.inactive).length;
    const derivedChurnedCount = customers.filter((c) => c.inactive).length;

    return {
      totalRevenue,
      activeCount,
      repeatCount,
      avgOrderValue,
      derivedVipCount,
      derivedLoyalCount,
      derivedNewCount,
      derivedChurnedCount
    };
  }, [customers]);

  // Sorting and filtering customers list (Memoized for peak CPU efficiency)
  const filteredCustomers = useMemo(() => {
    return customers
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
  }, [customers, search, segmentFilter, riskFilter, sortField, sortOrder]);

  function toggleSort(field: "name" | "ltv" | "orders" | "lastPurchase") {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  const loading = sessionLoading || listLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-500 text-white text-xs font-semibold px-4 py-3 rounded-md shadow-premium border border-emerald-600/30 animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* AI Analyzing banner */}
      {isAnalyzing && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-4 mb-6 flex items-center justify-between text-xs text-emerald-650 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold">AI is generating customer insights in the background. Your charts and recommendation cards will refresh automatically...</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1">Customer Analytics</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">Unified CRM, predictive churn models, and marketing campaign recommendations.</p>
        </div>
        <div className="flex gap-2">
          {latestReport && (
            <Button variant="outline" className="flex items-center gap-1.5" onClick={() => setShowReportModal(true)}>
              ★ AI Intelligence Report
            </Button>
          )}
          <Button onClick={() => setShowUploadModal(true)} className="flex items-center gap-1.5">
            <Plus size={14} /> Add Customer Data
          </Button>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card className="p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-2xl font-display font-semibold text-accent">{customers.length}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Total Customers</p>
        </Card>
        <Card className="p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-2xl font-display font-semibold text-accent2">{stats.activeCount}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Active Buyers</p>
        </Card>
        <Card className="p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-2xl font-display font-semibold text-warn">{stats.repeatCount}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Repeat Cohort</p>
        </Card>
        <Card className="p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-2xl font-display font-semibold text-zinc-900 dark:text-zinc-100">₹{stats.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Total Spent</p>
        </Card>
        <Card className="p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700">
          <p className="text-2xl font-display font-semibold text-zinc-900 dark:text-zinc-100">₹{stats.avgOrderValue.toLocaleString()}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Average Order Value</p>
        </Card>
      </div>

      {/* SVG Analytics Charts */}
      {customers.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* Segments Distribution */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-1 text-zinc-900 dark:text-zinc-50">Your Customer Groups</h3>
            <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mb-4 leading-normal">
              <strong>What it means:</strong> Groups your customer base into VIPs, Repeaters, New Active, and Quiet buyers.<br/>
              <strong>Why it matters:</strong> Allows you to target different groups with tailored outreach.<br/>
              <strong>What action to take:</strong> Check suggested outreach tools to start re-engaging.
            </p>
            <div className="flex flex-col gap-3">
              {[
                { name: "VIP Segment (LTV ≥ ₹2k)", count: stats.derivedVipCount, color: "bg-accent", pct: Math.round((stats.derivedVipCount / (customers.length || 1)) * 100) },
                { name: "Loyal Cohort (2+ Orders)", count: stats.derivedLoyalCount, color: "bg-accent2", pct: Math.round((stats.derivedLoyalCount / (customers.length || 1)) * 100) },
                { name: "New Active (1 Order, Active)", count: stats.derivedNewCount, color: "bg-warn", pct: Math.round((stats.derivedNewCount / (customers.length || 1)) * 100) },
                { name: "At Risk / Churned (Inactive)", count: stats.derivedChurnedCount, color: "bg-danger", pct: Math.round((stats.derivedChurnedCount / (customers.length || 1)) * 100) },
              ].map((seg) => (
                <div key={seg.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500 dark:text-zinc-400">{seg.name}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{seg.count} ({seg.pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${seg.color}`} style={{ width: `${seg.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Retention Donut */}
          <Card className="p-6 flex flex-col items-center justify-between text-center">
            <div className="text-left w-full">
              <h3 className="text-sm font-semibold mb-1 text-zinc-900 dark:text-zinc-50">Cohort Retention</h3>
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-normal">
                <strong>What it means:</strong> The percentage of your customer base who have purchased more than once.<br/>
                <strong>Why it matters:</strong> Returning customers spend more and cost less to market to.<br/>
                <strong>What action to take:</strong> Offer a small discount on their second transaction to build a return habit.
              </p>
            </div>
            <div className="relative w-28 h-28 flex items-center justify-center my-3">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e4e4e7" className="dark:stroke-zinc-800" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeDasharray={`${Math.round(2 * Math.PI * 40)}`}
                  strokeDashoffset={`${Math.round(2 * Math.PI * 40 * (1 - (stats.repeatCount / (customers.length || 1))))}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-display font-semibold text-emerald-600 dark:text-emerald-400">
                  {Math.round((stats.repeatCount / (customers.length || 1)) * 100)}%
                </span>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-bold">Repeat Rate</span>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
              {stats.repeatCount} of your buyers have completed multiple purchase transactions.
            </p>
          </Card>

          {/* Churn Risk Donut */}
          <Card className="p-6 flex flex-col items-center justify-between text-center">
            <div className="text-left w-full">
              <h3 className="text-sm font-semibold mb-1 text-zinc-900 dark:text-zinc-50">Customers You May Lose Soon</h3>
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-normal">
                <strong>What it means:</strong> Customers who haven&apos;t completed a purchase transaction in 60+ days.<br/>
                <strong>Why it matters:</strong> Quiet customers represent potential loss of business if not re-engaged promptly.<br/>
                <strong>What action to take:</strong> Send a direct WhatsApp reminder or a loyalty coupon to bring them back.
              </p>
            </div>
            <div className="relative w-28 h-28 flex items-center justify-center my-3">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e4e4e7" className="dark:stroke-zinc-800" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="8"
                  strokeDasharray={`${Math.round(2 * Math.PI * 40)}`}
                  strokeDashoffset={`${Math.round(2 * Math.PI * 40 * (1 - (stats.derivedChurnedCount / (customers.length || 1))))}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-display font-semibold text-red-500">
                  {Math.round((stats.derivedChurnedCount / (customers.length || 1)) * 100)}%
                </span>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-bold">High Risk</span>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
              {stats.derivedChurnedCount} customers are currently inactive (no purchase in 60+ days).
            </p>
          </Card>
        </div>
      )}

      {/* Empty State Callout */}
      {customers.length === 0 && (
        <Card className="p-8 text-center max-w-2xl mx-auto mb-6 border border-zinc-200 dark:border-zinc-800 shadow-premium">
          <p className="text-zinc-900 dark:text-zinc-50 font-semibold mb-2">No Customer Datasets Uploaded</p>
          <p className="text-zinc-500 dark:text-zinc-450 text-xs mb-6 leading-relaxed">
            Format your customer lists or sales spreadsheets using the downloadable templates below, or click to add customer purchase events manually.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => downloadCsvTemplate("customer")}>
              ↓ Customer CSV
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => downloadCsvTemplate("sales")}>
              ↓ Sales CSV
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => downloadCsvTemplate("orders")}>
              ↓ Orders CSV
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => downloadCsvTemplate("inventory")}>
              ↓ Inventory CSV
            </Button>
          </div>

          <div className="flex gap-2 justify-center">
            <Button onClick={() => {
              setShowUploadModal(true);
            }}>
              Upload CSV/Excel
            </Button>
          </div>
        </Card>
      )}

      {/* Main Customers List */}
      {customers.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-premium">
            <div className="flex-1 relative">
              <input
                className="input pl-8"
                placeholder="Search by name, email, phone or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <select
                className="flex h-9 rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950"
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
                className="flex h-9 rounded-md border border-zinc-200 bg-transparent px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950"
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
          <Card className="overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-premium">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-900/10 text-xs">
                    <th className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                      Name {sortField === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th>Contact Details</th>
                    <th>City</th>
                    <th className="text-center cursor-pointer select-none" onClick={() => toggleSort("orders")}>
                      Orders {sortField === "orders" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => toggleSort("ltv")}>
                      Total Spend {sortField === "ltv" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => toggleSort("lastPurchase")}>
                      Last Purchase {sortField === "lastPurchase" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th>Segment</th>
                    <th>CLV & Risk</th>
                    <th className="text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => {
                      // Segment calculation
                      let segment: { name: string; variant: "default" | "secondary" | "destructive" | "success" | "warning" } = { name: "Churned", variant: "destructive" };
                      if (c.lifetimeValue >= 2000) {
                        segment = { name: "VIP", variant: "default" };
                      } else if ((c.sales?.length ?? 0) >= 2) {
                        segment = { name: "Loyal", variant: "success" };
                      } else if ((c.sales?.length ?? 0) === 1 && !c.inactive) {
                        segment = { name: "New", variant: "warning" };
                      }

                      // Churn risk derivation
                      const riskScore = c.inactive ? 85 : c.lastPurchaseAt && Date.now() - new Date(c.lastPurchaseAt).getTime() > 30 * 86400000 ? 45 : 15;
                      const riskLabel = riskScore >= 70 ? "High" : riskScore >= 40 ? "Medium" : "Low";
                      const riskColor = riskScore >= 70 ? "text-red-500" : riskScore >= 40 ? "text-amber-500" : "text-emerald-500";

                      return (
                        <tr key={c.id}>
                          <td className="font-semibold">{c.name}</td>
                          <td className="text-xs text-zinc-450 dark:text-zinc-500 leading-normal">
                            <p>{c.email || "—"}</p>
                            <p>{c.phone || "—"}</p>
                          </td>
                          <td className="text-xs font-semibold">{c.city || "—"}</td>
                          <td className="text-center">{c.sales?.length ?? 0}</td>
                          <td className="font-semibold">₹{c.lifetimeValue.toLocaleString()}</td>
                          <td className="text-xs text-zinc-500">
                            {c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString() : "—"}
                          </td>
                          <td>
                            <Badge variant={segment.variant}>{segment.name}</Badge>
                          </td>
                          <td className="text-xs leading-normal">
                            <p className="font-semibold">CLV: ₹{Math.round(c.lifetimeValue / ((c.sales?.length ?? 0) || 1)).toLocaleString()}</p>
                            <p className="mt-0.5 text-zinc-500">Risk: <span className={`font-bold ${riskColor}`}>{riskLabel} ({riskScore})</span></p>
                          </td>
                          <td className="text-right">
                            <Link href={`/customers/${c.id}`}>
                              <Button variant="link" size="sm" className="h-auto p-0 font-bold text-xs text-accent">
                                Profile →
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-450 dark:text-zinc-500">
                        No customer profiles match the current filter search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* CSV/Excel Template Downloads inside main page footer when data exists */}
      {customers.length > 0 && (
        <Card className="p-5 mt-6 border border-zinc-200 dark:border-zinc-800 shadow-premium border-dashed">
          <p className="font-semibold text-sm mb-3 flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
            <FileDown size={16} /> CSV / Excel Templates Generator
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => downloadCsvTemplate("customer")}>
              ↓ Customer List Template
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => downloadCsvTemplate("sales")}>
              ↓ Sales History Template
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => downloadCsvTemplate("orders")}>
              ↓ Orders Template
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => downloadCsvTemplate("inventory")}>
              ↓ Inventory Template
            </Button>
          </div>
        </Card>
      )}

      {/* Dynamic Modal Imports (Loaded lazily when triggered) */}
      {showUploadModal && (
        <CustomerUploadModal
          businessId={businessId || ""}
          onClose={() => setShowUploadModal(false)}
          onSuccess={(msg) => showToast(msg)}
          onStartAnalysis={() => queryClient.invalidateQueries({ queryKey: ["analysis-status", businessId] })}
        />
      )}

      {showReportModal && latestReport && (
        <CustomerReportDrawer
          report={latestReport}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </AppShell>
  );
}
