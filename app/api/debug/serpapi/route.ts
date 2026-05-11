import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "Strategy Consultant";
  const location = req.nextUrl.searchParams.get("location") ?? "Santiago, Chile";

  if (!process.env.SERPAPI_KEY) {
    return NextResponse.json({ error: "SERPAPI_KEY not set" });
  }

  try {
    const params: Record<string, string | number> = {
      engine: "google_jobs",
      q,
      api_key: process.env.SERPAPI_KEY,
      hl: "en",
      start: 0,
    };
    if (location) params.location = location;

    const response = await axios.get("https://serpapi.com/search.json", {
      params,
      timeout: 30000,
    });

    return NextResponse.json({
      status: response.status,
      error: response.data.error ?? null,
      jobCount: response.data.jobs_results?.length ?? 0,
      firstJob: response.data.jobs_results?.[0] ?? null,
      searchMetadata: response.data.search_metadata ?? null,
      searchParameters: response.data.search_parameters ?? null,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { status: number; data: unknown } };
    return NextResponse.json({
      error: e.message,
      responseStatus: e.response?.status,
      responseData: e.response?.data,
    });
  }
}
