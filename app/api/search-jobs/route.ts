import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: string;
}

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  description: string;
}

interface MuseJob {
  id: number;
  name: string;
  publication_date: string;
  locations: { name: string }[];
  levels: { name: string }[];
  company: { name: string };
  refs: { landing_page: string };
  contents: string;
}

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobGeo: string;
  jobType: string[];
  pubDate: string;
  jobDescription: string;
  jobIndustry: string[];
  jobLevel: string;
}

interface FindWorkJob {
  id: number;
  role: string;
  company_name: string;
  employment_type: string;
  location: string;
  remote: boolean;
  date_posted: string;
  keywords: string[];
  url: string;
  text: string;
}

export interface UnifiedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  flag: string;
  type: string;
  url: string;
  description: string;
  tags: string[];
  source: string;
  postedAt: string;
  score?: number;
  matchReasons?: string[];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function locationFlag(loc: string): string {
  const l = loc.toLowerCase();
  if (!loc || loc === "—") return "🌍";
  if (/remote|worldwide|anywhere|global/i.test(loc)) return "🌍";
  if (/\busa\b|united states|\bny\b|\bca\b|\btx\b|\bsf\b|new york|san francisco|los angeles|chicago|seattle|boston|austin/.test(l)) return "🇺🇸";
  if (/\buk\b|united kingdom|london|manchester|birmingham|edinburgh|england|scotland/.test(l)) return "🇬🇧";
  if (/france|paris|lyon|marseille|bordeaux/.test(l)) return "🇫🇷";
  if (/germany|deutschland|berlin|munich|münchen|hamburg|frankfurt|cologne/.test(l)) return "🇩🇪";
  if (/canada|toronto|vancouver|montreal|calgary|ottawa/.test(l)) return "🇨🇦";
  if (/australia|sydney|melbourne|brisbane|perth|adelaide/.test(l)) return "🇦🇺";
  if (/spain|españa|madrid|barcelona|valencia|seville/.test(l)) return "🇪🇸";
  if (/netherlands|amsterdam|rotterdam|the hague|eindhoven/.test(l)) return "🇳🇱";
  if (/switzerland|zurich|zürich|geneva|bern/.test(l)) return "🇨🇭";
  if (/sweden|stockholm|gothenburg|malmö/.test(l)) return "🇸🇪";
  if (/portugal|lisbon|lisboa|porto/.test(l)) return "🇵🇹";
  if (/ireland|dublin|cork/.test(l)) return "🇮🇪";
  if (/india|bangalore|bengaluru|mumbai|delhi|hyderabad|pune/.test(l)) return "🇮🇳";
  if (/singapore/.test(l)) return "🇸🇬";
  if (/brazil|brasil|são paulo|rio de janeiro/.test(l)) return "🇧🇷";
  if (/poland|warsaw|kraków|wroclaw/.test(l)) return "🇵🇱";
  if (/europe|emea/.test(l)) return "🇪🇺";
  if (/latin america|latam/.test(l)) return "🌎";
  if (/asia|apac/.test(l)) return "🌏";
  return "📍";
}

