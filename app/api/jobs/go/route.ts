import { NextRequest, NextResponse } from "next/server";

// Known ATS domains (used for href scanning)
const ATS_DOMAINS = [
  "greenhouse.io", "lever.co", "myworkdayjobs.com", "linkedin.com/jobs",
  "smartrecruiters.com", "bamboohr.com", "workable.com", "icims.com",
  "taleo.net", "successfactors.com", "jobvite.com", "ashbyhq.com",
  "recruitee.com", "jazz.co", "breezy.hr", "applytojob.com",
  "amazon.jobs", "careers.google.com", "jobs.apple.com",
  "careers.microsoft.com", "metacareers.com", "jobs.netflix.com",
  "jobs.lever.co", "boards.greenhouse.io", "apply.workable.com",
  "careers.shopify.com", "stripe.com/jobs", "pinpointhq.com", "rippling.com/jobs",
];

// ATS tracking params — catch custom-domain ATS (e.g. careers.feverup.com?gh_jid=...)
const ATS_PARAMS = ["gh_jid", "gh_src", "lever-origin", "lever_source", "jid"];

function hasAtsParam(url: string): boolean {
  try {
    const u = new URL(url);
    return ATS_PARAMS.some(p => u.searchParams.has(p));
  } catch { return false; }
}

function isNonAdzuna(url: string): boolean {
  return url.startsWith("http") && !url.includes("adzuna.com");
}

function isCareerUrl(url: string): boolean {
  if (!isNonAdzuna(url)) return false;
  if (ATS_DOMAINS.some(d => url.includes(d))) return true;
  if (hasAtsParam(url)) return true;
  // Heuristic: path contains apply/jobs/careers
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\/(jobs|careers|apply|job|position|vacancy|opening)/.test(path);
  } catch { return false; }
}

async function resolveAdzunaUrl(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
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

    // Clean redirect away from Adzuna
    const finalUrl = res.url;
    if (finalUrl && isNonAdzuna(finalUrl) && finalUrl !== url) return finalUrl;

    const html = await res.text();

    // 1. __NEXT_DATA__ — Adzuna is a Next.js app; apply URL is often in the SSR payload
    const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
    if (nextData) {
      // Targeted known keys
      const targeted = nextData.match(
        /"(?:apply_url|source_url|external_url|applyUrl|sourceUrl|externalUrl|job_url|apply_link|directUrl|direct_url|applicationUrl|redirect_url)"\s*:\s*"(https?:\/\/(?![^"]*adzuna)[^"]+)"/
      );
      if (targeted) return decodeURIComponent(targeted[1].replace(/\\u002F/g, "/"));

      // Broader: any key with apply/source/external + external URL
      const broad = nextData.match(
        /"[a-z_]*(?:apply|source|external|direct)[a-z_]*"\s*:\s*"(https?:\/\/(?![^"]*adzuna)[^"]+)"/i
      );
      if (broad) return decodeURIComponent(broad[1].replace(/\\u002F/g, "/"));
    }

    // 2. JSON-LD structured data
    for (const block of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const data = JSON.parse(block[1]) as Record<string, unknown>;
        for (const key of ["url", "sameAs", "applyUrl", "applicationUrl"]) {
          const val = data[key];
          if (typeof val === "string" && isNonAdzuna(val)) return val;
        }
      } catch { /* ignore */ }
    }

    // 3. href/src with ATS params — catches custom-domain Greenhouse/Lever
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (hasAtsParam(m[1])) return m[1];
    }

    // 4. href matching known ATS domains
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (ATS_DOMAINS.some(d => m[1].includes(d))) return m[1];
    }

    // 5. Any URL in the page that looks like a career/apply URL (heuristic)
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (isCareerUrl(m[1])) return m[1];
    }

    // 6. data-url / data-apply-url attributes
    for (const m of html.matchAll(/data-(?:href|url|apply-?url)="(https?:\/\/[^"]+)"/g)) {
      if (isNonAdzuna(m[1])) return m[1];
    }

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

  // Already a direct non-Adzuna URL — redirect immediately
  if (!url.includes("adzuna.com")) {
    return NextResponse.redirect(url);
  }

  // Try to resolve the Adzuna URL to the company's application page
  const resolved = await resolveAdzunaUrl(url);
  if (resolved) return NextResponse.redirect(resolved);

  // Final fallback: Google search scoped to the job + country so the right
  // regional posting appears first
  const country = location.split(",").pop()?.trim() ?? "";
  const query = [company, role, country, "careers apply"].filter(Boolean).join(" ");
  const fallback = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  return NextResponse.redirect(fallback);
}
