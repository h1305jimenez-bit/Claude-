import axios from "axios";

export interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string;
  country?: string;
}

// Supported Adzuna country codes
const COUNTRY_CODES: Record<string, string> = {
  "us": "us", "usa": "us", "united states": "us", "america": "us",
  "gb": "gb", "uk": "gb", "united kingdom": "gb", "england": "gb", "london": "gb",
  "ca": "ca", "canada": "ca",
  "au": "au", "australia": "au",
  "de": "de", "germany": "de",
  "fr": "fr", "france": "fr",
  "nl": "nl", "netherlands": "nl",
  "sg": "sg", "singapore": "sg",
  "nz": "nz", "new zealand": "nz",
  "at": "at", "austria": "at",
  "be": "be", "belgium": "be",
  "br": "br", "brazil": "br",
  "in": "in", "india": "in",
  "mx": "mx", "mexico": "mx",
  "pl": "pl", "poland": "pl",
  "za": "za", "south africa": "za",
};

// Default countries to search when no specific location given
const DEFAULT_COUNTRIES = ["us", "gb", "ca", "au", "de", "sg"];

function detectCountry(location: string): string | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  for (const [key, code] of Object.entries(COUNTRY_CODES)) {
    if (lower.includes(key)) return code;
  }
  return null;
}

async function fetchForCountry(
  role: string,
  location: string,
  country: string
): Promise<AdzunaJob[]> {
  try {
    const response = await axios.get(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1`,
      {
        params: {
          app_id: process.env.ADZUNA_APP_ID,
          app_key: process.env.ADZUNA_API_KEY,
          what: role,
          where: location,
          results_per_page: 10,
          "content-type": "application/json",
        },
        timeout: 8000,
      }
    );
    return (response.data.results ?? []).map((j: AdzunaJob) => ({ ...j, country }));
  } catch {
    return [];
  }
}

export async function fetchAdzunaJobs(
  role: string,
  location: string,
): Promise<AdzunaJob[]> {
  const detectedCountry = detectCountry(location);

  if (detectedCountry) {
    // If the location string is purely a country name (e.g. "United States", "Mexico"),
    // don't pass it as `where` — Adzuna's `where` expects a city/region, not a country.
    // Passing the full country name to the country endpoint returns very few results.
    const isCountryOnly = Object.entries(COUNTRY_CODES).some(
      ([key, code]) => code === detectedCountry && location.toLowerCase().trim() === key
    );
    const whereParam = isCountryOnly ? "" : location;

    try {
      const [page1, page2] = await Promise.all([
        axios.get(`https://api.adzuna.com/v1/api/jobs/${detectedCountry}/search/1`, {
          params: {
            app_id: process.env.ADZUNA_APP_ID,
            app_key: process.env.ADZUNA_API_KEY,
            what: role,
            ...(whereParam && { where: whereParam }),
            results_per_page: 50,
            "content-type": "application/json",
          },
          timeout: 8000,
        }).catch(() => ({ data: { results: [] } })),
        axios.get(`https://api.adzuna.com/v1/api/jobs/${detectedCountry}/search/2`, {
          params: {
            app_id: process.env.ADZUNA_APP_ID,
            app_key: process.env.ADZUNA_API_KEY,
            what: role,
            ...(whereParam && { where: whereParam }),
            results_per_page: 50,
            "content-type": "application/json",
          },
          timeout: 8000,
        }).catch(() => ({ data: { results: [] } })),
      ]);
      const seen = new Set<string>();
      const combined: AdzunaJob[] = [];
      for (const job of [...(page1.data.results ?? []), ...(page2.data.results ?? [])]) {
        if (!seen.has((job as AdzunaJob).id)) { seen.add((job as AdzunaJob).id); combined.push(job as AdzunaJob); }
      }
      return combined;
    } catch (e) {
      throw e;
    }
  }

  // No specific country — search all default countries in parallel
  const results = await Promise.all(
    DEFAULT_COUNTRIES.map(country => fetchForCountry(role, "", country))
  );

  // Combine, deduplicate by id, sort by recency
  const seen = new Set<string>();
  const combined: AdzunaJob[] = [];
  for (const countryJobs of results) {
    for (const job of countryJobs) {
      if (!seen.has(job.id)) {
        seen.add(job.id);
        combined.push(job);
      }
    }
  }
  return combined;
}
