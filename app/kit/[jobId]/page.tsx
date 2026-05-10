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
  { key: "personal", label: "Personal Info" },
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

  const supabase = createBrowserSupabase();


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
        {tab !== "preview" && !isPaid && (
          <div className="border border-border rounded-[8px] p-8 text-center bg-surface mb-6">
            <p className="font-syne font-bold text-lg text-text-primary mb-2">Upgrade to Pro</p>
            <p className="text-text-dimmed text-sm font-dm-sans mb-4">Generate full application kits for $9/month.</p>
            <a href="/profile" className="inline-block px-6 py-2.5 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms]">
              Upgrade now →
            </a>
          </div>
        )}

        {tab !== "preview" && isPaid && !kit && !generating && (
          <div className="border border-border rounded-[8px] p-8 text-center bg-surface mb-6">
            <p className="font-syne font-bold text-lg text-text-primary mb-2">Generate your application kit</p>
            <p className="text-text-dimmed text-sm font-dm-sans mb-4">
              Claude will write a cover letter, tailored CV, screening answers, and skills gap analysis.
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
              <p className="mt-4 text-xs text-text-dimmed font-dm-sans">
                For the full job description,{" "}
                <a
                  href={`/api/jobs/go?url=${encodeURIComponent(job.url)}&company=${encodeURIComponent(job.company)}&role=${encodeURIComponent(job.role)}&location=${encodeURIComponent(job.location ?? "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-text-primary transition-all duration-[150ms]"
                >
                  view the job posting ↗
                </a>
              </p>
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

            <div className="flex gap-2">
              {(() => {
                const goUrl = `/api/jobs/go?url=${encodeURIComponent(job.url)}&company=${encodeURIComponent(job.company)}&role=${encodeURIComponent(job.role)}&location=${encodeURIComponent(job.location ?? "")}`;
                return (
                  <>
                    <a
                      href={goUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-border rounded-[8px] text-sm font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface transition-all duration-[150ms]"
                    >
                      View job posting ↗
                    </a>
                    <a
                      href={goUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms]"
                    >
                      Apply →
                    </a>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {tab === "insights" && (
          <div className="space-y-6">
            {!insights && !generatingInsights && (
              <div className="border border-border rounded-[8px] p-8 text-center bg-surface">
                <p className="font-syne font-bold text-lg text-text-primary mb-2">Generate job insights</p>
                <p className="text-text-dimmed text-sm font-dm-sans mb-4">
                  Claude will extract key skills, identify gaps, and give you ready-to-use talking points.
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

        {tab === "personal" && kit && (
          <KitPanel title="Personal information">
            <div className="space-y-3">
              {Object.entries(kit.personal_info).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border border-border rounded-[8px] px-3 py-2 bg-background">
                  <span className="text-xs text-text-dimmed font-dm-sans capitalize">{k}</span>
                  <span className="text-sm font-dm-sans text-text-primary">{v}</span>
                </div>
              ))}
            </div>
          </KitPanel>
        )}

        {tab === "cover" && kit && (
          <KitPanel title="Cover letter">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-dm-sans text-sm text-text-primary leading-relaxed">{kit.cover_letter}</pre>
            </div>
          </KitPanel>
        )}

        {tab === "cv" && kit && (
          <KitPanel title="Tailored CV">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-dm-sans text-sm text-text-primary leading-relaxed">{kit.tailored_cv}</pre>
            </div>
          </KitPanel>
        )}

        {tab === "screening" && kit && (
          <div className="space-y-4">
            {kit.screening_answers.map((qa, i) => (
              <KitPanel key={i} title={`Q${i + 1}: ${qa.question}`}>
                <p className="text-sm font-dm-sans text-text-primary leading-relaxed">{qa.answer}</p>
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
