"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, setToken, setBusinessId, setStoredUser, getStoredUser, getBusinessId } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
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
  { href: "/chat", label: "AI Chat", icon: Bot },
  { href: "/suggested-messages", label: "AI Suggested Messages", icon: MessageSquare },
  { href: "/missions", label: "Growth Missions", icon: Target },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
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

  const user = mounted ? getStoredUser() : null;

  function logout() {
    api.post("/api/auth/logout").catch(() => {});
    setToken(null);
    setBusinessId(null);
    setStoredUser(null);
    router.push("/login");
  }

  // Prefetch data on hover for instant perceived navigation
  const handlePrefetch = (href: string) => {
    const bId = getBusinessId();
    if (!bId) return;

    if (href === "/dashboard") {
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
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 relative">
      {/* Mobile Sticky Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 z-30 sticky top-0">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center font-display font-bold text-white dark:text-zinc-900 text-sm shadow">
            N
          </div>
          <span className="font-display font-semibold text-base tracking-tight">Nexora</span>
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
          "fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-5 gap-6 z-50 transform transition-transform duration-300 ease-in-out md:transform-none md:shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header container inside Sidebar */}
        <div className="flex items-center justify-between md:block">
          <Link href="/dashboard" className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center font-display font-bold text-white dark:text-zinc-900 text-sm shadow">
              N
            </div>
            <span className="font-display font-semibold text-base tracking-tight">Nexora</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-550 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
            title="Close Menu"
            type="button"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Navigation Items Link List */}
        <nav className="flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => handlePrefetch(item.href)}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-550 font-semibold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50"
                )}
              >
                <span
                  className={cn(
                    "transition-all duration-150 shrink-0",
                    active ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-50"
                  )}
                >
                  <Icon size={18} strokeWidth={2} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="px-1 min-w-0 flex-1 flex items-center gap-3">
              {user?.avatar ? (
                <div className={cn("w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-bold text-white text-xs", user.avatar)}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-center font-bold text-xs">
                  {user?.name?.charAt(0).toUpperCase() || "B"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-snug">{user?.name || "Business Owner"}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate leading-none mt-0.5">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors flex items-center justify-center shrink-0 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
              title="Toggle Theme"
              type="button"
            >
              {theme === "dark" ? (
                <Sun size={16} strokeWidth={2} />
              ) : (
                <Moon size={16} strokeWidth={2} />
              )}
            </button>
          </div>
          <button
            onClick={logout}
            className="group w-full justify-start text-xs font-medium px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors flex items-center gap-3 border border-transparent"
          >
            <span className="transition-all duration-150 shrink-0 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-50">
              <LogOut size={16} strokeWidth={2} />
            </span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Page Content Body Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
