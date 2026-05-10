import { NextRequest, NextResponse } from "next/server";

const ATS_DOMAINS = [
  "greenhouse.io", "lever.co", "myworkdayjobs.com", "linkedin.com/jobs",
  "smartrecruiters.com", "bamboohr.com", "workable.com", "icims.com",
  "taleo.net", "successfactors.com", "jobvite.com", "ashbyhq.com",
  "recruitee.com", "jazz.co", "breezy.hr", "applytojob.com",
  "amazon.jobs", "careers.google.com", "jobs.apple.com",
  "careers.microsoft.com", "metacareers.com", "jobs.netflix.com",
  "jobs.lever.co", "boards.greenhouse.io", "apply.workable.com",
  "careers.shopify.com", "stripe.com/jobs", "pinpointhq.com", "rippling.com/jobs",
  "oraclecloud.com", "fa.oraclecloud.com",
];

const AGGREGATORS = [
  "linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com",
  "monster.com", "careerjet.com", "simplyhired.com", "snagajob.com",
  "adzuna.com", "jobsora.com", "jora.com", "expertini.com",
  "talent.com", "neuvoo.com", "trovit.com", "jobrapido.com",
];

const ATS_PARAMS = ["gh_jid", "gh_src", "lever-origin", "lever_source", "jid"];

function isSearchResultsPage(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const serps = ["google.com", "bing.com", "yahoo.com", "duckduckgo.com"];
    if (!serps.some(s => host === s || host.endsWith("." + s))) return false;
    return u.searchParams.has("q") || u.pathname.startsWith("/search");
  } catch { return false; }
}

function isAggregator(url: string): boolean {
  return AGGREGATORS.some(a => url.includes(a));
}

function isDirectCareerUrl(url: string): boolean {
  if (!url.startsWith("http") || url.includes("adzuna.com")) return false;
  if (isSearchResultsPage(url)) return false;
  if (ATS_DOMAINS.some(d => url.includes(d))) return true;
  try {
    const u = new URL(url);
    if (ATS_PARAMS.some(p => u.searchParams.has(p))) return true;
    return /\/(jobs|careers|apply|job|position|vacancy|opening)\b/.test(u.pathname.toLowerCase());
  } catch { return false; }
}

async function resolveAdzunaUrl(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, {
      method: "GET", redirect: "follow", signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timer);
    const finalUrl = res.url;
    if (finalUrl && !finalUrl.includes("adzuna.com") && finalUrl !== url && !isSearchResultsPage(finalUrl)) return finalUrl;
    const html = await res.text();
    const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
    if (nextData) {
      const m = nextData.match(/"(?:apply_url|source_url|external_url|applyUrl|redirect_url)"\s*:\s*"(https?:\/\/(?![^"]*adzuna)[^"]+)"/);
      if (m) return decodeURIComponent(m[1].replace(/\\u002F/g, "/"));
    }
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (ATS_DOMAINS.some(d => m[1].includes(d))) return m[1];
    }
  } catch { /* fall through */ }
  finally { clearTimeout(timer); }
  return null;
}

async function searchCareerUrl(company: string, role: string, location: string): Promise<string | null> {
  const city = location.split(",")[0]?.trim() ?? "";
  const country = location.split(",").pop()?.trim() ?? "";
  const place = city && country && city !== country ? `${city} ${country}` : (country || city);
  const query = [company, role, place, "apply", "-site:linkedin.com", "-site:indeed.com", "-site:glassdoor.com"].filter(Boolean).join(" ");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      method: "GET", redirect: "follow", signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "text/html" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    for (const m of html.matchAll(/uddg=(https?[^&"'\s]+)/g)) {
      try {
        const href = decodeURIComponent(m[1]);
        if (!href.startsWith("http") || isAggregator(href) || isSearchResultsPage(href)) continue;
        return href;
      } catch { /* skip */ }
    }
  } catch { /* timeout */ }
  finally { clearTimeout(timer); }
  return null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  const company = req.nextUrl.searchParams.get("company") ?? "";
  const role = req.nextUrl.searchParams.get("role") ?? "";
  const location = req.nextUrl.searchParams.get("location") ?? "";

  const city = location.split(",")[0]?.trim() ?? "";
  const country = location.split(",").pop()?.trim() ?? "";
  const place = city && country && city !== country ? `${city} ${country}` : (country || city);
  const searchQuery = [company, role, place, "careers"].filter(Boolean).join(" ");
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

  // Already a direct career URL
  if (url && isDirectCareerUrl(url)) {
    return NextResponse.json({ resolvedUrl: url, searchQuery, googleUrl });
  }

  // Adzuna: try to extract the real apply link
  if (url && url.includes("adzuna.com")) {
    const resolved = await resolveAdzunaUrl(url);
    if (resolved && isDirectCareerUrl(resolved)) {
      return NextResponse.json({ resolvedUrl: resolved, searchQuery, googleUrl });
    }
  }

  // Smart search via DuckDuckGo
  if (company && role) {
    const found = await searchCareerUrl(company, role, location);
    if (found) return NextResponse.json({ resolvedUrl: found, searchQuery, googleUrl });
  }

  // Fallback: just return the Google search URL so at least we have something
  return NextResponse.json({ resolvedUrl: null, searchQuery, googleUrl });
}
