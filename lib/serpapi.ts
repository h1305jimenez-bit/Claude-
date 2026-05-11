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
    timeout: 10000,
  });

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

  const query = location ? `${role} jobs ${location}` : `${role} jobs`;

  try {
    const [page1, page2] = await Promise.allSettled([
      fetchPage(query, 0),
      fetchPage(query, 10),
    ]);

    const combined: SerpJob[] = [];
    const seen = new Set<string>();

    for (const result of [page1, page2]) {
      if (result.status === "rejected") continue;
      for (const job of result.value) {
        if (!seen.has(job.id)) {
          seen.add(job.id);
          combined.push(job);
        }
      }
    }

    return combined;
  } catch {
    return [];
  }
}
