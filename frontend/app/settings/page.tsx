"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { getStoredUser } from "@/lib/api";

export default function SettingsPage() {
  const { business, loading } = useSession({ requireBusiness: true });
  const user = getStoredUser();

  if (loading) return <AppShell><div className="text-muted">Loading…</div></AppShell>;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold mb-7">Settings</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-6">
          <p className="font-medium mb-4">Account</p>
          <div className="flex flex-col gap-3 text-sm">
            <div><p className="text-muted text-xs mb-0.5">Name</p><p>{user?.name}</p></div>
            <div><p className="text-muted text-xs mb-0.5">Email</p><p>{user?.email}</p></div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-medium">Business Profile</p>
            <Link href="/discovery" className="text-xs text-accent">Edit</Link>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <div><p className="text-muted text-xs mb-0.5">Name</p><p>{business?.name}</p></div>
            <div><p className="text-muted text-xs mb-0.5">Industry</p><p>{business?.industry}</p></div>
            <div><p className="text-muted text-xs mb-0.5">Location</p><p>{business?.location || "Not set"}</p></div>
            <div><p className="text-muted text-xs mb-0.5">Goals</p><p>{business?.goals || "Not set"}</p></div>
          </div>
        </div>

        <div className="card p-6 md:col-span-2">
          <p className="font-medium mb-4">Digital Channels</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {[
              ["Google Business", business?.googleBusiness],
              ["Instagram", business?.instagram],
              ["Facebook", business?.facebook],
              ["Website", business?.website],
              ["WhatsApp Business", business?.whatsappBiz],
              ["LinkedIn", business?.linkedin],
            ].map(([label, val]) => (
              <div key={label as string} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                <span className="text-muted">{label}</span>
                <span className={val ? "text-accent2" : "text-muted"}>{val ? "Connected" : "Not set"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
