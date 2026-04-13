"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Login failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="text-xl font-bold text-hec-navy">Operator dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">
        Enter the admin password to view recent orders.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full rounded-xl border border-hec-stone bg-white px-4 py-3 text-sm focus:border-hec-navy focus:outline-none"
        />
        {error && (
          <p className="text-sm text-hec-burgundy">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-full bg-hec-navy py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Checking..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
