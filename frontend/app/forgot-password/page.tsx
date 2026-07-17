"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { motion, useReducedMotion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await api.post<{ success: boolean; message: string }>("/api/auth/forgot-password", { email });
      setMessage(res.message);
    } catch (err) {
      setError((err as any)?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
          <h1 className="font-display text-xl font-bold tracking-tight mb-1 text-zinc-900 dark:text-white">Reset your password</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">Enter your email address and we'll send you a link to reset your password.</p>

          {message ? (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-medium">
                {message}
              </div>
              <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.01 }} whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}>
                <Link href="/login" className="btn-primary text-center w-full block h-9 text-xs flex items-center justify-center shadow-md">
                  Back to Sign In
                </Link>
              </motion.div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="label text-xs">Email Address</label>
                <input
                  className="input h-9 text-xs"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                />
              </div>
              
              {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
              
              <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.01 }} whileTap={shouldReduceMotion ? {} : { scale: 0.99 }} className="w-full mt-2">
                <button type="submit" disabled={loading} className="btn-primary w-full h-9 text-xs hover:shadow-premium shadow-md">
                  {loading ? "Sending reset link…" : "Send Reset Link"}
                </button>
              </motion.div>
              
              <div className="text-center mt-2">
                <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:underline font-semibold transition-colors">
                  Remember your password? Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
