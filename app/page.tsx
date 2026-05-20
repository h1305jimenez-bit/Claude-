"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { createBrowserSupabase } from "@/lib/supabase";

type ParsedPrefs = {
  name?: string; phone?: string; linkedin?: string; education?: string;
  target_role?: string; seniority?: string; salary_expectation?: string; work_authorization?: string;
};

type Step = "upload" | "signup";

function LandingFlow() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedPrefs | null>(null);
  const [parseError, setParseError] = useState("");

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const router = useRouter();
  const supabase = createBrowserSupabase();

  const handleParseCv = async (f: File) => {
    setParsing(true);
    setParseError("");
    try {
      const res = await fetch("/api/cv/parse", {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: f,
      });
      const data = await res.json() as { prefs?: ParsedPrefs; error?: string };
      if (!res.ok || !data.prefs) throw new Error(data.error ?? "Could not parse CV");
      setParsed(data.prefs);
      setName(data.prefs.name ?? "");
      setStep("signup");
    } catch (e) {
      setParseError((e as { message?: string }).message ?? "Parse failed");
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = (f: File) => {
    setFile(f);
    handleParseCv(f);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          // Save CV parse data to sessionStorage so onboarding can pre-fill
          if (parsed) sessionStorage.setItem("cv_parsed_prefs", JSON.stringify(parsed));
          if (file) {
            // Store file name so onboarding knows to prompt re-upload
            sessionStorage.setItem("cv_file_name", file.name);
          }

          await supabase.from("users").insert({ id: data.user.id, email, name, plan: "free" });

          // If session is immediately available (email confirm disabled), go to onboarding
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
      const e = err as { message?: string };
      setAuthError(e.message ?? "An error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <span className="font-syne font-bold text-xl text-text-primary">Applykit</span>
          {step === "upload" && (
            <Link href="/auth" className="text-sm text-text-dimmed hover:text-text-primary font-dm-sans transition-all duration-[150ms]">
              Log in
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {step === "upload" && (
            <>
              <div className="text-center mb-8">
                <h1 className="font-syne font-bold text-3xl text-text-primary mb-3">
                  Get matched jobs.<br />Apply in 3 minutes.
                </h1>
                <p className="text-text-dimmed text-sm font-dm-sans">
                  Upload your CV — we&apos;ll parse it, find matching jobs, and generate your full application kit.
                </p>
              </div>

              <div
                className={`border-2 border-dashed border-border rounded-[8px] p-10 text-center cursor-pointer hover:bg-surface transition-all duration-[150ms] ${parsing ? "pointer-events-none opacity-60" : ""}`}
                onClick={() => !parsing && document.getElementById("cv-landing-input")?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f?.type === "application/pdf") handleFileChange(f);
                }}
              >
                <input
                  id="cv-landing-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChange(f);
                  }}
                />
                {parsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Spinner size="lg" />
                    <p className="text-sm text-text-dimmed font-dm-sans">Reading your CV…</p>
                  </div>
                ) : (
                  <>
                    <p className="text-3xl mb-3">📄</p>
                    <p className="text-sm font-dm-sans text-text-primary font-medium mb-1">
                      {file ? file.name : "Drop your CV here"}
                    </p>
                    <p className="text-xs text-text-dimmed font-dm-sans">PDF · Max 10 MB</p>
                  </>
                )}
              </div>

              {parseError && (
                <p className="text-xs text-red-500 font-dm-sans mt-3 text-center">{parseError}</p>
              )}

              <p className="text-center mt-6 text-sm text-text-dimmed font-dm-sans">
                Already have an account?{" "}
                <Link href="/auth" className="text-text-primary hover:underline">Log in →</Link>
              </p>
            </>
          )}

          {step === "signup" && (
            <>
              {/* CV parsed preview */}
              {parsed && (
                <div className="border border-border rounded-[8px] p-4 bg-surface mb-5">
                  <p className="text-xs text-text-dimmed font-dm-sans mb-2">Parsed from your CV</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {[
                      { label: "Name", value: parsed.name },
                      { label: "Role", value: parsed.target_role },
                      { label: "Seniority", value: parsed.seniority },
                      { label: "Education", value: parsed.education },
                    ].filter(f => f.value).map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-text-dimmed font-dm-sans">{label}</p>
                        <p className="text-sm font-dm-sans text-text-primary truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode toggle */}
              <div className="flex border border-border rounded-[8px] p-1 mb-5">
                {(["signup", "login"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setAuthError(""); setAuthMessage(""); }}
                    className={`flex-1 py-1.5 text-sm rounded-[6px] transition-all duration-[150ms] font-dm-sans ${
                      mode === m ? "bg-btn-bg text-btn-text" : "text-text-dimmed hover:text-text-primary"
                    }`}
                  >
                    {m === "signup" ? "Create account" : "Log in"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAuth} className="space-y-3">
                {mode === "signup" && (
                  <div>
                    <label className="block text-xs text-text-dimmed font-dm-sans mb-1">Full name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Jane Smith"
                      className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary placeholder:text-text-dimmed focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-text-dimmed font-dm-sans mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary placeholder:text-text-dimmed focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-dimmed font-dm-sans mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary placeholder:text-text-dimmed focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                  />
                </div>

                {authError && <p className="text-xs text-red-600 font-dm-sans">{authError}</p>}
                {authMessage && <p className="text-xs text-text-dimmed font-dm-sans">{authMessage}</p>}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans font-medium hover:opacity-90 transition-all duration-[150ms] disabled:opacity-50"
                >
                  {authLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner size="sm" />
                      {mode === "signup" ? "Creating account…" : "Logging in…"}
                    </span>
                  ) : mode === "signup" ? "Create account →" : "Log in →"}
                </button>
              </form>

              <button
                onClick={() => { setStep("upload"); setFile(null); setParsed(null); }}
                className="w-full mt-3 text-xs text-text-dimmed font-dm-sans hover:text-text-primary transition-all duration-[150ms] text-center"
              >
                ← Upload a different CV
              </button>
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
