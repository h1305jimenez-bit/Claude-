import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
  };

  try {
    // Try GET first — HEAD is often blocked by ATS/career sites
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers,
    });
    clearTimeout(timer);

    // Only mark as removed on definitive 404.
    // 403/429/5xx = blocked or rate-limited, not removed — treat as unknown.
    if (res.status === 404) return NextResponse.json({ active: false, httpStatus: 404 });
    if (res.status < 400 || res.status === 403 || res.status === 429) {
      return NextResponse.json({ active: true, httpStatus: res.status });
    }
    // 5xx or other 4xx — uncertain
    return NextResponse.json({ active: null, httpStatus: res.status });
  } catch {
    clearTimeout(timer);
    // Timeout or DNS failure — uncertain, not confirmed removed
    return NextResponse.json({ active: null, httpStatus: null });
  }
}
