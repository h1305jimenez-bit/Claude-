"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { JobRow } from "@/components/JobRow";
import { RefreshMeter } from "@/components/RefreshMeter";
import { AddJobModal } from "@/components/AddJobModal";
import type { Job, User } from "@/lib/types";

const STATUS_GROUPS = [
  { key: "new", label: "New" },
  { key: "open", label: "Open" },
  { key: "closing", label: "Closing soon" },
  { key: "closed", label: "Closed" },
] as const;

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(5);
  const [error, setError] = useState("");
  const [showAddJob, setShowAddJob] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const supabase = createBrowserSupabase();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;
      setAccessToken(sessionData.session?.access_token ?? null);

      const [userRes, jobsRes] = await Promise.all([
        supabase.from("users").select("*").eq("id", userId).single(),
        supabase.from("jobs").select("*").eq("user_id", userId).order("score", { ascending: false }),
      ]);

      if (userRes.data) {
        const u = userRes.data as User;
        setUser(u);
        // Compute remaining refreshes
        const today = new Date().toDateString();
        const resetDate = u.daily_refreshes_reset_at
          ? new Date(u.daily_refreshes_reset_at).toDateString()
          : null;
        if (today !== resetDate) {
          setRemaining(5);
        } else {
          setRemaining(Math.max(0, 5 - (u.daily_refreshes_used ?? 0)));
        }
      }

      if (jobsRes.data) setJobs(jobsRes.data as Job[]);

      // Auto-fetch if no jobs or last job is > 24h old
      const hasJobs = jobsRes.data && jobsRes.data.length > 0;
      const lastJob = jobsRes.data?.[0];
      const isStale = lastJob
        ? Date.now() - new Date(lastJob.created_at).getTime() > 24 * 60 * 60 * 1000
        : true;

      if (!hasJobs || isStale) {
        await triggerRefresh(false);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const triggerRefresh = async (manual = true) => {
    if (manual && remaining <= 0) {
      setError("Daily refresh limit reached. Try again tomorrow.");
      return;
    }
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/jobs/fetch", {
        method: "POST",
        headers: accessToken ? { "x-access-token": accessToken } : {},
      });
      let data: { count?: number; remaining?: number; error?: string } = {};
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
      if ((data.count ?? 0) === 0) setError("No new jobs found. Try again later or update your target role in Profile.");

      // Reload jobs
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (userId) {
        const { data: newJobs } = await supabase
          .from("jobs")
          .select("*")
          .eq("user_id", userId)
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

  const grouped = STATUS_GROUPS.map((group) => ({
    ...group,
    jobs: jobs.filter((j) => j.status === group.key),
  }));

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
              <p className="text-text-dimmed text-sm font-dm-sans">
                Matched to your CV · scored by AI
              </p>
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
              <p className="font-dm-sans text-text-dimmed text-sm">
                {refreshing ? "Fetching jobs..." : "No jobs yet. Click Refresh to fetch matches."}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map((group) =>
                group.jobs.length > 0 ? (
                  <div key={group.key}>
                    <h2 className="font-dm-sans text-xs text-text-dimmed font-medium uppercase tracking-wider mb-3">
                      {group.label} · {group.jobs.length}
                    </h2>
                    <div className="space-y-2">
                      {group.jobs.map((job) => (
                        <JobRow key={job.id} job={job} />
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
        </main>

        {/* Sidebar right */}
        <aside className="w-64 border-l border-border p-6 shrink-0">
          <RefreshMeter
            remaining={remaining}
            onRefresh={() => triggerRefresh(true)}
            loading={refreshing}
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
