"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export default function SetupPasswordPage() {
  const router = useRouter();
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
      // Redirect to onboarding
      router.push("/discovery");
    } catch (err) {
      setError((err as any)?.message || "Failed to setup password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-3 text-muted">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Verifying profile setup…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base text-ink flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display font-bold text-white">N</div>
          <span className="font-display font-semibold text-lg">Nexora</span>
        </div>

        <div className="card p-7">
          <h1 className="font-display text-xl font-semibold mb-1">Set up your password</h1>
          <p className="text-sm text-muted mb-6">Create a password to secure your account for future logins.</p>

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
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white text-xs"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary mt-2">
              {loading ? "Saving setup…" : "Complete Account Setup"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
