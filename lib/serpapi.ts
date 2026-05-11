import axios from "axios";

export interface SerpJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string;
  source: "serpapi";
}

interface RawSerpJob {
  job_id?: string;
  title?: string;
  company_name?: string;
  location?: string;
  description?: string;
  apply_options?: Array<{ link?: string; title?: string }>;
  detected_extensions?: { posted_at?: string };
}

async function fetchPage(query: string, start: number): Promise<SerpJob[]> {
  const response = await axios.get("https://serpapi.com/search.json", {
    params: {
      engine: "google_jobs",
      q: query,
      api_key: process.env.SERPAPI_KEY,
      hl: "en",
      start,
    },
    timeout: 25000,
  });

  // SerpAPI returns { error: "..." } on quota exceeded, bad key, etc.
  if (response.data.error) throw new Error(`SerpAPI: ${response.data.error}`);

  const results: RawSerpJob[] = response.data.jobs_results ?? [];
  return results.map((job) => ({
    id: `serp_${job.job_id ?? Math.random().toString(36).slice(2)}`,
    title: job.title ?? "",
    company: { display_name: job.company_name ?? "" },
    location: { display_name: job.location ?? "" },
    description: job.description ?? "",
    redirect_url: job.apply_options?.[0]?.link ?? "",
    created: new Date().toISOString(),
    source: "serpapi" as const,
  }));
}

export async function fetchGoogleJobs(
  role: string,
  location: string,
): Promise<SerpJob[]> {
  if (!process.env.SERPAPI_KEY) return [];

  const query = location ? `${role} ${location}` : role;

  // Fetch page 1 (required) and page 2 (best-effort — don't fail if slow)
  const page1 = await fetchPage(query, 0);

  const page2Result = await Promise.race([
    fetchPage(query, 10).catch(() => [] as SerpJob[]),
    new Promise<SerpJob[]>(resolve => setTimeout(() => resolve([]), 8000)),
  ]);

  const combined: SerpJob[] = [];
  const seen = new Set<string>();

  for (const job of [...page1, ...page2Result]) {
    if (!seen.has(job.id)) {
      seen.add(job.id);
      combined.push(job);
    }
  }

  return combined;
}
