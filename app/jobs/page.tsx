"use client";

import { useState, useRef, useCallback } from "react";
import type { UnifiedJob } from "@/app/api/search-jobs/route";
import type { CandidateProfile } from "@/app/api/analyze-cv/route";

type Stage = "upload" | "analyzing" | "search";

const SOURCE_COLORS: Record<string, string> = {
  Arbeitnow: "bg-blue-50 text-blue-700",
  Remotive: "bg-green-50 text-green-700",
};

// ── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-100 text-green-700"
      : score >= 60
        ? "bg-yellow-100 text-yellow-700"
        : "bg-slate-100 text-slate-500";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {score}%
    </span>
  );
}

// ── Job card ──────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: UnifiedJob }) {
  return (
    <div className="bg-white rounded-2xl border border-hec-stone shadow-card p-5 hover:border-hec-navy transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h2 className="text-hec-navy font-semibold text-sm">{job.title}</h2>
            {job.score !== undefined && <ScoreBadge score={job.score} />}
          </div>
          <p className="text-slate-500 text-xs">{job.company}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
            SOURCE_COLORS[job.source] ?? "bg-slate-100 text-slate-600"
          }`}
        >
          {job.source}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs text-slate-500">
        <span>📍 {job.location}</span>
        <span>💼 {job.type}</span>
        <span>🕐 {job.postedAt}</span>
      </div>

      <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 mb-3">
        {job.description}
      </p>

      {job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-hec-sand text-hec-navy text-xs rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {job.matchReasons && job.matchReasons.length > 0 && (
        <div className="mb-3">
          {job.matchReasons.slice(0, 2).map((r, i) => (
            <p key={i} className="text-xs text-green-600 flex items-start gap-1">
              <span>✓</span>
              <span>{r}</span>
            </p>
          ))}
        </div>
      )}

      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-2.5 bg-hec-navy text-white text-xs font-semibold rounded-xl active:scale-95 transition-all hover:bg-hec-blue text-center"
      >
        Apply ⚡
      </a>
    </div>
  );
}

// ── Upload zone ───────────────────────────────────────────────────────────────

function UploadZone({
  file,
  onFile,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  inputRef,
}: {
  file: File | null;
  onFile: (f: File) => void;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
        dragging
          ? "border-hec-gold bg-hec-gold-soft"
          : file
            ? "border-green-400 bg-green-50"
            : "border-hec-stone hover:border-hec-navy"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {file ? (
        <>
          <p className="text-3xl mb-2">📄</p>
          <p className="text-hec-navy font-semibold text-sm">{file.name}</p>
          <p className="text-slate-400 text-xs mt-1">
            {(file.size / 1024).toFixed(0)} KB · Click to change
          </p>
        </>
      ) : (
        <>
          <p className="text-4xl mb-3">📋</p>
          <p className="text-hec-navy font-semibold text-sm">
            Drop your CV here
          </p>
          <p className="text-slate-400 text-xs mt-1">
            or click to browse · PDF only · Max 6 MB
          </p>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [analyzeError, setAnalyzeError] = useState("");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<UnifiedJob[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const ANALYZE_STEPS = [
    "Reading CV…",
    "Identifying skills & experience…",
    "Building your profile…",
    "Searching worldwide jobs…",
  ];

  // ── File handling ────────────────────────────────────────────────────────

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) return;
    setFile(f);
  }, []);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  // ── Analyze CV ───────────────────────────────────────────────────────────

  async function analyzeCV() {
    if (!file) return;
    setStage("analyzing");
    setAnalyzeStep(0);
    setAnalyzeError("");

    const stepTimer = setInterval(() => {
      setAnalyzeStep((s) => Math.min(s + 1, ANALYZE_STEPS.length - 1));
    }, 1200);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/analyze-cv", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setProfile(data.profile);
      setQuery(data.profile.title || "");
      setStage("search");

      // Auto-search with profile
      await doSearch(data.profile.title || "", data.profile);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Unknown error");
      setStage("upload");
    } finally {
      clearInterval(stepTimer);
    }
  }

  // ── Search jobs ──────────────────────────────────────────────────────────

  async function doSearch(q: string, prof: CandidateProfile | null = profile) {
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch("/api/search-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, profile: prof }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setJobs(data.jobs ?? []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function handleQueryChange(val: string) {
    setQuery(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(val), 600);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-hec-ivory">
      {/* Hero */}
      <div className="bg-hec-navy px-4 pt-8 pb-12 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-hec-gold/20 blur-3xl"
        />
        <div className="relative max-w-xl mx-auto">
          <p className="text-hec-gold text-xs font-semibold uppercase tracking-widest mb-2">
            AI Job Search
          </p>
          <h1 className="text-white text-2xl font-bold leading-tight">
            Find & apply to jobs worldwide
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Upload your CV · Claude matches you · one-click apply
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-4 pb-12">
        {/* ── Stage: upload ── */}
        {stage === "upload" && (
          <div className="bg-white rounded-3xl shadow-card border border-hec-stone p-6">
            <h2 className="text-hec-navy font-bold text-lg mb-1">
              Upload your CV
            </h2>
            <p className="text-slate-500 text-sm mb-5">
              Claude will read your CV, extract your profile, and instantly
              search for the best matching jobs across multiple platforms.
            </p>

            <UploadZone
              file={file}
              onFile={handleFile}
              dragging={dragging}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              inputRef={inputRef}
            />

            {analyzeError && (
              <p className="mt-3 text-xs text-red-600 font-medium">
                ⚠ {analyzeError}
              </p>
            )}

            <button
              onClick={analyzeCV}
              disabled={!file}
              className="mt-5 w-full py-3.5 bg-hec-navy text-white font-semibold rounded-2xl active:scale-95 transition-all disabled:opacity-40 text-sm"
            >
              Analyze & Find Jobs →
            </button>

            <p className="text-center text-xs text-slate-400 mt-3">
              Or{" "}
              <button
                onClick={() => {
                  setStage("search");
                  doSearch("");
                }}
                className="text-hec-gold font-semibold underline"
              >
                browse jobs without a CV
              </button>
            </p>
          </div>
        )}

        {/* ── Stage: analyzing ── */}
        {stage === "analyzing" && (
          <div className="bg-white rounded-3xl shadow-card border border-hec-stone p-8 text-center">
            <div className="w-12 h-12 border-3 border-hec-navy border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <h2 className="text-hec-navy font-bold text-lg mb-4">
              Analyzing your profile…
            </h2>
            <div className="text-left space-y-2.5">
              {ANALYZE_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="text-base">
                    {i < analyzeStep
                      ? "✅"
                      : i === analyzeStep
                        ? "⏳"
                        : "⬜"}
                  </span>
                  <span
                    className={`text-sm ${
                      i <= analyzeStep
                        ? "text-hec-navy font-medium"
                        : "text-slate-400"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stage: search ── */}
        {stage === "search" && (
          <>
            {/* Profile card */}
            {profile && (
              <div className="bg-hec-navy rounded-2xl p-4 mb-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-hec-gold/20 flex items-center justify-center text-2xl flex-shrink-0">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{profile.name}</p>
                  <p className="text-white/60 text-xs truncate">
                    {profile.title} · {profile.experience_years}y exp
                  </p>
                  <p className="text-hec-gold text-xs mt-0.5 truncate">
                    {profile.skills.slice(0, 4).join(" · ")}
                    {profile.skills.length > 4 &&
                      ` +${profile.skills.length - 4}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStage("upload");
                    setFile(null);
                    setProfile(null);
                    setJobs([]);
                  }}
                  className="text-white/40 hover:text-white/80 text-xs active:scale-95 transition-all flex-shrink-0"
                >
                  Change
                </button>
              </div>
            )}

            {/* Search bar */}
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by role, skill, or company…"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-hec-stone text-hec-ink placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-hec-gold shadow-card"
              />
              {searching && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                  <span className="w-4 h-4 border-2 border-hec-navy border-t-transparent rounded-full animate-spin inline-block" />
                </span>
              )}
            </div>

            {/* Results header */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-hec-navy">
                {searching
                  ? "Searching…"
                  : `${jobs.length} job${jobs.length !== 1 ? "s" : ""} found`}
              </p>
              <div className="flex gap-1.5 text-xs text-slate-400">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  Arbeitnow
                </span>
                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Remotive
                </span>
              </div>
            </div>

            {searchError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 text-xs text-red-700">
                ⚠ {searchError}
              </div>
            )}

            {/* Job list */}
            {jobs.length === 0 && !searching ? (
              <div className="bg-white rounded-2xl shadow-card border border-hec-stone p-10 text-center">
                <p className="text-4xl mb-3">🌍</p>
                <p className="text-hec-navy font-semibold mb-1">No jobs found</p>
                <p className="text-slate-400 text-sm">
                  Try different keywords or check your connection.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

    </main>
  );
}
