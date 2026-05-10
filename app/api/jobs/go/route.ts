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
  "oraclecloud.com", "fa.oraclecloud.com", "fa.us2.oraclecloud.com",
  "sap.com/careers", "successfactors.eu", "careers.sap.com",
];

// Job aggregators to skip when picking the first search result
const AGGREGATORS = [
  "linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com",
  "monster.com", "careerjet.com", "simplyhired.com", "snagajob.com",
  "adzuna.com", "jobsora.com", "jora.com", "expertini.com",
  "talent.com", "neuvoo.com", "trovit.com", "mitula.com",
  "jobrapido.com", "bebee.com", "lensa.com", "wellfound.com",
  "builtinchicago.org", "builtinla.com", "builtinnyc.com",
];

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

function isSearchResultsPage(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const serps = ["google.com", "bing.com", "yahoo.com", "duckduckgo.com", "baidu.com", "yandex.com"];
    if (!serps.some(s => host === s || host.endsWith("." + s))) return false;
    return u.searchParams.has("q") || u.pathname.startsWith("/search");
  } catch { return false; }
}

function isCareerUrl(url: string): boolean {
  if (!isNonAdzuna(url)) return false;
  if (ATS_DOMAINS.some(d => url.includes(d))) return true;
  if (hasAtsParam(url)) return true;
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\/(jobs|careers|apply|job|position|vacancy|opening)/.test(path);
  } catch { return false; }
}

function isAggregator(url: string): boolean {
  return AGGREGATORS.some(a => url.includes(a));
}

// Fetch DuckDuckGo HTML results for one query and return the best career URL found.
// Priority: ATS-domain hit > career URL pattern > any non-aggregator result.
async function ddgSearch(query: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
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
    if (!res.ok) return null;

    const html = await res.text();
    const candidates: string[] = [];

    for (const m of html.matchAll(/uddg=(https?[^&"'\s]+)/g)) {
      try {
        const href = decodeURIComponent(m[1]);
        if (href.startsWith("http") && !isAggregator(href) && !isSearchResultsPage(href)) {
          candidates.push(href);
        }
      } catch { /* skip malformed */ }
    }

    // Prefer ATS-hosted URLs, then any career-path URL, then first result
    return candidates.find(u => ATS_DOMAINS.some(d => u.includes(d)))
      ?? candidates.find(u => isCareerUrl(u))
      ?? candidates[0]
      ?? null;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// Run multiple search queries in parallel and pick the best hit.
async function searchCareerUrl(company: string, role: string, location: string): Promise<string | null> {
  const city = location.split(",")[0]?.trim() ?? "";
  const country = location.split(",").pop()?.trim() ?? "";
  const place = city && country && city !== country ? `${city} ${country}` : (country || city);

  const queries = [
    // Most specific: quoted company + role so we get the right listing page
    `"${company}" "${role}" ${place} careers`,
    // Broader: standard terms plus explicit aggregator exclusions
    `${company} ${role} ${place} apply -site:linkedin.com -site:indeed.com -site:glassdoor.com`,
    // Fallback: just the company careers page (ignores role — finds their careers landing page)
    `${company} careers ${place}`,
  ].filter(Boolean);

  // Run all queries in parallel; return the first ATS hit, then first career-URL hit, then first result
  const results = await Promise.all(queries.map(q => ddgSearch(q)));
  return results.find(r => r && ATS_DOMAINS.some(d => r.includes(d)))
    ?? results.find(r => r && isCareerUrl(r))
    ?? results.find(r => r !== null)
    ?? null;
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

    const finalUrl = res.url;
    if (finalUrl && isNonAdzuna(finalUrl) && finalUrl !== url) return finalUrl;

    const html = await res.text();

    const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
    if (nextData) {
      const targeted = nextData.match(
        /"(?:apply_url|source_url|external_url|applyUrl|sourceUrl|externalUrl|job_url|apply_link|directUrl|direct_url|applicationUrl|redirect_url)"\s*:\s*"(https?:\/\/(?![^"]*adzuna)[^"]+)"/
      );
      if (targeted) return decodeURIComponent(targeted[1].replace(/\\u002F/g, "/"));

      const broad = nextData.match(
        /"[a-z_]*(?:apply|source|external|direct)[a-z_]*"\s*:\s*"(https?:\/\/(?![^"]*adzuna)[^"]+)"/i
      );
      if (broad) return decodeURIComponent(broad[1].replace(/\\u002F/g, "/"));
    }

    for (const block of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const data = JSON.parse(block[1]) as Record<string, unknown>;
        for (const key of ["url", "sameAs", "applyUrl", "applicationUrl"]) {
          const val = data[key];
          if (typeof val === "string" && isNonAdzuna(val)) return val;
        }
      } catch { /* ignore */ }
    }

    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (hasAtsParam(m[1])) return m[1];
    }
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (ATS_DOMAINS.some(d => m[1].includes(d))) return m[1];
    }
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (isCareerUrl(m[1])) return m[1];
    }
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

  // Already a direct career URL — redirect immediately
  if (!url.includes("adzuna.com") && !isSearchResultsPage(url)) {
    return NextResponse.redirect(url);
  }

  // Adzuna URL: try to extract the actual apply link from the page
  const resolveTarget = url.includes("adzuna.com") ? url : null;
  const resolved = resolveTarget ? await resolveAdzunaUrl(resolveTarget) : null;
  if (resolved && !isSearchResultsPage(resolved)) return NextResponse.redirect(resolved);

  // Smart search: query DuckDuckGo and take the first non-aggregator result
  // This finds the direct company career/ATS page — same as the first Google result
  if (company && role) {
    const searchUrl = await searchCareerUrl(company, role, location);
    if (searchUrl) return NextResponse.redirect(searchUrl);
  }

  // Last resort: show Google search results so the user can pick the right link
  const country = location.split(",").pop()?.trim() ?? "";
  const googleQuery = [company, role, country, "careers apply"].filter(Boolean).join(" ");
  return NextResponse.redirect(`https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`);
}
