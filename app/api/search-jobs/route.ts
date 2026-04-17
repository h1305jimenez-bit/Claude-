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

export interface UnifiedJob {
  id: string;
  title: string;
  company: string;
  location: string;
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

async function fetchArbeitnow(query: string): Promise<UnifiedJob[]> {
  const res = await fetch(
    `https://arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return [];
  const { data } = (await res.json()) as { data: ArbeitnowJob[] };
  return data.slice(0, 20).map((j) => ({
    id: `arbeitnow-${j.slug}`,
    title: j.title,
    company: j.company_name,
    location: j.remote ? "Remote" : j.location || "—",
    type: j.job_types[0] ?? "Full-time",
    url: j.url,
    description: stripHtml(j.description).slice(0, 500),
    tags: j.tags.slice(0, 6),
    source: "Arbeitnow",
    postedAt: formatDate(j.created_at),
  }));
}

async function fetchRemotive(query: string): Promise<UnifiedJob[]> {
  const res = await fetch(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=20`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return [];
  const { jobs } = (await res.json()) as { jobs: RemotiveJob[] };
  return jobs.slice(0, 15).map((j) => ({
    id: `remotive-${j.id}`,
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || "Remote",
    type: j.job_type ?? "Full-time",
    url: j.url,
    description: stripHtml(j.description).slice(0, 500),
    tags: j.tags.slice(0, 6),
    source: "Remotive",
    postedAt: formatDate(j.publication_date),
  }));
}

async function fetchTheMuse(query: string): Promise<UnifiedJob[]> {
  const category = encodeURIComponent(query || "Software Engineer");
  const res = await fetch(
    `https://www.themuse.com/api/public/jobs?category=${category}&page=0&descending=true`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return [];
  const { results } = (await res.json()) as { results: MuseJob[] };
  return (results ?? []).slice(0, 15).map((j) => ({
    id: `muse-${j.id}`,
    title: j.name,
    company: j.company.name,
    location: j.locations?.[0]?.name ?? "—",
    type: j.levels?.[0]?.name ?? "Full-time",
    url: j.refs.landing_page,
    description: stripHtml(j.contents ?? "").slice(0, 500),
    tags: j.levels?.map((l) => l.name) ?? [],
    source: "The Muse",
    postedAt: formatDate(j.publication_date),
  }));
}

async function fetchJobicy(query: string): Promise<UnifiedJob[]> {
  // Jobicy uses tag-based search; take first meaningful keyword
  const tag = encodeURIComponent(query.split(/\s+/)[0] ?? "developer");
  const res = await fetch(
    `https://jobicy.com/api/v2/remote-jobs?count=15&tag=${tag}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { jobs?: JobicyJob[] };
  return (data.jobs ?? []).slice(0, 12).map((j) => ({
    id: `jobicy-${j.id}`,
    title: j.jobTitle,
    company: j.companyName,
    location: j.jobGeo || "Remote",
    type: j.jobType?.[0] ?? "Full-time",
    url: j.url,
    description: stripHtml(j.jobDescription ?? "").slice(0, 500),
    tags: [...(j.jobIndustry ?? []), j.jobLevel].filter(Boolean).slice(0, 5),
    source: "Jobicy",
    postedAt: formatDate(j.pubDate),
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = body.query ?? "";
    const profile = body.profile ?? null;

    // Fetch all sources in parallel
    const results = await Promise.allSettled([
      fetchArbeitnow(query),
      fetchRemotive(query),
      fetchTheMuse(query),
      fetchJobicy(query),
    ]);

    const jobs: UnifiedJob[] = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );

    if (jobs.length === 0) return Response.json({ jobs: [] });

    if (!profile) return Response.json({ jobs: jobs.slice(0, 50) });

    // Score with Claude when CV profile is provided
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ jobs: jobs.slice(0, 50) });

    const client = new Anthropic({ apiKey });
    const top = jobs.slice(0, 30);
    const jobList = top
      .map(
        (j, i) =>
          `${i + 1}. "${j.title}" at ${j.company} (${j.location}) [${j.type}] — ${j.tags.join(", ")}`,
      )
      .join("\n");

    const scoreMsg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
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
