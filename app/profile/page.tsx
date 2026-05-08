"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import type { User } from "@/lib/types";

const TABS = ["Profile", "Preferences", "Account"] as const;
type ProfileTab = (typeof TABS)[number];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>("Profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [message, setMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [preferences, setPreferences] = useState({
    name: "",
    phone: "",
    linkedin: "",
    education: "",
    target_role: "",
    target_location: "",
    seniority: "",
    salary_expectation: "",
    work_authorization: "",
  });

  const supabase = createBrowserSupabase();
  const router = useRouter();

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) { router.push("/auth"); return; }
      setAccessToken(sessionData.session?.access_token ?? null);

      const { data } = await supabase.from("users").select("*").eq("id", userId).single();
      if (data) {
        const u = data as User;
        setUser(u);
        setPreferences({
          name: u.name || "",
          phone: u.phone || "",
          linkedin: u.linkedin || "",
          education: u.education || "",
          target_role: u.target_role || "",
          target_location: u.target_location || "",
          seniority: u.seniority || "",
          salary_expectation: u.salary_expectation || "",
          work_authorization: u.work_authorization || "",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { loadUser(); }, [loadUser]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upgraded") === "true") {
        setMessage("You are now on Pro. Welcome!");
      }
    }
  }, []);

  const handleSavePreferences = async () => {
    setSaving(true);
    setMessage("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;
      await supabase.from("users").update(preferences).eq("id", userId);
      setMessage("Saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleCvUpload = async () => {
    if (!cvFile || !accessToken) return;
    setUploadingCv(true);
    setMessage("");
    try {
      const res = await fetch("/api/user/upload-cv", {
        method: "POST",
        headers: { "x-access-token": accessToken, "Content-Type": "application/pdf" },
        body: cvFile,
      });
      const data = await res.json() as { path?: string; prefsExtracted?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setCvFile(null);
      await loadUser();
      if (data.prefsExtracted) {
        setTab("Preferences");
        setMessage("CV uploaded. Preferences auto-filled from your CV — review and save.");
      } else {
        setMessage("CV uploaded.");
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setMessage(e.message ?? "Upload failed");
    } finally {
      setUploadingCv(false);
    }
  };

  const handleUpgradeToStripe = async () => {
    const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
    const data = await res.json() as { url?: string; error?: string };
    if (data.url) window.location.href = data.url;
  };

  const handleDeleteAccount = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;

    // Delete all user data
    await Promise.all([
      supabase.from("applications").delete().eq("user_id", userId),
      supabase.from("kits").delete().eq("user_id", userId),
      supabase.from("jobs").delete().eq("user_id", userId),
    ]);
    await supabase.from("users").delete().eq("id", userId);
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="ml-56 flex-1 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 bg-surface-secondary rounded" />
            <div className="h-4 w-32 bg-surface-secondary rounded" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">Profile & Settings</h1>
          <p className="text-text-dimmed text-sm font-dm-sans">{user?.email}</p>
        </div>

        {message && (
          <div className="border border-border rounded-[8px] p-3 bg-surface mb-6 text-sm font-dm-sans text-text-primary">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-dm-sans border-b-2 transition-all duration-[150ms] ${
                tab === t
                  ? "border-text-primary text-text-primary font-medium"
                  : "border-transparent text-text-dimmed hover:text-text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Profile" && (
          <div className="space-y-6">
            <div className="border border-border rounded-[8px] p-6 bg-surface">
              <h3 className="font-dm-sans font-medium text-text-primary mb-4">CV</h3>
              {user?.cv_url && (
                <p className="text-xs text-text-dimmed font-dm-sans mb-3">CV uploaded. Upload a new one to replace it.</p>
              )}
              <div
                className="border-2 border-dashed border-border rounded-[8px] p-6 text-center mb-3 cursor-pointer hover:bg-surface-secondary transition-all duration-[150ms]"
                onClick={() => document.getElementById("cv-profile-input")?.click()}
              >
                <input
                  id="cv-profile-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                />
                {cvFile ? (
                  <p className="text-sm font-dm-sans text-text-primary">{cvFile.name}</p>
                ) : (
                  <p className="text-sm text-text-dimmed font-dm-sans">Click to upload new CV (PDF)</p>
                )}
              </div>
              <button
                onClick={handleCvUpload}
                disabled={!cvFile || uploadingCv}
                className="w-full py-2.5 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms] disabled:opacity-40"
              >
                {uploadingCv ? "Uploading..." : "Upload CV"}
              </button>
            </div>
          </div>
        )}

        {tab === "Preferences" && (
          <div className="space-y-4">
            {[
              { key: "name", label: "Full name", type: "text" },
              { key: "phone", label: "Phone", type: "tel" },
              { key: "linkedin", label: "LinkedIn URL", type: "url" },
              { key: "education", label: "Education", type: "text" },
              { key: "target_role", label: "Target role", type: "text" },
              { key: "target_location", label: "Target location", type: "text" },
              { key: "seniority", label: "Seniority", type: "text" },
              { key: "salary_expectation", label: "Salary expectation", type: "text" },
              { key: "work_authorization", label: "Work authorization", type: "text" },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-text-dimmed font-dm-sans mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={preferences[field.key as keyof typeof preferences]}
                  onChange={(e) =>
                    setPreferences((p) => ({ ...p, [field.key]: e.target.value }))
                  }
                  className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                />
              </div>
            ))}
            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="w-full py-2.5 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms] disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save preferences"}
            </button>
          </div>
        )}

        {tab === "Account" && (
          <div className="space-y-6">
            <div className="border border-border rounded-[8px] p-6 bg-surface">
              <h3 className="font-dm-sans font-medium text-text-primary mb-2">Current plan</h3>
              <p className="font-syne font-bold text-2xl text-text-primary capitalize mb-4">
                {user?.plan ?? "free"}
              </p>
              {user?.plan === "free" ? (
                <button
                  onClick={handleUpgradeToStripe}
                  className="px-6 py-2.5 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms]"
                >
                  Upgrade to Pro — $9/month
                </button>
              ) : (
                <p className="text-sm text-text-dimmed font-dm-sans">You&apos;re on Pro. Manage your subscription via Stripe.</p>
              )}
            </div>

            <div className="border border-border rounded-[8px] p-6 bg-surface">
              <h3 className="font-dm-sans font-medium text-text-primary mb-2">Danger zone</h3>
              <p className="text-xs text-text-dimmed font-dm-sans mb-4">
                Permanently deletes your account and all data. This cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 border border-border rounded-[8px] text-sm font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms]"
                >
                  Delete account
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-dm-sans text-text-primary">Are you sure? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 border border-border rounded-[8px] text-sm font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="flex-1 py-2 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms]"
                    >
                      Confirm delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
