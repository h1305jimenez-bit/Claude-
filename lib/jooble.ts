import axios from "axios";

export interface JoobleJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string;
  source: "jooble";
}

interface RawJoobleJob {
  id?: string;
  title?: string;
  company?: string;
  location?: string;
  snippet?: string;
  link?: string;
  updated?: string;
}

export async function fetchJoobleJobs(
  role: string,
  location: string,
): Promise<JoobleJob[]> {
  if (!process.env.JOOBLE_API_KEY) return [];

  try {
    const response = await axios.post(
      `https://jooble.org/api/${process.env.JOOBLE_API_KEY}`,
      { keywords: role, location, resultsOnPage: 20, page: 1 },
      { timeout: 20000, headers: { "Content-Type": "application/json" } }
    );

    const jobs: RawJoobleJob[] = response.data?.jobs ?? [];
    return jobs.map((job, i) => ({
      id: `jooble_${job.id ?? i}_${Date.now()}`,
      title: job.title ?? "",
      company: { display_name: job.company ?? "" },
      location: { display_name: job.location ?? "" },
      description: job.snippet ?? "",
      redirect_url: job.link ?? "",
      created: job.updated ?? new Date().toISOString(),
      source: "jooble" as const,
    }));
  } catch {
    return [];
  }
}
