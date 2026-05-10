"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { KitPanel, KitSkeleton } from "@/components/KitPanel";
import type { Job, Kit, User, JobInsights } from "@/lib/types";

const TABS = [
  { key: "preview", label: "Application Preview" },
  { key: "insights", label: "Job Insights" },
  { key: "cover", label: "Cover Letter" },
  { key: "cv", label: "Tailored CV" },
  { key: "screening", label: "Screening Answers" },
  { key: "skills", label: "Skills Gap" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function KitPage() {
  const params = useParams();
  const jobId = params?.jobId as string;
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [kit, setKit] = useState<Kit | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [insights, setInsights] = useState<JobInsights | null>(null);
  const [tab, setTab] = useState<TabKey>("preview");
  const [generating, setGenerating] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insightsError, setInsightsError] = useState("");
  const [careerUrl, setCareerUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [resolving, setResolving] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);

  const supabase = createBrowserSupabase();

  function downloadText(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const [copied, setCopied] = useState<string | null>(null);
  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) { router.push("/auth"); return; }

      const [userRes, jobRes, kitRes, insightsRes] = await Promise.all([
        supabase.from("users").select("*").eq("id", userId).single(),
        supabase.from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single(),
        supabase.from("kits").select("*").eq("job_id", jobId).eq("user_id", userId).single(),
        supabase.from("job_insights").select("*").eq("job_id", jobId).eq("user_id", userId).single(),
      ]);

      if (userRes.data) setUser(userRes.data as User);
      if (jobRes.data) setJob(jobRes.data as Job);
      if (kitRes.data) setKit(kitRes.data as Kit);
      if (insightsRes.data) setInsights(insightsRes.data as JobInsights);
    } finally {
      setLoading(false);
    }
  }, [supabase, jobId, router]);

  const generateKit = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/kits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json() as { kit?: Kit; error?: string };
      if (!res.ok) {
        if (data.error === "upgrade_required") {
          setError("upgrade_required");
        } else {
          throw new Error(data.error ?? "Generation failed");
        }
        return;
      }
      if (data.kit) setKit(data.kit);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const generateInsights = async () => {
    setGeneratingInsights(true);
    setInsightsError("");
    try {
      const res = await fetch("/api/jobs/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json() as { insights?: JobInsights; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate insights");
      if (data.insights) setInsights(data.insights);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setInsightsError(e.message ?? "Failed to generate insights");
    } finally {
      setGeneratingInsights(false);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  // Resolve the career page URL once the job loads
  useEffect(() => {
    if (!job) return;
    setResolving(true);
    setIframeBlocked(false);
    const params = new URLSearchParams({
      url: job.url ?? "",
      company: job.company,
      role: job.role,
      location: job.location ?? "",
    });
    fetch(`/api/jobs/resolve?${params}`)
      .then(r => r.json())
      .then((d: { resolvedUrl?: string | null; searchQuery?: string; googleUrl?: string }) => {
        setCareerUrl(d.resolvedUrl ?? null);
        setSearchQuery(d.searchQuery ?? "");
        setGoogleUrl(d.googleUrl ?? "");
      })
      .catch(() => {})
      .finally(() => setResolving(false));
  }, [job]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="ml-56 flex-1 p-8">
          <div className="h-6 w-48 bg-surface-secondary rounded animate-pulse mb-8" />
          <KitSkeleton />
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="ml-56 flex-1 p-8">
          <p className="text-text-dimmed font-dm-sans">Job not found.</p>
        </main>
      </div>
    );
  }

  const isPaid = user?.plan === "paid";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => router.push("/dashboard")} className="text-text-dimmed text-sm font-dm-sans hover:text-text-primary transition-all duration-[150ms]">
              ← Dashboard
            </button>
          </div>
          <h1 className="font-syne font-bold text-2xl text-text-primary">{job.role}</h1>
          <p className="text-text-dimmed text-sm font-dm-sans">{job.company} · {job.location}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs px-2 py-0.5 border border-border rounded-full font-dm-sans text-text-dimmed">{job.portal}</span>
            <span className="text-xs text-text-dimmed font-dm-sans">{job.steps} steps · ~{job.estimated_time}</span>
            <span className="font-syne font-bold text-text-primary">{job.score}/100</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6 overflow-x-auto">
          {TABS.map((t) => {
            const locked = t.key !== "preview" && t.key !== "insights" && !isPaid;
            return (
              <button
                key={t.key}
                onClick={() => !locked && setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-dm-sans whitespace-nowrap border-b-2 transition-all duration-[150ms] ${
                  tab === t.key
                    ? "border-text-primary text-text-primary font-medium"
                    : "border-transparent text-text-dimmed hover:text-text-primary"
                } ${locked ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {t.label}
                {locked && <span className="ml-1 text-xs">🔒</span>}
              </button>
            );
          })}
        </div>

        {/* Generate CTA or upgrade prompt */}
        {tab !== "preview" && tab !== "insights" && !isPaid && (
          <div className="border border-border rounded-[8px] p-8 text-center bg-surface mb-6">
            <p className="font-syne font-bold text-lg text-text-primary mb-2">Upgrade to Pro</p>
            <p className="text-text-dimmed text-sm font-dm-sans mb-4">
              Unlimited job refreshes, plus tailored cover letters, CVs, screening answers, and skills gap analysis for every application.
            </p>
            <a href="/profile" className="inline-block px-6 py-2.5 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms]">
              Upgrade now →
            </a>
          </div>
        )}

        {tab !== "preview" && tab !== "insights" && isPaid && !kit && !generating && (
          <div className="border border-border rounded-[8px] p-8 text-center bg-surface mb-6">
            <p className="font-syne font-bold text-lg text-text-primary mb-2">Generate your application kit</p>
            <p className="text-text-dimmed text-sm font-dm-sans mb-4">
              Get a tailored cover letter, CV, screening answers, and skills gap analysis for this role.
            </p>
            {error && <p className="text-xs text-red-500 font-dm-sans mb-3">{error}</p>}
            <button
              onClick={generateKit}
              className="px-6 py-2.5 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms]"
            >
              Generate kit
            </button>
          </div>
        )}

        {generating && <KitSkeleton />}

        {/* Tab content */}
        {tab === "preview" && (
          <div className="space-y-4">
            <KitPanel title="Why you're a match">
              {job.score_rationale ? (
                <div className="space-y-2">
                  {job.score_rationale.split(/(?<=\.)\s+/).filter(Boolean).map((sentence, i) => (
                    <p key={i} className="text-sm font-dm-sans leading-relaxed text-text-dimmed">
                      {sentence.trim()}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-dimmed font-dm-sans">No analysis available.</p>
              )}
              {job.tip && (
                <div className="mt-4 border border-border rounded-[8px] p-3 bg-surface-secondary">
                  <p className="text-xs text-text-dimmed font-dm-sans font-medium mb-0.5">Application tip</p>
                  <p className="text-sm font-dm-sans text-text-primary">{job.tip}</p>
                </div>
              )}
            </KitPanel>

            {job.application_flow && job.application_flow.length > 0 && (
              <KitPanel title="Application steps">
                <div className="space-y-3">
                  {job.application_flow.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="font-syne font-bold text-text-dimmed shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <p className="font-dm-sans font-medium text-text-primary text-sm">{step.name}</p>
                        <p className="text-xs text-text-dimmed font-dm-sans">{step.detail}</p>
                        {step.fields.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {step.fields.map((f) => (
                              <span key={f} className="text-xs px-2 py-0.5 bg-surface-secondary border border-border rounded-full font-dm-sans text-text-dimmed">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </KitPanel>
            )}

            {/* Career page search + embedded preview */}
            <div className="border border-border rounded-[8px] overflow-hidden bg-surface">
              {/* Google-style search bar */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="flex-1 text-sm font-dm-sans text-text-primary truncate">{searchQuery || "Searching…"}</span>
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3 py-1.5 bg-btn-bg text-btn-text text-xs font-dm-sans rounded-[6px] hover:opacity-90 transition-all duration-[150ms]"
                >
                  Search on Google ↗
                </a>
              </div>

              {/* Spinner while resolving */}
              {resolving && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 bg-surface">
                  <div className="w-6 h-6 border-2 border-border border-t-text-dimmed rounded-full animate-spin" />
                  <p className="text-xs text-text-dimmed font-dm-sans">Finding career page…</p>
                </div>
              )}

              {/* Iframe — only rendered when we have a URL and it's not blocked */}
              {!resolving && careerUrl && !iframeBlocked && (
                <iframe
                  key={careerUrl}
                  src={careerUrl}
                  className="w-full border-0"
                  style={{ height: 560 }}
                  title="Career page"
                  onLoad={() => {
                    setTimeout(() => {
                      try {
                        const f = document.querySelector("iframe[title='Career page']") as HTMLIFrameElement;
                        if (f && (!f.contentDocument || !f.contentDocument.body.innerHTML)) {
                          setIframeBlocked(true);
                        }
                      } catch { /* cross-origin — blocked but load fired; leave as-is */ }
                    }, 1000);
                  }}
                  onError={() => setIframeBlocked(true)}
                />
              )}

              {/* Compact fallback when blocked or no URL */}
              {!resolving && (!careerUrl || iframeBlocked) && (
                <div className="flex flex-col items-center gap-4 py-10 px-8 text-center bg-surface">
                  <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dimmed">
                      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-dm-sans font-medium text-text-primary mb-1">
                      {iframeBlocked ? "This site can't be embedded" : "Career page not found"}
                    </p>
                    <p className="text-xs text-text-dimmed font-dm-sans">
                      {iframeBlocked
                        ? "The company blocks embedding — open in a new tab to apply."
                        : "Use the Google search above to find the career page."}
                    </p>
                  </div>
                  {(careerUrl || googleUrl) && (
                    <a
                      href={careerUrl ?? googleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms]"
                    >
                      Open career page ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "insights" && (
          <div className="space-y-6">
            {!insights && !generatingInsights && (
              <div className="border border-border rounded-[8px] p-8 text-center bg-surface">
                <p className="font-syne font-bold text-lg text-text-primary mb-2">Generate job insights</p>
                <p className="text-text-dimmed text-sm font-dm-sans mb-4">
                  Get a deep breakdown of key skills, alignment with your background, and ready-to-use talking points for interviews and your cover letter.
                </p>
                {insightsError && <p className="text-xs text-red-500 font-dm-sans mb-3">{insightsError}</p>}
                <button
                  onClick={generateInsights}
                  className="px-6 py-2.5 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms]"
                >
                  Generate insights
                </button>
              </div>
            )}

            {generatingInsights && (
              <div className="space-y-4 animate-pulse">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="border border-border rounded-[8px] p-5 bg-surface">
                    <div className="h-4 bg-surface-secondary rounded w-1/3 mb-3" />
                    <div className="h-3 bg-surface-secondary rounded w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {insights && (
              <>
                {/* Company mission */}
                {insights.company_mission && (
                  <KitPanel title="Company mission">
                    <p className="text-sm text-text-primary font-dm-sans leading-relaxed">{insights.company_mission}</p>
                  </KitPanel>
                )}

                {/* Key skills */}
                {insights.key_skills?.length > 0 && (
                  <KitPanel title="Key skills required">
                    <div className="space-y-3">
                      {insights.key_skills.map((s, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-dm-sans mt-0.5 ${
                            s.required
                              ? "bg-text-primary text-background border-text-primary"
                              : "border-border text-text-dimmed"
                          }`}>
                            {s.required ? "Required" : "Nice to have"}
                          </span>
                          <div>
                            <p className="text-sm font-dm-sans font-medium text-text-primary">{s.skill}</p>
                            <p className="text-xs text-text-dimmed font-dm-sans">{s.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </KitPanel>
                )}

                {/* Gap analysis */}
                {insights.gap_analysis?.length > 0 && (
                  <KitPanel title="Gap analysis">
                    <div className="space-y-2">
                      {insights.gap_analysis.map((g, i) => (
                        <div key={i} className="border border-border rounded-[8px] p-3 bg-background">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-dm-sans font-medium text-text-primary">{g.skill}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-dm-sans ${
                              g.gap_level === "strong"
                                ? "border-green-500 text-green-700 bg-green-50"
                                : g.gap_level === "partial"
                                ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                                : "border-red-400 text-red-700 bg-red-50"
                            }`}>
                              {g.gap_level === "strong" ? "You have it" : g.gap_level === "partial" ? "Partial" : "Gap"}
                            </span>
                          </div>
                          <p className="text-xs text-text-dimmed font-dm-sans">{g.action}</p>
                        </div>
                      ))}
                    </div>
                  </KitPanel>
                )}

                {/* Suggested insights / talking points */}
                {insights.suggested_insights?.length > 0 && (
                  <KitPanel title="Talking points for cover letter">
                    <div className="space-y-3">
                      {insights.suggested_insights.map((s, i) => (
                        <div key={i} className="border border-border rounded-[8px] p-3 bg-background">
                          <p className="text-xs font-dm-sans font-medium text-text-dimmed mb-1">{s.title}</p>
                          <p className="text-sm font-dm-sans text-text-primary leading-relaxed">{s.content}</p>
                        </div>
                      ))}
                    </div>
                  </KitPanel>
                )}

                {/* Word cloud */}
                {insights.word_cloud?.length > 0 && (
                  <KitPanel title="Key terms from job description">
                    <div className="flex flex-wrap gap-2">
                      {insights.word_cloud
                        .sort((a, b) => b.count - a.count)
                        .map((w, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 border border-border rounded-full font-dm-sans text-text-primary bg-background"
                            style={{ fontSize: `${Math.max(11, Math.min(18, 11 + w.count))}px` }}
                          >
                            {w.word}
                          </span>
                        ))}
                    </div>
                  </KitPanel>
                )}

                {/* Research topics */}
                {insights.research_topics?.length > 0 && (
                  <KitPanel title="Research before applying">
                    <div className="space-y-3">
                      {insights.research_topics.map((r, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="font-syne font-bold text-text-dimmed shrink-0">{String(i + 1).padStart(2, "0")}</span>
                          <div>
                            <p className="text-sm font-dm-sans font-medium text-text-primary">{r.topic}</p>
                            <p className="text-xs text-text-dimmed font-dm-sans">{r.why}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </KitPanel>
                )}

                <button
                  onClick={generateInsights}
                  disabled={generatingInsights}
                  className="text-xs text-text-dimmed font-dm-sans hover:text-text-primary transition-all duration-[150ms]"
                >
                  Regenerate insights
                </button>
              </>
            )}
          </div>
        )}

        {tab === "cover" && kit && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <button
                onClick={() => copyText(kit.cover_letter, "cover")}
                className="px-3 py-1.5 border border-border rounded-[8px] text-xs font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface transition-all duration-[150ms]"
              >
                {copied === "cover" ? "Copied ✓" : "Copy"}
              </button>
              <button
                onClick={() => downloadText(kit.cover_letter, `Cover_Letter_${job.company}_${job.role}.txt`)}
                className="px-3 py-1.5 border border-border rounded-[8px] text-xs font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface transition-all duration-[150ms]"
              >
                ↓ Download
              </button>
            </div>
            <KitPanel title="Cover letter">
              <div className="space-y-4">
                {kit.cover_letter.split(/\n\n+/).filter(Boolean).map((para, i) => (
                  <p key={i} className="text-sm font-dm-sans text-text-primary leading-relaxed whitespace-pre-line">{para.trim()}</p>
                ))}
              </div>
            </KitPanel>
          </div>
        )}

        {tab === "cv" && kit && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <button
                onClick={() => copyText(kit.tailored_cv, "cv")}
                className="px-3 py-1.5 border border-border rounded-[8px] text-xs font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface transition-all duration-[150ms]"
              >
                {copied === "cv" ? "Copied ✓" : "Copy"}
              </button>
              <button
                onClick={() => downloadText(kit.tailored_cv, `CV_${job.company}_${job.role}.txt`)}
                className="px-3 py-1.5 bg-btn-bg text-btn-text rounded-[8px] text-xs font-dm-sans hover:opacity-90 transition-all duration-[150ms]"
              >
                ↓ Download CV
              </button>
            </div>
            <KitPanel title="Tailored CV">
              <div className="font-dm-sans text-sm text-text-primary leading-relaxed space-y-1">
                {kit.tailored_cv.split("\n").map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={i} className="h-3" />;
                  const isHeader = trimmed === trimmed.toUpperCase() && trimmed.length < 40 && !/\d/.test(trimmed);
                  return (
                    <p key={i} className={isHeader ? "font-syne font-bold text-text-primary mt-4 mb-1 border-b border-border pb-1" : "text-text-primary"}>
                      {line}
                    </p>
                  );
                })}
              </div>
            </KitPanel>
            <p className="text-xs text-text-dimmed font-dm-sans text-center">
              Paste this into your preferred word processor to apply final formatting before sending.
            </p>
          </div>
        )}

        {tab === "screening" && kit && (
          <div className="space-y-4">
            <p className="text-xs text-text-dimmed font-dm-sans">Likely interview screening questions based on the job description and your background. Use these to prepare.</p>
            {kit.screening_answers.map((qa, i) => (
              <KitPanel key={i} title={`Q${i + 1}: ${qa.question}`}>
                <p className="text-sm font-dm-sans text-text-primary leading-relaxed mb-3">{qa.answer}</p>
                <button
                  onClick={() => copyText(qa.answer, `qa-${i}`)}
                  className="text-xs px-2.5 py-1 border border-border rounded-[6px] font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface transition-all duration-[150ms]"
                >
                  {copied === `qa-${i}` ? "Copied ✓" : "Copy answer"}
                </button>
              </KitPanel>
            ))}
          </div>
        )}

        {tab === "skills" && kit && (
          <div className="space-y-3">
            {kit.skills_gap.map((item, i) => (
              <div key={i} className="border border-border rounded-[8px] p-4 bg-surface">
                <p className="font-dm-sans font-medium text-text-primary text-sm mb-1">{item.skill}</p>
                <p className="text-xs text-text-dimmed font-dm-sans">{item.tip}</p>
              </div>
            ))}
            {kit.preview_data?.overallVerdict != null && (
              <div className="border border-border rounded-[8px] p-4 bg-surface-secondary">
                <p className="text-xs text-text-dimmed font-dm-sans font-medium mb-1">Overall verdict</p>
                <p className="text-sm font-dm-sans text-text-primary">{kit.preview_data.overallVerdict != null ? String(kit.preview_data.overallVerdict) : ""}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
