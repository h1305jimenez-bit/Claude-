"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { createBrowserSupabase } from "@/lib/supabase";

type ParsedPrefs = {
  name?: string; phone?: string; linkedin?: string; education?: string;
  target_role?: string; target_location?: string; seniority?: string;
  salary_expectation?: string; work_authorization?: string;
};

type PreviewJob = {
  id: string; role: string; location: string;
  score: number; rationale: string;
};

type Step = "upload" | "searching" | "results";

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75
    ? "bg-text-primary text-background"
    : score >= 50
      ? "bg-surface-secondary text-text-primary border border-border"
      : "bg-surface border border-border text-text-dimmed";
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-[8px] text-sm font-bold font-syne shrink-0 ${color}`}>
      {score}
    </span>
  );
}

function Redacted({ width = "w-28" }: { width?: string }) {
  return (
    <span className={`inline-block ${width} h-3.5 rounded bg-surface-secondary align-middle`} />
  );
}

function LandingFlow() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedPrefs | null>(null);
  const [previewJobs, setPreviewJobs] = useState<PreviewJob[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchError, setSearchError] = useState("");

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const router = useRouter();
  const supabase = createBrowserSupabase();

  const handleFile = async (f: File) => {
    setFile(f);
    setStep("searching");
    setSearchError("");
    try {
      const res = await fetch("/api/jobs/preview", {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: f,
      });
      const data = await res.json() as {
        prefs?: ParsedPrefs; jobs?: PreviewJob[];
        totalCount?: number; error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setParsed(data.prefs ?? null);
      setPreviewJobs(data.jobs ?? []);
      setTotalCount(data.totalCount ?? data.jobs?.length ?? 0);
      setName(data.prefs?.name ?? "");
      setStep("results");
    } catch (e) {
      setSearchError((e as { message?: string }).message ?? "Something went wrong");
      setStep("upload");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (signUpError) throw signUpError;
        if (data.user) {
          if (parsed) sessionStorage.setItem("cv_parsed_prefs", JSON.stringify(parsed));
          await supabase.from("users").insert({ id: data.user.id, email, name, plan: "free" });
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            router.push("/onboarding");
          } else {
            setAuthMessage("Check your email to confirm your account, then log in to continue.");
          }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      setAuthError((err as { message?: string }).message ?? "An error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-syne font-bold text-xl text-text-primary">Applykit</span>
          <Link href="/auth" className="text-sm text-text-dimmed hover:text-text-primary font-dm-sans transition-all duration-[150ms]">
            Log in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-2xl">

          {/* Upload */}
          {step === "upload" && (
            <div className="flex flex-col items-center text-center">
              <h1 className="font-syne font-bold text-3xl text-text-primary mb-3">
                Upload your CV.<br />See your matches instantly.
              </h1>
              <p className="text-text-dimmed text-sm font-dm-sans mb-8 max-w-sm">
                We&apos;ll scan your CV, find live job openings across 6 countries, and score each one — free, no sign-up required.
              </p>

              <div
                className="w-full border-2 border-dashed border-border rounded-[8px] p-12 text-center cursor-pointer hover:bg-surface transition-all duration-[150ms]"
                onClick={() => document.getElementById("cv-landing-input")?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f?.type === "application/pdf") handleFile(f);
                }}
              >
                <input id="cv-landing-input" type="file" accept=".pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <p className="text-4xl mb-3">📄</p>
                <p className="text-sm font-dm-sans text-text-primary font-medium mb-1">Drop your CV here or click to upload</p>
                <p className="text-xs text-text-dimmed font-dm-sans">PDF · Max 10 MB</p>
              </div>

              {searchError && <p className="text-xs text-red-500 font-dm-sans mt-4">{searchError}</p>}

              <p className="mt-8 text-sm text-text-dimmed font-dm-sans">
                Already have an account?{" "}
                <Link href="/auth" className="text-text-primary hover:underline">Log in →</Link>
              </p>
            </div>
          )}

          {/* Searching */}
          {step === "searching" && (
            <div className="flex flex-col items-center text-center py-20">
              <Spinner size="lg" />
              <p className="mt-4 text-sm font-dm-sans text-text-primary font-medium">Scanning jobs across 6 countries…</p>
              <p className="mt-1 text-xs text-text-dimmed font-dm-sans">{file?.name}</p>
            </div>
          )}

          {/* Results */}
          {step === "results" && (
            <>
              {/* Hero count */}
              <div className="text-center mb-8">
                <p className="font-syne font-extrabold text-6xl text-text-primary mb-2">{totalCount}</p>
                <p className="text-lg font-dm-sans text-text-primary font-medium">
                  open roles match your profile worldwide
                </p>
                {parsed?.target_role && (
                  <p className="text-sm text-text-dimmed font-dm-sans mt-1">
                    Searching for <strong className="text-text-primary">{parsed.target_role}</strong>
                    {parsed.seniority ? ` · ${parsed.seniority}` : ""}
                  </p>
                )}
                <button
                  onClick={() => { setStep("upload"); setFile(null); setParsed(null); setPreviewJobs([]); }}
                  className="mt-2 text-xs text-text-dimmed font-dm-sans hover:text-text-primary transition-all duration-[150ms] underline underline-offset-2"
                >
                  ← Try a different CV
                </button>
              </div>

              {/* Teaser job cards */}
              {previewJobs.length > 0 && (
                <div className="relative mb-6">
                  <div className="space-y-2">
                    {previewJobs.slice(0, 5).map((job, i) => (
                      <div
                        key={job.id}
                        className={`border border-border rounded-[8px] p-4 bg-surface flex items-start gap-3 transition-all duration-[150ms] ${i >= 3 ? "opacity-40" : ""}`}
                      >
                        <ScoreBadge score={job.score} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-dm-sans font-medium text-text-primary truncate">{job.role}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {/* Company name redacted */}
                            <Redacted width="w-24" />
                            <span className="text-text-dimmed text-xs font-dm-sans">·</span>
                            <p className="text-xs text-text-dimmed font-dm-sans">{job.location}</p>
                          </div>
                          <p className="text-xs text-text-dimmed font-dm-sans mt-1 line-clamp-1">{job.rationale}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Fade-out overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                </div>
              )}

              <p className="text-xs text-center text-text-dimmed font-dm-sans mb-5">
                🔒 Sign up to see company names, apply, and generate your full application kit
              </p>

              {/* Sign-up box */}
              <div className="border-2 border-btn-bg rounded-[8px] p-6 bg-surface">
                <h2 className="font-syne font-bold text-lg text-text-primary mb-1">
                  Unlock {totalCount} matches — free
                </h2>
                <p className="text-xs text-text-dimmed font-dm-sans mb-4">
                  See every company, apply in 3 minutes, and get a full kit: cover letter, tailored CV &amp; screening answers.
                </p>

                <div className="flex border border-border rounded-[8px] p-1 mb-4">
                  {(["signup", "login"] as const).map((m) => (
                    <button key={m} onClick={() => { setMode(m); setAuthError(""); setAuthMessage(""); }}
                      className={`flex-1 py-1.5 text-sm rounded-[6px] transition-all duration-[150ms] font-dm-sans ${mode === m ? "bg-btn-bg text-btn-text" : "text-text-dimmed hover:text-text-primary"}`}>
                      {m === "signup" ? "Create account" : "Log in"}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleAuth} className="space-y-3">
                  {mode === "signup" && (
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name"
                      className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary placeholder:text-text-dimmed focus:outline-none focus:border-text-primary transition-all duration-[150ms]" />
                  )}
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email"
                    className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary placeholder:text-text-dimmed focus:outline-none focus:border-text-primary transition-all duration-[150ms]" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password"
                    className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary placeholder:text-text-dimmed focus:outline-none focus:border-text-primary transition-all duration-[150ms]" />

                  {authError && <p className="text-xs text-red-600 font-dm-sans">{authError}</p>}
                  {authMessage && <p className="text-xs text-text-dimmed font-dm-sans">{authMessage}</p>}

                  <button type="submit" disabled={authLoading}
                    className="w-full py-2.5 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans font-medium hover:opacity-90 transition-all duration-[150ms] disabled:opacity-50">
                    {authLoading
                      ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" />{mode === "signup" ? "Creating account…" : "Logging in…"}</span>
                      : mode === "signup" ? `Unlock my ${totalCount} matches →` : "Log in →"}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-4 px-6 text-center">
        <p className="text-xs text-text-dimmed font-dm-sans">Open Beta · All features free · No credit card needed</p>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense>
      <LandingFlow />
    </Suspense>
  );
}
