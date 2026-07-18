"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useSession } from "@/lib/useSession";
import { api, getStoredUser, setStoredUser, ApiError } from "@/lib/api";
import { Business } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner, Skeleton } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, MapPin, Target, ExternalLink, Edit3, User, Info, X } from "lucide-react";

const AVATAR_PRESETS = [
  "bg-gradient-to-tr from-blue-500 to-indigo-500",
  "bg-gradient-to-tr from-purple-500 to-pink-500",
  "bg-gradient-to-tr from-emerald-500 to-teal-500",
  "bg-gradient-to-tr from-amber-500 to-orange-500",
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { business, loading } = useSession({ requireBusiness: true });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);
    if (user) {
      setProfileName(user.name);
      setSelectedAvatar(user.avatar || null);
    }
  }, []);

  // Profile Edit states
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Business Edit Modal states
  const [showBusinessModal, setShowBusinessModal] = useState(false);
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

  // React Query Mutation: Save Profile Details
  const saveProfileMutation = useMutation({
    mutationFn: async ({ name, avatar }: { name: string; avatar: string | null }) => {
      const res = await api.patch<{ user: { id: string; name: string; email: string; avatar: string | null } }>(
        "/api/auth/profile",
        { name, avatar }
      );
      return res.user;
    },
    onSuccess: (updatedUser) => {
      setStoredUser(updatedUser);
      setSuccessMsg("Account profile updated successfully!");
      setEditProfileMode(false);
      setProfileError(null);
      // Force refresh cached session business data
      queryClient.invalidateQueries({ queryKey: ["businessMe"] });
    },
    onError: (err) => {
      setProfileError(err instanceof ApiError ? err.message : "Failed to update profile.");
    },
  });

  // React Query Mutation: Save Business Details
  const saveBusinessMutation = useMutation({
    mutationFn: async (formData: typeof bizForm) => {
      const res = await api.post<{ business: Business }>("/api/business", {
        ...formData,
        businessId: business?.id,
      });
      return res.business;
    },
    onSuccess: (updatedBiz) => {
      setSuccessMsg("Business profile & channels updated successfully!");
      setShowBusinessModal(false);
      setBizError(null);
      // Invalidate related metadata queries
      queryClient.invalidateQueries({ queryKey: ["businessMe"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", updatedBiz.id] });
      queryClient.invalidateQueries({ queryKey: ["insights", updatedBiz.id] });
    },
    onError: (err) => {
      setBizError(err instanceof ApiError ? err.message : "Failed to save business settings.");
    },
  });

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-8 max-w-4xl mx-auto py-6 text-left">
          <div className="space-y-2">
            <Skeleton className="h-9 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
              <Card className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            </div>
            <div className="md:col-span-2 space-y-6">
              <Card className="p-6 space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-1 bg-zinc-200 dark:bg-zinc-800 w-full" />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setSuccessMsg(null);
    saveProfileMutation.mutate({ name: profileName, avatar: selectedAvatar });
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

  function handleSaveBiz(e: React.FormEvent) {
    e.preventDefault();
    setBizError(null);
    setSuccessMsg(null);
    saveBusinessMutation.mutate(bizForm);
  }

  return (
    <AppShell>
      {/* Toast Success Message */}
      {successMsg && (
        <Alert variant="success" className="mb-6 animate-fade-in py-3 text-left">
          <AlertDescription className="text-xs font-semibold">{successMsg}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 text-left">
        <h1 className="font-display text-2xl font-semibold mb-1">Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs">
          Manage your personal account profile, business details, and public digital channels.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 text-left">
        {/* Account Profile Card */}
        <Card className="border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-150 dark:border-zinc-850 p-6 pb-4">
            <div className="flex items-center gap-2">
              <User className="text-zinc-550" size={16} />
              <CardTitle className="text-sm font-semibold">Account Profile</CardTitle>
            </div>
            {!editProfileMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setProfileName(currentUser?.name || "");
                  setSelectedAvatar(currentUser?.avatar || null);
                  setEditProfileMode(true);
                  setProfileError(null);
                  setSuccessMsg(null);
                }}
                className="h-8 text-xs font-semibold px-3 flex items-center gap-1.5"
              >
                <Edit3 size={12} />
                Edit Profile
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-6">
            {editProfileMode ? (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Choose Avatar Badge</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAvatar(null)}
                      className={`h-9 px-3.5 text-xs font-semibold ${
                        selectedAvatar === null ? "ring-2 ring-accent/20 border-accent text-accent" : ""
                      }`}
                    >
                      None
                    </Button>
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSelectedAvatar(preset)}
                        className={`w-9 h-9 rounded-full border-2 shrink-0 ${preset} ${
                          selectedAvatar === preset ? "border-zinc-900 dark:border-white scale-105" : "border-transparent hover:scale-105"
                        } transition-all duration-150`}
                        title="Avatar Preset"
                      />
                    ))}
                  </div>
                </div>

                {profileError && (
                  <Alert variant="destructive" className="py-2 px-3">
                    <AlertDescription className="text-xs font-semibold">
                      {profileError}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 mt-4 pt-2">
                  <Button type="submit" isLoading={saveProfileMutation.isPending} className="flex-1 text-xs h-9">
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditProfileMode(false)}
                    className="flex-1 text-xs h-9"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  {currentUser?.avatar ? (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base ${currentUser.avatar}`}>
                      {(currentUser.name?.charAt(0) || "B").toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-bold text-base">
                      {(currentUser?.name?.charAt(0) || "B").toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{currentUser?.name}</p>
                    <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-1">{currentUser?.email}</p>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/20 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-550 font-semibold">Authentication Type:</span>
                    <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                      {currentUser?.provider || "Credentials"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Profile Card */}
        <Card className="border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-150 dark:border-zinc-850 p-6 pb-4">
            <div className="flex items-center gap-2">
              <Globe className="text-accent" size={16} />
              <CardTitle className="text-sm font-semibold">Business Profile Details</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenBizModal}
              className="h-8 text-xs font-semibold px-3 flex items-center gap-1.5"
            >
              <Edit3 size={12} />
              Edit Details
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/25 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1 font-bold">Business Name</span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed block">{business?.name || "—"}</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/25 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1 font-bold">Industry Sector</span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed block">{business?.industry || "—"}</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/25 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1 font-bold flex items-center gap-1">
                  <MapPin size={10} className="text-zinc-400" /> Location / Market
                </span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed block">{business?.location || "Not configured"}</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/25 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1 font-bold flex items-center gap-1">
                  <Target size={10} className="text-zinc-400" /> Strategic Goals
                </span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed block truncate line-clamp-2" title={business?.goals || ""}>
                  {business?.goals || "Not configured"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Digital Channels Card */}
        <Card className="md:col-span-2 border border-zinc-200 dark:border-zinc-800 shadow-premium bg-white dark:bg-zinc-950">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-150 dark:border-zinc-850 p-6 pb-4">
            <div className="flex items-center gap-2">
              <Globe className="text-accent2" size={16} />
              <CardTitle className="text-sm font-semibold">Public Digital Channels</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenBizModal}
              className="h-8 text-xs font-semibold px-3 flex items-center gap-1.5"
            >
              <Edit3 size={12} />
              Edit Profiles
            </Button>
          </CardHeader>
          <CardContent className="p-6">
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
                    className={`flex flex-col justify-between border rounded-lg p-4 transition-all duration-200 ${
                      isSet
                        ? "border-emerald-500/20 bg-emerald-500/[0.02] hover:border-emerald-500/40 hover:shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-150 dark:border-zinc-850">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
                      <Badge variant={isSet ? "success" : "secondary"} className="text-[9px] px-1.5 py-0 leading-none">
                        {isSet ? "Connected" : "Not set"}
                      </Badge>
                    </div>
                    {isSet ? (
                      <a
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline font-medium flex items-center gap-1 leading-normal break-all truncate mt-1 animate-fade-in"
                      >
                        <span>{val}</span>
                        <ExternalLink size={10} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="text-[10px] italic text-zinc-450 mt-1">No profile configured</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unified Business & Profiles Edit Modal */}
      {showBusinessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl p-6 relative bg-white dark:bg-zinc-950 shadow-premium my-8 border border-zinc-200 dark:border-zinc-800 animate-fade-in text-left animate-scale-in">
            <button
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
              onClick={() => setShowBusinessModal(false)}
              title="Close Dialog"
            >
              <X size={18} />
            </button>
            <h2 className="font-display text-sm font-semibold mb-1 flex items-center gap-2">
              <Edit3 size={16} className="text-accent" /> Edit Business Info & Digital Channels
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 border-b border-zinc-150 dark:border-zinc-850 pb-2">
              Updates saved here synchronize immediately with assessment generators and AI strategic recommendations.
            </p>

            <form onSubmit={handleSaveBiz} className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Category: Business General Information */}
              <div>
                <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Info size={12} /> General Business Data
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Business Name</Label>
                    <Input
                      required
                      value={bizForm.name}
                      onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
                      placeholder="My Business Ltd."
                    />
                  </div>
                  <div>
                    <Label>Industry Sector</Label>
                    <Input
                      required
                      value={bizForm.industry}
                      onChange={(e) => setBizForm({ ...bizForm, industry: e.target.value })}
                      placeholder="Real Estate / E-Commerce"
                    />
                  </div>
                  <div>
                    <Label>Location / Primary Market</Label>
                    <Input
                      value={bizForm.location}
                      onChange={(e) => setBizForm({ ...bizForm, location: e.target.value })}
                      placeholder="e.g. Mumbai, India"
                    />
                  </div>
                  <div>
                    <Label>Core Goals</Label>
                    <Input
                      value={bizForm.goals}
                      onChange={(e) => setBizForm({ ...bizForm, goals: e.target.value })}
                      placeholder="e.g. Increase monthly leads by 20%"
                    />
                  </div>
                </div>
              </div>

              {/* Category: Digital Public Profiles */}
              <div className="border-t border-zinc-150 dark:border-zinc-850 pt-4 mt-2">
                <h4 className="text-[10px] font-bold text-accent2 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Globe size={12} /> Public Social Profiles & Channels
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Website Link</Label>
                    <Input
                      value={bizForm.website}
                      onChange={(e) => setBizForm({ ...bizForm, website: e.target.value })}
                      placeholder="https://mywebsite.com"
                    />
                  </div>
                  <div>
                    <Label>Google Business Profile URL / Q</Label>
                    <Input
                      value={bizForm.googleBusiness}
                      onChange={(e) => setBizForm({ ...bizForm, googleBusiness: e.target.value })}
                      placeholder="https://g.page/r/..."
                    />
                  </div>
                  <div>
                    <Label>Instagram Profile URL / Handle</Label>
                    <Input
                      value={bizForm.instagram}
                      onChange={(e) => setBizForm({ ...bizForm, instagram: e.target.value })}
                      placeholder="@mybusiness"
                    />
                  </div>
                  <div>
                    <Label>Facebook Profile Link / Handle</Label>
                    <Input
                      value={bizForm.facebook}
                      onChange={(e) => setBizForm({ ...bizForm, facebook: e.target.value })}
                      placeholder="e.g. mybusiness.fb"
                    />
                  </div>
                  <div>
                    <Label>LinkedIn Profile URL</Label>
                    <Input
                      value={bizForm.linkedin}
                      onChange={(e) => setBizForm({ ...bizForm, linkedin: e.target.value })}
                      placeholder="https://linkedin.com/company/..."
                    />
                  </div>
                  <div>
                    <Label>WhatsApp Business Phone Number</Label>
                    <Input
                      value={bizForm.whatsappBiz}
                      onChange={(e) => setBizForm({ ...bizForm, whatsappBiz: e.target.value })}
                      placeholder="+919000000000"
                    />
                  </div>
                </div>
              </div>

              {bizError && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertDescription className="text-xs font-semibold">{bizError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2 mt-6 border-t border-zinc-150 dark:border-zinc-850 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBusinessModal(false)}
                  disabled={saveBusinessMutation.isPending}
                  className="h-9 px-4 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={saveBusinessMutation.isPending} className="h-9 px-4 text-xs font-semibold">
                  Save Settings
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
