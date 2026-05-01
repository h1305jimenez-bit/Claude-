"use client";

import { useState } from "react";
import type { Position } from "@/lib/election-store";

interface Props {
  positions: Position[];
  initialResults: Record<string, Record<string, number>>;
  initialMyVotes: Record<string, string>;
  email: string | null;
}

export function ElectionClient({ positions, initialResults, initialMyVotes, email }: Props) {
  const [results, setResults] = useState(initialResults);
  const [myVotes, setMyVotes] = useState(initialMyVotes);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function vote(positionId: string, candidateId: string) {
    if (!email) return;
    setLoading(`${positionId}:${candidateId}`);
    setError(null);
    try {
      const res = await fetch("/api/election/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId, candidateId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setResults(data.results);
        setMyVotes(data.myVotes);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(null);
    }
  }

  const totalVoted = Object.keys(myVotes).length;
  const allDone = totalVoted === positions.length;

  return (
    <div className="space-y-6">
      {!email && (
        <div className="rounded-2xl border border-hec-gold bg-hec-gold-soft/50 p-4 text-sm text-hec-ink">
          <span className="font-semibold">Sign in</span> with your @hec.edu
          email to cast your vote.
        </div>
      )}

      {allDone && (
        <div className="rounded-2xl bg-hec-navy/5 p-4 text-center text-sm font-semibold text-hec-navy">
          ✅ You've voted in all positions — thank you!
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-hec-burgundy/30 bg-hec-burgundy/5 p-3 text-sm text-hec-burgundy">
          {error}
        </div>
      )}

      {positions.map((position) => {
        const myPick = myVotes[position.id];
        const posResults = results[position.id] ?? {};
        const totalForPosition = Object.values(posResults).reduce((a, b) => a + b, 0);

        return (
          <section key={position.id} className="rounded-2xl border border-hec-stone bg-white shadow-card">
            <div className="border-b border-hec-stone px-5 py-4">
              <h2 className="font-bold text-hec-navy">{position.title}</h2>
              {myPick && (
                <p className="mt-0.5 text-xs text-slate-500">
                  You voted · {totalForPosition} vote{totalForPosition !== 1 ? "s" : ""} total
                </p>
              )}
            </div>

            <ul className="divide-y divide-hec-stone">
              {position.candidates.map((c) => {
                const voteCount = posResults[c.id] ?? 0;
                const pct = totalForPosition > 0 ? Math.round((voteCount / totalForPosition) * 100) : 0;
                const isMyVote = myPick === c.id;
                const isSubmitting = loading === `${position.id}:${c.id}`;

                return (
                  <li key={c.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-hec-sand text-2xl">
                        {c.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-hec-navy">{c.name}</span>
                          {isMyVote && (
                            <span className="rounded-full bg-hec-navy px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              Your vote
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-hec-gold font-medium">{c.program}</p>
                        <p className="mt-1 text-sm text-slate-600">{c.pitch}</p>

                        {myPick ? (
                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-xs text-slate-500">
                              <span>{voteCount} vote{voteCount !== 1 ? "s" : ""}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-hec-stone">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isMyVote ? "bg-hec-navy" : "bg-hec-gold"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          email && (
                            <button
                              onClick={() => vote(position.id, c.id)}
                              disabled={!!loading}
                              className="mt-3 rounded-full border border-hec-navy px-4 py-1.5 text-xs font-semibold text-hec-navy transition hover:bg-hec-navy hover:text-white disabled:opacity-50"
                            >
                              {isSubmitting ? "Voting…" : "Vote"}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
