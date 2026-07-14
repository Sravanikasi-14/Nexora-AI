"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api, getStoredUser, setStoredUser, ApiError } from "@/lib/api";

const AVATAR_PRESETS = [
  "bg-gradient-to-tr from-blue-500 to-indigo-500",
  "bg-gradient-to-tr from-purple-500 to-pink-500",
  "bg-gradient-to-tr from-emerald-500 to-teal-500",
  "bg-gradient-to-tr from-amber-500 to-orange-500",
];

export default function SettingsPage() {
  const { business, loading } = useSession({ requireBusiness: true });
  const currentUser = getStoredUser();

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(currentUser?.name || "");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentUser?.avatar || null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <AppShell><div className="text-muted">Loading…</div></AppShell>;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const res = await api.patch<{ user: { id: string; name: string; email: string; avatar: string | null } }>(
        "/api/auth/profile",
        { name, avatar: selectedAvatar }
      );
      setStoredUser(res.user);
      setSuccess("Profile updated successfully!");
      setEditMode(false);
    } catch (err) {
      setError((err as any)?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold mb-7">Settings</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Account Settings Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-medium">Account Profile</p>
            {!editMode && (
              <button
                onClick={() => {
                  setName(currentUser?.name || "");
                  setSelectedAvatar(currentUser?.avatar || null);
                  setEditMode(true);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs text-accent hover:underline font-semibold"
              >
                Edit Profile
              </button>
            )}
          </div>

          {editMode ? (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="label mb-2">Choose Avatar Badge</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedAvatar(null)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xs text-muted ${
                      selectedAvatar === null ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-white/40"
                    }`}
                  >
                    None
                  </button>
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSelectedAvatar(preset)}
                      className={`w-10 h-10 rounded-full border-2 shrink-0 ${preset} ${
                        selectedAvatar === preset ? "border-accent scale-105" : "border-transparent hover:scale-105"
                      } transition-all`}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex gap-2.5 mt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-xs py-2">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="btn-secondary flex-1 text-xs py-2 border border-border"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              {success && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs">
                  {success}
                </div>
              )}
              <div className="flex items-center gap-4">
                {currentUser?.avatar ? (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm ${currentUser.avatar}`}>
                    {currentUser.name?.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm">
                    {currentUser?.name?.charAt(0).toUpperCase() || "B"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{currentUser?.name}</p>
                  <p className="text-xs text-muted mt-0.5">{currentUser?.email}</p>
                </div>
              </div>
              <div className="border-t border-border/50 pt-3 flex flex-col gap-2.5 text-xs">
                <div>
                  <span className="text-muted mr-2">Login Provider:</span>
                  <span className="capitalize font-semibold text-accent2">{currentUser?.provider || "credentials"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Business Profile Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-medium">Business Profile</p>
            <Link href="/discovery" className="text-xs text-accent hover:underline font-semibold">Edit</Link>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <div><p className="text-muted text-xs mb-0.5">Name</p><p>{business?.name}</p></div>
            <div><p className="text-muted text-xs mb-0.5">Industry</p><p>{business?.industry}</p></div>
            <div><p className="text-muted text-xs mb-0.5">Location</p><p>{business?.location || "Not set"}</p></div>
            <div><p className="text-muted text-xs mb-0.5">Goals</p><p>{business?.goals || "Not set"}</p></div>
          </div>
        </div>

        {/* Digital Channels Card */}
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
