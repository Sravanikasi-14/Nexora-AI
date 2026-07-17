"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { motion, useReducedMotion } from "framer-motion";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const shouldReduceMotion = useReducedMotion();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Real-time validation criteria
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
    match: password === confirmPassword && password.length > 0,
  };

  const isFormValid = Object.values(checks).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Reset token is missing. Please request a new link.");
      return;
    }

    if (!isFormValid) {
      setError("Please satisfy all password complexity requirements.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err) {
      setError((err as any)?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="card p-7 text-center border border-zinc-250 dark:border-zinc-850 shadow-glow bg-white dark:bg-zinc-950 rounded-xl">
        <h1 className="font-display text-xl font-bold mb-3 text-red-500">Invalid Reset Link</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">This password reset link is missing a validation token.</p>
        <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.01 }} whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}>
          <Link href="/forgot-password" className="btn-primary w-full h-9 text-xs flex items-center justify-center shadow-md">
            Request a new link
          </Link>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card p-7 text-center border border-zinc-250 dark:border-zinc-850 shadow-glow bg-white dark:bg-zinc-950 rounded-xl">
        <h1 className="font-display text-xl font-bold mb-3 text-emerald-500">Password Reset Successful</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">Your password has been successfully updated. You can now sign in with your new credentials.</p>
        <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.01 }} whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}>
          <Link href="/login" className="btn-primary w-full h-9 text-xs flex items-center justify-center shadow-md">
            Go to Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="card p-7 border border-zinc-250 dark:border-zinc-850 shadow-glow bg-white dark:bg-zinc-950 rounded-xl">
      <h1 className="font-display text-xl font-bold mb-1 text-zinc-900 dark:text-white">Set new password</h1>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">Enter your new password below. Make sure it satisfies the requirements.</p>

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
          <input
            className="input h-9 text-xs"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {/* Requirements Checklist */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-xs flex flex-col gap-1.5 text-left">
          <p className="font-semibold text-[10px] uppercase tracking-wider text-zinc-450 dark:text-zinc-500 mb-1">Password Requirements</p>
          <div className="flex items-center gap-2">
            <span className={checks.length ? "text-emerald-500 font-semibold" : "text-zinc-450"}>✓</span>
            <span className={checks.length ? "text-zinc-900 dark:text-zinc-150" : "text-zinc-455"}>Minimum 8 characters</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={checks.uppercase ? "text-emerald-500 font-semibold" : "text-zinc-450"}>✓</span>
            <span className={checks.uppercase ? "text-zinc-900 dark:text-zinc-150" : "text-zinc-455"}>At least one uppercase letter (A-Z)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={checks.lowercase ? "text-emerald-500 font-semibold" : "text-zinc-450"}>✓</span>
            <span className={checks.lowercase ? "text-zinc-900 dark:text-zinc-150" : "text-zinc-455"}>At least one lowercase letter (a-z)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={checks.number ? "text-emerald-500 font-semibold" : "text-zinc-450"}>✓</span>
            <span className={checks.number ? "text-zinc-900 dark:text-zinc-150" : "text-zinc-455"}>At least one number (0-9)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={checks.special ? "text-emerald-500 font-semibold" : "text-zinc-450"}>✓</span>
            <span className={checks.special ? "text-zinc-900 dark:text-zinc-150" : "text-zinc-455"}>At least one special character (@$!%*?&)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={checks.match ? "text-emerald-500 font-semibold" : "text-zinc-450"}>✓</span>
            <span className={checks.match ? "text-zinc-900 dark:text-zinc-150" : "text-zinc-455"}>Passwords match</span>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
        
        <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.01 }} whileTap={shouldReduceMotion ? {} : { scale: 0.99 }} className="w-full mt-2">
          <button type="submit" disabled={loading || !isFormValid} className="btn-primary w-full h-9 text-xs hover:shadow-premium shadow-md">
            {loading ? "Resetting password…" : "Reset Password"}
          </button>
        </motion.div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex items-center justify-center px-6 py-16">
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <motion.div
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            className="w-8 h-8 rounded bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center font-display font-bold text-white dark:text-zinc-900 text-sm shadow"
          >
            N
          </motion.div>
          <span className="font-display font-semibold text-lg tracking-tight">Nexora</span>
        </Link>

        <Suspense fallback={
          <div className="card p-7 text-center border border-zinc-250 dark:border-zinc-850 shadow-glow bg-white dark:bg-zinc-950 rounded-xl">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs text-zinc-550 dark:text-zinc-400">Loading reset form…</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
