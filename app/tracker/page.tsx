"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import type { Job } from "@/lib/types";

const PIPELINE_STATUSES = ["open", "closing", "closed"] as const;
type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

const STATUS_LABELS: Record<string, string> = {
  open: "In review",
  closing: "Closing soon",
  closed: "Applied / Done",
  new: "New",
};

const STATUS_COLORS: Record<string, string> = {
  open: "border-blue-300 text-blue-700 bg-blue-50",
  closing: "border-yellow-400 text-yellow-700 bg-yellow-50",
  closed: "border-green-400 text-green-700 bg-green-50",
  new: "border-border text-text-dimmed",
};

function daysAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export default function TrackerPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const supabase = createBrowserSupabase();
  const router = useRouter();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) { router.push("/auth"); return; }

      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["open", "closing", "closed"])
        .order("score", { ascending: false });

      if (data) setJobs(data as Job[]);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStatus = async (jobId: string, status: string) => {
    setUpdatingId(jobId);
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: status as Job["status"] } : j));
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/jobs?id=eq.${jobId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
  };

  const applied = jobs.filter(j => j.status === "closed").length;
  const inReview = jobs.filter(j => j.status === "open" || j.status === "closing").length;
  const avgScore = jobs.length
    ? Math.round(jobs.reduce((s, j) => s + j.score, 0) / jobs.length)
    : 0;

  const grouped: Record<PipelineStatus, Job[]> = {
    open: jobs.filter(j => j.status === "open"),
    closing: jobs.filter(j => j.status === "closing"),
    closed: jobs.filter(j => j.status === "closed"),
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">Tracker</h1>
          <p className="text-text-dimmed text-sm font-dm-sans">
            Jobs you&apos;ve moved out of New. Update status as you progress.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "In pipeline", value: inReview },
            { label: "Applied / Done", value: applied },
            { label: "Avg match score", value: avgScore ? `${avgScore}/100` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="border border-border rounded-[8px] p-4 bg-surface">
              <p className="text-xs text-text-dimmed font-dm-sans mb-1">{label}</p>
              <p className="font-syne font-bold text-2xl text-text-primary">{value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-border rounded-[8px] h-16 animate-pulse bg-surface" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="border border-border rounded-[8px] p-12 text-center bg-surface">
            <p className="text-text-dimmed font-dm-sans text-sm mb-2">No jobs in your pipeline yet.</p>
            <p className="text-text-dimmed font-dm-sans text-xs">
              From the Dashboard, click a job card and change its status to move it here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {PIPELINE_STATUSES.map(status => {
              const group = grouped[status];
              if (!group.length) return null;
              return (
                <div key={status}>
                  <h2 className="font-dm-sans text-xs text-text-dimmed font-medium uppercase tracking-wider mb-3">
                    {STATUS_LABELS[status]} · {group.length}
                  </h2>
                  <div className="border border-border rounded-[8px] overflow-hidden">
                    <table className="w-full text-sm font-dm-sans">
                      <thead className="bg-surface border-b border-border">
                        <tr>
                          {["Company", "Role", "Location", "Score", "Posted", "Status", "Apply"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs text-text-dimmed font-medium">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.map((job, i) => (
                          <tr
                            key={job.id}
                            className={`border-b border-border last:border-0 hover:bg-surface transition-all duration-[150ms] ${
                              i % 2 === 0 ? "bg-background" : "bg-surface"
                            }`}
                          >
                            <td className="px-4 py-3 font-medium text-text-primary">{job.company}</td>
                            <td className="px-4 py-3 text-text-dimmed max-w-[200px]">
                              <a
                                href={`/kit/${job.id}`}
                                className="hover:text-text-primary hover:underline transition-all duration-[150ms]"
                              >
                                {job.role}
                              </a>
                            </td>
                            <td className="px-4 py-3 text-text-dimmed text-xs">{job.location || "—"}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 border border-border rounded-full font-dm-sans font-semibold text-text-primary">
                                {job.score}/100
                              </span>
                            </td>
                            <td className="px-4 py-3 text-text-dimmed text-xs">{daysAgo(job.posted_date)}</td>
                            <td className="px-4 py-3">
                              <select
                                value={job.status}
                                disabled={updatingId === job.id}
                                onChange={e => updateStatus(job.id, e.target.value)}
                                className="text-xs border border-border rounded-[6px] px-2 py-1 bg-background text-text-primary font-dm-sans focus:outline-none hover:bg-surface transition-all duration-[150ms] disabled:opacity-50"
                              >
                                <option value="new">New</option>
                                <option value="open">In review</option>
                                <option value="closing">Closing soon</option>
                                <option value="closed">Applied / Done</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              {job.url ? (
                                <a
                                  href={`/api/jobs/go?url=${encodeURIComponent(job.url)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 border border-border rounded-[6px] text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms]"
                                >
                                  Apply ↗
                                </a>
                              ) : (
                                <span className="text-xs text-text-dimmed">No link</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
