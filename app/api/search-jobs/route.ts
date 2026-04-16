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
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  description: string;
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
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = body.query ?? "";
    const profile = body.profile ?? null;

    // Fetch from both sources in parallel
    const [arbeitnowRes, remotiveRes] = await Promise.allSettled([
      fetch(
        `https://arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(8000) },
      ),
      fetch(
        `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=30`,
        { signal: AbortSignal.timeout(8000) },
      ),
    ]);

    const jobs: UnifiedJob[] = [];

    if (arbeitnowRes.status === "fulfilled" && arbeitnowRes.value.ok) {
      const data = (await arbeitnowRes.value.json()) as {
        data: ArbeitnowJob[];
      };
      for (const j of data.data.slice(0, 25)) {
        jobs.push({
          id: `arbeitnow-${j.slug}`,
          title: j.title,
          company: j.company_name,
          location: j.remote ? "Remote" : j.location || "—",
          type: j.job_types[0] ?? "Full-time",
          url: j.url,
          description: stripHtml(j.description).slice(0, 600),
          tags: j.tags.slice(0, 6),
          source: "Arbeitnow",
          postedAt: formatDate(j.created_at),
        });
      }
    }

    if (remotiveRes.status === "fulfilled" && remotiveRes.value.ok) {
      const data = (await remotiveRes.value.json()) as {
        jobs: RemotiveJob[];
      };
      for (const j of data.jobs.slice(0, 20)) {
        jobs.push({
          id: `remotive-${j.id}`,
          title: j.title,
          company: j.company_name,
          location: j.candidate_required_location || "Remote",
          type: j.job_type ?? "Full-time",
          url: j.url,
          description: stripHtml(j.description).slice(0, 600),
          tags: j.tags.slice(0, 6),
          source: "Remotive",
          postedAt: formatDate(j.publication_date),
        });
      }
    }

    if (jobs.length === 0) {
      return Response.json({ jobs: [] });
    }

    // If no profile, return jobs sorted by recency (already in order)
    if (!profile) {
      return Response.json({ jobs: jobs.slice(0, 40) });
    }

    // Score jobs with Claude when CV profile is provided
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ jobs: jobs.slice(0, 40) });
    }

    const client = new Anthropic({ apiKey });
    const jobList = jobs
      .slice(0, 30)
      .map(
        (j, i) =>
          `${i + 1}. "${j.title}" at ${j.company} (${j.location}) [${j.type}] — Tags: ${j.tags.join(", ")}`,
      )
      .join("\n");

    const scoreMsg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: "Job matching assistant. Return only valid JSON array, no markdown.",
      messages: [
        {
          role: "user",
          content: `Candidate:
- Title: ${profile.title}
- Skills: ${(profile.skills as string[]).join(", ")}
- Experience: ${profile.experience_years} years
- Summary: ${profile.summary}

Score each job 0-100. Return: [{"index":1,"score":85,"reasons":["reason1","reason2"]}]

Jobs:
${jobList}`,
        },
      ],
    });

    const scoreText =
      scoreMsg.content[0].type === "text" ? scoreMsg.content[0].text : "[]";
    const arrMatch = scoreText.match(/\[[\s\S]*\]/);
    const scores: { index: number; score: number; reasons: string[] }[] =
      arrMatch ? JSON.parse(arrMatch[0]) : [];

    const scoredJobs = jobs.slice(0, 30).map((job, i) => {
      const s = scores.find((x) => x.index === i + 1);
      return { ...job, score: s?.score ?? 50, matchReasons: s?.reasons ?? [] };
    });

    scoredJobs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return Response.json({ jobs: scoredJobs });
  } catch (err) {
    console.error("[search-jobs]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 },
    );
  }
}
