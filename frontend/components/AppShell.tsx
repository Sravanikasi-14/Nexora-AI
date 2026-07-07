"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { setToken, setBusinessId, setStoredUser, getStoredUser } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "◆" },
  { href: "/customers", label: "Customer Analystics", icon: "◈" },
  { href: "/chat", label: "AI Chat", icon: "◇" },
  { href: "/missions", label: "Growth Missions", icon: "◉" },
  { href: "/insights", label: "Insights", icon: "◐" },
  { href: "/automation", label: "Automation", icon: "◑" },
  { href: "/settings", label: "Settings", icon: "◒" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = mounted ? getStoredUser() : null;

  function logout() {
    setToken(null);
    setBusinessId(null);
    setStoredUser(null);
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex bg-base text-ink">
      <aside className="w-64 shrink-0 border-r border-border flex flex-col p-5 gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display font-bold text-white">
            N
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Nexora</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active ? "bg-surface2 text-ink" : "text-muted hover:text-ink hover:bg-surface2/60"
                }`}
              >
                <span className={active ? "text-accent" : "text-muted"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-border">
          <div className="px-1 mb-3">
            <p className="text-sm font-medium truncate">{user?.name || "Business Owner"}</p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="btn-ghost w-full justify-start text-sm">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
