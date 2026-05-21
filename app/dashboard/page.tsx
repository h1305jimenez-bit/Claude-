"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { JobRow } from "@/components/JobRow";
import { RefreshMeter } from "@/components/RefreshMeter";
import { AddJobModal } from "@/components/AddJobModal";
import { PageSpinner } from "@/components/Spinner";
import { SUPPORTED_LOCATIONS } from "@/lib/adzuna";
import type { Job, User } from "@/lib/types";

const SUPPORTED_NAMES = new Set(SUPPORTED_LOCATIONS.map(l => l.name.toLowerCase()));

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(5);
  const [error, setError] = useState("");
  const [showAddJob, setShowAddJob] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [customLocationInput, setCustomLocationInput] = useState("");
  const [suggestedRoles, setSuggestedRoles] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const autoRefreshDone = useRef(false);

  const supabase = createBrowserSupabase();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      const token = sessionData.session?.access_token ?? null;
      if (!userId || !token) return;
      setAccessToken(token);

      // Use raw fetch so SDK key issues don't affect user lookup
      const [userRes, jobsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*&limit=1`, {
          headers: { "Authorization": `Bearer ${token}`, "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
        }).then(r => r.json()) as Promise<User[]>,
        supabase.from("jobs").select("*").eq("user_id", userId).eq("status", "new").order("score", { ascending: false }),
      ]);

      const userData = userRes as User[];
      if (userData[0]) {
        const u = userData[0];
        setUser(u);
        setSelectedRoles(u.target_role ? u.target_role.split(",").map((r: string) => r.trim()).filter(Boolean) : []);
        setSelectedLocations(u.target_location ? u.target_location.split(",").map((l: string) => l.trim()).filter(Boolean) : []);
        if (u.cv_text) {
          setLoadingSuggestions(true);
          fetch("/api/user/suggest-roles", { method: "POST", headers: { "x-access-token": token } })
            .then(r => r.json())
            .then((d: { suggestions?: string[] }) => { if (d.suggestions) setSuggestedRoles(d.suggestions); })
            .catch(() => {})
            .finally(() => setLoadingSuggestions(false));
        }
        const today = new Date().toDateString();
        const resetDate = u.daily_refreshes_reset_at
          ? new Date(u.daily_refreshes_reset_at).toDateString()
          : null;
        setRemaining(today !== resetDate ? 5 : Math.max(0, 5 - (u.daily_refreshes_used ?? 0)));
      }

      if (jobsRes.data) setJobs(jobsRes.data as Job[]);

      // Auto-fetch if no jobs or last job is > 24h old — pass token directly to avoid stale state
      const hasJobs = jobsRes.data && jobsRes.data.length > 0;
      const lastJob = jobsRes.data?.[0];
      const isStale = lastJob
        ? Date.now() - new Date(lastJob.created_at).getTime() > 24 * 60 * 60 * 1000
        : true;

      // Only auto-refresh once per page session, and only if we have refreshes left
      const userData2 = userRes as User[];
      const refreshesLeft = userData2[0]
        ? (() => {
            const u = userData2[0];
            const today = new Date().toDateString();
            const resetDate = u.daily_refreshes_reset_at ? new Date(u.daily_refreshes_reset_at).toDateString() : null;
            return today !== resetDate ? 5 : Math.max(0, 5 - (u.daily_refreshes_used ?? 0));
          })()
        : 0;

      const newJobs = jobsRes.data?.filter(j => j.status === "new") ?? [];
      if ((!newJobs.length || isStale) && !autoRefreshDone.current && refreshesLeft > 0) {
        autoRefreshDone.current = true;
        await triggerRefresh(false, token);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const trackJob = async (jobId: string) => {
    // Optimistically remove from dashboard (it moves to tracker)
    setJobs(prev => prev.filter(j => j.id !== jobId));
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/jobs?id=eq.${jobId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ status: "open" }),
    });
  };

  const runDebug = async () => {
    if (!accessToken) { setDebugInfo("No access token yet — reload page first"); return; }
    try {
      const res = await fetch("/api/debug/user", { headers: { "x-access-token": accessToken } });
      const data = await res.json() as unknown;
      setDebugInfo(JSON.stringify(data, null, 2));
    } catch (e) {
      setDebugInfo(String(e));
    }
  };

  const fixUserId = async () => {
    if (!accessToken) return;
    setError("");
    try {
      const res = await fetch("/api/fix/user-id", {
        method: "POST",
        headers: { "x-access-token": accessToken },
      });
      const data = await res.json() as { action?: string; error?: string; steps?: string[] };
      const stepsSummary = data.steps ? `\n${data.steps.join("\n")}` : "";
      if (data.error) {
        setDebugInfo(stepsSummary);
        setError(`Fix failed: ${data.error}`);
      } else if (data.action === "already_correct") {
        setDebugInfo(stepsSummary);
        setError("IDs already match — refreshing jobs...");
        await triggerRefresh(false);
      } else if (data.action === "failed") {
        setDebugInfo(stepsSummary);
        setError("Fix attempts failed — see debug info below");
      } else {
        setDebugInfo(null);
        setError(`Fixed! (${data.action}) Reloading...`);
        await loadData();
      }
    } catch (e) {
      setError(`Fix error: ${String(e)}`);
    }
  };

  const addRole = (role: string) => {
    const trimmed = role.trim();
    if (!trimmed || selectedRoles.includes(trimmed)) return;
    setSelectedRoles(prev => [...prev, trimmed]);
    setCustomRoleInput("");
  };

  const removeRole = (role: string) => setSelectedRoles(prev => prev.filter(r => r !== role));

  const toggleLocation = (loc: string) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  const addCustomLocation = (loc: string) => {
    const trimmed = loc.trim();
    if (!trimmed || selectedLocations.includes(trimmed)) return;
    setSelectedLocations(prev => [...prev, trimmed]);
    setCustomLocationInput("");
  };

  const handleSearch = async () => {
    if (!accessToken) return;
    const allRoles = [...selectedRoles, ...(customRoleInput.trim() ? [customRoleInput.trim()] : [])];
    const allLocs = [...selectedLocations, ...(customLocationInput.trim() ? [customLocationInput.trim()] : [])];
    if (customRoleInput.trim()) addRole(customRoleInput.trim());
    if (customLocationInput.trim()) addCustomLocation(customLocationInput.trim());
    const roleStr = allRoles.join(", ");
    const locStr = allLocs.join(", ");
    if (roleStr || locStr) {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "x-access-token": accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(roleStr && { target_role: roleStr }),
          ...(locStr && { target_location: locStr }),
        }),
      });
      setUser(u => u ? { ...u, target_role: roleStr || u.target_role, target_location: locStr || u.target_location } : u);
    }
    await triggerRefresh(true);
  };

  const triggerRefresh = async (manual = true, tokenOverride?: string) => {
    if (manual && remaining <= 0 && user?.plan !== "paid") {
      setError("Daily refresh limit reached. Try again tomorrow.");
      return;
    }
    setRefreshing(true);
    setError("");
    const token = tokenOverride ?? accessToken;
    try {
      const res = await fetch("/api/jobs/fetch", {
        method: "POST",
        headers: token ? { "x-access-token": token } : {},
      });
      let data: { count?: number; remaining?: number; error?: string; debug?: Record<string, unknown> } = {};
      try { data = await res.json(); } catch { /* non-JSON response */ }
      if (!res.ok) {
        if (data.error === "daily_limit_reached") {
          setError("Daily refresh limit reached.");
          setRemaining(0);
        } else if (data.error === "ai_busy") {
          setError("Our AI is under heavy load — wait 30 seconds and try again.");
        } else {
          setError(data.error ?? `Server error ${res.status}`);
        }
        return;
      }
      if (data.remaining !== undefined) setRemaining(data.remaining);
      // Always surface debug info while troubleshooting
      if (data.debug) setDebugInfo(JSON.stringify(data.debug, null, 2));
      const upsertFailed = data.debug && (data.debug.upsertStatus as number) >= 400;
      if ((data.count ?? 0) === 0) {
        setError("No new jobs found. Try again later or update your target role in Profile.");
      } else if (upsertFailed) {
        setError(`Scored ${data.count} jobs but database save failed — see debug info below.`);
      }

      // Reload jobs
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (userId) {
        const { data: newJobs } = await supabase
          .from("jobs")
          .select("*")
          .eq("user_id", userId)
          .neq("status", "stale")
          .order("score", { ascending: false });
        if (newJobs) setJobs(newJobs as Job[]);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(`Refresh failed: ${e.message ?? "network error"}`);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-56 flex-1 flex">
        {/* Main content */}
        <main className="flex-1 p-8 max-w-3xl">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="font-syne font-bold text-2xl text-text-primary">Your matches</h1>
              <button
                onClick={() => setShowAddJob(true)}
                className="shrink-0 px-4 py-2 border border-border rounded-[8px] text-sm font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface transition-all duration-[150ms]"
              >
                + Add job
              </button>
            </div>

            {/* Inline search panel */}
            <div className="border border-border rounded-[8px] bg-surface divide-y divide-border">

              {/* Roles section */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-text-primary font-dm-sans">Target roles</p>
                  {loadingSuggestions && (
                    <span className="flex items-center gap-1 text-xs text-text-dimmed font-dm-sans">
                      <div className="w-3 h-3 border border-border border-t-text-dimmed rounded-full animate-spin" />
                      Suggesting from CV…
                    </span>
                  )}
                </div>

                {/* Selected role chips */}
                {selectedRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedRoles.map(role => (
                      <span key={role} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-dm-sans bg-text-primary text-background rounded-full">
                        {role}
                        <button onClick={() => removeRole(role)} className="opacity-60 hover:opacity-100 leading-none ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* AI suggestions */}
                {suggestedRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {suggestedRoles.filter(r => !selectedRoles.includes(r)).map(role => (
                      <button key={role} onClick={() => addRole(role)}
                        className="px-2.5 py-1 text-xs font-dm-sans border border-border rounded-full text-text-dimmed hover:border-text-primary hover:text-text-primary transition-all duration-[150ms]">
                        + {role}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom role input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customRoleInput}
                    onChange={(e) => setCustomRoleInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && customRoleInput.trim()) { addRole(customRoleInput); e.preventDefault(); } }}
                    placeholder="Type a role and press Enter…"
                    autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                    className="flex-1 border border-border rounded-[8px] px-3 py-1.5 text-sm font-dm-sans bg-background text-text-primary placeholder:text-text-dimmed focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                  />
                  <button onClick={() => addRole(customRoleInput)} disabled={!customRoleInput.trim()}
                    className="px-3 py-1.5 border border-border rounded-[8px] text-xs font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms] disabled:opacity-40">
                    Add
                  </button>
                </div>
              </div>

              {/* Locations section */}
              <div className="p-4">
                <p className="text-xs font-medium text-text-primary font-dm-sans mb-2">Location</p>

                {/* Selected location chips */}
                {selectedLocations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedLocations.map(loc => {
                      const supported = SUPPORTED_LOCATIONS.some(s => s.name.toLowerCase() === loc.toLowerCase());
                      return (
                        <span key={loc} className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-dm-sans rounded-full ${supported ? "bg-text-primary text-background" : "bg-surface border border-border text-text-dimmed"}`}>
                          {loc}
                          <button onClick={() => toggleLocation(loc)} className="opacity-60 hover:opacity-100 leading-none ml-0.5">×</button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Supported country chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SUPPORTED_LOCATIONS.map(({ name }) => {
                    const selected = selectedLocations.includes(name);
                    return (
                      <button key={name} onClick={() => toggleLocation(name)}
                        className={`px-2.5 py-1 text-xs font-dm-sans border rounded-full transition-all duration-[150ms] ${selected ? "border-text-primary bg-surface-secondary text-text-primary" : "border-border text-text-dimmed hover:border-text-primary hover:text-text-primary"}`}>
                        {selected ? "✓ " : ""}{name}
                      </button>
                    );
                  })}
                </div>

                {/* Custom location input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customLocationInput}
                    onChange={(e) => setCustomLocationInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && customLocationInput.trim()) { addCustomLocation(customLocationInput); e.preventDefault(); } }}
                    placeholder="Any city or country (e.g. Santiago, Chile)…"
                    autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                    className="flex-1 border border-border rounded-[8px] px-3 py-1.5 text-sm font-dm-sans bg-background text-text-primary placeholder:text-text-dimmed focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                  />
                  <button onClick={() => addCustomLocation(customLocationInput)} disabled={!customLocationInput.trim()}
                    className="px-3 py-1.5 border border-border rounded-[8px] text-xs font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms] disabled:opacity-40">
                    Add
                  </button>
                </div>
              </div>

              {/* Search button */}
              <div className="px-4 py-3 flex justify-end">
                <button
                  onClick={handleSearch}
                  disabled={refreshing || (selectedRoles.length === 0 && !customRoleInput.trim())}
                  className="px-6 py-2 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans font-medium hover:opacity-90 transition-all duration-[150ms] disabled:opacity-40"
                >
                  {refreshing ? "Searching…" : "Search →"}
                </button>
              </div>
            </div>
          </div>

          {showAddJob && (
            <AddJobModal
              onClose={() => setShowAddJob(false)}
            />
          )}

          {/* Unsupported location notice */}
          {user?.target_location && (() => {
            const unsupported = user.target_location
              .split(",").map(l => l.trim()).filter(Boolean)
              .filter(l => !SUPPORTED_NAMES.has(l.toLowerCase()));
            if (!unsupported.length) return null;
            return (
              <div className="border border-border rounded-[8px] p-4 mb-6 bg-surface">
                <p className="text-sm font-dm-sans font-medium text-text-primary mb-1">
                  Automatic job search unavailable for: {unsupported.join(", ")}
                </p>
                <p className="text-xs text-text-dimmed font-dm-sans mb-3">
                  Our job search partners don&apos;t cover these locations yet. You can still apply to jobs there — paste any job URL using the button below and we&apos;ll score it and build a full application kit.
                </p>
                <button
                  onClick={() => setShowAddJob(true)}
                  className="px-3 py-1.5 bg-btn-bg text-btn-text rounded-[8px] text-xs font-dm-sans font-medium hover:opacity-90 transition-all duration-[150ms]"
                >
                  + Add job manually →
                </button>
              </div>
            );
          })()}

          {error && (
            <div className="border border-border rounded-[8px] p-3 mb-6 bg-surface text-sm text-text-dimmed font-dm-sans flex items-center justify-between gap-3">
              <span>{error}</span>
              {error.includes("failed") || error.includes("error") ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={fixUserId} className="px-2 py-0.5 border border-border rounded text-xs text-text-primary hover:bg-surface-secondary transition-all">
                    Fix account →
                  </button>
                  <button onClick={runDebug} className="underline text-xs">diagnose</button>
                </div>
              ) : (
                <button onClick={() => setError("")} className="text-xs text-text-dimmed hover:text-text-primary">✕</button>
              )}
            </div>
          )}

          {debugInfo && (
            <div className="border border-border rounded-[8px] p-3 mb-6 bg-surface">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-syne font-bold text-text-primary">Debug info</p>
                <button onClick={() => setDebugInfo(null)} className="text-xs text-text-dimmed">✕</button>
              </div>
              <pre className="text-xs text-text-dimmed font-mono overflow-auto max-h-64 whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}

          {/* Refresh loading state */}
          {refreshing && (
            <div className="border border-border rounded-[8px] p-5 mb-4 bg-surface">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 border-2 border-border border-t-text-primary rounded-full animate-spin shrink-0" />
                <p className="text-sm font-dm-sans text-text-primary font-medium">Scoring new matches…</p>
              </div>
              <div className="w-full h-1 bg-surface-secondary rounded-full overflow-hidden">
                <div className="h-full bg-text-primary rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
              <p className="text-xs text-text-dimmed font-dm-sans mt-2">Fetching jobs and ranking them against your CV. This takes ~30 seconds.</p>
            </div>
          )}

          {loading ? (
            <PageSpinner label="Loading your matches…" />
          ) : jobs.length === 0 && !refreshing ? (
            <div className="border border-border rounded-[8px] p-12 text-center bg-surface">
              <p className="font-dm-sans text-text-dimmed text-sm mb-1">No new matches right now.</p>
              <p className="font-dm-sans text-text-dimmed text-xs">
                Hit Refresh to fetch new matches, or check the Tracker for jobs you&apos;re already pursuing.
              </p>
            </div>
          ) : (
            <div className={`space-y-2 transition-opacity duration-300 ${refreshing ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} onTrack={trackJob} />
              ))}
            </div>
          )}
        </main>

        {/* Sidebar right */}
        <aside className="w-64 border-l border-border p-6 shrink-0">
          <RefreshMeter
            remaining={remaining}
            isPaid={user?.plan === "paid"}
            onRefresh={() => triggerRefresh(true)}
            loading={refreshing}
            onReset={async () => {
              if (!accessToken) return;
              await fetch("/api/fix/reset-refreshes", { method: "POST", headers: { "x-access-token": accessToken } });
              setRemaining(5);
            }}
          />

          {user && (
            <div className="mt-6 border border-border rounded-[8px] p-4 bg-surface">
              <p className="text-xs text-text-dimmed font-dm-sans mb-1">Plan</p>
              <p className="font-syne font-bold text-text-primary capitalize">{user.plan}</p>
              {user.plan === "free" && (
                <>
                  <p className="text-xs text-text-dimmed font-dm-sans mt-1">Unlimited refreshes + full application kits</p>
                  <a
                    href="/profile"
                    className="block mt-3 text-xs text-center py-2 border border-border rounded-[8px] hover:bg-surface-secondary transition-all duration-[150ms] font-dm-sans"
                  >
                    Upgrade to Pro →
                  </a>
                </>
              )}
            </div>
          )}

          <div className="mt-4 border border-border rounded-[8px] p-4 bg-surface">
            <p className="text-xs text-text-dimmed font-dm-sans mb-1">Total matches</p>
            <p className="font-syne font-bold text-2xl text-text-primary">{jobs.length}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
