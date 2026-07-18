"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setBusinessId, ApiError } from "@/lib/api";
import { Business } from "@/lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Globe,
  UploadCloud,
  Check,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";

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

const STEPS = ["Basics", "About your scale", "Digital profiles", "Import datasets", "Goals"];

const QUESTIONS = [
  "What is the name of your business and which industry do you operate in?",
  "Tell me a bit about your scale. Where is your location, and what are your numbers?",
  "Where can customers currently find you online?",
  "Do you have any customer list or sales CSV files to import?",
  "What are your primary business goals right now?"
];

function FloatingAvatar() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div className="relative w-24 h-24 flex items-center justify-center mx-auto mb-8 select-none">
      {!shouldReduceMotion && (
        <motion.div
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.35, 0.65, 0.35],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-gradient-to-tr from-accent via-indigo-500 to-emerald-500 rounded-full blur-2xl"
        />
      )}
      <motion.div
        animate={shouldReduceMotion ? {} : {
          rotate: [0, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="relative w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-lg overflow-hidden"
      >
        <div className="absolute inset-0.5 bg-gradient-to-tr from-accent via-indigo-500 to-emerald-500 rounded-full opacity-80 blur-[2px]" />
        <div className="absolute inset-2 bg-zinc-950 rounded-full flex items-center justify-center font-display font-black text-white text-base">
          N
        </div>
      </motion.div>
    </div>
  );
}

function MagicalLoader({ onComplete }: { onComplete: () => void }) {
  const [progressIdx, setProgressIdx] = useState(0);
  const phases = [
    "Analyzing industry trends...",
    "Correlating customer cohorts...",
    "Inspecting digital footprint...",
    "Preparing strategic recommendations..."
  ];

  useEffect(() => {
    if (progressIdx >= phases.length) {
      onComplete();
      return;
    }
    const timeout = setTimeout(() => {
      setProgressIdx((prev) => prev + 1);
    }, 1800);
    return () => clearTimeout(timeout);
  }, [progressIdx, onComplete, phases.length]);

  return (
    <div className="text-center space-y-6 max-w-sm mx-auto select-none py-10">
      <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse" />
        <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
      <div className="space-y-2">
        <h3 className="font-display font-bold text-lg text-white">Perfect.</h3>
        <p className="text-sm font-semibold text-zinc-300">I'm building your Growth DNA...</p>
        <p className="text-[10px] text-zinc-500 font-mono pt-4">
          {phases[Math.min(progressIdx, phases.length - 1)]}
        </p>
      </div>
    </div>
  );
}

function DiscoveryPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const shouldReduceMotion = useReducedMotion();

  const [step, setStep] = useState(-1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [isBuildingDNA, setIsBuildingDNA] = useState(false);

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
  }, [data, token, fetchError, isDemo, router, searchParams]);

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
    queryClient.invalidateQueries({ queryKey: ["businessMe"] });
    queryClient.invalidateQueries({ queryKey: ["assessment", id] });
    setIsBuildingDNA(true);
  }

  const completeDNALoader = () => {
    router.push("/assessment");
  };

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
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-500">
        <Spinner size="lg" />
        <p className="text-xs">Verifying profile setup…</p>
      </div>
    );
  }

  if (isBuildingDNA) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex items-center justify-center px-6 py-16">
        <MagicalLoader onComplete={completeDNALoader} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col justify-center py-16 px-6 relative overflow-hidden">
      
      {/* Background Spotlight */}
      {!shouldReduceMotion && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
      )}

      <div className="w-full max-w-xl mx-auto">
        
        {/* Progress Bar indicator */}
        {step >= 0 && (
          <div className="max-w-md mx-auto mb-8 select-none">
            <div className="flex justify-between items-center text-[9px] text-zinc-450 dark:text-zinc-500 uppercase tracking-widest font-bold mb-2">
              <span>Understanding your business...</span>
              <span className="font-mono">Step {step + 1} of {STEPS.length}</span>
            </div>
            <div className="h-1 bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden relative">
              <motion.div
                className="absolute top-0 bottom-0 left-0 bg-accent rounded-full"
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.35 }}
              />
            </div>
          </div>
        )}

        <FloatingAvatar />

        <AnimatePresence mode="wait">
          {step === -1 ? (
            /* Introduction Panel */
            <motion.div
              key="intro"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="text-center space-y-6"
            >
              <div className="space-y-3 max-w-md mx-auto">
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  Hi 👋 I'm Nexora.
                </h1>
                <p className="text-zinc-550 dark:text-zinc-400 text-sm leading-relaxed font-semibold">
                  Before I become your AI Growth Officer... I'd love to understand your business.
                </p>
              </div>

              {/* Demo banner helper */}
              {isDemo && (
                <div className="max-w-md mx-auto bg-accent/10 border border-accent/20 rounded-xl p-3 text-left">
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal">
                    💡 **Walkthrough mode Active**: Answers will be pre-filled with demo logs. Click through below to evaluate.
                  </p>
                </div>
              )}

              <motion.div
                whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                className="pt-2"
              >
                <Button size="lg" className="shadow-lg hover:shadow-premium font-semibold text-xs" onClick={() => setStep(0)}>
                  Let's Begin
                  <ChevronRight size={14} className="ml-1.5" />
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            /* Conversational Steps Cards */
            <motion.div
              key={step}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="card p-8 border border-zinc-250 dark:border-zinc-850 shadow-glow bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md rounded-2xl text-left space-y-6"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-accent uppercase tracking-widest block">Conversational Scan</span>
                <h3 className="font-display font-extrabold text-base text-zinc-900 dark:text-white leading-snug">
                  {QUESTIONS[step]}
                </h3>
              </div>

              {/* Steps input conditions */}
              {step === 0 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="label text-xs">Business name *</label>
                    <input className="input h-9 text-xs" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Coastal Coffee Co." />
                  </div>
                  <div>
                    <label className="label text-xs">Industry *</label>
                    <input className="input h-9 text-xs" value={form.industry} onChange={(e) => update("industry", e.target.value)} placeholder="e.g. Food & Beverage" />
                  </div>
                  <div>
                    <label className="label text-xs">Category (optional)</label>
                    <input className="input h-9 text-xs" value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="e.g. Café / Retail" />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label text-xs">Location</label>
                      <input className="input h-9 text-xs" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="City, Country" />
                    </div>
                    <div>
                      <label className="label text-xs">Employees</label>
                      <input className="input h-9 text-xs" value={form.employees} onChange={(e) => update("employees", e.target.value)} placeholder="e.g. 5-10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label text-xs">Years in business</label>
                      <input className="input h-9 text-xs" value={form.yearsInBusiness} onChange={(e) => update("yearsInBusiness", e.target.value)} placeholder="e.g. 3" />
                    </div>
                    <div>
                      <label className="label text-xs">Avg. Daily Sales</label>
                      <input className="input h-9 text-xs" type="number" value={form.avgDailySales} onChange={(e) => update("avgDailySales", e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Avg. Monthly Revenue</label>
                    <input className="input h-9 text-xs" type="number" value={form.avgMonthlyRevenue} onChange={(e) => update("avgMonthlyRevenue", e.target.value)} placeholder="Optional" />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ["googleBusiness", "Google Business Name"],
                    ["instagram", "Instagram Handle"],
                    ["facebook", "Facebook Page"],
                    ["website", "Website URL"],
                    ["whatsappBiz", "WhatsApp Phone"],
                    ["linkedin", "LinkedIn Profile"]
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="label text-xs">{label}</label>
                      <input
                        className="input h-9 text-xs"
                        value={form[key as keyof FormState] as string}
                        onChange={(e) => update(key as keyof FormState, e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <p className="text-[11px] text-zinc-550 dark:text-zinc-400 leading-normal">
                    Upload CSV logs if you have them. Importing lists unlocks deep customer cohort and sales trend intelligence.
                  </p>
                  {[
                    ["customer", "Customer list CSV", "name, phone, email, notes", "border-l-indigo-500"],
                    ["sales", "Sales logs CSV", "customer_name, amount, product, date", "border-l-emerald-500"],
                    ["product", "Product inventory CSV", "name, price, units_sold", "border-l-blue-500"]
                  ].map(([type, label, cols, accentL]) => (
                    <div key={type} className={`border border-zinc-200 dark:border-zinc-900 rounded-xl p-4 border-l-4 ${accentL} flex items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-950/20 shadow-sm`}>
                      <div className="space-y-0.5">
                        <p className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5"><FileSpreadsheet size={13} className="text-zinc-400" /> {label}</p>
                        <p className="text-[9px] text-zinc-500 font-medium">Headers: {cols}</p>
                      </div>
                      <motion.label
                        whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                        className="btn-secondary text-[10px] font-bold cursor-pointer h-7 flex items-center gap-1 px-3 py-0 border border-zinc-200 dark:border-zinc-800 rounded-md shrink-0 select-none bg-white dark:bg-zinc-900 shadow-sm"
                      >
                        <UploadCloud size={11} />
                        Choose
                        <input
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(type as "customer" | "sales" | "product", file);
                          }}
                        />
                      </motion.label>
                    </div>
                  ))}
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="label text-xs">What are your business goals right now?</label>
                    <textarea
                      className="input min-h-[120px] text-xs py-2 leading-relaxed"
                      value={form.goals}
                      onChange={(e) => update("goals", e.target.value)}
                      placeholder="e.g. Increase repeat client bookings, target local search clicks, boost off-season revenue..."
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-500 bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 rounded-lg select-none">
                  <AlertCircle size={14} className="shrink-0" />
                  <p className="text-xs font-semibold">{error}</p>
                </div>
              )}

              {/* Navigation button panel */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-900 select-none">
                <button
                  className="text-xs font-bold text-zinc-450 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors"
                  onClick={() => setStep((s) => Math.max(-1, s - 1))}
                >
                  Back
                </button>
                
                {step < STEPS.length - 1 ? (
                  <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.01 }} whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}>
                    <Button size="sm" className="shadow-md hover:shadow-premium text-xs font-bold px-5" disabled={saving} onClick={handleNext}>
                      {saving ? "Saving..." : "Continue"}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.01 }} whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}>
                    <Button size="sm" className="shadow-md hover:shadow-premium text-xs font-bold px-5 bg-gradient-to-r from-accent to-indigo-600" disabled={saving} onClick={handleFinish}>
                      {saving ? "Processing..." : "Compile DNA"}
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default function DiscoveryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-500">
        <Spinner size="lg" />
        <p className="text-xs">Loading onboarding…</p>
      </div>
    }>
      <DiscoveryPageContent />
    </Suspense>
  );
}
