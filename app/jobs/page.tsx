"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect } from "react";
import type { UnifiedJob } from "@/app/api/search-jobs/route";
import type { CandidateProfile } from "@/app/api/analyze-cv/route";
import { isApplied, saveApplication } from "@/lib/job-applications";
import {
  getSavedProfile,
  getSavedCvDataUrl,
  saveProfile,
  clearSavedProfile,
  dataUrlToFile,
} from "@/lib/saved-profile";
import {
  getAlerts,
  saveAlert,
  updateAlertSeen,
} from "@/lib/job-alerts";

type Stage = "upload" | "analyzing" | "search";
type ApplyState = "idle" | "loading" | "applied" | "manual";

const SOURCE_COLORS: Record<string, string> = {
  Arbeitnow: "bg-blue-50 text-blue-700",
  Remotive: "bg-green-50 text-green-700",
  "The Muse": "bg-purple-50 text-purple-700",
  Jobicy: "bg-orange-50 text-orange-700",
  FindWork: "bg-red-50 text-red-700",
};

// ── Score badge ───────────────────────────────────────────────────────────────

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

// ── Alert modal ───────────────────────────────────────────────────────────────

function AlertModal({
  query,
  defaultEmail,
  onSave,
  onClose,
}: {
  query: string;
  defaultEmail: string;
  onSave: (email: string) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(defaultEmail);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
        <p className="text-xs text-hec-gold font-semibold uppercase tracking-widest mb-1">
          Job Alert
        </p>
        <h2 className="text-hec-navy font-bold text-lg mb-1">
          Get notified of new jobs
        </h2>
        <p className="text-slate-500 text-sm mb-5">
          We'll email you when new jobs matching{" "}
          <strong>"{query}"</strong> appear.
        </p>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
          Your email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-3 rounded-xl border border-hec-stone text-sm text-hec-ink focus:outline-none focus:ring-2 focus:ring-hec-gold mb-4"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-hec-sand text-hec-navy text-sm font-semibold rounded-xl active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => email && onSave(email)}
            disabled={!email}
            className="flex-1 py-2.5 bg-hec-navy text-white text-sm font-semibold rounded-xl active:scale-95 transition-all disabled:opacity-40"
          >
            Save Alert 🔔
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Job card ──────────────────────────────────────────────────────────────────

function JobCard({
  job,
  profile,
  cvFile,
}: {
  job: UnifiedJob;
  profile: CandidateProfile | null;
  cvFile: File | null;
}) {
  const [applyState, setApplyState] = useState<ApplyState>("idle");

  useEffect(() => {
    if (isApplied(job.url)) setApplyState("applied");
  }, [job.url]);

  async function handleApply() {
    if (applyState === "applied") return;

    if (!profile || !cvFile) {
      window.open(job.url, "_blank", "noopener");
      saveApplication({
        jobTitle: job.title, company: job.company, location: job.location,
        url: job.url, source: job.source, method: "manual", status: "applied",
      });
      setApplyState("manual");
      return;
    }

    setApplyState("loading");
    const fd = new FormData();
    fd.append("cv", cvFile);
    fd.append("profile", JSON.stringify(profile));
    fd.append("job", JSON.stringify(job));

    try {
      const res = await fetch("/api/apply-job", { method: "POST", body: fd });
      const data = (await res.json()) as {
        applied: boolean; ats?: string; coverLetter?: string;
      };

      if (data.applied) {
        saveApplication({
          jobTitle: job.title, company: job.company, location: job.location,
          url: job.url, source: job.source, method: "auto", ats: data.ats,
          status: "applied", coverLetter: data.coverLetter,
        });
        setApplyState("applied");
      } else {
        window.open(job.url, "_blank", "noopener");
        saveApplication({
          jobTitle: job.title, company: job.company, location: job.location,
          url: job.url, source: job.source, method: "manual", status: "applied",
          coverLetter: data.coverLetter,
        });
        setApplyState("manual");
      }
    } catch {
      window.open(job.url, "_blank", "noopener");
      setApplyState("manual");
    }
  }

  const btnLabel =
    applyState === "loading" ? "Applying…"
    : applyState === "applied" ? "✓ Applied"
    : applyState === "manual"  ? "Opened →"
    : "Apply ⚡";

  const btnCls =
    applyState === "applied" ? "bg-green-600 text-white cursor-default"
    : applyState === "loading" ? "bg-hec-navy/60 text-white cursor-wait"
    : "bg-hec-navy text-white hover:bg-hec-blue active:scale-95";

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
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${SOURCE_COLORS[job.source] ?? "bg-slate-100 text-slate-600"}`}>
          {job.source}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs text-slate-500">
        <span>{job.flag} {job.location}</span>
        <span>💼 {job.type}</span>
        <span>🕐 {job.postedAt}</span>
      </div>

      <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 mb-3">
        {job.description}
      </p>

      {job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-hec-sand text-hec-navy text-xs rounded-full font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {job.matchReasons && job.matchReasons.length > 0 && (
        <div className="mb-3">
          {job.matchReasons.slice(0, 2).map((r, i) => (
            <p key={i} className="text-xs text-green-600 flex items-start gap-1">
              <span>✓</span><span>{r}</span>
            </p>
          ))}
        </div>
      )}

      <button
        onClick={handleApply}
        disabled={applyState === "loading" || applyState === "applied"}
        className={`w-full py-2.5 text-xs font-semibold rounded-xl transition-all ${btnCls}`}
      >
        {applyState === "loading" && (
          <span className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1.5 align-middle" />
        )}
        {btnLabel}
      </button>
    </div>
  );
}

// ── Upload zone ───────────────────────────────────────────────────────────────

function UploadZone({
  file, onFile, dragging, onDragOver, onDragLeave, onDrop, onClick, inputRef,
}: {
  file: File | null; onFile: (f: File) => void; dragging: boolean;
  onDragOver: (e: React.DragEvent) => void; onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void; onClick: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div
      onClick={onClick} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
        dragging ? "border-hec-gold bg-hec-gold-soft"
        : file   ? "border-green-400 bg-green-50"
        :          "border-hec-stone hover:border-hec-navy"
      }`}
    >
      <input ref={inputRef} type="file" accept=".pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {file ? (
        <>
          <p className="text-3xl mb-2">📄</p>
          <p className="text-hec-navy font-semibold text-sm">{file.name}</p>
          <p className="text-slate-400 text-xs mt-1">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
        </>
      ) : (
        <>
          <p className="text-4xl mb-3">📋</p>
          <p className="text-hec-navy font-semibold text-sm">Drop your CV here</p>
          <p className="text-slate-400 text-xs mt-1">or click to browse · PDF only · Max 6 MB</p>
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
  const [savedProfile, setSavedProfile] = useState<CandidateProfile | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const ANALYZE_STEPS = [
    "Reading CV…",
    "Identifying skills & experience…",
    "Building your profile…",
    "Searching worldwide jobs…",
  ];

  // Load saved profile on mount + check alerts
  useEffect(() => {
    const sp = getSavedProfile();
    if (sp) setSavedProfile(sp);

    // Check job alerts in the background
    const alerts = getAlerts();
    if (alerts.length > 0) {
      fetch("/api/send-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alerts }),
      })
        .then((r) => r.json())
        .then((data: { results?: { alertId: string; allIds: string[] }[] }) => {
          (data.results ?? []).forEach(({ alertId, allIds }) => {
            updateAlertSeen(alertId, allIds);
          });
        })
        .catch(() => {});
    }
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) return;
    setFile(f);
  }, []);

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }

  function useSavedProfile() {
    if (!savedProfile) return;
    setProfile(savedProfile);
    setQuery(savedProfile.title ?? "");

    // Try to restore saved CV file
    const cvDataUrl = getSavedCvDataUrl();
    if (cvDataUrl) {
      const restored = dataUrlToFile(cvDataUrl, "resume.pdf");
      setFile(restored);
    }

    setStage("search");
    doSearch(savedProfile.title ?? "", savedProfile);
  }

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
      const res = await fetch("/api/analyze-cv", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setProfile(data.profile);
      setQuery(data.profile.title ?? "");
      setSavedProfile(data.profile);
      saveProfile(data.profile, file); // auto-save for next visit
      setStage("search");
      await doSearch(data.profile.title ?? "", data.profile);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Unknown error");
      setStage("upload");
    } finally {
      clearInterval(stepTimer);
    }
  }

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

  function handleSaveAlert(email: string) {
    saveAlert(query || "developer", email);
    setShowAlertModal(false);
    setAlertSaved(true);
    setTimeout(() => setAlertSaved(false), 3000);
  }

  return (
    <main className="min-h-screen bg-hec-ivory">
      {/* Hero */}
      <div className="bg-hec-navy px-4 pt-8 pb-12 relative overflow-hidden">
        <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-hec-gold/20 blur-3xl" />
        <div className="relative max-w-xl mx-auto flex items-start justify-between gap-4">
          <div>
            <p className="text-hec-gold text-xs font-semibold uppercase tracking-widest mb-2">AI Job Search</p>
            <h1 className="text-white text-2xl font-bold leading-tight">Find & apply worldwide</h1>
            <p className="text-white/70 text-sm mt-1">Upload CV · AI matches you · one-click apply</p>
          </div>
          <Link
            href="/jobs/dashboard"
            className="flex-shrink-0 mt-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all active:scale-95 whitespace-nowrap"
          >
            📊 My Applications
          </Link>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-4 pb-12">

        {/* ── Stage: upload ── */}
        {stage === "upload" && (
          <div className="space-y-3">
            {/* Saved profile banner */}
            {savedProfile && (
              <div className="bg-white rounded-2xl border border-hec-stone shadow-card p-4 flex items-center gap-3">
                <div className="text-2xl">👤</div>
                <div className="flex-1 min-w-0">
                  <p className="text-hec-navy font-semibold text-sm">Welcome back, {savedProfile.name.split(" ")[0]}!</p>
                  <p className="text-slate-500 text-xs truncate">{savedProfile.title} · {savedProfile.skills.slice(0, 3).join(", ")}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={useSavedProfile}
                    className="px-3 py-1.5 bg-hec-navy text-white text-xs font-semibold rounded-xl active:scale-95 transition-all whitespace-nowrap"
                  >
                    Use profile →
                  </button>
                  <button
                    onClick={() => { clearSavedProfile(); setSavedProfile(null); }}
                    className="text-xs text-slate-400 hover:text-slate-600 text-center"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-card border border-hec-stone p-6">
              <h2 className="text-hec-navy font-bold text-lg mb-1">Upload your CV</h2>
              <p className="text-slate-500 text-sm mb-5">
                Claude reads your CV, extracts your profile, and instantly finds the best matching jobs across 4 platforms worldwide.
              </p>

              <UploadZone
                file={file} onFile={handleFile} dragging={dragging}
                onDragOver={handleDragOver} onDragLeave={() => setDragging(false)}
                onDrop={handleDrop} onClick={() => inputRef.current?.click()} inputRef={inputRef}
              />

              {analyzeError && (
                <p className="mt-3 text-xs text-red-600 font-medium">⚠ {analyzeError}</p>
              )}

              <button
                onClick={analyzeCV} disabled={!file}
                className="mt-5 w-full py-3.5 bg-hec-navy text-white font-semibold rounded-2xl active:scale-95 transition-all disabled:opacity-40 text-sm"
              >
                Analyze & Find Jobs →
              </button>

              <p className="text-center text-xs text-slate-400 mt-3">
                Or{" "}
                <button
                  onClick={() => { setStage("search"); doSearch(""); }}
                  className="text-hec-gold font-semibold underline"
                >
                  browse jobs without a CV
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── Stage: analyzing ── */}
        {stage === "analyzing" && (
          <div className="bg-white rounded-3xl shadow-card border border-hec-stone p-8 text-center">
            <div className="w-12 h-12 border-2 border-hec-navy border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <h2 className="text-hec-navy font-bold text-lg mb-4">Analyzing your profile…</h2>
            <div className="text-left space-y-2.5">
              {ANALYZE_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="text-base">
                    {i < analyzeStep ? "✅" : i === analyzeStep ? "⏳" : "⬜"}
                  </span>
                  <span className={`text-sm ${i <= analyzeStep ? "text-hec-navy font-medium" : "text-slate-400"}`}>
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
                <div className="w-12 h-12 rounded-xl bg-hec-gold/20 flex items-center justify-center text-2xl flex-shrink-0">👤</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{profile.name}</p>
                  <p className="text-white/60 text-xs truncate">{profile.title} · {profile.experience_years}y exp</p>
                  <p className="text-hec-gold text-xs mt-0.5 truncate">
                    {profile.skills.slice(0, 4).join(" · ")}{profile.skills.length > 4 && ` +${profile.skills.length - 4}`}
                  </p>
                </div>
                <button
                  onClick={() => { setStage("upload"); setFile(null); setProfile(null); setJobs([]); }}
                  className="text-white/40 hover:text-white/80 text-xs active:scale-95 transition-all flex-shrink-0"
                >
                  Change
                </button>
              </div>
            )}

            {/* Search bar */}
            <div className="relative mb-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🔍</span>
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

            {/* Results header + alert button */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-hec-navy">
                {searching ? "Searching…" : `${jobs.length} job${jobs.length !== 1 ? "s" : ""} found`}
              </p>
              <div className="flex items-center gap-2">
                {alertSaved ? (
                  <span className="text-xs text-green-600 font-semibold">🔔 Alert saved!</span>
                ) : (
                  <button
                    onClick={() => setShowAlertModal(true)}
                    className="text-xs text-hec-gold font-semibold hover:underline active:scale-95 transition-all"
                  >
                    🔔 Save alert
                  </button>
                )}
              </div>
            </div>

            {/* Source legend */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {Object.entries(SOURCE_COLORS).map(([src, cls]) => (
                <span key={src} className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{src}</span>
              ))}
            </div>

            {searchError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 text-xs text-red-700">⚠ {searchError}</div>
            )}

            {jobs.length === 0 && !searching ? (
              <div className="bg-white rounded-2xl shadow-card border border-hec-stone p-10 text-center">
                <p className="text-4xl mb-3">🌍</p>
                <p className="text-hec-navy font-semibold mb-1">No jobs found</p>
                <p className="text-slate-400 text-sm">Try different keywords.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} profile={profile} cvFile={file} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Alert modal */}
      {showAlertModal && (
        <AlertModal
          query={query || "developer"}
          defaultEmail={profile?.email ?? ""}
          onSave={handleSaveAlert}
          onClose={() => setShowAlertModal(false)}
        />
      )}
    </main>
  );
}
