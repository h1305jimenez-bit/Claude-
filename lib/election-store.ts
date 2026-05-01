export interface Candidate {
  id: string;
  name: string;
  program: string;
  emoji: string;
  pitch: string;
}

export interface Position {
  id: string;
  title: string;
  candidates: Candidate[];
}

export const POSITIONS: Position[] = [
  {
    id: "president",
    title: "Class President",
    candidates: [
      {
        id: "alice-dupont",
        name: "Alice Dupont",
        program: "MBA 2025",
        emoji: "👩‍💼",
        pitch: "Bridging cultures on campus and amplifying every student's voice in faculty decisions.",
      },
      {
        id: "marco-rossi",
        name: "Marco Rossi",
        program: "MBA 2025",
        emoji: "👨‍💼",
        pitch: "Four years in consulting — I know how to get things done. Let's make this cohort legendary.",
      },
      {
        id: "priya-sharma",
        name: "Priya Sharma",
        program: "MBA 2025",
        emoji: "👩‍🎓",
        pitch: "Inclusive leadership starts with listening. I'll hold monthly open forums and publish action logs.",
      },
    ],
  },
  {
    id: "vp-social",
    title: "VP Social",
    candidates: [
      {
        id: "lucas-meyer",
        name: "Lucas Meyer",
        program: "MBA 2025",
        emoji: "🎉",
        pitch: "Epic events, tight budget. My first act: a rooftop networking night in Jouy-en-Josas.",
      },
      {
        id: "sofia-kim",
        name: "Sofia Kim",
        program: "MBA 2025",
        emoji: "🌍",
        pitch: "International nights, weekend hikes, and a proper end-of-year gala — all on the agenda.",
      },
    ],
  },
  {
    id: "vp-academics",
    title: "VP Academics",
    candidates: [
      {
        id: "james-okafor",
        name: "James Okafor",
        program: "MBA 2025",
        emoji: "📚",
        pitch: "I'll push for more electives, better study-group spaces, and direct professor feedback loops.",
      },
      {
        id: "mei-chen",
        name: "Mei Chen",
        program: "MBA 2025",
        emoji: "🎓",
        pitch: "Academic excellence + well-being. I'll negotiate deadline flexibility and peer-tutoring credits.",
      },
    ],
  },
];

interface VoteRecord {
  /** email → candidateId */
  [positionId: string]: Record<string, string>;
}

const g = globalThis as unknown as { __hecElectionVotes?: VoteRecord };
if (!g.__hecElectionVotes) g.__hecElectionVotes = {};

export function castVote(positionId: string, candidateId: string, email: string): "ok" | "already_voted" | "invalid" {
  const position = POSITIONS.find((p) => p.id === positionId);
  if (!position) return "invalid";
  if (!position.candidates.find((c) => c.id === candidateId)) return "invalid";

  const store = g.__hecElectionVotes!;
  if (!store[positionId]) store[positionId] = {};
  if (store[positionId][email]) return "already_voted";

  store[positionId][email] = candidateId;
  return "ok";
}

export function getResults(): Record<string, Record<string, number>> {
  const store = g.__hecElectionVotes ?? {};
  const out: Record<string, Record<string, number>> = {};
  for (const position of POSITIONS) {
    out[position.id] = {};
    for (const c of position.candidates) out[position.id][c.id] = 0;
    for (const vote of Object.values(store[position.id] ?? {})) {
      out[position.id][vote] = (out[position.id][vote] ?? 0) + 1;
    }
  }
  return out;
}

export function getVotesByEmail(email: string): Record<string, string> {
  const store = g.__hecElectionVotes ?? {};
  const out: Record<string, string> = {};
  for (const position of POSITIONS) {
    if (store[position.id]?.[email]) {
      out[position.id] = store[position.id][email];
    }
  }
  return out;
}
