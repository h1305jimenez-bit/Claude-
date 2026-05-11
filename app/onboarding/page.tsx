"use client";

import { useState, useEffect } from "react";
import { Spinner } from "@/components/Spinner";
import { createBrowserSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const SENIORITY_OPTIONS = ["Intern", "Junior", "Mid-level", "Senior", "Lead", "Manager", "Director", "Executive"];
const WORK_AUTH_OPTIONS = ["US Citizen", "Green Card", "H-1B", "OPT/CPT", "TN Visa", "E-3", "Other", "Not applicable"];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cvUploaded, setCvUploaded] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    linkedin: "",
    education: "",
    target_role: "",
    target_location: "",
    seniority: "Mid-level",
    salary_expectation: "",
    work_authorization: "US Citizen",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const supabase = createBrowserSupabase();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/auth"); return; }
      setAccessToken(session.access_token);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCvUpload = async () => {
    if (!cvFile || !accessToken) return;
    setUploading(true);
    setError("");
    try {
      const res = await fetch("/api/user/upload-cv", {
        method: "POST",
        headers: { "x-access-token": accessToken, "Content-Type": "application/pdf" },
        body: cvFile,
      });
      const data = await res.json() as {
        path?: string;
        prefs?: { name?: string; phone?: string; linkedin?: string; education?: string;
          target_role?: string; seniority?: string; salary_expectation?: string; work_authorization?: string };
        prefsExtracted?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (data.prefsExtracted && data.prefs) {
        setForm((f) => ({
          ...f,
          ...(data.prefs!.name && { name: data.prefs!.name }),
          ...(data.prefs!.phone && { phone: data.prefs!.phone }),
          ...(data.prefs!.linkedin && { linkedin: data.prefs!.linkedin }),
          ...(data.prefs!.education && { education: data.prefs!.education }),
          ...(data.prefs!.target_role && { target_role: data.prefs!.target_role }),
          ...(data.prefs!.seniority && { seniority: data.prefs!.seniority }),
          ...(data.prefs!.salary_expectation && { salary_expectation: data.prefs!.salary_expectation }),
          ...(data.prefs!.work_authorization && { work_authorization: data.prefs!.work_authorization }),
        }));
      }
      setCvUploaded(true);
      setStep(2);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error("Not authenticated");

      const { error: updateErr } = await supabase.from("users").update(form).eq("id", userId);
      if (updateErr) throw updateErr;

      router.push("/dashboard");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <span className="font-syne font-bold text-xl text-text-primary">Applyjobs</span>
          <div className="flex gap-2 mt-4">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-[150ms] ${
                  step >= s ? "bg-text-primary" : "bg-surface-secondary"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div>
            <h1 className="font-syne font-bold text-2xl text-text-primary mb-2">Upload your CV</h1>
            <p className="text-text-dimmed text-sm font-dm-sans mb-6">We parse your PDF to personalise job matches and application kits.</p>

            <div
              className="border-2 border-dashed border-border rounded-[8px] p-8 text-center mb-4 cursor-pointer hover:bg-surface transition-all duration-[150ms]"
              onClick={() => document.getElementById("cv-input")?.click()}
            >
              <input
                id="cv-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              />
              {cvFile ? (
                <p className="text-sm text-text-primary font-dm-sans">{cvFile.name}</p>
              ) : (
                <>
                  <p className="text-text-dimmed text-sm font-dm-sans mb-1">Click to upload PDF</p>
                  <p className="text-text-dimmed text-xs font-dm-sans">Max 10MB</p>
                </>
              )}
            </div>

            {error && <p className="text-xs text-red-500 font-dm-sans mb-3">{error}</p>}

            <button
              onClick={handleCvUpload}
              disabled={!cvFile || uploading}
              className="w-full py-3 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans font-medium hover:opacity-90 transition-all duration-[150ms] disabled:opacity-40"
            >
              {uploading ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" />Uploading & parsing…</span> : "Upload CV"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="font-syne font-bold text-2xl text-text-primary mb-2">Your preferences</h1>
            <p className="text-text-dimmed text-sm font-dm-sans mb-6">Help us find the right jobs for you.</p>

            <div className="space-y-4">
              {[
                { key: "name", label: "Full name", type: "text", placeholder: "Jane Smith" },
                { key: "phone", label: "Phone", type: "tel", placeholder: "+1 555 000 0000" },
                { key: "linkedin", label: "LinkedIn URL", type: "url", placeholder: "https://linkedin.com/in/you" },
                { key: "education", label: "Highest education", type: "text", placeholder: "BS Computer Science, MIT" },
                { key: "target_role", label: "Target role", type: "text", placeholder: "Software Engineer" },
                { key: "target_location", label: "Target location", type: "text", placeholder: "Santiago, Chile" },
                { key: "salary_expectation", label: "Salary expectation", type: "text", placeholder: "$120,000 – $150,000" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs text-text-dimmed font-dm-sans mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary placeholder:text-text-dimmed focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-text-dimmed font-dm-sans mb-1">Seniority</label>
                <select
                  value={form.seniority}
                  onChange={(e) => setForm((f) => ({ ...f, seniority: e.target.value }))}
                  className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                >
                  {SENIORITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-text-dimmed font-dm-sans mb-1">Work authorization</label>
                <select
                  value={form.work_authorization}
                  onChange={(e) => setForm((f) => ({ ...f, work_authorization: e.target.value }))}
                  className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                >
                  {WORK_AUTH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-xs text-red-500 font-dm-sans mt-3">{error}</p>}

            <button
              onClick={handleSavePreferences}
              disabled={saving || !form.target_role}
              className="w-full mt-6 py-3 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans font-medium hover:opacity-90 transition-all duration-[150ms] disabled:opacity-40"
            >
              {saving ? "Saving..." : "Go to dashboard →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
