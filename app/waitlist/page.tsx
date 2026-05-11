"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/waitlist")
      .then((r) => r.json())
      .then((d: { count: number }) => setCount(d.count))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSubmitted(true);
      setCount((c) => (c !== null ? c + 1 : 1));
    } catch (err: unknown) {
      const e2 = err as { message?: string };
      setError(e2.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link href="/" className="font-syne font-bold text-2xl text-text-primary mb-12">
        Applyjobs
      </Link>

      <div className="w-full max-w-sm text-center">
        <h1 className="font-syne font-bold text-3xl text-text-primary mb-3">Join the waitlist</h1>
        <p className="text-text-dimmed font-dm-sans text-sm mb-2">
          Auto-apply is coming soon. Be the first to know.
        </p>
        {count !== null && (
          <p className="text-text-dimmed font-dm-sans text-xs mb-8">
            <span className="font-syne font-bold text-text-primary">{count.toLocaleString()}</span> people ahead of you
          </p>
        )}

        {submitted ? (
          <div className="border border-border rounded-[8px] p-8 bg-surface">
            <p className="font-dm-sans text-text-primary mb-1">You&apos;re on the list.</p>
            <p className="text-sm text-text-dimmed font-dm-sans">We&apos;ll email you when auto-apply launches.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full border border-border rounded-[8px] px-4 py-3 text-sm font-dm-sans bg-surface text-text-primary placeholder:text-text-dimmed focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
            />
            {error && <p className="text-xs text-red-500 font-dm-sans">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans font-medium hover:opacity-90 transition-all duration-[150ms] disabled:opacity-50"
            >
              {loading ? "..." : "Join waitlist"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
