"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  getApplications,
  updateStatus,
  deleteApplication,
  type Application,
  type AppStatus,
} from "@/lib/job-applications";

const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; color: string; dot: string }
> = {
  applied: {
    label: "Applied",
    color: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  interview: {
    label: "Interview",
    color: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
  },
  offer: {
    label: "Offer 🎉",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  rejected: {
    label: "Rejected",
    color: "bg-slate-100 text-slate-500",
    dot: "bg-slate-400",
  },
};

const ALL_STATUSES: AppStatus[] = ["applied", "interview", "offer", "rejected"];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-hec-stone shadow-card p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-slate-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}

function CoverLetterSection({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-3 pt-3 border-t border-hec-stone">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-hec-gold font-semibold flex items-center gap-1 active:scale-95 transition-all"
      >
        {open ? "▾" : "▸"} View cover letter
      </button>
      {open && (
        <div className="mt-2 bg-hec-ivory rounded-xl p-3 relative">
          <p className="text-xs text-hec-ink leading-relaxed whitespace-pre-wrap">{text}</p>
          <button
            onClick={copy}
            className="mt-2 text-xs text-hec-gold font-semibold active:scale-95 transition-all"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState<AppStatus | "all">("all");

  useEffect(() => {
    setApps(getApplications());
  }, []);

  function handleStatusChange(id: string, status: AppStatus) {
    updateStatus(id, status);
    setApps(getApplications());
  }

  function handleDelete(id: string) {
    deleteApplication(id);
    setApps(getApplications());
  }

  const counts = {
    applied: apps.filter((a) => a.status === "applied").length,
    interview: apps.filter((a) => a.status === "interview").length,
    offer: apps.filter((a) => a.status === "offer").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  const visible = filter === "all" ? apps : apps.filter((a) => a.status === filter);

  return (
    <main className="min-h-screen bg-hec-ivory">
      {/* Hero */}
      <div className="bg-hec-navy px-4 pt-8 pb-12 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-hec-gold/20 blur-3xl"
        />
        <div className="relative max-w-xl mx-auto flex items-start justify-between gap-4">
          <div>
            <p className="text-hec-gold text-xs font-semibold uppercase tracking-widest mb-2">
              My Applications
            </p>
            <h1 className="text-white text-2xl font-bold leading-tight">
              Application Dashboard
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Track every application and its status
            </p>
          </div>
          <Link
            href="/jobs"
            className="flex-shrink-0 mt-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all active:scale-95"
          >
            ← Search Jobs
          </Link>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-4 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <StatCard label="Applied" value={counts.applied} color="text-blue-600" />
          <StatCard label="Interview" value={counts.interview} color="text-yellow-600" />
          <StatCard label="Offer" value={counts.offer} color="text-green-600" />
          <StatCard label="Rejected" value={counts.rejected} color="text-slate-400" />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap mb-4">
          {(["all", ...ALL_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                filter === s
                  ? "bg-hec-navy text-white"
                  : "bg-white border border-hec-stone text-hec-navy hover:border-hec-navy"
              }`}
            >
              {s === "all" ? `All (${apps.length})` : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {apps.length === 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-hec-stone p-10 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-hec-navy font-semibold mb-1">No applications yet</p>
            <p className="text-slate-400 text-sm mb-4">
              Start applying to jobs and they'll appear here.
            </p>
            <Link
              href="/jobs"
              className="inline-block px-5 py-2.5 bg-hec-navy text-white text-sm font-semibold rounded-xl active:scale-95 transition-all"
            >
              Find Jobs →
            </Link>
          </div>
        )}

        {/* Application cards */}
        <div className="flex flex-col gap-3">
          {visible.map((app) => {
            const cfg = STATUS_CONFIG[app.status];
            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-hec-stone shadow-card p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-hec-navy font-semibold text-sm truncate">
                      {app.jobTitle}
                    </h2>
                    <p className="text-slate-500 text-xs">{app.company}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs text-slate-400">
                  <span>📍 {app.location}</span>
                  <span>📅 {formatDate(app.appliedAt)}</span>
                  {app.method === "auto" && app.ats && (
                    <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">
                      Auto via {app.ats}
                    </span>
                  )}
                  {app.method === "manual" && (
                    <span className="bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                      Manual
                    </span>
                  )}
                </div>

                {/* Status selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-slate-400 font-medium">Update status:</p>
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(app.id, s)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                        app.status === s
                          ? STATUS_CONFIG[s].color
                          : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>

                {/* Cover letter */}
                {app.coverLetter && <CoverLetterSection text={app.coverLetter} />}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-hec-stone">
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-hec-gold font-semibold hover:underline"
                  >
                    View job →
                  </a>
                  <button
                    onClick={() => handleDelete(app.id)}
                    className="text-xs text-slate-300 hover:text-red-400 transition-colors active:scale-95"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
