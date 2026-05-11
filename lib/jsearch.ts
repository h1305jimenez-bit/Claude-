import axios from "axios";

export interface JSearchJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string;
  source: "jsearch";
}

interface RawJSearchJob {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_description?: string;
  job_apply_link?: string;
  job_posted_at_datetime_utc?: string;
}

async function fetchPage(query: string, page: number): Promise<JSearchJob[]> {
  const response = await axios.get("https://jsearch.p.rapidapi.com/search", {
    params: { query, page, num_pages: 1, date_posted: "month" },
    headers: {
      "X-RapidAPI-Key": process.env.JSEARCH_API_KEY!,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
    timeout: 20000,
  });

  const jobs: RawJSearchJob[] = response.data?.data ?? [];
  return jobs.map((job) => {
    const locationParts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
    return {
      id: `jsearch_${job.job_id ?? Math.random().toString(36).slice(2)}`,
      title: job.job_title ?? "",
      company: { display_name: job.employer_name ?? "" },
      location: { display_name: locationParts.join(", ") },
      description: (job.job_description ?? "").slice(0, 1000),
      redirect_url: job.job_apply_link ?? "",
      created: job.job_posted_at_datetime_utc ?? new Date().toISOString(),
      source: "jsearch" as const,
    };
  });
}

export async function fetchJSearchJobs(
  role: string,
  location: string,
): Promise<JSearchJob[]> {
  if (!process.env.JSEARCH_API_KEY) return [];

  const query = location ? `${role} in ${location}` : role;

  try {
    const [page1, page2] = await Promise.allSettled([
      fetchPage(query, 1),
      fetchPage(query, 2),
    ]);

    const combined: JSearchJob[] = [];
    const seen = new Set<string>();

    for (const result of [page1, page2]) {
      if (result.status === "rejected") continue;
      for (const job of result.value) {
        if (!seen.has(job.id)) { seen.add(job.id); combined.push(job); }
      }
    }

    return combined;
  } catch {
    return [];
  }
}
