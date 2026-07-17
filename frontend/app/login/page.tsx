"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { api, setToken, setStoredUser, setBusinessId } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { motion, useReducedMotion } from "framer-motion";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();

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

  useEffect(() => {
    const tab = searchParams.get("tab");
    setIsRegister(tab === "register");
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("nexora_remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

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
        const res = await api.post<{ token: string; user: { id: string; name: string; email: string } }>(
          "/api/auth/register",
          { name, email, password, confirmPassword }
        );
        setToken(res.token);
        setStoredUser(res.user);
        router.push("/discovery");
      } else {
        const res = await api.post<{ token: string; user: { id: string; name: string; email: string } }>(
          "/api/auth/login",
          { email, password }
        );
        setToken(res.token);
        setStoredUser(res.user);

        if (typeof window !== "undefined") {
          if (rememberMe) {
            localStorage.setItem("nexora_remembered_email", email);
          } else {
            localStorage.removeItem("nexora_remembered_email");
          }
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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-500">
        <Spinner size="lg" />
        <p className="text-xs">Verifying session…</p>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
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

          {/* Selector Tabs */}
          <div className="flex border border-zinc-200 dark:border-zinc-800 mb-6 bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-1">
            <button
              onClick={() => {
                setIsRegister(false);
                setError(null);
                router.replace("/login");
              }}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                !isRegister ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
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
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                isRegister ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
              }`}
            >
              Create Account
            </button>
          </div>

          <Card className="border border-zinc-250 dark:border-zinc-850 shadow-glow bg-white dark:bg-zinc-950">
            <CardHeader className="space-y-1 p-6 pb-4">
              <CardTitle className="text-xl font-bold tracking-tight">
                {isRegister ? "Create your account" : "Welcome back"}
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                {isRegister ? "Set up your credentials to get started." : "Sign in to continue growing your business."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {isRegister && (
                  <div>
                    <Label className="text-xs">Full Name</Label>
                    <Input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs">Email Address</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="mb-1.5 text-xs">Password</Label>
                    {!isRegister && (
                      <Link href="/forgot-password" className="text-xs text-zinc-500 hover:underline mb-1.5 font-medium">
                        Forgot Password?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10 h-9 text-xs"
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

                {isRegister && (
                  <>
                    <div>
                      <Label className="text-xs">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pr-10 h-9 text-xs"
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

                    <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-md p-3 text-[11px] flex flex-col gap-1.5 text-left">
                      <p className="font-semibold uppercase tracking-wider text-zinc-400 text-[10px] mb-1">Password Rules</p>
                      <div className="flex items-center gap-1.5">
                        <span className={checks.length ? "text-emerald-500 font-semibold" : "text-zinc-450"}>✓</span>
                        <span className={checks.length ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-450"}>Min 8 characters</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={checks.uppercase ? "text-emerald-500 font-semibold" : "text-zinc-450"}>✓</span>
                        <span className={checks.uppercase ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-450"}>At least 1 uppercase letter</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={checks.lowercase ? "text-emerald-500 font-semibold" : "text-zinc-450"}>✓</span>
                        <span className={checks.lowercase ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-450"}>At least 1 lowercase letter</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={checks.number ? "text-emerald-500 font-semibold" : "text-zinc-450"}>✓</span>
                        <span className={checks.number ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-450"}>At least 1 number</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={checks.special ? "text-emerald-500 font-semibold" : "text-zinc-450"}>✓</span>
                        <span className={checks.special ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-450"}>At least 1 special char (@$!%*?&)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={checks.match ? "text-emerald-500 font-semibold" : "text-zinc-450"}>✓</span>
                        <span className={checks.match ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-450"}>Passwords match</span>
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
                      className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-50 focus:ring-zinc-900 dark:focus:ring-zinc-300"
                    />
                    <label htmlFor="rememberMe" className="text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer select-none font-medium">
                      Remember email on this device
                    </label>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive" className="py-2.5 px-3">
                    <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
                  </Alert>
                )}
                
                <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.01 }} whileTap={shouldReduceMotion ? {} : { scale: 0.99 }} className="w-full mt-2">
                  <Button type="submit" isLoading={loading} className="w-full h-9 text-xs hover:shadow-premium shadow-md transition-all duration-150" disabled={isRegister && !isRegisterFormValid}>
                    {isRegister ? "Create Account" : "Sign In"}
                  </Button>
                </motion.div>
              </form>

              {/* Social Google Sign-In */}
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex items-center my-1">
                  <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800"></div>
                  <span className="px-3 text-xs text-zinc-400 font-medium">or</span>
                  <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800"></div>
                </div>

                <div className="flex justify-center w-full">
                  {googleClientId ? (
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                    />
                  ) : (
                    <div className="text-center p-3 border border-amber-500/25 bg-amber-500/[0.02] rounded-md w-full">
                      <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5 leading-none">
                        ⚠️ Google OAuth is Disabled
                      </p>
                      <p className="text-[9px] text-zinc-550 dark:text-zinc-450 mt-1.5 leading-normal max-w-xs mx-auto text-center">
                        Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to your local environment file (`frontend/.env.local`) to activate Google Sign-In options.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Try Nexora for Demo Business Option */}
              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                <p className="text-[10px] text-zinc-450 dark:text-zinc-550 text-center font-medium">Want to explore before creating an account?</p>
                <motion.div whileHover={shouldReduceMotion ? {} : { scale: 1.01 }} whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="w-full text-xs font-semibold h-9 shadow-sm hover:shadow-premium"
                  >
                    🚀 Try Nexora with a demo business
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-zinc-550 dark:text-zinc-400 mt-6 font-medium">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <button onClick={() => { setIsRegister(false); router.replace("/login"); }} className="text-zinc-900 dark:text-zinc-100 hover:underline font-semibold">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button onClick={() => { setIsRegister(true); router.replace("/login?tab=register"); }} className="text-zinc-900 dark:text-zinc-100 hover:underline font-semibold">
                  Create one
                </button>
              </>
            )}
          </p>
        </motion.div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-500">
        <Spinner size="lg" />
        <p className="text-xs">Verifying session…</p>
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
