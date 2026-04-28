import type { Election } from "./votes-types";

// globalThis trick keeps data alive across Next.js hot-reloads in dev mode.
const g = globalThis as unknown as {
  __hecElections?: Election[];
  __hecVotes?: Record<string, Record<string, number>>; // electionId -> candidateId -> count
  __hecVoters?: Record<string, Set<string>>;           // electionId -> Set<email>
};

if (!g.__hecElections) g.__hecElections = [];
if (!g.__hecVotes) g.__hecVotes = {};
if (!g.__hecVoters) g.__hecVoters = {};

export function listElections(): Election[] {
  return [...(g.__hecElections ?? [])];
}

export function getElection(id: string): Election | undefined {
  return g.__hecElections?.find((e) => e.id === id);
}

export function saveElection(election: Election): void {
  const list = g.__hecElections!;
  const idx = list.findIndex((e) => e.id === election.id);
  if (idx >= 0) list[idx] = election;
  else list.unshift(election);
}

export function deleteElection(id: string): void {
  if (!g.__hecElections) return;
  const idx = g.__hecElections.findIndex((e) => e.id === id);
  if (idx >= 0) g.__hecElections.splice(idx, 1);
  delete g.__hecVotes![id];
  delete g.__hecVoters![id];
}

export function getVotes(electionId: string): Record<string, number> {
  return { ...(g.__hecVotes?.[electionId] ?? {}) };
}

export function hasVoted(electionId: string, email: string): boolean {
  return g.__hecVoters?.[electionId]?.has(email.toLowerCase()) ?? false;
}

export function castVote(electionId: string, candidateId: string, email: string): boolean {
  const e = email.toLowerCase();
  if (hasVoted(electionId, e)) return false;
  if (!g.__hecVotes![electionId]) g.__hecVotes![electionId] = {};
  const v = g.__hecVotes![electionId];
  v[candidateId] = (v[candidateId] ?? 0) + 1;
  if (!g.__hecVoters![electionId]) g.__hecVoters![electionId] = new Set();
  g.__hecVoters![electionId].add(e);
  return true;
}

export function getVoterCount(electionId: string): number {
  return g.__hecVoters?.[electionId]?.size ?? 0;
}
