"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { JobRow } from "@/components/JobRow";
import { RefreshMeter } from "@/components/RefreshMeter";
import { AddJobModal } from "@/components/AddJobModal";
import type { Job, User } from "@/lib/types";

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

  const triggerRefresh = async (manual = true, tokenOverride?: string) => {
    if (manual && remaining <= 0) {
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
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">
                {user?.target_role ? `Jobs for ${user.target_role}` : "Your jobs"}
              </h1>
              <p className="text-text-dimmed text-sm font-dm-sans mb-2">
                Matched to your CV · scored by AI
              </p>
              {user && (
                <div className="flex flex-wrap gap-1.5">
                  {[
                    user.target_location,
                    user.seniority,
                    user.work_authorization,
                    user.target_companies,
                  ]
                    .flatMap(v => v ? v.split(",").map(s => s.trim()).filter(Boolean) : [])
                    .map((chip, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-dm-sans bg-surface border border-border text-text-dimmed"
                      >
                        {chip}
                      </span>
                    ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAddJob(true)}
              className="shrink-0 px-4 py-2 border border-border rounded-[8px] text-sm font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface transition-all duration-[150ms]"
            >
              + Add job
            </button>
          </div>

          {showAddJob && (
            <AddJobModal
              onClose={() => setShowAddJob(false)}
            />
          )}

          {error && (
            <div className="border border-border rounded-[8px] p-3 mb-6 bg-surface text-sm text-text-dimmed font-dm-sans">
              {error}
              <button onClick={fixUserId} className="ml-3 px-2 py-0.5 border border-border rounded text-xs text-text-primary hover:bg-surface-secondary transition-all">
                Fix account →
              </button>
              <button onClick={runDebug} className="ml-2 underline text-xs">diagnose</button>
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

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border border-border rounded-[8px] p-4 animate-pulse bg-surface">
                  <div className="h-4 bg-surface-secondary rounded w-2/3 mb-2" />
                  <div className="h-3 bg-surface-secondary rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="border border-border rounded-[8px] p-12 text-center bg-surface">
              <p className="font-dm-sans text-text-dimmed text-sm mb-1">
                {refreshing ? "Fetching jobs..." : "No new matches right now."}
              </p>
              {!refreshing && (
                <p className="font-dm-sans text-text-dimmed text-xs">
                  Hit Refresh to fetch new matches, or check the Tracker for jobs you&apos;re already pursuing.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
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
                <a
                  href="/profile"
                  className="block mt-3 text-xs text-center py-2 border border-border rounded-[8px] hover:bg-surface-secondary transition-all duration-[150ms] font-dm-sans"
                >
                  Upgrade to Pro →
                </a>
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
