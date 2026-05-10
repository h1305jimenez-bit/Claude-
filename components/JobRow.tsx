"use client";

import Link from "next/link";
import type { Job } from "@/lib/types";

interface JobRowProps {
  job: Job;
}

const scoreColor = (score: number) => {
  if (score >= 75) return "text-text-primary";
  if (score >= 50) return "text-text-dimmed";
  return "text-text-dimmed";
};

function daysAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

const statusLabel: Record<string, string> = {
  new: "New",
  open: "Open",
  closing: "Closing",
  closed: "Closed",
};

export function JobRow({ job }: JobRowProps) {
  return (
    <div className="border border-border rounded-card p-4 bg-surface hover:bg-surface-secondary transition-all duration-[150ms] group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 border border-border rounded-full font-dm-sans ${
              job.status === "closed" ? "text-text-dimmed" : "text-text-primary"
            }`}>
              {statusLabel[job.status] ?? job.status}
            </span>
            <span className="text-xs px-2 py-0.5 border border-border rounded-full font-dm-sans font-semibold text-text-primary">
              {job.score}/100
            </span>
          </div>
          <h3 className="font-dm-sans font-medium text-text-primary text-sm truncate">{job.role}</h3>
          <p className="text-text-dimmed text-xs font-dm-sans">{job.company} · {job.location}</p>

          {/* Preview strip */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {job.portal && (
              <span className="text-xs px-2 py-0.5 bg-surface-secondary border border-border rounded-full font-dm-sans text-text-dimmed">
                {job.portal}
              </span>
            )}
            {job.steps > 0 && (
              <span className="text-xs text-text-dimmed font-dm-sans">
                {job.steps} steps
              </span>
            )}
            {job.estimated_time && (
              <span className="text-xs text-text-dimmed font-dm-sans">
                ~{job.estimated_time}
              </span>
            )}
            {daysAgo(job.posted_date) && (
              <span className="text-xs text-text-dimmed font-dm-sans ml-auto">
                {daysAgo(job.posted_date)}
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/kit/${job.id}`}
          className="shrink-0 text-xs px-3 py-2 border border-border rounded-card bg-background hover:bg-btn-bg hover:text-btn-text hover:border-btn-bg transition-all duration-[150ms] font-dm-sans text-text-primary"
        >
          Open Kit →
        </Link>
      </div>

      {job.score_rationale && (
        <p className="mt-2 text-xs text-text-dimmed font-dm-sans line-clamp-1">{job.score_rationale}</p>
      )}
    </div>
  );
}
