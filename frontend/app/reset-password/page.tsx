"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

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
      <div className="card p-7 text-center">
        <h1 className="font-display text-xl font-semibold mb-3 text-danger">Invalid Reset Link</h1>
        <p className="text-sm text-muted mb-6">This password reset link is missing a validation token.</p>
        <Link href="/forgot-password" className="btn-primary">
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card p-7 text-center">
        <h1 className="font-display text-xl font-semibold mb-3 text-emerald-400">Password Reset Successful</h1>
        <p className="text-sm text-muted mb-6">Your password has been successfully updated. You can now sign in with your new credentials.</p>
        <Link href="/login" className="btn-primary">
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-7">
      <h1 className="font-display text-xl font-semibold mb-1">Set new password</h1>
      <p className="text-sm text-muted mb-6">Enter your new password below. Make sure it satisfies the requirements.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white text-xs"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Confirm New Password</label>
          <input
            className="input"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {/* Requirements Checklist */}
        <div className="bg-white/5 border border-border/30 rounded-lg p-3.5 text-xs flex flex-col gap-1.5">
          <p className="font-semibold text-[11px] uppercase tracking-wider text-muted mb-1">Password Requirements</p>
          <div className="flex items-center gap-2">
            <span className={checks.length ? "text-emerald-400" : "text-muted"}>✓</span>
            <span className={checks.length ? "text-ink" : "text-muted"}>Minimum 8 characters</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={checks.uppercase ? "text-emerald-400" : "text-muted"}>✓</span>
            <span className={checks.uppercase ? "text-ink" : "text-muted"}>At least one uppercase letter (A-Z)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={checks.lowercase ? "text-emerald-400" : "text-muted"}>✓</span>
            <span className={checks.lowercase ? "text-ink" : "text-muted"}>At least one lowercase letter (a-z)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={checks.number ? "text-emerald-400" : "text-muted"}>✓</span>
            <span className={checks.number ? "text-ink" : "text-muted"}>At least one number (0-9)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={checks.special ? "text-emerald-400" : "text-muted"}>✓</span>
            <span className={checks.special ? "text-ink" : "text-muted"}>At least one special character (@$!%*?&)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={checks.match ? "text-emerald-400" : "text-muted"}>✓</span>
            <span className={checks.match ? "text-ink" : "text-muted"}>Passwords match</span>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading || !isFormValid} className="btn-primary mt-2">
          {loading ? "Resetting password…" : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-base text-ink flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display font-bold text-white">N</div>
          <span className="font-display font-semibold text-lg">Nexora</span>
        </Link>

        <Suspense fallback={
          <div className="card p-7 text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted">Loading reset form…</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
