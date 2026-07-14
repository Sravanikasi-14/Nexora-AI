"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-base text-ink flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/login" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display font-bold text-white">N</div>
          <span className="font-display font-semibold text-lg">Nexora</span>
        </Link>

        <div className="card p-7">
          <h1 className="font-display text-xl font-semibold mb-1">Reset your password</h1>
          <p className="text-sm text-muted mb-6">Enter your email address and we'll send you a link to reset your password.</p>

          {message ? (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm">
                {message}
              </div>
              <Link href="/login" className="btn-primary text-center">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="label">Email Address</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary mt-2">
                {loading ? "Sending reset link…" : "Send Reset Link"}
              </button>
              <div className="text-center mt-2">
                <Link href="/login" className="text-xs text-accent hover:underline">
                  Remember your password? Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
