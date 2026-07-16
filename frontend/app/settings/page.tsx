"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api, getStoredUser, setStoredUser, ApiError } from "@/lib/api";
import { Business } from "@/lib/types";
import { Globe, MapPin, Target, ExternalLink, Edit3, CheckCircle2, User, Info } from "lucide-react";

const AVATAR_PRESETS = [
  "bg-gradient-to-tr from-blue-500 to-indigo-500",
  "bg-gradient-to-tr from-purple-500 to-pink-500",
  "bg-gradient-to-tr from-emerald-500 to-teal-500",
  "bg-gradient-to-tr from-amber-500 to-orange-500",
];

export default function SettingsPage() {
  const { business: initialBusiness, loading } = useSession({ requireBusiness: true });
  const currentUser = getStoredUser();

  const [business, setBusiness] = useState<Business | null>(null);

  // Profile Edit states
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentUser?.avatar || null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Business Edit Modal states
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [bizSaving, setBizSaving] = useState(false);
  const [bizError, setBizError] = useState<string | null>(null);
  const [bizForm, setBizForm] = useState({
    name: "",
    industry: "",
    location: "",
    goals: "",
    googleBusiness: "",
    instagram: "",
    facebook: "",
    website: "",
    whatsappBiz: "",
    linkedin: "",
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialBusiness) {
      setBusiness(initialBusiness);
    }
  }, [initialBusiness]);

  if (loading) {
    return (
      <AppShell>
        <div className="text-muted">Loading settings…</div>
      </AppShell>
    );
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setSuccessMsg(null);
    setProfileSaving(true);

    try {
      const res = await api.patch<{ user: { id: string; name: string; email: string; avatar: string | null } }>(
        "/api/auth/profile",
        { name: profileName, avatar: selectedAvatar }
      );
      setStoredUser(res.user);
      setSuccessMsg("Account profile updated successfully!");
      setEditProfileMode(false);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  function handleOpenBizModal() {
    if (!business) return;
    setBizForm({
      name: business.name || "",
      industry: business.industry || "",
      location: business.location || "",
      goals: business.goals || "",
      googleBusiness: business.googleBusiness || "",
      instagram: business.instagram || "",
      facebook: business.facebook || "",
      website: business.website || "",
      whatsappBiz: business.whatsappBiz || "",
      linkedin: business.linkedin || "",
    });
    setBizError(null);
    setShowBusinessModal(true);
  }

  async function handleSaveBiz(e: React.FormEvent) {
    e.preventDefault();
    setBizSaving(true);
    setBizError(null);
    setSuccessMsg(null);

    try {
      const res = await api.post<{ business: Business }>("/api/business", {
        ...bizForm,
        businessId: business?.id,
      });
      setBusiness(res.business);
      setSuccessMsg("Business profile & channels updated successfully!");
      setShowBusinessModal(false);
    } catch (err) {
      setBizError(err instanceof ApiError ? err.message : "Failed to save business settings.");
    } finally {
      setBizSaving(false);
    }
  }

  return (
    <AppShell>
      {/* Toast Success Message */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1">Settings</h1>
          <p className="text-muted text-sm font-medium">Manage your personal account profile, business details, and public digital channels.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Account Profile Card */}
        <div className="card p-6 flex flex-col justify-between border border-border bg-surface">
          <div>
            <div className="flex items-center justify-between mb-5 border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <User className="text-accent2" size={18} />
                <h3 className="font-semibold text-sm text-ink">Account Profile</h3>
              </div>
              {!editProfileMode && (
                <button
                  onClick={() => {
                    setProfileName(currentUser?.name || "");
                    setSelectedAvatar(currentUser?.avatar || null);
                    setEditProfileMode(true);
                    setProfileError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-accent hover:underline font-bold flex items-center gap-1"
                >
                  <Edit3 size={12} />
                  Edit Profile
                </button>
              )}
            </div>

            {editProfileMode ? (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    className="input text-sm py-2.5"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <label className="label mb-2">Choose Avatar Badge</label>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedAvatar(null)}
                      className={`w-10 h-10 rounded-full border border-border flex items-center justify-center font-bold text-xs bg-surface hover:border-accent/40 ${
                        selectedAvatar === null ? "border-accent ring-2 ring-accent/25 text-accent" : "text-muted"
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

                {profileError && <p className="text-xs text-danger font-semibold mt-1">⚠️ {profileError}</p>}

                <div className="flex gap-2 mt-4 pt-2">
                  <button type="submit" disabled={profileSaving} className="btn-primary flex-1 text-xs py-2 font-semibold">
                    {profileSaving ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditProfileMode(false)}
                    className="btn-secondary flex-1 text-xs py-2 border border-border font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4 bg-surface2/15 p-4 rounded-xl border border-border/40">
                  {currentUser?.avatar ? (
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-base ${currentUser.avatar}`}>
                      {currentUser.name?.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-base">
                      {currentUser?.name?.charAt(0).toUpperCase() || "B"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-ink leading-tight">{currentUser?.name}</p>
                    <p className="text-xs text-muted mt-1">{currentUser?.email}</p>
                  </div>
                </div>

                <div className="bg-surface2/10 p-3.5 rounded-xl border border-border/30 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted font-medium">Authentication Type:</span>
                    <span className="capitalize font-bold text-accent2 bg-accent2/10 px-2 py-0.5 rounded border border-accent2/20">
                      {currentUser?.provider || "Credentials"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Business Profile Card */}
        <div className="card p-6 border border-border bg-surface flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="text-accent" size={18} />
                <h3 className="font-semibold text-sm text-ink">Business Profile Details</h3>
              </div>
              <button
                onClick={handleOpenBizModal}
                className="text-xs text-accent hover:underline font-bold flex items-center gap-1"
              >
                <Edit3 size={12} />
                Edit Details
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-surface2/10 p-3.5 rounded-xl border border-border/40">
                  <span className="text-[10px] text-muted uppercase tracking-wider block mb-1 font-semibold">Business Name</span>
                  <span className="text-xs font-bold text-ink leading-relaxed block">{business?.name || "—"}</span>
                </div>
                <div className="bg-surface2/10 p-3.5 rounded-xl border border-border/40">
                  <span className="text-[10px] text-muted uppercase tracking-wider block mb-1 font-semibold">Industry Sector</span>
                  <span className="text-xs font-bold text-ink leading-relaxed block">{business?.industry || "—"}</span>
                </div>
                <div className="bg-surface2/10 p-3.5 rounded-xl border border-border/40">
                  <span className="text-[10px] text-muted uppercase tracking-wider block mb-1 font-semibold flex items-center gap-1">
                    <MapPin size={10} className="text-muted" /> Location / Market
                  </span>
                  <span className="text-xs font-bold text-ink leading-relaxed block">{business?.location || "Not configured"}</span>
                </div>
                <div className="bg-surface2/10 p-3.5 rounded-xl border border-border/40">
                  <span className="text-[10px] text-muted uppercase tracking-wider block mb-1 font-semibold flex items-center gap-1">
                    <Target size={10} className="text-muted" /> Strategic Goals
                  </span>
                  <span className="text-xs font-bold text-ink leading-relaxed block truncate-2-lines">{business?.goals || "Not configured"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Digital Channels Card */}
        <div className="card p-6 md:col-span-2 border border-border bg-surface">
          <div className="flex items-center justify-between mb-5 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="text-accent2" size={18} />
              <h3 className="font-semibold text-sm text-ink">Public Digital Channels</h3>
            </div>
            <button
              onClick={handleOpenBizModal}
              className="text-xs text-accent hover:underline font-bold flex items-center gap-1"
            >
              <Edit3 size={12} />
              Edit Profiles
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {[
              { label: "Google Business", val: business?.googleBusiness, prefix: "https://google.com/maps?q=" },
              { label: "Instagram", val: business?.instagram, prefix: "https://instagram.com/" },
              { label: "Facebook", val: business?.facebook, prefix: "https://facebook.com/" },
              { label: "Website", val: business?.website, prefix: "" },
              { label: "WhatsApp Business", val: business?.whatsappBiz, prefix: "https://wa.me/" },
              { label: "LinkedIn", val: business?.linkedin, prefix: "https://linkedin.com/in/" },
            ].map(({ label, val, prefix }) => {
              const isSet = !!val;
              const linkUrl = isSet ? (val.startsWith("http") ? val : `${prefix}${val}`) : "#";

              return (
                <div
                  key={label}
                  className={`flex flex-col justify-between border rounded-xl p-4 transition-all duration-200 ${
                    isSet
                      ? "border-accent2/25 bg-accent2/5 hover:border-accent2/45 hover:shadow-sm"
                      : "border-border/30 bg-surface2/5 text-muted"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/20">
                    <span className="text-[11px] font-semibold text-ink">{label}</span>
                    <span className={`text-[8px] font-bold uppercase pill py-0.5 px-1.5 ${
                      isSet ? "bg-accent2/15 text-accent2 border border-accent2/20" : "bg-muted/15 text-muted"
                    }`}>
                      {isSet ? "Connected" : "Not set"}
                    </span>
                  </div>
                  {isSet ? (
                    <a
                      href={linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline font-medium flex items-center gap-1 leading-normal break-all truncate mt-1"
                    >
                      <span>{val}</span>
                      <ExternalLink size={10} className="shrink-0" />
                    </a>
                  ) : (
                    <span className="text-[11px] italic text-muted/50 mt-1">No profile address configured</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unified Business & Profiles Edit Modal */}
      {showBusinessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="card w-full max-w-2xl p-6 relative bg-base shadow-2xl my-8">
            <button
              className="absolute top-4 right-4 text-muted hover:text-ink text-lg"
              onClick={() => setShowBusinessModal(false)}
            >
              ✕
            </button>
            <h2 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
              <Edit3 size={18} className="text-accent" /> Edit Business Info & Digital Channels
            </h2>
            <p className="text-xs text-muted mb-4 border-b border-border/40 pb-2">
              Updates saved here synchronize immediately with assessment generators and AISuggested outreach components.
            </p>

            <form onSubmit={handleSaveBiz} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Category: Business General Information */}
              <div>
                <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Info size={12} /> General Business Data
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Business Name</label>
                    <input
                      type="text"
                      className="input text-sm py-2.5"
                      required
                      value={bizForm.name}
                      onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
                      placeholder="My Business Ltd."
                    />
                  </div>
                  <div>
                    <label className="label">Industry Sector</label>
                    <input
                      type="text"
                      className="input text-sm py-2.5"
                      required
                      value={bizForm.industry}
                      onChange={(e) => setBizForm({ ...bizForm, industry: e.target.value })}
                      placeholder="Real Estate / E-Commerce"
                    />
                  </div>
                  <div>
                    <label className="label">Location / Primary Market</label>
                    <input
                      type="text"
                      className="input text-sm py-2.5"
                      value={bizForm.location}
                      onChange={(e) => setBizForm({ ...bizForm, location: e.target.value })}
                      placeholder="e.g. Mumbai, India"
                    />
                  </div>
                  <div>
                    <label className="label">Core Goals</label>
                    <input
                      type="text"
                      className="input text-sm py-2.5"
                      value={bizForm.goals}
                      onChange={(e) => setBizForm({ ...bizForm, goals: e.target.value })}
                      placeholder="e.g. Increase monthly leads by 20%"
                    />
                  </div>
                </div>
              </div>

              {/* Category: Digital Public Profiles */}
              <div className="border-t border-border/40 pt-4 mt-2">
                <h4 className="text-xs font-bold text-accent2 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Globe size={12} /> Public Social Profiles & Channels
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Website Link</label>
                    <input
                      type="text"
                      className="input text-sm py-2.5"
                      value={bizForm.website}
                      onChange={(e) => setBizForm({ ...bizForm, website: e.target.value })}
                      placeholder="https://mywebsite.com"
                    />
                  </div>
                  <div>
                    <label className="label">Google Business Profile URL / Q</label>
                    <input
                      type="text"
                      className="input text-sm py-2.5"
                      value={bizForm.googleBusiness}
                      onChange={(e) => setBizForm({ ...bizForm, googleBusiness: e.target.value })}
                      placeholder="https://g.page/r/..."
                    />
                  </div>
                  <div>
                    <label className="label">Instagram Profile URL / Handle</label>
                    <input
                      type="text"
                      className="input text-sm py-2.5"
                      value={bizForm.instagram}
                      onChange={(e) => setBizForm({ ...bizForm, instagram: e.target.value })}
                      placeholder="@mybusiness"
                    />
                  </div>
                  <div>
                    <label className="label">Facebook Profile Link / Handle</label>
                    <input
                      type="text"
                      className="input text-sm py-2.5"
                      value={bizForm.facebook}
                      onChange={(e) => setBizForm({ ...bizForm, facebook: e.target.value })}
                      placeholder="e.g. mybusiness.fb"
                    />
                  </div>
                  <div>
                    <label className="label">LinkedIn Profile URL</label>
                    <input
                      type="text"
                      className="input text-sm py-2.5"
                      value={bizForm.linkedin}
                      onChange={(e) => setBizForm({ ...bizForm, linkedin: e.target.value })}
                      placeholder="https://linkedin.com/company/..."
                    />
                  </div>
                  <div>
                    <label className="label">WhatsApp Business Phone Number</label>
                    <input
                      type="text"
                      className="input text-sm py-2.5"
                      value={bizForm.whatsappBiz}
                      onChange={(e) => setBizForm({ ...bizForm, whatsappBiz: e.target.value })}
                      placeholder="+919000000000"
                    />
                  </div>
                </div>
              </div>

              {bizError && <p className="text-xs text-danger font-semibold mt-2">⚠️ {bizError}</p>}

              <div className="flex justify-end gap-2 mt-6 border-t border-border/40 pt-4">
                <button
                  type="button"
                  className="btn-secondary text-xs px-4 py-2"
                  onClick={() => setShowBusinessModal(false)}
                  disabled={bizSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs px-5 py-2 font-semibold" disabled={bizSaving}>
                  {bizSaving ? "Saving Details…" : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
