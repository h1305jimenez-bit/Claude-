"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Candidate {
  id: string;
  name: string;
  description?: string;
  emoji: string;
}

interface Election {
  id: string;
  title: string;
  description?: string;
  candidates: Candidate[];
  isOpen: boolean;
  createdAt: string;
  closedAt?: string;
  hasVoted: boolean;
  votes?: Record<string, number>;
}

export default function ElectionPage() {
  const { id } = useParams<{ id: string }>();
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/votes/elections");
    const all: Election[] = await res.json();
    setElection(all.find((e) => e.id === id) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function castVote(candidateId: string) {
    setVoting(true);
    setError(null);
    try {
      const res = await fetch("/api/votes/cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId: id, candidateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not cast vote");
      setJustVoted(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading…</div>;
  }

  if (!election) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-600">Election not found.</p>
        <Link href="/vote" className="mt-4 block text-sm text-hec-navy underline">
          ← Back to elections
        </Link>
      </div>
    );
  }

  const totalVotes = election.votes
    ? Object.values(election.votes).reduce((s, v) => s + v, 0)
    : 0;

  const hasVoted = election.hasVoted || justVoted;

  return (
    <div className="space-y-6">
      <Link href="/vote" className="text-sm text-slate-500 hover:text-hec-navy">
        ← All elections
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          {election.isOpen ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Open
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
              Closed
            </span>
          )}
          {hasVoted && election.isOpen && (
            <span className="inline-flex items-center rounded-full bg-hec-gold-soft px-2.5 py-0.5 text-xs font-medium text-hec-navy">
              Voted ✓
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-hec-navy">{election.title}</h1>
        {election.description && (
          <p className="mt-1 text-sm text-slate-600">{election.description}</p>
        )}
      </div>

      {justVoted && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
          <div className="text-3xl">✅</div>
          <p className="mt-2 font-semibold text-green-800">Vote recorded!</p>
          <p className="mt-1 text-sm text-green-700">
            Results will be revealed once the election closes.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {election.candidates.map((candidate) => {
          const count = election.votes?.[candidate.id] ?? 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

          return (
            <div
              key={candidate.id}
              className="rounded-2xl border border-hec-stone bg-white p-5 shadow-card"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-hec-sand text-3xl">
                  {candidate.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-hec-navy">{candidate.name}</div>
                  {candidate.description && (
                    <p className="mt-0.5 text-sm text-slate-600">{candidate.description}</p>
                  )}

                  {election.votes && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{pct}%</span>
                        <span>
                          {count} vote{count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-hec-stone">
                        <div
                          className="h-full rounded-full bg-hec-navy transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {election.isOpen && !hasVoted && (
                  <button
                    type="button"
                    onClick={() => castVote(candidate.id)}
                    disabled={voting}
                    className="flex-shrink-0 rounded-full bg-hec-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-hec-blue disabled:opacity-50"
                  >
                    {voting ? "…" : "Vote"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-hec-burgundy">
          {error}
        </div>
      )}

      {election.votes && (
        <p className="text-center text-sm text-slate-500">
          {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
          {election.closedAt && (
            <>
              {" "}
              · Closed{" "}
              {new Date(election.closedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </>
          )}
        </p>
      )}

      {election.isOpen && !hasVoted && (
        <p className="text-center text-xs text-slate-400">
          Your vote is anonymous. Once cast, it cannot be changed.
        </p>
      )}
    </div>
  );
}
