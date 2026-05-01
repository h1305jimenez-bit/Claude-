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

function placeholder(clubId: string, category: "Social" | "Professional"): Candidate[] {
  return [
    {
      id: `${clubId}-candidate-a`,
      name: "Candidate A",
      program: "MBA 2026",
      emoji: category === "Social" ? "🎉" : "💼",
      pitch: "TBD",
    },
    {
      id: `${clubId}-candidate-b`,
      name: "Candidate B",
      program: "MBA 2026",
      emoji: category === "Social" ? "🌍" : "📊",
      pitch: "TBD",
    },
  ];
}

export const POSITIONS: Position[] = [
  // — Social clubs —
  { id: "mba-council",           title: "MBA Council",                          candidates: placeholder("mba-council", "Social") },
  { id: "mba-africa",            title: "MBA Africa Club",                       candidates: placeholder("mba-africa", "Social") },
  { id: "mba-apac",              title: "MBA Asia Pacific Business Club (APAC)", candidates: placeholder("mba-apac", "Social") },
  { id: "mba-international",     title: "MBA International Club",                candidates: placeholder("mba-international", "Social") },
  { id: "mba-mena",              title: "MBA Middle East & North Africa Club",   candidates: placeholder("mba-mena", "Social") },
  { id: "mba-latam",             title: "MBA Latin America Club (LatAm)",        candidates: placeholder("mba-latam", "Social") },
  { id: "mba-lgbtqia",           title: "MBA LGBTQIA+ and Allies Club",          candidates: placeholder("mba-lgbtqia", "Social") },
  { id: "mba-wine-spirits",      title: "MBA Wine, Spirits & Beer Society",      candidates: placeholder("mba-wine-spirits", "Social") },
  { id: "mba-women-leadership",  title: "MBA Women in Leadership Club",          candidates: placeholder("mba-women-leadership", "Social") },
  // — Professional clubs —
  { id: "mba-arts-media",        title: "MBA Arts Media Entertainment Club",     candidates: placeholder("mba-arts-media", "Professional") },
  { id: "mba-consulting",        title: "MBA Consulting Club",                   candidates: placeholder("mba-consulting", "Professional") },
  { id: "mba-consulting-practice", title: "The Consulting Practice at HEC Paris (MBA)", candidates: placeholder("mba-consulting-practice", "Professional") },
  { id: "mba-energy",            title: "MBA Energy Club",                       candidates: placeholder("mba-energy", "Professional") },
  { id: "mba-entrepreneurship",  title: "MBA Entrepreneurship Club",             candidates: placeholder("mba-entrepreneurship", "Professional") },
  { id: "mba-fmcg",              title: "MBA FMCG",                              candidates: placeholder("mba-fmcg", "Professional") },
  { id: "mba-healthcare",        title: "MBA Healthcare Club",                   candidates: placeholder("mba-healthcare", "Professional") },
  { id: "mba-luxury",            title: "MBA Luxury Club",                       candidates: placeholder("mba-luxury", "Professional") },
  { id: "mba-marketing",         title: "MBA Marketing Club",                    candidates: placeholder("mba-marketing", "Professional") },
  { id: "mba-finance",           title: "MBA FinanceClub",                       candidates: placeholder("mba-finance", "Professional") },
  { id: "mba-product-mgmt",      title: "MBA Product Management Club",           candidates: placeholder("mba-product-mgmt", "Professional") },
  { id: "mba-real-estate",       title: "MBA Real Estate Club",                  candidates: placeholder("mba-real-estate", "Professional") },
  { id: "mba-search-fund",       title: "MBA Search Fund Club",                  candidates: placeholder("mba-search-fund", "Professional") },
  { id: "mba-sports-investment",  title: "MBA Sports Investment Club",           candidates: placeholder("mba-sports-investment", "Professional") },
  { id: "mba-sustainability",    title: "MBA Sustainability Club",                candidates: placeholder("mba-sustainability", "Professional") },
  { id: "mba-tech",              title: "MBA Tech Club",                          candidates: placeholder("mba-tech", "Professional") },
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
