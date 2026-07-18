"use client";

import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Spinner, Skeleton } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Database, Search, ShieldAlert, ArrowRightLeft, FileSpreadsheet, ListTodo, Activity, ShoppingBag } from "lucide-react";

interface DebugDataPayload {
  business: any;
  customers: any[];
  sales: any[];
  products: any[];
  assessment: any | null;
  missions: any[];
}

export default function DatabasePage() {
  const { businessId, loading: sessionLoading } = useSession({ requireBusiness: true });
  const [activeTab, setActiveTab] = useState<"customers" | "sales" | "products" | "assessment" | "missions">("customers");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading: queryLoading, error, refetch } = useQuery<DebugDataPayload>({
    queryKey: ["debug-data", businessId],
    queryFn: () => api.get<DebugDataPayload>(`/api/business/${businessId}/debug-data`),
    enabled: !!businessId,
  });

  const loading = sessionLoading || queryLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-8 text-left py-6">
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
              System Database
            </h1>
            <p className="text-zinc-550 dark:text-zinc-400 text-xs">Inspect raw CRM data and table metrics directly.</p>
          </div>
          <div className="flex gap-2.5">
            <Skeleton className="h-8 w-28 rounded-[12px]" />
            <Skeleton className="h-8 w-28 rounded-[12px]" />
            <Skeleton className="h-8 w-28 rounded-[12px]" />
          </div>
          <Card className="p-0 overflow-hidden border border-zinc-200/40 dark:border-zinc-900/50 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-xl rounded-[24px]">
            <div className="p-5 border-b border-zinc-200/10 dark:border-zinc-800/40">
              <Skeleton className="h-6 w-1/4" />
            </div>
            <div className="p-5 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="h-8 flex-1 rounded-[12px]" />
                  <Skeleton className="h-8 flex-1 rounded-[12px]" />
                  <Skeleton className="h-8 flex-1 rounded-[12px]" />
                  <Skeleton className="h-8 flex-1 rounded-[12px]" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-left">
          <Card className="max-w-md w-full p-6 text-center border border-red-500/20 bg-red-500/[0.02]">
            <ShieldAlert className="text-red-500 mx-auto mb-4" size={32} />
            <h3 className="font-semibold text-base mb-1">Failed to load live data</h3>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-4">
              We couldn't connect to the backend to pull database tables. Check your connection or terminal logs.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry Connection
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Filter content by search query using memoization
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      if (activeTab === "customers") return data.customers;
      if (activeTab === "sales") return data.sales;
      if (activeTab === "products") return data.products;
      if (activeTab === "missions") return data.missions;
      return [];
    }

    if (activeTab === "customers") {
      return data.customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          c.id.toLowerCase().includes(q)
      );
    }
    if (activeTab === "sales") {
      return data.sales.filter(
        (s) =>
          (s.product && s.product.toLowerCase().includes(q)) ||
          (s.customerId && s.customerId.toLowerCase().includes(q)) ||
          s.id.toLowerCase().includes(q)
      );
    }
    if (activeTab === "products") {
      return data.products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
      );
    }
    if (activeTab === "missions") {
      return data.missions.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.priority.toLowerCase().includes(q) ||
          m.status.toLowerCase().includes(q)
      );
    }
    return [];
  }, [data, activeTab, searchQuery]);

  return (
    <AppShell>
      <div className="mb-6 text-left">
        <h1 className="font-display text-2xl font-semibold mb-1 flex items-center gap-2">
          <Database size={24} className="text-accent" /> Data Debugger
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs">
          Interactive audit portal displaying live, read-only tables directly from the **PostgreSQL** database.
        </p>
      </div>

      {/* Info Warning Card */}
      <Card className="mb-6 border-amber-500/25 bg-amber-500/[0.02] text-left">
        <CardContent className="p-4 flex gap-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
          <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">⚠️</div>
          <div>
            <strong>Demo Audit Notice:</strong> This debugger pulls real records matching your business profile ID 
            <code className="mx-1 px-1 bg-amber-500/10 rounded font-semibold text-[10px]">{data.business.id}</code>. 
            No hallucinated analytics or placeholder data exist in Nexora. What you see below is the exact data driving your dashboard scoring.
          </div>
        </CardContent>
      </Card>

      {/* Tab selectors */}
      <div className="flex flex-wrap border-b border-zinc-200 dark:border-zinc-800 mb-6 gap-2">
        {[
          { key: "customers", label: "Customers Table", count: data.customers.length, icon: FileSpreadsheet },
          { key: "sales", label: "Sales Table", count: data.sales.length, icon: ArrowRightLeft },
          { key: "products", label: "Products Table", count: data.products.length, icon: ShoppingBag },
          { key: "missions", label: "Missions Table", count: data.missions.length, icon: ListTodo },
          { key: "assessment", label: "Assessment JSON", count: data.assessment ? 1 : 0, icon: Activity },
        ].map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key as any);
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all leading-none ${
              activeTab === key
                ? "border-accent text-accent dark:text-zinc-150"
                : "border-transparent text-zinc-450 hover:text-zinc-900 dark:hover:text-zinc-150"
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
            <Badge variant={activeTab === key ? "default" : "secondary"} className="text-[10px] px-1 py-0 font-bold shrink-0">
              {count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Search Input (For Table Tabs) */}
      {activeTab !== "assessment" && (
        <div className="relative mb-4 max-w-sm text-left">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <Input
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      )}

      {/* Dynamic Tab Contents */}
      <Card className="border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950 overflow-hidden text-left">
        <CardContent className="p-0">
          {activeTab === "customers" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>id (CUID)</TableHead>
                    <TableHead>name</TableHead>
                    <TableHead>email</TableHead>
                    <TableHead>phone</TableHead>
                    <TableHead>lifetimeValue</TableHead>
                    <TableHead>lastPurchaseAt</TableHead>
                    <TableHead>createdAt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-zinc-450 italic">
                        No customer records matched your query.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-[10px] text-zinc-500">{c.id}</TableCell>
                        <TableCell className="font-semibold text-xs">{c.name}</TableCell>
                        <TableCell className="text-xs">{c.email || "—"}</TableCell>
                        <TableCell className="text-xs">{c.phone || "—"}</TableCell>
                        <TableCell className="font-mono font-bold text-xs">₹{(c.lifetimeValue || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-xs text-zinc-450">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === "sales" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>id (CUID)</TableHead>
                    <TableHead>customerId</TableHead>
                    <TableHead>product</TableHead>
                    <TableHead>amount</TableHead>
                    <TableHead>quantity</TableHead>
                    <TableHead>paymentMethod</TableHead>
                    <TableHead>date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-zinc-450 italic">
                        No sales transactions logged.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-[10px] text-zinc-500">{s.id}</TableCell>
                        <TableCell className="font-mono text-[10px] text-zinc-500">{s.customerId || "—"}</TableCell>
                        <TableCell className="font-semibold text-xs">{s.product || "—"}</TableCell>
                        <TableCell className="font-mono font-bold text-xs">₹{s.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{s.quantity ?? 1}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="secondary" className="text-[10px]">
                            {s.paymentMethod || "Other"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-450">{new Date(s.date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === "products" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>id (CUID)</TableHead>
                    <TableHead>name</TableHead>
                    <TableHead>price</TableHead>
                    <TableHead>unitsSold</TableHead>
                    <TableHead>createdAt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-zinc-450 italic">
                        No products catalogued.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-[10px] text-zinc-500">{p.id}</TableCell>
                        <TableCell className="font-semibold text-xs">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">₹{(p.price || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{p.unitsSold ?? 0}</TableCell>
                        <TableCell className="text-xs text-zinc-450">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === "missions" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>id (CUID)</TableHead>
                    <TableHead>title</TableHead>
                    <TableHead>priority</TableHead>
                    <TableHead>status</TableHead>
                    <TableHead>createdAt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-zinc-450 italic">
                        No strategic missions generated.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-[10px] text-zinc-500">{m.id}</TableCell>
                        <TableCell className="font-semibold text-xs">{m.title}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={m.priority === "high" ? "destructive" : "warning"} className="text-[10px]">
                            {m.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={m.status === "done" ? "success" : "secondary"} className="text-[10px]">
                            {m.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-450">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === "assessment" && (
            <div className="p-6">
              {data.assessment ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded">
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-550 uppercase tracking-wider font-bold block mb-1">readinessScore</span>
                      <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{data.assessment.readinessScore ?? "—"}</span>
                    </div>
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded">
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-550 uppercase tracking-wider font-bold block mb-1">confidenceScore</span>
                      <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{data.assessment.confidenceScore ?? "—"}</span>
                    </div>
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded">
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-550 uppercase tracking-wider font-bold block mb-1">digitalMaturity</span>
                      <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{data.assessment.digitalMaturity ?? "—"}</span>
                    </div>
                    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded">
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-555 uppercase tracking-wider font-bold block mb-1">growthScore</span>
                      <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{data.assessment.growthScore ?? "—"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-bold block mb-1.5">Raw Database Record (JSON)</span>
                    <pre className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-850 rounded text-[11px] font-mono overflow-auto max-h-96 text-zinc-700 dark:text-zinc-300">
                      {JSON.stringify(data.assessment, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-xs text-zinc-450 italic">
                  No Assessment record exists yet in the database. Complete Discovery first.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
