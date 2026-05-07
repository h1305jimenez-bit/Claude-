"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { ApplyModal } from "@/components/ApplyModal";
import type { Job, Kit } from "@/lib/types";

export default function AutoApplyPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [kits, setKits] = useState<Record<string, Kit>>({});
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const supabase = createBrowserSupabase();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;

      const { data: kitReadyJobs } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", userId)
        .eq("kit_ready", true)
        .neq("status", "closed")
        .order("score", { ascending: false });

      if (kitReadyJobs) {
        setJobs(kitReadyJobs as Job[]);

        const kitResults = await Promise.all(
          kitReadyJobs.map((j: Job) =>
            supabase.from("kits").select("*").eq("job_id", j.id).eq("user_id", userId).single()
          )
        );

        const kitMap: Record<string, Kit> = {};
        kitResults.forEach((r, i) => {
          if (r.data) kitMap[kitReadyJobs[i].id] = r.data as Kit;
        });
        setKits(kitMap);
      }

      // Load already applied job IDs
      const { data: apps } = await supabase
        .from("applications")
        .select("job_id")
        .eq("user_id", userId);
      if (apps) setAppliedIds(new Set(apps.map((a: { job_id: string }) => a.job_id)));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApplied = (jobId: string) => {
    setAppliedIds((prev) => new Set([...prev, jobId]));
    setSelectedJob(null);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">Auto-Apply</h1>
          <p className="text-text-dimmed text-sm font-dm-sans">Jobs with complete kits — ready to apply.</p>
        </div>

        {/* Coming soon banner */}
        <div className="border border-border rounded-[8px] p-4 bg-surface mb-6 flex items-center justify-between">
          <div>
            <p className="font-dm-sans font-medium text-text-primary text-sm">Fully automated apply coming soon</p>
            <p className="text-text-dimmed text-xs font-dm-sans">We&apos;ll fill and submit forms automatically.</p>
          </div>
          <a
            href="/waitlist"
            className="text-xs px-3 py-2 border border-border rounded-[8px] font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms] whitespace-nowrap"
          >
            Join waitlist →
          </a>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border rounded-[8px] p-4 animate-pulse bg-surface">
                <div className="h-4 bg-surface-secondary rounded w-2/3 mb-2" />
                <div className="h-3 bg-surface-secondary rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="border border-border rounded-[8px] p-12 text-center bg-surface">
            <p className="text-text-dimmed font-dm-sans text-sm mb-2">No kits ready yet.</p>
            <p className="text-text-dimmed text-xs font-dm-sans">Generate kits from the dashboard and they&apos;ll appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const applied = appliedIds.has(job.id);
              return (
                <div key={job.id} className="border border-border rounded-[8px] p-4 bg-surface">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-dm-sans font-medium text-text-primary text-sm">{job.role}</h3>
                      <p className="text-text-dimmed text-xs font-dm-sans">{job.company} · {job.location}</p>
                      <div className="flex gap-2 mt-2">
                        {[
                          `${job.score}/100 match`,
                          job.portal,
                          `${job.steps} steps`,
                          `~${job.estimated_time}`,
                        ].filter(Boolean).map((badge) => (
                          <span key={badge} className="text-xs px-2 py-0.5 bg-surface-secondary border border-border rounded-full font-dm-sans text-text-dimmed">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                    {applied ? (
                      <span className="shrink-0 text-xs px-3 py-2 border border-border rounded-[8px] text-text-dimmed font-dm-sans">
                        Applied ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="shrink-0 text-xs px-3 py-2 bg-btn-bg text-btn-text rounded-[8px] font-dm-sans hover:opacity-90 transition-all duration-[150ms]"
                      >
                        Review & Apply →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedJob && (
        <ApplyModal
          job={selectedJob}
          kit={kits[selectedJob.id] ?? null}
          onClose={() => setSelectedJob(null)}
          onApplied={() => handleApplied(selectedJob.id)}
        />
      )}
    </div>
  );
}
