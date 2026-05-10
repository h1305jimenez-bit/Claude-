import { NextRequest, NextResponse } from "next/server";

const ATS_DOMAINS = [
  "greenhouse.io", "lever.co", "myworkdayjobs.com", "linkedin.com/jobs",
  "smartrecruiters.com", "bamboohr.com", "workable.com", "icims.com",
  "taleo.net", "successfactors.com", "jobvite.com", "ashbyhq.com",
  "recruitee.com", "jazz.co", "breezy.hr", "applytojob.com",
  "amazon.jobs", "careers.google.com", "jobs.apple.com",
  "careers.microsoft.com", "metacareers.com", "jobs.netflix.com",
  "jobs.lever.co", "boards.greenhouse.io", "apply.workable.com",
  "careers.shopify.com", "stripe.com/jobs", "airbnb.design/careers",
];

function extractAtsUrl(text: string): string | null {
  for (const m of text.matchAll(/https?:\/\/[^\s"'<>)]+/g)) {
    const u = m[0].replace(/[).,;]+$/, "");
    if (ATS_DOMAINS.some(d => u.includes(d))) return u;
  }
  return null;
}

async function resolveAdzunaUrl(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timer);

    const finalUrl = res.url;
    if (finalUrl && !finalUrl.includes("adzuna.com") && finalUrl !== url) return finalUrl;

    const html = await res.text();

    // 1. __NEXT_DATA__ (Adzuna uses Next.js SSR — the apply URL is often here)
    const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
    if (nextData) {
      const m = nextData.match(
        /"(?:apply_url|source_url|external_url|applyUrl|sourceUrl|externalUrl|job_url|apply_link|directUrl|direct_url|applicationUrl|apply)"\s*:\s*"(https?:\/\/(?![^"]*adzuna)[^"]+)"/
      );
      if (m) return m[1];

      // Broader: any key containing "apply" or "source" paired with an external URL
      const broad = nextData.match(
        /"[a-z_]*(?:apply|source|external|direct)[a-z_]*"\s*:\s*"(https?:\/\/(?![^"]*adzuna)[^"]+)"/i
      );
      if (broad) return broad[1];
    }

    // 2. JSON-LD structured data
    for (const block of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const data = JSON.parse(block[1]) as Record<string, unknown>;
        for (const key of ["url", "sameAs", "applyUrl", "applicationUrl"]) {
          const val = data[key];
          if (typeof val === "string" && !val.includes("adzuna.com")) return val;
        }
      } catch { /* ignore */ }
    }

    // 3. href attributes pointing to ATS / known career domains
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (ATS_DOMAINS.some(d => m[1].includes(d))) return m[1];
    }

    // 4. Any ATS URL embedded in the page
    const fromHtml = extractAtsUrl(html);
    if (fromHtml) return fromHtml;

  } catch { /* fall through */ }
  finally { clearTimeout(timer); }

  return null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const company = req.nextUrl.searchParams.get("company") ?? "";
  const role = req.nextUrl.searchParams.get("role") ?? "";
  const location = req.nextUrl.searchParams.get("location") ?? "";

  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  // Already a direct company/ATS URL — redirect immediately
  if (!url.includes("adzuna.com")) {
    return NextResponse.redirect(url);
  }

  // Try to resolve the Adzuna URL to a company page
  const resolved = await resolveAdzunaUrl(url);
  if (resolved) return NextResponse.redirect(resolved);

  // Could not resolve — fall back to a Google search for the specific job
  // Include location so the correct country's posting appears first
  const country = location.split(",").pop()?.trim() ?? "";
  const query = [company, role, country, "careers apply"].filter(Boolean).join(" ");
  const fallback = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  return NextResponse.redirect(fallback);
}
