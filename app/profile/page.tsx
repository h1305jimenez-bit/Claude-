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
  const [tokenCopied, setTokenCopied] = useState(false);
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
      if (params.get("upgraded") === "true") setMessage("You are now on Pro. Welcome!");
      if (params.get("tab") === "account") setTab("Account");
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
          <div className="space-y-4">
            {/* Summary card */}
            <div className="border border-border rounded-[8px] bg-surface">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-medium text-text-primary font-dm-sans">Your details</h3>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                {[
                  { label: "Name", value: user?.name },
                  { label: "Email", value: user?.email },
                  { label: "Phone", value: user?.phone },
                  { label: "LinkedIn", value: user?.linkedin },
                  { label: "Education", value: user?.education },
                  { label: "Seniority", value: user?.seniority },
                  { label: "Target role", value: user?.target_role },
                  { label: "Location", value: user?.target_location },
                  { label: "Work authorization", value: user?.work_authorization },
                  { label: "Salary expectation", value: user?.salary_expectation },
                ].map(({ label, value }) => (
                  <div key={label} className="min-w-0">
                    <p className="text-xs text-text-dimmed font-dm-sans mb-0.5">{label}</p>
                    <p className="text-sm font-dm-sans text-text-primary truncate">
                      {value || <span className="text-text-dimmed italic">Not set</span>}
                    </p>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-4">
                <button
                  onClick={() => setTab("Preferences")}
                  className="text-xs font-dm-sans text-text-dimmed hover:text-text-primary transition-all duration-[150ms] underline underline-offset-2"
                >
                  Edit in Preferences →
                </button>
              </div>
            </div>

            {/* CV upload */}
            <div className="border border-border rounded-[8px] bg-surface">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-medium text-text-primary font-dm-sans">CV</h3>
                <p className="text-xs text-text-dimmed font-dm-sans mt-0.5">
                  {user?.cv_url ? "CV on file — upload a new PDF to replace it." : "Upload your CV to auto-fill preferences and generate kits."}
                </p>
              </div>
              <div className="p-5">
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
                    <>
                      <p className="text-2xl mb-2">📄</p>
                      <p className="text-sm text-text-dimmed font-dm-sans">Click to upload PDF</p>
                      <p className="text-xs text-text-dimmed font-dm-sans mt-0.5">Max 10 MB</p>
                    </>
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
          </div>
        )}

        {tab === "Preferences" && (
          <div className="space-y-4">

            {/* Job preferences — FIRST */}
            <div className="border border-border rounded-[8px] bg-surface">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-medium text-text-primary font-dm-sans">Job preferences</h3>
                <p className="text-xs text-text-dimmed font-dm-sans mt-0.5">Shapes job matching and application kits</p>
              </div>
              <div className="p-5 space-y-5">

                {/* Target roles */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-text-dimmed font-dm-sans">Target roles</label>
                    {loadingSuggestions && (
                      <span className="flex items-center gap-1.5 text-xs text-text-dimmed font-dm-sans">
                        <Spinner size="sm" />Suggesting…
                      </span>
                    )}
                  </div>
                  {selectedRoles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedRoles.map((role) => (
                        <span key={role} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-dm-sans bg-text-primary text-background rounded-full">
                          {role}
                          <button onClick={() => {
                            const updated = selectedRoles.filter(r => r !== role);
                            setSelectedRoles(updated);
                            setPreferences(p => ({ ...p, target_role: updated.join(", ") }));
                          }} className="opacity-60 hover:opacity-100 leading-none">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  {suggestedRoles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {suggestedRoles.map((role) => {
                        const selected = selectedRoles.includes(role);
                        return (
                          <button key={role} onClick={() => {
                            const updated = selected ? selectedRoles.filter(r => r !== role) : [...selectedRoles, role];
                            setSelectedRoles(updated);
                            setPreferences(p => ({ ...p, target_role: updated.join(", ") }));
                          }} className={`px-3 py-1 text-xs font-dm-sans border rounded-full transition-all duration-[150ms] ${selected ? "border-text-primary text-text-primary bg-surface-secondary" : "border-border text-text-dimmed hover:border-text-primary hover:text-text-primary"}`}>
                            {selected ? "✓ " : ""}{role}
                          </button>
                        );
                      })}
                    </div>
                  )}
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
                      autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                      className="flex-1 border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                    />
                    <button onClick={() => {
                      const val = roleInput.trim();
                      if (val && !selectedRoles.includes(val)) {
                        const updated = [...selectedRoles, val];
                        setSelectedRoles(updated);
                        setPreferences(p => ({ ...p, target_role: updated.join(", ") }));
                      }
                      setRoleInput("");
                    }} disabled={!roleInput.trim()} className="px-3 py-2 border border-border rounded-[8px] text-sm font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms] disabled:opacity-40">Add</button>
                  </div>
                </div>

                {/* Target locations */}
                <div>
                  <div className="mb-2">
                    <label className="block text-xs text-text-dimmed font-dm-sans mb-0.5">Target locations</label>
                    <p className="text-xs text-text-dimmed font-dm-sans opacity-60">Filled countries fetch jobs automatically. Others require manual job adding.</p>
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
                      autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
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
                    }} disabled={!locationInput.trim()} className="px-3 py-2 border border-border rounded-[8px] text-sm font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms] disabled:opacity-40">Add</button>
                  </div>
                </div>

                {/* Seniority & Work auth side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-text-dimmed font-dm-sans mb-1">Seniority</label>
                    <select
                      value={preferences.seniority}
                      onChange={(e) => setPreferences(p => ({ ...p, seniority: e.target.value }))}
                      className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                    >
                      <option value="">Select…</option>
                      {["Intern", "Junior", "Mid-level", "Senior", "Lead", "Manager", "Director", "Executive"].map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-dimmed font-dm-sans mb-1">Work authorization</label>
                    <select
                      value={preferences.work_authorization}
                      onChange={(e) => setPreferences(p => ({ ...p, work_authorization: e.target.value }))}
                      className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                    >
                      <option value="">Select…</option>
                      {["US Citizen", "Green Card", "H-1B", "OPT/CPT", "TN Visa", "E-3", "Other", "Not applicable"].map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>
            </div>

            {/* Personal info */}
            <div className="border border-border rounded-[8px] bg-surface">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-medium text-text-primary font-dm-sans">Personal info</h3>
                <p className="text-xs text-text-dimmed font-dm-sans mt-0.5">Used to auto-fill job applications</p>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { key: "name", label: "Full name", type: "text", placeholder: "Jane Smith" },
                  { key: "phone", label: "Phone", type: "tel", placeholder: "+1 555 000 0000" },
                  { key: "linkedin", label: "LinkedIn URL", type: "url", placeholder: "https://linkedin.com/in/you" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-text-dimmed font-dm-sans mb-1">{field.label}</label>
                    <input
                      type={field.type}
                      value={preferences[field.key as keyof typeof preferences]}
                      onChange={(e) => setPreferences((p) => ({ ...p, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Education */}
            <div className="border border-border rounded-[8px] bg-surface">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-medium text-text-primary font-dm-sans">Education</h3>
                <p className="text-xs text-text-dimmed font-dm-sans mt-0.5">Your highest qualification</p>
              </div>
              <div className="p-5">
                <label className="block text-xs text-text-dimmed font-dm-sans mb-1">Degree &amp; institution</label>
                <input
                  type="text"
                  value={preferences.education}
                  onChange={(e) => setPreferences((p) => ({ ...p, education: e.target.value }))}
                  placeholder="BS Computer Science, MIT"
                  className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                />
              </div>
            </div>

            {/* Compensation */}
            <div className="border border-border rounded-[8px] bg-surface">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-medium text-text-primary font-dm-sans">Compensation</h3>
                <p className="text-xs text-text-dimmed font-dm-sans mt-0.5">Helps filter and tailor your applications</p>
              </div>
              <div className="p-5">
                <label className="block text-xs text-text-dimmed font-dm-sans mb-1">Salary expectation</label>
                <input
                  type="text"
                  value={preferences.salary_expectation}
                  onChange={(e) => setPreferences((p) => ({ ...p, salary_expectation: e.target.value }))}
                  placeholder="$120,000 – $150,000"
                  className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                />
              </div>
            </div>

            {/* Dream companies */}
            <div className="border border-border rounded-[8px] bg-surface">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-medium text-text-primary font-dm-sans">Dream companies</h3>
                <p className="text-xs text-text-dimmed font-dm-sans mt-0.5">Jobs from these companies get priority when scoring matches</p>
              </div>
              <div className="p-5">
                {selectedCompanies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
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
                <div className="flex flex-wrap gap-2 mb-3">
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
                    autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
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
                  }} disabled={!companyInput.trim()} className="px-3 py-2 border border-border rounded-[8px] text-sm font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms] disabled:opacity-40">Add</button>
                </div>
              </div>
            </div>

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
            <div className="border-2 border-btn-bg rounded-[8px] p-6 bg-surface">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🔌</span>
                <h3 className="font-dm-sans font-semibold text-text-primary">Connect Chrome Extension</h3>
              </div>
              <p className="text-xs text-text-dimmed font-dm-sans mb-5">
                Auto-fill job applications on Greenhouse, Lever, Workday, and 20+ other platforms directly from your browser.
              </p>

              <ol className="space-y-3 mb-5">
                {[
                  { step: "1", text: "Install the Applykit extension from the Chrome Web Store" },
                  { step: "2", text: "Click the Applykit icon in your browser toolbar to open the popup" },
                  { step: "3", text: "Copy your token below and paste it into the extension popup" },
                  { step: "4", text: "Click Connect — you're ready to auto-fill applications!" },
                ].map(({ step, text }) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-btn-bg text-btn-text text-xs font-dm-sans font-medium flex items-center justify-center mt-0.5">{step}</span>
                    <p className="text-sm font-dm-sans text-text-primary">{text}</p>
                  </li>
                ))}
              </ol>

              <button
                onClick={() => {
                  if (accessToken) {
                    navigator.clipboard.writeText(accessToken);
                    setTokenCopied(true);
                    setTimeout(() => setTokenCopied(false), 3000);
                  }
                }}
                className={`w-full py-3 rounded-[8px] text-sm font-dm-sans font-medium transition-all duration-[150ms] ${
                  tokenCopied
                    ? "bg-green-600 text-white"
                    : "bg-btn-bg text-btn-text hover:opacity-90"
                }`}
              >
                {tokenCopied ? "✓ Token copied — paste it in the extension!" : "Copy my token →"}
              </button>

              {tokenCopied && (
                <p className="text-xs text-text-dimmed font-dm-sans text-center mt-2">
                  Now open the extension popup and paste it there.
                </p>
              )}
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
