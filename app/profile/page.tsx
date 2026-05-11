"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Spinner } from "@/components/Spinner";
import type { User } from "@/lib/types";
import { SUPPORTED_LOCATIONS } from "@/lib/adzuna";

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
  const [suggestedRoles, setSuggestedRoles] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState("");
  const [preferences, setPreferences] = useState({
    name: "",
    phone: "",
    linkedin: "",
    education: "",
    target_role: "",
    target_location: "",
    target_companies: "",
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
      const token = sessionData.session?.access_token ?? null;
      if (!userId || !token) { router.push("/auth"); return; }
      setAccessToken(token);

      // Use raw fetch — Supabase SDK key format causes issues
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*&limit=1`,
        { headers: { "Authorization": `Bearer ${token}`, "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" } }
      );
      const rows = await res.json() as User[];
      const u = rows[0];
      if (u) {
        setUser(u);
        const roles = u.target_role ? u.target_role.split(",").map((r: string) => r.trim()).filter(Boolean) : [];
        setSelectedRoles(roles);
        const locs = u.target_location ? u.target_location.split(",").map((l: string) => l.trim()).filter(Boolean) : [];
        setSelectedLocations(locs);
        const companies = u.target_companies ? u.target_companies.split(",").map((c: string) => c.trim()).filter(Boolean) : [];
        setSelectedCompanies(companies);
        setPreferences({
          name: u.name || "",
          phone: u.phone || "",
          linkedin: u.linkedin || "",
          education: u.education || "",
          target_role: u.target_role || "",
          target_location: u.target_location || "",
          target_companies: u.target_companies || "",
          seniority: u.seniority || "",
          salary_expectation: u.salary_expectation || "",
          work_authorization: u.work_authorization || "",
        });
        if (u.cv_text) {
          setLoadingSuggestions(true);
          fetch("/api/user/suggest-roles", { method: "POST", headers: { "x-access-token": token } })
            .then(r => r.json())
            .then((d: { suggestions?: string[] }) => { if (d.suggestions) setSuggestedRoles(d.suggestions); })
            .catch(() => {})
            .finally(() => setLoadingSuggestions(false));
        }
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
    if (!accessToken) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "x-access-token": accessToken, "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage("Saved.");
    } catch {
      setMessage("Save failed — please try again.");
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
      const data = await res.json() as {
        path?: string; prefsExtracted?: boolean; error?: string;
        prefs?: { name?: string; phone?: string; linkedin?: string; education?: string;
          target_role?: string; seniority?: string; salary_expectation?: string; work_authorization?: string };
      };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setCvFile(null);
      if (data.prefsExtracted && data.prefs) {
        const p = data.prefs;
        setPreferences((prev) => ({
          ...prev,
          ...(p.name && { name: p.name }),
          ...(p.phone && { phone: p.phone }),
          ...(p.linkedin && { linkedin: p.linkedin }),
          ...(p.education && { education: p.education }),
          ...(p.target_role && { target_role: p.target_role }),
          ...(p.seniority && { seniority: p.seniority }),
          ...(p.salary_expectation && { salary_expectation: p.salary_expectation }),
          ...(p.work_authorization && { work_authorization: p.work_authorization }),
        }));
        setTab("Preferences");
        setMessage("CV uploaded. Preferences auto-filled — review and save.");
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

  const handleSuggestRoles = async () => {
    if (!accessToken) return;
    setLoadingSuggestions(true);
    setSuggestedRoles([]);
    try {
      const res = await fetch("/api/user/suggest-roles", {
        method: "POST",
        headers: { "x-access-token": accessToken },
      });
      const data = await res.json() as { suggestions?: string[]; error?: string };
      if (data.suggestions) setSuggestedRoles(data.suggestions);
      else setMessage(data.error ?? "Could not generate suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
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
        <main className="ml-56 flex-1 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-text-dimmed font-dm-sans">Loading profile…</p>
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
                {uploadingCv ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" />Uploading…</span> : "Upload CV"}
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

            {/* Target roles — multi-select */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-text-dimmed font-dm-sans">Target roles</label>
                {loadingSuggestions && (
                  <span className="flex items-center gap-1.5 text-xs text-text-dimmed font-dm-sans">
                    <Spinner size="sm" />Suggesting…
                  </span>
                )}
              </div>

              {/* Selected roles as tags */}
              {selectedRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedRoles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-dm-sans bg-text-primary text-background rounded-full"
                    >
                      {role}
                      <button
                        onClick={() => {
                          const updated = selectedRoles.filter(r => r !== role);
                          setSelectedRoles(updated);
                          setPreferences(p => ({ ...p, target_role: updated.join(", ") }));
                        }}
                        className="opacity-60 hover:opacity-100 leading-none"
                      >×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {suggestedRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {suggestedRoles.map((role) => {
                    const selected = selectedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        onClick={() => {
                          const updated = selected
                            ? selectedRoles.filter(r => r !== role)
                            : [...selectedRoles, role];
                          setSelectedRoles(updated);
                          setPreferences(p => ({ ...p, target_role: updated.join(", ") }));
                        }}
                        className={`px-3 py-1 text-xs font-dm-sans border rounded-full transition-all duration-[150ms] ${
                          selected
                            ? "border-text-primary text-text-primary bg-surface-secondary"
                            : "border-border text-text-dimmed hover:border-text-primary hover:text-text-primary"
                        }`}
                      >
                        {selected ? "✓ " : ""}{role}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Manual input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={selectedRoles.length > 0 ? "Add another role..." : "Type a role..."}
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && roleInput.trim()) {
                      const val = roleInput.trim();
                      if (!selectedRoles.includes(val)) {
                        const updated = [...selectedRoles, val];
                        setSelectedRoles(updated);
                        setPreferences(p => ({ ...p, target_role: updated.join(", ") }));
                      }
                      setRoleInput("");
                      e.preventDefault();
                    }
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="flex-1 border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                />
                <button
                  onClick={() => {
                    const val = roleInput.trim();
                    if (val && !selectedRoles.includes(val)) {
                      const updated = [...selectedRoles, val];
                      setSelectedRoles(updated);
                      setPreferences(p => ({ ...p, target_role: updated.join(", ") }));
                    }
                    setRoleInput("");
                  }}
                  disabled={!roleInput.trim()}
                  className="px-3 py-2 border border-border rounded-[8px] text-sm font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms] disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Target locations — multi-select */}
            <div>
              <div className="mb-2">
                <label className="block text-xs text-text-dimmed font-dm-sans mb-0.5">Target locations</label>
                <p className="text-xs text-text-dimmed font-dm-sans opacity-60">Highlighted countries fetch jobs automatically. Others require manual job adding.</p>
              </div>

              {selectedLocations.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedLocations.map((loc) => {
                    const isSupported = SUPPORTED_LOCATIONS.some(s => s.name.toLowerCase() === loc.toLowerCase());
                    return (
                      <span key={loc} className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-dm-sans rounded-full ${isSupported ? "bg-text-primary text-background" : "bg-surface border border-border text-text-dimmed"}`}>
                        {isSupported ? "✓ " : "⚠ "}{loc}
                        <button onClick={() => {
                          const updated = selectedLocations.filter(l => l !== loc);
                          setSelectedLocations(updated);
                          setPreferences(p => ({ ...p, target_location: updated.join(", ") }));
                        }} className="opacity-60 hover:opacity-100">×</button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-2">
                {SUPPORTED_LOCATIONS.map(({ name }) => {
                  const selected = selectedLocations.includes(name);
                  return (
                    <button key={name} onClick={() => {
                      const updated = selected ? selectedLocations.filter(l => l !== name) : [...selectedLocations, name];
                      setSelectedLocations(updated);
                      setPreferences(p => ({ ...p, target_location: updated.join(", ") }));
                    }} className={`px-3 py-1 text-xs font-dm-sans border rounded-full transition-all duration-[150ms] ${selected ? "border-text-primary text-text-primary bg-surface-secondary" : "border-border text-text-dimmed hover:border-text-primary hover:text-text-primary"}`}>
                      {selected ? "✓ " : ""}{name}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Any city or country (e.g. Santiago, Chile)…"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && locationInput.trim()) {
                      const val = locationInput.trim();
                      if (!selectedLocations.includes(val)) {
                        const updated = [...selectedLocations, val];
                        setSelectedLocations(updated);
                        setPreferences(p => ({ ...p, target_location: updated.join(", ") }));
                      }
                      setLocationInput("");
                      e.preventDefault();
                    }
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="flex-1 border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                />
                <button onClick={() => {
                  const val = locationInput.trim();
                  if (val && !selectedLocations.includes(val)) {
                    const updated = [...selectedLocations, val];
                    setSelectedLocations(updated);
                    setPreferences(p => ({ ...p, target_location: updated.join(", ") }));
                  }
                  setLocationInput("");
                }} disabled={!locationInput.trim()} className="px-3 py-2 border border-border rounded-[8px] text-sm font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms] disabled:opacity-40">
                  Add
                </button>
              </div>
            </div>

            {/* Target companies — multi-select */}
            <div>
              <label className="block text-xs text-text-dimmed font-dm-sans mb-2">Target companies</label>
              <p className="text-xs text-text-dimmed font-dm-sans mb-2 opacity-70">
                Jobs from these companies will be prioritised when scoring matches.
              </p>

              {selectedCompanies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedCompanies.map((co) => (
                    <span key={co} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-dm-sans bg-text-primary text-background rounded-full">
                      {co}
                      <button onClick={() => {
                        const updated = selectedCompanies.filter(c => c !== co);
                        setSelectedCompanies(updated);
                        setPreferences(p => ({ ...p, target_companies: updated.join(", ") }));
                      }} className="opacity-60 hover:opacity-100">×</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  "Google", "Microsoft", "Apple", "Meta", "Amazon", "Netflix",
                  "Salesforce", "Adobe", "Atlassian", "Shopify", "Stripe", "Revolut",
                  "McKinsey", "BCG", "Bain", "Deloitte", "Accenture",
                  "Goldman Sachs", "JPMorgan", "BlackRock",
                  "Spotify", "Airbnb", "Uber", "LinkedIn", "HubSpot",
                ].map((co) => {
                  const selected = selectedCompanies.includes(co);
                  return (
                    <button key={co} onClick={() => {
                      const updated = selected ? selectedCompanies.filter(c => c !== co) : [...selectedCompanies, co];
                      setSelectedCompanies(updated);
                      setPreferences(p => ({ ...p, target_companies: updated.join(", ") }));
                    }} className={`px-3 py-1 text-xs font-dm-sans border rounded-full transition-all duration-[150ms] ${selected ? "border-text-primary text-text-primary bg-surface-secondary" : "border-border text-text-dimmed hover:border-text-primary hover:text-text-primary"}`}>
                      {selected ? "✓ " : ""}{co}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a company..."
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && companyInput.trim()) {
                      const val = companyInput.trim();
                      if (!selectedCompanies.includes(val)) {
                        const updated = [...selectedCompanies, val];
                        setSelectedCompanies(updated);
                        setPreferences(p => ({ ...p, target_companies: updated.join(", ") }));
                      }
                      setCompanyInput("");
                      e.preventDefault();
                    }
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="flex-1 border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                />
                <button onClick={() => {
                  const val = companyInput.trim();
                  if (val && !selectedCompanies.includes(val)) {
                    const updated = [...selectedCompanies, val];
                    setSelectedCompanies(updated);
                    setPreferences(p => ({ ...p, target_companies: updated.join(", ") }));
                  }
                  setCompanyInput("");
                }} disabled={!companyInput.trim()} className="px-3 py-2 border border-border rounded-[8px] text-sm font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms] disabled:opacity-40">
                  Add
                </button>
              </div>
            </div>

            {[
              { key: "seniority", label: "Seniority", type: "text" },
              { key: "salary_expectation", label: "Salary expectation", type: "text" },
              { key: "work_authorization", label: "Work authorization", type: "text" },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-text-dimmed font-dm-sans mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={preferences[field.key as keyof typeof preferences]}
                  onChange={(e) => setPreferences((p) => ({ ...p, [field.key]: e.target.value }))}
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
            {/* Chrome Extension */}
            <div className="border border-border rounded-[8px] p-6 bg-surface">
              <h3 className="font-dm-sans font-medium text-text-primary mb-1">Chrome Extension</h3>
              <p className="text-xs text-text-dimmed font-dm-sans mb-4">
                Auto-fill job applications on Greenhouse, Lever, Workday and more. Click below to copy your session token, then paste it into the extension popup.
              </p>
              <button
                onClick={() => {
                  if (accessToken) {
                    navigator.clipboard.writeText(accessToken);
                    setMessage("Token copied — paste it in the Applykit extension popup.");
                  }
                }}
                className="px-4 py-2 border border-border rounded-[8px] text-sm font-dm-sans text-text-primary hover:bg-surface-secondary transition-all duration-[150ms]"
              >
                Copy extension token
              </button>
            </div>

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
