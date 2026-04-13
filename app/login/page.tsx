"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send code");
      if (data.devCode) setDevCode(data.devCode);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify code");
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center py-8">
      <div className="w-full max-w-sm space-y-6 rounded-3xl bg-white p-6 shadow-card">
        <div className="text-center">
          <div className="text-3xl">🎓</div>
          <h1 className="mt-2 text-xl font-bold text-hec-navy">
            Sign in with your HEC email
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            We'll email you a 6-digit code. No password needed.
          </p>
        </div>

        {step === "email" && (
          <form onSubmit={requestCode} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                HEC email address
              </span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="first.last@hec.edu"
                className="w-full rounded-xl border border-hec-stone bg-hec-ivory px-4 py-3 text-sm focus:border-hec-navy focus:bg-white focus:outline-none"
                required
              />
            </label>
            {error && <p className="text-sm text-hec-burgundy">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-hec-navy py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send me a code"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verifyCode} className="space-y-3">
            <p className="text-sm text-slate-600">
              Enter the 6-digit code we sent to <strong>{email}</strong>.
            </p>
            {devCode && (
              <div className="rounded-xl bg-hec-gold-soft p-3 text-xs text-hec-ink">
                Dev mode: code is <strong className="font-mono">{devCode}</strong>.
                Add a <code>RESEND_API_KEY</code> to send real emails.
              </div>
            )}
            <input
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="w-full rounded-xl border border-hec-stone bg-hec-ivory px-4 py-3 text-center text-2xl font-semibold tracking-[0.5em] focus:border-hec-navy focus:bg-white focus:outline-none"
              required
            />
            {error && <p className="text-sm text-hec-burgundy">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full rounded-full bg-hec-navy py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & continue"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="w-full text-center text-xs text-slate-500 underline"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
