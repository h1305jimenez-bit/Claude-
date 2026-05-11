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

async function fetchPage(query: string, start: number, location?: string): Promise<SerpJob[]> {
  const params: Record<string, string | number> = {
    engine: "google_jobs",
    q: query,
    api_key: process.env.SERPAPI_KEY!,
    hl: "en",
    start,
  };

  if (location) params.location = location;

  const response = await axios.get("https://serpapi.com/search.json", {
    params,
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

  // Pass role as the query and location as SerpAPI's location param so
  // Google Jobs searches within that geography rather than defaulting to US.
  const serpLocation = location || undefined;

  const page1 = await fetchPage(role, 0, serpLocation);

  const page2Result = await Promise.race([
    fetchPage(role, 10, serpLocation).catch(() => [] as SerpJob[]),
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
