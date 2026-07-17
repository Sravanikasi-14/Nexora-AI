"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setBusinessId, ApiError } from "@/lib/api";
import { Business } from "@/lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type FormState = {
  businessId?: string;
  name: string;
  industry: string;
  category: string;
  location: string;
  employees: string;
  yearsInBusiness: string;
  products: string;
  services: string;
  avgDailySales: string;
  avgMonthlyRevenue: string;
  googleBusiness: string;
  instagram: string;
  facebook: string;
  website: string;
  whatsappBiz: string;
  linkedin: string;
  goals: string;
};

const EMPTY: FormState = {
  name: "",
  industry: "",
  category: "",
  location: "",
  employees: "",
  yearsInBusiness: "",
  products: "",
  services: "",
  avgDailySales: "",
  avgMonthlyRevenue: "",
  googleBusiness: "",
  instagram: "",
  facebook: "",
  website: "",
  whatsappBiz: "",
  linkedin: "",
  goals: "",
};

const STEPS = ["Basics", "About the business", "Digital presence", "Import your data", "Goals"];

function DiscoveryPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});

  const token = typeof window !== "undefined" ? localStorage.getItem("nexora_token") : null;

  // React Query: Cached business lookup
  const { data, isLoading: checking, error: fetchError } = useQuery({
    queryKey: ["businessMe"],
    queryFn: () => api.get<{ business: Business | null }>("/api/business/me"),
    enabled: !!token,
    staleTime: 1000 * 60 * 15,
  });

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    if (fetchError) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("nexora_token");
        localStorage.removeItem("nexora_business_id");
        localStorage.removeItem("nexora_user");
      }
      router.replace("/login");
      return;
    }

    if (data?.business) {
      const biz = data.business;
      const forceEdit = searchParams.get("edit") === "true" || searchParams.get("reRun") === "true";
      if (biz.discoveryComplete && !isDemo && !forceEdit) {
        router.replace("/assessment");
        return;
      }
      setForm({
        businessId: biz.id,
        name: biz.name || "",
        industry: biz.industry || "",
        category: biz.category || "",
        location: biz.location || "",
        employees: biz.employees || "",
        yearsInBusiness: biz.yearsInBusiness || "",
        products: biz.products || "",
        services: biz.services || "",
        avgDailySales: biz.avgDailySales?.toString() || "",
        avgMonthlyRevenue: biz.avgMonthlyRevenue?.toString() || "",
        googleBusiness: biz.googleBusiness || "",
        instagram: biz.instagram || "",
        facebook: biz.facebook || "",
        website: biz.website || "",
        whatsappBiz: biz.whatsappBiz || "",
        linkedin: biz.linkedin || "",
        goals: biz.goals || "",
      });
      setBusinessId(biz.id);
    }
  }, [data, token, fetchError, isDemo, router]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function persist(complete = false): Promise<string | null> {
    setError(null);
    if (step === 0 && (!form.name.trim() || !form.industry.trim())) {
      setError("Business name and industry are required — everything else is optional.");
      return null;
    }
    setSaving(true);
    try {
      const res = await api.post<{ business: Business }>("/api/business", {
        businessId: form.businessId,
        name: form.name.trim(),
        industry: form.industry.trim(),
        category: form.category || undefined,
        location: form.location || undefined,
        employees: form.employees || undefined,
        yearsInBusiness: form.yearsInBusiness || undefined,
        products: form.products || undefined,
        services: form.services || undefined,
        avgDailySales: form.avgDailySales ? parseFloat(form.avgDailySales) : undefined,
        avgMonthlyRevenue: form.avgMonthlyRevenue ? parseFloat(form.avgMonthlyRevenue) : undefined,
        googleBusiness: form.googleBusiness || undefined,
        instagram: form.instagram || undefined,
        facebook: form.facebook || undefined,
        website: form.website || undefined,
        whatsappBiz: form.whatsappBiz || undefined,
        linkedin: form.linkedin || undefined,
        goals: form.goals || undefined,
        discoveryComplete: complete,
      });
      update("businessId", res.business.id);
      setBusinessId(res.business.id);
      return res.business.id;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    const id = await persist(false);
    if (!id) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  async function handleFinish() {
    const id = await persist(true);
    if (!id) return;
    // Invalidate cached business session & assessment data
    queryClient.invalidateQueries({ queryKey: ["businessMe"] });
    queryClient.invalidateQueries({ queryKey: ["assessment", id] });
    router.push("/assessment");
  }

  async function handleUpload(type: "customer" | "sales" | "product", file: File) {
    if (!form.businessId) {
      const id = await persist(false);
      if (!id) return;
    }
    const fd = new FormData();
    fd.append("file", file);
    setUploadStatus((s) => ({ ...s, [type]: "Uploading…" }));
    try {
      const res = await api.postForm<{ recordsProcessed: number }>(
        `/api/business/${form.businessId}/upload/${type}`,
        fd
      );
      setUploadStatus((s) => ({ ...s, [type]: `✓ ${res.recordsProcessed} record(s) imported` }));
    } catch (err) {
      setUploadStatus((s) => ({ ...s, [type]: err instanceof ApiError ? err.message : "Upload failed" }));
    }
  }

  if (checking) {
    return <div className="min-h-screen bg-base flex items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-base text-ink">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <div className="mb-8">
          <p className="text-sm text-accent font-medium mb-1">AI Business Discovery</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Let&apos;s get to know your business</h1>
          <p className="text-muted mt-2 leading-relaxed">
            Share whatever you&apos;re comfortable with. Only business name and industry are required — you can skip
            everything else and add it later.
          </p>
        </div>

        {/* Demo walkthrough banner */}
        {isDemo && (
          <div className="mb-6 bg-accent/15 border border-accent/25 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-xl">💡</span>
            <div>
              <h4 className="font-semibold text-ink text-xs">Demo walkthrough</h4>
              <p className="text-muted text-[11px] mt-0.5">
                These answers are pre-filled from your real seeded business. Feel free to edit anything, then click through the steps to continue.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full ${i <= step ? "bg-accent" : "bg-surface2"}`} />
              <p className={`text-xs mt-1.5 ${i === step ? "text-ink" : "text-muted"}`}>{s}</p>
            </div>
          ))}
        </div>

        <div className="card p-7">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="label">Business name *</label>
                <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Coastal Coffee Co." />
              </div>
              <div>
                <label className="label">Industry *</label>
                <input className="input" value={form.industry} onChange={(e) => update("industry", e.target.value)} placeholder="e.g. Food & Beverage" />
              </div>
              <div>
                <label className="label">Category (optional)</label>
                <input className="input" value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="e.g. Café / Retail" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Location</label>
                  <input className="input" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="City, Country" />
                </div>
                <div>
                  <label className="label">Employees</label>
                  <input className="input" value={form.employees} onChange={(e) => update("employees", e.target.value)} placeholder="e.g. 5-10" />
                </div>
              </div>
              <div>
                <label className="label">Years in business</label>
                <input className="input" value={form.yearsInBusiness} onChange={(e) => update("yearsInBusiness", e.target.value)} placeholder="e.g. 3" />
              </div>
              <div>
                <label className="label">Products</label>
                <input className="input" value={form.products} onChange={(e) => update("products", e.target.value)} placeholder="Comma separated" />
              </div>
              <div>
                <label className="label">Services</label>
                <input className="input" value={form.services} onChange={(e) => update("services", e.target.value)} placeholder="Comma separated" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Avg. daily sales</label>
                  <input className="input" type="number" value={form.avgDailySales} onChange={(e) => update("avgDailySales", e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <label className="label">Avg. monthly revenue</label>
                  <input className="input" type="number" value={form.avgMonthlyRevenue} onChange={(e) => update("avgMonthlyRevenue", e.target.value)} placeholder="Optional" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              {[
                ["googleBusiness", "Google Business Profile name"],
                ["instagram", "Instagram handle"],
                ["facebook", "Facebook page name"],
                ["website", "Website URL"],
                ["whatsappBiz", "WhatsApp Business phone number"],
                ["linkedin", "LinkedIn"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    className="input"
                    value={form[key as keyof FormState] as string}
                    onChange={(e) => update(key as keyof FormState, e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-muted -mt-1">
                Upload CSVs if you have them — this is what unlocks real growth analysis. All optional.
              </p>
              {[
                ["customer", "Customer list CSV", "name, phone, email, notes"],
                ["sales", "Sales / invoice CSV", "customer_name, amount, product, date"],
                ["product", "Product catalog CSV", "name, price, units_sold"],
              ].map(([type, label, cols]) => (
                <div key={type} className="border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted mt-0.5">Columns: {cols}</p>
                    </div>
                    <label className="btn-secondary text-sm cursor-pointer">
                      Choose file
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(type as "customer" | "sales" | "product", file);
                        }}
                      />
                    </label>
                  </div>
                  {uploadStatus[type] && <p className="text-xs text-accent2 mt-2">{uploadStatus[type]}</p>}
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="label">What are your business goals right now?</label>
                <textarea
                  className="input min-h-[120px]"
                  value={form.goals}
                  onChange={(e) => update("goals", e.target.value)}
                  placeholder="e.g. Increase repeat customers, grow Instagram following, launch a new product line…"
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-danger mt-4">{error}</p>}

          <div className="flex items-center justify-between mt-7">
            <button
              className="btn-ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn-primary" disabled={saving} onClick={handleNext}>
                {saving ? "Saving…" : "Continue"}
              </button>
            ) : (
              <button className="btn-primary" disabled={saving} onClick={handleFinish}>
                {saving ? "Finishing…" : "Run Business Assessment"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DiscoveryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base flex items-center justify-center text-muted">Loading…</div>}>
      <DiscoveryPageContent />
    </Suspense>
  );
}
