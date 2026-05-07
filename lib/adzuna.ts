import axios from "axios";

export interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string;
}

export async function fetchAdzunaJobs(
  role: string,
  location: string,
  page = 1
): Promise<AdzunaJob[]> {
  const response = await axios.get(
    `https://api.adzuna.com/v1/api/jobs/us/search/${page}`,
    {
      params: {
        app_id: process.env.ADZUNA_APP_ID,
        app_key: process.env.ADZUNA_API_KEY,
        what: role,
        where: location,
        results_per_page: 20,
        "content-type": "application/json",
      },
    }
  );
  return response.data.results ?? [];
}