async function fetchArbeitnow(query: string): Promise<UnifiedJob[]> {
  const res = await fetch(
    `https://arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return [];
  const { data } = (await res.json()) as { data: ArbeitnowJob[] };
  return data.slice(0, 30).map((j) => {
    const loc = j.remote ? "Remote" : j.location || "—";
    return {
      id: `arbeitnow-${j.slug}`,
      title: j.title,
      company: j.company_name,
      location: loc,
      flag: locationFlag(loc),
      type: j.job_types[0] ?? "Full-time",
      url: j.url,
      description: stripHtml(j.description).slice(0, 500),
      tags: j.tags.slice(0, 6),
      source: "Arbeitnow",
      postedAt: formatDate(j.created_at),
    };
  });
}

async function fetchRemotive(query: string): Promise<UnifiedJob[]> {
  const res = await fetch(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=30`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return [];
  const { jobs } = (await res.json()) as { jobs: RemotiveJob[] };
  return jobs.slice(0, 25).map((j) => {
    const loc = j.candidate_required_location || "Worldwide";
    return {
      id: `remotive-${j.id}`,
      title: j.title,
      company: j.company_name,
      location: loc,
      flag: locationFlag(loc),
      type: j.job_type ?? "Full-time",
      url: j.url,
      description: stripHtml(j.description).slice(0, 500),
      tags: j.tags.slice(0, 6),
      source: "Remotive",
      postedAt: formatDate(j.publication_date),
    };
  });
}

async function fetchTheMuse(query: string): Promise<UnifiedJob[]> {
  const category = encodeURIComponent(query || "Software Engineer");
  const res = await fetch(
    `https://www.themuse.com/api/public/jobs?category=${category}&page=0&descending=true`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return [];
  const { results } = (await res.json()) as { results: MuseJob[] };
  return (results ?? []).slice(0, 20).map((j) => {
    const loc = j.locations?.[0]?.name ?? "—";
    return {
      id: `muse-${j.id}`,
      title: j.name,
      company: j.company.name,
      location: loc,
      flag: locationFlag(loc),
      type: j.levels?.[0]?.name ?? "Full-time",
      url: j.refs.landing_page,
      description: stripHtml(j.contents ?? "").slice(0, 500),
      tags: j.levels?.map((l) => l.name) ?? [],
      source: "The Muse",
      postedAt: formatDate(j.publication_date),
    };
  });
}

async function fetchJobicy(query: string): Promise<UnifiedJob[]> {
  const tag = encodeURIComponent(query.split(/\s+/)[0] ?? "developer");
  const res = await fetch(
    `https://jobicy.com/api/v2/remote-jobs?count=20&tag=${tag}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { jobs?: JobicyJob[] };
  return (data.jobs ?? []).slice(0, 18).map((j) => {
    const loc = j.jobGeo || "Remote";
    return {
      id: `jobicy-${j.id}`,
      title: j.jobTitle,
      company: j.companyName,
      location: loc,
      flag: locationFlag(loc),
      type: j.jobType?.[0] ?? "Full-time",
      url: j.url,
      description: stripHtml(j.jobDescription ?? "").slice(0, 500),
      tags: [...(j.jobIndustry ?? []), j.jobLevel].filter(Boolean).slice(0, 5),
      source: "Jobicy",
      postedAt: formatDate(j.pubDate),
    };
  });
}

async function fetchFindWork(query: string): Promise<UnifiedJob[]> {
  const res = await fetch(
    `https://findwork.dev/api/jobs/?search=${encodeURIComponent(query)}&order_by=-date`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: FindWorkJob[] };
  return (data.results ?? []).slice(0, 20).map((j) => {
    const loc = j.remote ? "Remote" : j.location || "—";
    return {
      id: `findwork-${j.id}`,
      title: j.role,
      company: j.company_name,
      location: loc,
      flag: locationFlag(loc),
      type: j.employment_type || "Full-time",
      url: j.url,
      description: stripHtml(j.text ?? "").slice(0, 500),
      tags: (j.keywords ?? []).slice(0, 6),
      source: "FindWork",
      postedAt: formatDate(j.date_posted),
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = body.query ?? "";
    const profile = body.profile ?? null;

    // Fetch all 5 sources in parallel
    const results = await Promise.allSettled([
      fetchArbeitnow(query),
      fetchRemotive(query),
      fetchTheMuse(query),
      fetchJobicy(query),
      fetchFindWork(query),
    ]);

    const jobs: UnifiedJob[] = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );

    if (jobs.length === 0) return Response.json({ jobs: [] });
    if (!profile) return Response.json({ jobs: jobs.slice(0, 60) });

    // Score with Claude when CV profile is provided
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ jobs: jobs.slice(0, 60) });

    const client = new Anthropic({ apiKey });
    const top = jobs.slice(0, 40);
    const jobList = top
      .map(
        (j, i) =>
          `${i + 1}. "${j.title}" at ${j.company} (${j.location}) [${j.type}] — ${j.tags.join(", ")}`,
      )
      .join("\n");

    const scoreMsg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: "Job matching assistant. Return only a valid JSON array, no markdown.",
      messages: [
        {
          role: "user",
          content: `Candidate: ${profile.title}, skills: ${(profile.skills as string[]).join(", ")}, ${profile.experience_years}y exp.

Score each job 0-100. Return: [{"index":1,"score":85,"reasons":["reason"]}]

Jobs:\n${jobList}`,
        },
      ],
    });

    const scoreText =
      scoreMsg.content[0].type === "text" ? scoreMsg.content[0].text : "[]";
    const arrMatch = scoreText.match(/\[[\s\S]*\]/);
    const scores: { index: number; score: number; reasons: string[] }[] =
      arrMatch ? JSON.parse(arrMatch[0]) : [];

    const scoredJobs = top
      .map((job, i) => {
        const s = scores.find((x) => x.index === i + 1);
        return { ...job, score: s?.score ?? 50, matchReasons: s?.reasons ?? [] };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return Response.json({ jobs: scoredJobs });
  } catch (err) {
    console.error("[search-jobs]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 },
    );
  }
}
