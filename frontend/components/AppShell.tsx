"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, setToken, setBusinessId, setStoredUser, getStoredUser, getBusinessId } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import Logo from "@/components/brand/Logo";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Mic,
  BarChart3,
  Bot,
  Target,
  Lightbulb,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/talk", label: "Talk with Nexora", icon: Mic },
  { href: "/customers", label: "Customer Analytics", icon: BarChart3 },
  { href: "/chat", label: "AI Assistant", icon: Bot },
  { href: "/suggested-messages", label: "AI Suggested Messages", icon: MessageSquare },
  { href: "/missions", label: "Growth Missions", icon: Target },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/settings", label: "Settings", icon: Settings },
];



export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());
    const savedTheme = localStorage.getItem("nexora_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setTheme(systemTheme);
    }
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("nexora_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };



  function logout() {
    api.post("/api/auth/logout").catch(() => {});
    queryClient.clear();
    setToken(null);
    setBusinessId(null);
    setStoredUser(null);
    router.push("/login");
  }

  // Prefetch data on hover for instant perceived navigation
  const handlePrefetch = (href: string) => {
    const bId = getBusinessId();
    if (!bId) return;

    if (href === "/dashboard" || href === "/talk") {
      queryClient.prefetchQuery({
        queryKey: ["dashboard", bId],
        queryFn: () => api.get(`/api/dashboard/${bId}`),
      });
    } else if (href === "/missions") {
      queryClient.prefetchQuery({
        queryKey: ["missions", bId],
        queryFn: () => api.get(`/api/missions/${bId}`),
      });
    } else if (href === "/customers") {
      queryClient.prefetchQuery({
        queryKey: ["customers", bId],
        queryFn: () => api.get(`/api/customers/business/${bId}`),
      });
    } else if (href === "/insights") {
      queryClient.prefetchQuery({
        queryKey: ["insights", bId],
        queryFn: () => api.get(`/api/insights/${bId}`),
      });
    } else if (href === "/suggested-messages") {
      queryClient.prefetchQuery({
        queryKey: ["suggested-messages", bId],
        queryFn: () => api.get(`/api/automation/${bId}/suggestions`),
      });
    } else if (href === "/chat") {
      queryClient.prefetchQuery({
        queryKey: ["chat", bId],
        queryFn: () => api.get(`/api/chat/${bId}`),
      });
    }
  };


  return (
    <div className="h-screen flex flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 relative overflow-hidden">
      {/* Premium Gradient Mesh Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {/* Soft radial glow top right */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-500/[0.03] to-indigo-500/[0.01] blur-[100px] dark:from-blue-500/[0.02] dark:to-transparent" />
        {/* Soft radial glow bottom left */}
        <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-500/[0.03] to-pink-500/[0.01] blur-[120px] dark:from-purple-500/[0.01] dark:to-transparent" />
        {/* Tiny breathing floating blurs */}
        <motion.div 
          animate={shouldReduceMotion ? {} : { 
            y: [0, -15, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full bg-blue-500/[0.015] blur-[80px] dark:bg-blue-600/[0.01]"
        />
        <motion.div 
          animate={shouldReduceMotion ? {} : { 
            y: [0, 20, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-1/3 right-1/3 w-80 h-80 rounded-full bg-purple-500/[0.015] blur-[90px] dark:bg-purple-600/[0.01]"
        />
      </div>
      {/* Mobile Sticky Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 z-30 sticky top-0">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo iconSize={30} />
        </Link>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors flex items-center justify-center"
          title="Open Menu"
          type="button"
        >
          <Menu size={20} strokeWidth={2} />
        </button>
      </header>

      {/* Dark Mobile Sidebar Backdrop Mask overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky md:top-4 md:h-[calc(100vh-2rem)] inset-y-0 left-0 w-52 m-0 md:m-4 rounded-none md:rounded-[24px] bg-white/70 dark:bg-zinc-950/75 backdrop-blur-xl border-r md:border border-zinc-200/50 dark:border-zinc-900/60 flex flex-col p-4 gap-5 z-50 transform transition-transform duration-300 ease-in-out md:transform-none md:shrink-0 shadow-premium",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header container inside Sidebar */}
        <div className="flex items-center justify-between md:block px-1.5 py-1">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo iconSize={32} />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-[12px] hover:bg-zinc-150 dark:hover:bg-zinc-900 text-zinc-550 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
            title="Close Menu"
            type="button"
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>

        {/* Navigation Items Link List */}
        <nav className="flex flex-col gap-1 overflow-y-auto relative">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => handlePrefetch(item.href)}
                className={cn(
                  "group relative flex items-center gap-2.5 px-3 py-2 rounded-[14px] text-[11px] font-bold transition-all duration-200",
                  active
                    ? "text-white"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-150/30 dark:hover:bg-zinc-900/40"
                )}
              >
                {/* Active Indicator Layer */}
                {active && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[14px] -z-10 shadow-sm shadow-blue-500/20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                <span
                  className={cn(
                    "transition-all duration-300 shrink-0",
                    active ? "text-white" : "text-zinc-400 dark:text-zinc-500 group-hover:scale-110 group-hover:rotate-6 group-hover:text-zinc-900 dark:group-hover:text-zinc-50"
                  )}
                >
                  <Icon size={14} strokeWidth={2.2} />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="mt-auto pt-3.5 border-t border-zinc-200/50 dark:border-zinc-900 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0 flex-1 flex items-center gap-2">
              {user?.avatar && user.avatar.startsWith("http") ? (
                // Google profile picture URL
                <img
                  src={user.avatar}
                  alt={user.name || "User"}
                  className="w-6 h-6 rounded-full shrink-0 object-cover shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800"
                  referrerPolicy="no-referrer"
                />
              ) : user?.avatar ? (
                // Color gradient avatar (password sign-up users)
                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-bold text-white text-[10px] shadow-sm ${user.avatar}`}>
                  {(user.name?.charAt(0) || "B").toUpperCase()}
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-250 dark:border-zinc-800 shrink-0 flex items-center justify-center font-bold text-[10px] shadow-sm">
                  {(user?.name?.charAt(0) || "B").toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 truncate leading-tight">{user?.name || "Business Owner"}</p>
                <p className="text-[8px] text-zinc-400 dark:text-zinc-500 truncate leading-none mt-0.5">{user?.email}</p>
              </div>
            </div>
            
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-[10px] hover:bg-zinc-150 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors flex items-center justify-center shrink-0 border border-zinc-200/40 dark:border-zinc-800/40 shadow-sm"
              title="Toggle Theme"
              type="button"
            >
              {theme === "dark" ? (
                <Sun size={13} strokeWidth={2.2} />
              ) : (
                <Moon size={13} strokeWidth={2.2} />
              )}
            </button>
          </div>

          <button
            onClick={logout}
            className="group w-full justify-start text-[10px] font-bold px-3 py-2 rounded-[14px] hover:bg-red-500/10 dark:hover:bg-red-950/20 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition-colors flex items-center gap-2 border border-transparent"
          >
            <span className="transition-transform duration-300 shrink-0 text-zinc-400 dark:text-zinc-500 group-hover:scale-110 group-hover:-translate-x-0.5 group-hover:text-red-500 dark:group-hover:text-red-400">
              <LogOut size={13} strokeWidth={2.2} />
            </span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Page Content Body Area */}
      <main className="flex-1 min-w-0 overflow-y-auto relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
