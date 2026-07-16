"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, setToken, setBusinessId, setStoredUser, getStoredUser } from "@/lib/api";
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

  // Close sidebar overlay automatically when path changes (mobile friendly navigation)
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-base text-ink relative">
      {/* Mobile Sticky Header (Visible only on screens below md width) */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-surface border-b border-border z-30 sticky top-0">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display font-bold text-white shadow-md shadow-accent/15">
            N
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Nexora</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-surface2 text-muted hover:text-ink transition-colors flex items-center justify-center"
          title="Open Menu"
          type="button"
        >
          <Menu size={22} strokeWidth={1.8} />
        </button>
      </header>

      {/* Dark Mobile Sidebar Backdrop Mask overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navigation Sidebar (Fixed drawer on mobile, static side panel on desktop) */}
      <aside
        className={`fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 w-64 bg-surface border-r border-border flex flex-col p-5 gap-6 z-50 transform transition-transform duration-300 ease-in-out md:transform-none md:shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header container inside Sidebar */}
        <div className="flex items-center justify-between md:block">
          <Link href="/dashboard" className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display font-bold text-white shadow-md shadow-accent/15">
              N
            </div>
            <span className="font-display font-semibold text-lg tracking-tight">Nexora</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-lg hover:bg-surface2 text-muted hover:text-ink transition-colors"
            title="Close Menu"
            type="button"
          >
            <X size={20} strokeWidth={1.8} />
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
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out hover:bg-accent/5 hover:text-accent hover:translate-x-0.5 ${
                  active ? "bg-accent/10 text-accent font-semibold" : "text-muted hover:text-accent"
                }`}
              >
                <span
                  className={`transition-all duration-200 ease-in-out group-hover:scale-[1.05] shrink-0 ${
                    active ? "text-accent" : "text-muted group-hover:text-accent"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="mt-auto pt-4 border-t border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="px-1 min-w-0 flex-1 flex items-center gap-3">
              {user?.avatar ? (
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-white text-xs ${user.avatar}`}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-accent/20 text-accent shrink-0 flex items-center justify-center font-bold text-xs">
                  {user?.name?.charAt(0).toUpperCase() || "B"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user?.name || "Business Owner"}</p>
                <p className="text-xs text-muted truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-surface2 text-muted hover:text-ink transition flex items-center justify-center shrink-0"
              title="Toggle Theme"
              type="button"
            >
              {theme === "dark" ? (
                <Sun size={20} strokeWidth={1.8} />
              ) : (
                <Moon size={20} strokeWidth={1.8} />
              )}
            </button>
          </div>
          <button
            onClick={logout}
            className="group w-full justify-start text-sm px-3 py-2 rounded-lg hover:bg-accent/5 hover:text-accent transition-all duration-200 ease-in-out flex items-center gap-3"
          >
            <span className="transition-all duration-200 ease-in-out group-hover:scale-[1.05] shrink-0 text-muted group-hover:text-accent">
              <LogOut size={20} strokeWidth={1.8} />
            </span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Page Content Body Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
