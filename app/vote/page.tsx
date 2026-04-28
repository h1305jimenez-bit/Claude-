"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Election {
  id: string;
  title: string;
  description?: string;
  candidates: { id: string; name: string; emoji: string }[];
  isOpen: boolean;
  createdAt: string;
  hasVoted: boolean;
}

export default function VotePage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/votes/elections")
      .then((r) => r.json())
      .then(setElections)
      .finally(() => setLoading(false));
  }, []);

  const open = elections.filter((e) => e.isOpen);
  const closed = elections.filter((e) => !e.isOpen);

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading elections…</div>;
  }

  if (elections.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="text-5xl">🗳️</div>
        <p className="mt-4 text-slate-600">No elections at the moment.</p>
        <p className="mt-1 text-sm text-slate-400">Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-hec-navy p-6 text-white shadow-card">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-hec-gold/20 blur-3xl"
        />
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-hec-gold">
            HEC Paris · MBA Elections
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight">Your vote matters 🗳️</h1>
          <p className="mt-1 text-sm text-white/80">
            Verified HEC email — one person, one vote. Completely anonymous.
          </p>
        </div>
      </section>

      {open.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Open elections
          </h2>
          <div className="space-y-3">
            {open.map((e) => (
              <Link
                key={e.id}
                href={`/vote/${e.id}`}
                className="group block rounded-2xl border border-hec-stone bg-white p-5 shadow-card transition hover:border-hec-navy"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Open
                      </span>
                      {e.hasVoted && (
                        <span className="inline-flex items-center rounded-full bg-hec-gold-soft px-2.5 py-0.5 text-xs font-medium text-hec-navy">
                          Voted ✓
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-hec-navy">{e.title}</h3>
                    {e.description && (
                      <p className="mt-0.5 text-sm text-slate-600">{e.description}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-400">
                      {e.candidates.length} candidates
                    </p>
                  </div>
                  <span className="mt-1 text-xl text-hec-navy/30 transition group-hover:text-hec-navy">
                    ›
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Past elections
          </h2>
          <div className="space-y-3">
            {closed.map((e) => (
              <Link
                key={e.id}
                href={`/vote/${e.id}`}
                className="group block rounded-2xl border border-hec-stone bg-white p-5 opacity-75 shadow-card transition hover:border-hec-navy hover:opacity-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                      Closed
                    </span>
                    <h3 className="mt-2 text-base font-semibold text-hec-navy">{e.title}</h3>
                    {e.description && (
                      <p className="mt-0.5 text-sm text-slate-600">{e.description}</p>
                    )}
                  </div>
                  <span className="mt-1 text-xl text-hec-navy/30 transition group-hover:text-hec-navy">
                    ›
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
