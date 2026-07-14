"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { api, setToken, setStoredUser, setBusinessId, ApiError } from "@/lib/api";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Synchronize with query parameter tab=register
  useEffect(() => {
    const tab = searchParams.get("tab");
    setIsRegister(tab === "register");
  }, [searchParams]);

  // Load remembered email on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("nexora_remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  // Session guard
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nexora_token") : null;
    if (token) {
      (async () => {
        try {
          const bizRes = await api.get<{
            business: { id: string; discoveryComplete: boolean } | null;
            user?: { passwordSetupRequired: boolean };
          }>("/api/business/me");
          
          if (bizRes.user?.passwordSetupRequired) {
            router.replace("/setup-password");
            return;
          }
          if (bizRes.business) {
            setBusinessId(bizRes.business.id);
            if (bizRes.business.discoveryComplete) {
              router.replace("/dashboard");
              return;
            } else {
              router.replace("/discovery");
              return;
            }
          } else {
            router.replace("/discovery");
            return;
          }
        } catch {
          if (typeof window !== "undefined") {
            localStorage.removeItem("nexora_token");
            localStorage.removeItem("nexora_business_id");
            localStorage.removeItem("nexora_user");
          }
          setCheckingSession(false);
        }
      })();
    } else {
      setCheckingSession(false);
    }
  }, [router]);

  // Real-time register checks
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
    match: password === confirmPassword && password.length > 0,
  };

  const isRegisterFormValid = !isRegister || Object.values(checks).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic client validations
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (isRegister && !isRegisterFormValid) {
      setError("Please satisfy all password strength requirements.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        // Register API call
        const res = await api.post<{ token: string; user: { id: string; name: string; email: string } }>(
          "/api/auth/register",
          { name, email, password, confirmPassword }
        );
        setToken(res.token);
        setStoredUser(res.user);
        router.push("/discovery");
      } else {
        // Login API call
        const res = await api.post<{ token: string; user: { id: string; name: string; email: string } }>(
          "/api/auth/login",
          { email, password }
        );
        setToken(res.token);
        setStoredUser(res.user);

        // Manage Remember Me
        if (typeof window !== "undefined") {
          if (rememberMe) {
            localStorage.setItem("nexora_remembered_email", email);
          } else {
            localStorage.removeItem("nexora_remembered_email");
          }
        }

        // Check if onboarding is needed
        try {
          const bizRes = await api.get<{ business: { id: string; discoveryComplete: boolean } | null }>("/api/business/me");
          if (bizRes.business) {
            setBusinessId(bizRes.business.id);
            if (bizRes.business.discoveryComplete) {
              router.push("/dashboard");
            } else {
              router.push("/discovery");
            }
          } else {
            router.push("/discovery");
          }
        } catch {
          router.push("/discovery");
        }
      }
    } catch (err) {
      setError((err as any)?.message || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setError(null);
    setLoading(true);
    try {
      const loginRes = await api.post<{ token: string; user: { id: string; name: string; email: string } }>(
        "/api/auth/login",
        { email: "demo@nexora.ai", password: "demo1234" }
      );
      setToken(loginRes.token);
      setStoredUser(loginRes.user);

      try {
        const bizRes = await api.get<{ business: { id: string; discoveryComplete: boolean } | null }>("/api/business/me");
        if (bizRes.business) {
          setBusinessId(bizRes.business.id);
        }
      } catch (bizErr) {
        // ignore
      }
      router.push("/discovery?demo=true");
    } catch (err) {
      setError((err as any)?.message || "Could not log into demo account.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse: any) {
    if (!credentialResponse.credential) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: { id: string; name: string; email: string; passwordSetupRequired?: boolean } }>(
        "/api/auth/google",
        { idToken: credentialResponse.credential }
      );
      setToken(res.token);
      setStoredUser(res.user);

      if (res.user?.passwordSetupRequired) {
        router.push("/setup-password");
        return;
      }

      try {
        const bizRes = await api.get<{ business: { id: string; discoveryComplete: boolean } | null }>("/api/business/me");
        if (bizRes.business) {
          setBusinessId(bizRes.business.id);
          if (bizRes.business.discoveryComplete) {
            router.push("/dashboard");
          } else {
            router.push("/discovery");
          }
        } else {
          router.push("/discovery");
        }
      } catch (bizErr) {
        router.push("/discovery");
      }
    } catch (err) {
      setError((err as any)?.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    setError("Google Sign-In failed.");
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-3 text-muted">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Verifying session…</p>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className="min-h-screen bg-base text-ink flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2 justify-center mb-6">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display font-bold text-white">N</div>
            <span className="font-display font-semibold text-lg">Nexora</span>
          </Link>

          {/* Selector Tabs */}
          <div className="flex border-b border-border/50 mb-6 bg-surface/30 rounded-xl p-1">
            <button
              onClick={() => {
                setIsRegister(false);
                setError(null);
                router.replace("/login");
              }}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                !isRegister ? "bg-[#1C242C] text-white shadow-sm" : "text-muted hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsRegister(true);
                setError(null);
                router.replace("/login?tab=register");
              }}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                isRegister ? "bg-[#1C242C] text-white shadow-sm" : "text-muted hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="card p-7">
            <h1 className="font-display text-xl font-semibold mb-1">
              {isRegister ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted mb-6">
              {isRegister ? "Set up your credentials to get started." : "Sign in to continue growing your business."}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {isRegister && (
                <div>
                  <label className="label">Full Name</label>
                  <input
                    className="input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
              )}

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

              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Password</label>
                  {!isRegister && (
                    <Link href="/forgot-password" className="text-xs text-accent hover:underline mb-1">
                      Forgot Password?
                    </Link>
                  )}
                </div>
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

              {isRegister && (
                <>
                  <div>
                    <label className="label">Confirm Password</label>
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

                  {/* Requirements Checklist */}
                  <div className="bg-white/5 border border-border/30 rounded-lg p-3 text-[11px] flex flex-col gap-1">
                    <p className="font-semibold uppercase tracking-wider text-muted text-[10px] mb-1">Password Rules</p>
                    <div className="flex items-center gap-1.5">
                      <span className={checks.length ? "text-emerald-400" : "text-muted"}>✓</span>
                      <span className={checks.length ? "text-ink" : "text-muted"}>Min 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={checks.uppercase ? "text-emerald-400" : "text-muted"}>✓</span>
                      <span className={checks.uppercase ? "text-ink" : "text-muted"}>At least 1 uppercase</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={checks.lowercase ? "text-emerald-400" : "text-muted"}>✓</span>
                      <span className={checks.lowercase ? "text-ink" : "text-muted"}>At least 1 lowercase</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={checks.number ? "text-emerald-400" : "text-muted"}>✓</span>
                      <span className={checks.number ? "text-ink" : "text-muted"}>At least 1 number</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={checks.special ? "text-emerald-400" : "text-muted"}>✓</span>
                      <span className={checks.special ? "text-ink" : "text-muted"}>At least 1 special char (@$!%*?&)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={checks.match ? "text-emerald-400" : "text-muted"}>✓</span>
                      <span className={checks.match ? "text-ink" : "text-muted"}>Passwords match</span>
                    </div>
                  </div>
                </>
              )}

              {!isRegister && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-border bg-surface text-accent focus:ring-accent"
                  />
                  <label htmlFor="rememberMe" className="text-xs text-muted cursor-pointer select-none">
                    Remember email on this device
                  </label>
                </div>
              )}

              {error && <p className="text-sm text-danger">{error}</p>}
              <button type="submit" disabled={loading || (isRegister && !isRegisterFormValid)} className="btn-primary mt-2">
                {loading ? (isRegister ? "Creating account…" : "Signing in…") : (isRegister ? "Create Account" : "Sign In")}
              </button>
            </form>

            {/* Social Google Sign-In */}
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center my-1">
                <div className="flex-1 border-t border-border/50"></div>
                <span className="px-3 text-xs text-muted">or</span>
                <div className="flex-1 border-t border-border/50"></div>
              </div>

              <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                />
              </div>
            </div>

            {/* Try Nexora for Demo Business Option */}
            <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-2">
              <p className="text-[11px] text-muted text-center">Want to explore before creating an account?</p>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="btn-secondary w-full text-center flex items-center justify-center gap-2 border border-border bg-surface2/30 text-accent font-semibold hover:bg-surface2 transition-all text-xs py-2.5 rounded-xl"
              >
                🚀 Try Nexora with a demo business
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-muted mt-5">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <button onClick={() => { setIsRegister(false); router.replace("/login"); }} className="text-accent hover:underline font-semibold">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button onClick={() => { setIsRegister(true); router.replace("/login?tab=register"); }} className="text-accent hover:underline font-semibold">
                  Create one
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-3 text-muted">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Verifying session…</p>
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
