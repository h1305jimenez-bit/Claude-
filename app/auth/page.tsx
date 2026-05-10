"use client";

import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { createBrowserSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createBrowserSupabase();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          // Create profile row
          await supabase.from("users").insert({
            id: data.user.id,
            email,
            name,
            plan: "free",
          });
          setMessage("Check your email to confirm your account, then log in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      const authErr = err as { message?: string };
      setError(authErr.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link href="/" className="font-syne font-bold text-2xl text-text-primary mb-12">
        ApplyPilot
      </Link>

      <div className="w-full max-w-sm border border-border rounded-[8px] p-8 bg-surface">
        <div className="flex border border-border rounded-[8px] p-1 mb-6">
          {(["signup", "login"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-sm rounded-[6px] transition-all duration-[150ms] font-dm-sans ${
                mode === m
                  ? "bg-btn-bg text-btn-text"
                  : "text-text-dimmed hover:text-text-primary"
              }`}
            >
              {m === "signup" ? "Sign up" : "Log in"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs text-text-dimmed font-dm-sans mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
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

          {error && <p className="text-xs text-red-600 font-dm-sans">{error}</p>}
          {message && <p className="text-xs text-text-dimmed font-dm-sans">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans font-medium hover:opacity-90 transition-all duration-[150ms] disabled:opacity-50"
          >
            {loading ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" />{mode === "signup" ? "Creating account…" : "Logging in…"}</span> : mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
