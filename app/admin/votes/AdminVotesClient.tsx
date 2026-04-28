"use client";

import { useEffect, useState } from "react";

interface Candidate {
  id: string;
  name: string;
  description?: string;
  emoji: string;
}

interface ElectionAdmin {
  id: string;
  title: string;
  description?: string;
  candidates: Candidate[];
  isOpen: boolean;
  createdAt: string;
  closedAt?: string;
  votes: Record<string, number>;
  voterCount: number;
}

const EMPTY_CANDIDATE = { name: "", description: "", emoji: "👤" };

export function AdminVotesClient() {
  const [elections, setElections] = useState<ElectionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [candidates, setCandidates] = useState([
    { ...EMPTY_CANDIDATE },
    { ...EMPTY_CANDIDATE },
  ]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/votes/elections");
    if (res.ok) setElections(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createElection(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/votes/elections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          candidates: candidates.filter((c) => c.name.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create election");
      setTitle("");
      setDescription("");
      setCandidates([{ ...EMPTY_CANDIDATE }, { ...EMPTY_CANDIDATE }]);
      setShowForm(false);
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  async function toggleOpen(election: ElectionAdmin) {
    const res = await fetch(`/api/admin/votes/elections/${election.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: !election.isOpen }),
    });
    if (res.ok) await load();
  }

  async function removeElection(id: string) {
    if (!confirm("Delete this election and all its votes? This cannot be undone.")) return;
    await fetch(`/api/admin/votes/elections/${id}`, { method: "DELETE" });
    await load();
  }

  function updateCandidate(
    i: number,
    field: keyof typeof EMPTY_CANDIDATE,
    value: string,
  ) {
    const next = [...candidates];
    next[i] = { ...next[i], [field]: value };
    setCandidates(next);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-hec-navy">Election dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Create and manage HEC MBA elections. Votes are anonymous.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex-shrink-0 rounded-full bg-hec-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-hec-blue"
        >
          {showForm ? "Cancel" : "+ New election"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={createElection}
          className="space-y-5 rounded-2xl border border-hec-stone bg-white p-6 shadow-card"
        >
          <h2 className="font-semibold text-hec-navy">New election</h2>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Title *</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MBA Class Representative 2025"
              className="w-full rounded-xl border border-hec-stone bg-hec-ivory px-4 py-3 text-sm focus:border-hec-navy focus:bg-white focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Description (optional)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions or context for voters…"
              rows={2}
              className="w-full resize-none rounded-xl border border-hec-stone bg-hec-ivory px-4 py-3 text-sm focus:border-hec-navy focus:bg-white focus:outline-none"
            />
          </label>

          <div>
            <span className="mb-2 block text-xs font-medium text-slate-600">
              Candidates * (minimum 2)
            </span>
            <div className="space-y-3">
              {candidates.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <input
                    type="text"
                    value={c.emoji}
                    onChange={(e) => updateCandidate(i, "emoji", e.target.value || "👤")}
                    className="w-14 rounded-xl border border-hec-stone bg-hec-ivory px-2 py-3 text-center text-lg focus:border-hec-navy focus:outline-none"
                    placeholder="👤"
                    maxLength={2}
                  />
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      required
                      value={c.name}
                      onChange={(e) => updateCandidate(i, "name", e.target.value)}
                      placeholder={`Candidate ${i + 1} full name`}
                      className="w-full rounded-xl border border-hec-stone bg-hec-ivory px-4 py-3 text-sm focus:border-hec-navy focus:bg-white focus:outline-none"
                    />
                    <input
                      type="text"
                      value={c.description}
                      onChange={(e) => updateCandidate(i, "description", e.target.value)}
                      placeholder="Short bio or platform (optional)"
                      className="w-full rounded-xl border border-hec-stone bg-hec-ivory px-4 py-2 text-sm focus:border-hec-navy focus:bg-white focus:outline-none"
                    />
                  </div>
                  {candidates.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setCandidates(candidates.filter((_, j) => j !== i))}
                      className="mt-3 text-xl leading-none text-hec-burgundy hover:opacity-70"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCandidates([...candidates, { ...EMPTY_CANDIDATE }])}
              className="mt-3 text-sm text-hec-navy underline"
            >
              + Add candidate
            </button>
          </div>

          {createError && <p className="text-sm text-hec-burgundy">{createError}</p>}

          <button
            type="submit"
            disabled={
              creating ||
              !title.trim() ||
              candidates.filter((c) => c.name.trim()).length < 2
            }
            className="w-full rounded-full bg-hec-navy py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create election (starts closed)"}
          </button>
        </form>
      )}

      {/* Elections list */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading…</div>
      ) : elections.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          No elections yet. Create one above.
        </div>
      ) : (
        <div className="space-y-4">
          {elections.map((election) => {
            const totalVotes = Object.values(election.votes).reduce((s, v) => s + v, 0);
            const winner =
              !election.isOpen && totalVotes > 0
                ? election.candidates.reduce((a, b) =>
                    (election.votes[a.id] ?? 0) >= (election.votes[b.id] ?? 0) ? a : b,
                  )
                : null;

            return (
              <div
                key={election.id}
                className="rounded-2xl border border-hec-stone bg-white p-5 shadow-card"
              >
                {/* Election header */}
                <div className="flex items-start justify-between gap-4">
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
                      <span className="text-xs text-slate-400">
                        {election.voterCount} voter{election.voterCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <h3 className="mt-1.5 font-semibold text-hec-navy">{election.title}</h3>
                    {election.description && (
                      <p className="mt-0.5 text-sm text-slate-600">{election.description}</p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleOpen(election)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        election.isOpen
                          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          : "bg-green-100 text-green-800 hover:bg-green-200"
                      }`}
                    >
                      {election.isOpen ? "Close voting" : "Open voting"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeElection(election.id)}
                      className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-hec-burgundy transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Results */}
                <div className="mt-4 space-y-3">
                  {election.candidates.map((c) => {
                    const count = election.votes[c.id] ?? 0;
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    const isWinner = winner?.id === c.id;

                    return (
                      <div key={c.id}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span
                            className={`font-medium ${isWinner ? "text-hec-gold" : "text-hec-navy"}`}
                          >
                            {c.emoji} {c.name}
                            {isWinner && " 🏆"}
                          </span>
                          <span className="text-slate-500">
                            {count} vote{count !== 1 ? "s" : ""} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-hec-stone">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isWinner ? "bg-hec-gold" : "bg-hec-navy"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Created{" "}
                  {new Date(election.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {totalVotes > 0 && (
                    <>
                      {" "}
                      · {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
