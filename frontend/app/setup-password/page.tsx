"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";

export default function SetupPasswordPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const shouldReduceMotion = useReducedMotion();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nexora_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const res = await api.get<{
          business: { id: string; discoveryComplete: boolean } | null;
          user?: { passwordSetupRequired: boolean };
        }>("/api/business/me");
        
        if (!res.user?.passwordSetupRequired) {
          if (res.business?.discoveryComplete) {
            router.replace("/dashboard");
          } else {
            router.replace("/discovery");
          }
          return;
        }
      } catch {
        if (typeof window !== "undefined") {
          localStorage.removeItem("nexora_token");
          localStorage.removeItem("nexora_business_id");
          localStorage.removeItem("nexora_user");
        }
        router.replace("/login");
        return;
      } finally {
        setChecking(false);
      }
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/setup-password", { password });
      await queryClient.invalidateQueries({ queryKey: ["businessMe"] });
      router.push("/discovery");
    } catch (err) {
      setError((err as any)?.message || "Failed to setup password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-500">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Verifying profile setup…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex items-center justify-center px-6 py-16">
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <Link href="/login" className="flex items-center gap-2 justify-center mb-8">
          <motion.div
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            className="w-8 h-8 rounded bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center font-display font-bold text-white dark:text-zinc-900 text-sm shadow"
          >
            N
          </motion.div>
          <span className="font-display font-semibold text-lg tracking-tight">Nexora</span>
        </Link>

        <div className="card p-7 border border-zinc-250 dark:border-zinc-850 shadow-glow bg-white dark:bg-zinc-950 rounded-xl">
          <h1 className="font-display text-xl font-bold mb-1 text-zinc-900 dark:text-white">Set up your password</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">Create a password to secure your account for future logins.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label text-xs">New Password</label>
              <div className="relative">
                <input
                  className="input pr-10 h-9 text-xs"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 text-[10px] font-semibold"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div>
              <label className="label text-xs">Confirm New Password</label>
              <div className="relative">
                <input
                  className="input pr-10 h-9 text-xs"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 text-[10px] font-semibold"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            
            {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
            
            <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.01 }} whileTap={shouldReduceMotion ? {} : { scale: 0.99 }} className="w-full mt-2">
              <Button type="submit" isLoading={loading} className="w-full h-9 text-xs hover:shadow-premium shadow-md rounded-[18px] bg-gradient-to-r from-blue-600 to-indigo-600 border-0 font-bold text-white">
                Complete Account Setup
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
