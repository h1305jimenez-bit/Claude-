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

// ISO country codes for JSearch's country filter
const COUNTRY_CODES: Record<string, string> = {
  "chile": "cl", "argentina": "ar", "colombia": "co", "peru": "pe",
  "venezuela": "ve", "ecuador": "ec", "bolivia": "bo", "paraguay": "py",
  "uruguay": "uy", "brazil": "br", "mexico": "mx", "united states": "us",
  "united kingdom": "gb", "canada": "ca", "australia": "au", "germany": "de",
  "france": "fr", "spain": "es", "italy": "it", "netherlands": "nl",
  "singapore": "sg", "india": "in", "japan": "jp", "china": "cn",
  "south africa": "za", "nigeria": "ng", "kenya": "ke",
};

function getCountryCode(location: string): string | undefined {
  const lower = location.toLowerCase().trim();
  for (const [name, code] of Object.entries(COUNTRY_CODES)) {
    if (lower.includes(name)) return code;
  }
  return undefined;
}

async function fetchPage(query: string, page: number, countryCode?: string): Promise<JSearchJob[]> {
  const params: Record<string, string | number> = {
    query,
    page,
    num_pages: 1,
    date_posted: "month",
  };
  if (countryCode) params.country = countryCode;

  const response = await axios.get("https://jsearch.p.rapidapi.com/search-v2", {
    params,
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

  // Try both "role jobs in location" and "role jobs in <capital city>" for better coverage
  const queries = location
    ? [`${role} jobs in ${location}`]
    : [`${role} jobs`];

  // For country-level searches, also try the capital city for better results
  const capitalCities: Record<string, string> = {
    "chile": "Santiago", "argentina": "Buenos Aires", "colombia": "Bogotá",
    "peru": "Lima", "venezuela": "Caracas", "ecuador": "Quito",
    "bolivia": "La Paz", "uruguay": "Montevideo", "paraguay": "Asunción",
    "brazil": "São Paulo", "mexico": "Mexico City", "spain": "Madrid",
    "japan": "Tokyo", "china": "Shanghai", "nigeria": "Lagos", "kenya": "Nairobi",
  };
  const lower = location.toLowerCase().trim();
  const capital = Object.entries(capitalCities).find(([country]) => lower.includes(country))?.[1];
  if (capital && capital !== location) queries.push(`${role} jobs in ${capital}`);

  try {
    const pageResults = await Promise.allSettled(
      queries.flatMap(query => [fetchPage(query, 1), fetchPage(query, 2)])
    );

    const combined: JSearchJob[] = [];
    const seen = new Set<string>();
    for (const result of pageResults) {
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
