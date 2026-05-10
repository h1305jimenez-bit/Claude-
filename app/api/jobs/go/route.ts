import { NextRequest, NextResponse } from "next/server";

const ATS_DOMAINS = [
  "greenhouse.io", "lever.co", "myworkdayjobs.com", "linkedin.com/jobs",
  "smartrecruiters.com", "bamboohr.com", "workable.com", "icims.com",
  "taleo.net", "successfactors.com", "jobvite.com", "ashbyhq.com",
  "recruitee.com", "jazz.co", "breezy.hr", "applytojob.com",
  "amazon.jobs", "careers.google.com", "jobs.apple.com",
  "careers.microsoft.com", "metacareers.com", "jobs.netflix.com",
  "jobs.lever.co", "boards.greenhouse.io", "apply.workable.com",
];

function extractAtsUrl(text: string): string | null {
  const urlRe = /https?:\/\/[^\s"'<>)]+/g;
  for (const m of text.matchAll(urlRe)) {
    const u = m[0].replace(/[).,;]+$/, "");
    if (ATS_DOMAINS.some(d => u.includes(d))) return u;
  }
  return null;
}

async function resolveAdzunaUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
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

    // Successfully redirected away from Adzuna — use that URL directly
    const finalUrl = res.url;
    if (finalUrl && !finalUrl.includes("adzuna.com") && finalUrl !== url) return finalUrl;

    // Still on Adzuna — parse the page HTML
    const html = await res.text();

    // 1. Adzuna uses Next.js; the SSR payload in __NEXT_DATA__ often contains the source URL
    const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
    if (nextData) {
      const applyMatch = nextData.match(
        /"(?:apply_url|source_url|external_url|applyUrl|sourceUrl|externalUrl|job_url|apply_link|directUrl|direct_url|applicationUrl)"\s*:\s*"(https?:\/\/(?![^"]*adzuna)[^"]+)"/
      );
      if (applyMatch) return applyMatch[1];

      // Broader scan: any non-Adzuna https URL associated with apply/source keys
      const broadMatch = nextData.match(
        /"(?:[a-z_]*(?:apply|source|external|direct)[a-z_]*)"\s*:\s*"(https?:\/\/(?![^"]*adzuna)[^"]+)"/i
      );
      if (broadMatch) return broadMatch[1];
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

    // 3. href attributes pointing to known ATS / career domains
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (ATS_DOMAINS.some(d => m[1].includes(d))) return m[1];
    }

    // 4. data-apply-url or similar attributes
    const dataMatch = html.match(/data-(?:href|url|apply-?url|source-?url)="(https?:\/\/(?![^"]*adzuna)[^"]+)"/i);
    if (dataMatch) return dataMatch[1];

    // 5. Any non-Adzuna URL embedded in page data attributes or script tags
    const atsFromHtml = extractAtsUrl(html);
    if (atsFromHtml) return atsFromHtml;

  } catch { /* fall through */ }
  finally { clearTimeout(timer); }

  return url;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  // Not an Adzuna URL — redirect immediately, no processing needed
  if (!url.includes("adzuna.com")) {
    return NextResponse.redirect(url);
  }

  const resolved = await resolveAdzunaUrl(url);
  return NextResponse.redirect(resolved);
}
