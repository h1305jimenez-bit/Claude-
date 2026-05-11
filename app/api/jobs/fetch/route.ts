import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { fetchAdzunaJobs, SUPPORTED_LOCATIONS } from "@/lib/adzuna";
import { fetchGoogleJobs } from "@/lib/serpapi";
import { fetchJoobleJobs } from "@/lib/jooble";
import { fetchJSearchJobs } from "@/lib/jsearch";
import { checkRefreshLimit } from "@/lib/gating";
import type { User } from "@/lib/types";

const ADZUNA_SUPPORTED = new Set(SUPPORTED_LOCATIONS.map(l => l.name.toLowerCase()));

export const maxDuration = 120;

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.headers.get("x-access-token");
    if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Decode JWT to get userId
    const [, rawPayload] = accessToken.split(".");
    if (!rawPayload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    const padded = rawPayload + "=".repeat((4 - rawPayload.length % 4) % 4);
    const payload = JSON.parse(Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")) as { sub?: string };
    const userId = payload.sub;
    if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 401 });

    // Fetch user via raw REST (same pattern as upload-cv which works)
    const userRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*&limit=1`,
      { headers: { "Authorization": `Bearer ${accessToken}`, "apikey": ANON_KEY } }
    );
    const userData = await userRes.json() as User[];
    const user = userData[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Check refresh limit
    const { allowed, remaining } = checkRefreshLimit(user);
    if (!allowed) {
      return NextResponse.json({ error: "daily_limit_reached", remaining: 0 }, { status: 429 });
    }

    if (!user.target_role) {
      return NextResponse.json({ error: "Set a target role in your profile first." }, { status: 400 });
    }

    // Support multiple comma-separated roles and locations
    const roles = user.target_role.split(",").map((r: string) => r.trim()).filter(Boolean);
    const locations = user.target_location
      ? user.target_location.split(",").map((l: string) => l.trim()).filter(Boolean)
      : [""];
    let adzunaError = "";
    const searchQuery = roles.slice(0, 2).join(", ") + (locations[0] ? ` in ${locations.slice(0, 2).join(", ")}` : "");

    // Simplify a role title to its last 2 meaningful words (fallback for niche titles)
    function simplifyRole(role: string): string | null {
      const words = role.replace(/[&,]/g, " ").split(/\s+/).filter(w => w.length > 2);
      if (words.length <= 2) return null;
      return words.slice(-2).join(" ");
    }

    // Fetch ALL role×location combinations in parallel from both APIs
    const combos = roles.flatMap(role => locations.map(loc => ({ role, loc })));

    const [adzunaResults, serpResults] = await Promise.all([
      // Adzuna — only for its supported countries
      Promise.allSettled(
        combos.map(async ({ role, loc }) => {
          const isWorldwide = !loc || /remote|worldwide/i.test(loc);
          const locLower = loc.toLowerCase();
          const isAdzunaSupported = isWorldwide || ADZUNA_SUPPORTED.has(locLower) ||
            [...ADZUNA_SUPPORTED].some(s => locLower.includes(s) || s.includes(locLower));

          if (!isAdzunaSupported) return [];

          let results = await fetchAdzunaJobs(role, loc);
          if (results.length === 0) {
            const simplified = simplifyRole(role);
            if (simplified) results = await fetchAdzunaJobs(simplified, loc);
          }
          if (results.length === 0 && isWorldwide) results = await fetchAdzunaJobs(role, "");
          return results;
        })
      ),
      // Jooble + JSearch + SerpAPI for locations Adzuna doesn't cover
      // Capped at 4 queries to stay within Vercel's 120s function limit
      Promise.allSettled(
        roles.slice(0, 2).flatMap(role =>
          locations
            .filter(loc => {
              const ll = loc.toLowerCase();
              return loc && !ADZUNA_SUPPORTED.has(ll) && ![...ADZUNA_SUPPORTED].some(s => ll.includes(s) || s.includes(ll));
            })
            .slice(0, 2)
            .map(async loc => {
              const [jooble, jsearch, serp] = await Promise.allSettled([
                fetchJoobleJobs(role, loc),
                fetchJSearchJobs(role, loc),
                fetchGoogleJobs(role, loc),
              ]);
              const joobleJobs = jooble.status === "fulfilled" ? jooble.value : [];
              const jsearchJobs = jsearch.status === "fulfilled" ? jsearch.value : [];
              const serpJobs = serp.status === "fulfilled" ? serp.value : [];
              return {
                jobs: [...joobleJobs, ...jsearchJobs, ...serpJobs],
                debug: {
                  loc,
                  role,
                  joobleCount: joobleJobs.length,
                  jsearchCount: jsearchJobs.length,
                  serpCount: serpJobs.length,
                  joobleError: jooble.status === "rejected" ? String(jooble.reason) : null,
                  jsearchError: jsearch.status === "rejected" ? String(jsearch.reason) : null,
                  serpError: serp.status === "rejected" ? String(serp.reason) : null,
                },
              };
            })
        )
      ),
    ]);

    // Merge all results, deduplicate by id
    const seenIds = new Set<string>();
    type AnyJob = Awaited<ReturnType<typeof fetchAdzunaJobs>>[number] | Awaited<ReturnType<typeof fetchGoogleJobs>>[number];
    const allJobs: AnyJob[] = [];

    for (const result of adzunaResults) {
      if (result.status === "rejected") { adzunaError = result.reason?.message ?? String(result.reason); continue; }
      for (const job of result.value) {
        if (!seenIds.has(job.id)) { seenIds.add(job.id); allJobs.push(job); }
      }
    }
    const worldwideDebug: unknown[] = [];
    for (const result of serpResults) {
      if (result.status === "rejected") continue;
      worldwideDebug.push(result.value.debug);
      for (const job of result.value.jobs) {
        if (!seenIds.has(job.id)) { seenIds.add(job.id); allJobs.push(job); }
      }
    }

    const adzunaCount = allJobs.length;
    // Score up to 40 jobs — all in parallel with Haiku so latency stays low
    const jobsToScore = allJobs.slice(0, 40);

    // Resolve Adzuna tracking URLs to actual company career page URLs.
    // Adzuna's redirect_url lands on their own job detail page; we parse that page's HTML
    // to find the actual "Apply" link pointing to the company ATS/career page.
    const ATS_DOMAINS = [
      "greenhouse.io", "lever.co", "myworkdayjobs.com", "linkedin.com/jobs",
      "smartrecruiters.com", "bamboohr.com", "workable.com", "icims.com",
      "taleo.net", "successfactors.com", "jobvite.com", "ashbyhq.com",
      "recruitee.com", "jazz.co", "breezy.hr", "applytojob.com",
      "jobscore.com", "pinpointhq.com", "rippling.com/jobs",
      "amazon.jobs", "careers.google.com", "jobs.apple.com",
      "careers.microsoft.com", "metacareers.com", "jobs.netflix.com",
    ];

    function extractAtsUrl(text: string): string | null {
      const urlPattern = /https?:\/\/[^\s"'<>)]+/g;
      const urls = text.match(urlPattern) ?? [];
      for (const u of urls) {
        const clean = u.replace(/[).,;]+$/, "");
        if (ATS_DOMAINS.some(d => clean.includes(d))) return clean;
      }
      return null;
    }

    async function resolveUrl(url: string, description?: string): Promise<string> {
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
            "Accept-Language": "en-US,en;q=0.5",
          },
        });
        clearTimeout(timer);
        const finalUrl = res.url;

        // Redirected cleanly away from Adzuna — reject search engine pages
        const isSERP = (u: string) => { try { const x = new URL(u); const h = x.hostname.replace(/^www\./, ""); return ["google.com","bing.com","yahoo.com","duckduckgo.com"].some(s => h === s || h.endsWith("."+s)) && (x.searchParams.has("q") || x.pathname.startsWith("/search")); } catch { return false; } };
        if (finalUrl && !finalUrl.includes("adzuna.com") && !isSERP(finalUrl) && finalUrl !== url) return finalUrl;

        // Still on Adzuna — parse the HTML for the real apply link
        const html = await res.text();

        // Strategy 1: JSON-LD structured data (most reliable)
        const jsonLdBlocks = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
        for (const block of jsonLdBlocks) {
          try {
            const inner = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
            const data = JSON.parse(inner) as Record<string, unknown>;
            const isNonAdzuna = (v: unknown) => typeof v === "string" && !v.includes("adzuna.com");
            for (const key of ["url", "sameAs", "applyUrl", "applicationUrl"]) {
              if (isNonAdzuna(data[key])) return data[key] as string;
            }
          } catch { /* ignore */ }
        }

        // Strategy 2: href attributes pointing to known ATS / career domains
        const hrefRe = /href="(https?:\/\/[^"]+)"/g;
        let m: RegExpExecArray | null;
        while ((m = hrefRe.exec(html)) !== null) {
          const href = m[1];
          if (ATS_DOMAINS.some(d => href.includes(d))) return href;
        }

        // Strategy 3: data-url / data-apply-url attributes
        const dataRe = /data-(?:href|url|apply-?url)="(https?:\/\/[^"]+)"/g;
        while ((m = dataRe.exec(html)) !== null) {
          if (!m[1].includes("adzuna.com")) return m[1];
        }

      } catch { /* fall through */ }
      finally { clearTimeout(timer); }

      // Last resort: scan the job description text for ATS URLs
      if (description) {
        const atsUrl = extractAtsUrl(description);
        if (atsUrl) return atsUrl;
      }
      return url;
    }
    const resolvedUrls = await Promise.all(jobsToScore.map(j => resolveUrl(j.redirect_url, j.description)));
    const resolvedUrlMap = new Map(jobsToScore.map((j, i) => [j.id, resolvedUrls[i]]));

    const candidateContext = `Role: ${user.target_role}
Location: ${user.target_location || "Any"}
Seniority: ${user.seniority || "Not specified"}
Background: ${(user.cv_text || "").slice(0, 1500)}`;

    // Batch scoring — 5 jobs per Claude call to stay under the 50 req/min rate limit.
    // 40 jobs → 8 batches → 8 parallel calls (vs 40 before).
    const BATCH_SIZE = 5;
    const batches: (typeof jobsToScore)[] = [];
    for (let i = 0; i < jobsToScore.length; i += BATCH_SIZE) {
      batches.push(jobsToScore.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await Promise.allSettled(
      batches.map(async (batch) => {
        const batchPrompt = `Score these ${batch.length} jobs for this candidate. Return ONLY a valid JSON array with exactly ${batch.length} objects in order.

CANDIDATE:
${candidateContext}

JOBS:
${batch.map((job, i) => `--- JOB ${i + 1} ---
Company: ${job.company?.display_name || "Unknown"}
Title: ${job.title}
Description: ${(job.description || "").slice(0, 600)}`).join("\n\n")}

Return a JSON array of ${batch.length} objects (same order as jobs above):
[{"score":<0-100>,"rationale":"<3 sentences: (1) overall match, (2) specific skills that align, (3) gap or caveat>","portal":"<Workday/Greenhouse/Lever/Other>","needsLogin":<bool>,"steps":<1-8>,"estimatedMinutes":<number>,"tip":"<one actionable tip>","careerUrl":"<direct URL to company job posting — extract from description or use known careers page. Empty string if unknown>"}]`;

        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          messages: [{ role: "user", content: batchPrompt }],
        });

        const content = response.content[0];
        if (content.type !== "text") throw new Error("no text");
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("no json array");
        const scores = JSON.parse(jsonMatch[0]) as Array<{
          score: number; rationale: string; portal: string; needsLogin: boolean;
          steps: number; estimatedMinutes: number; tip: string; careerUrl?: string;
        }>;
        return { batch, scores };
      })
    );

    const scoredJobs: {
      user_id: string; adzuna_id: string; company: string; role: string; location: string;
      score: number; score_rationale: string; portal: string; needs_login: boolean;
      steps: number; estimated_time: string; status: string; kit_ready: boolean;
      url: string; description: string; posted_date: string;
    }[] = [];
    const scoringErrors: string[] = [];

    for (const result of batchResults) {
      if (result.status === "rejected") {
        scoringErrors.push(result.reason?.message ?? String(result.reason));
        continue;
      }
      const { batch, scores } = result.value;
      for (let i = 0; i < batch.length; i++) {
        const job = batch[i];
        const parsed = scores[i];
        if (!parsed) continue;
        const claudeUrl = parsed.careerUrl;
        // Only trust Claude's URL if it points to a known ATS domain or a career-related path —
        // prevents hallucinated or unrelated URLs (e.g. job aggregators, advertiser sites) from being stored.
        const isValidCareerUrl = (() => {
          if (!claudeUrl || !claudeUrl.startsWith("http") || claudeUrl.includes("adzuna.com")) return false;
          try {
            const u = new URL(claudeUrl);
            if (ATS_DOMAINS.some(d => u.hostname.includes(d.split("/")[0]))) return true;
            const atsParams = ["gh_jid", "gh_src", "lever-origin", "lever_source", "jid"];
            if (atsParams.some(p => u.searchParams.has(p))) return true;
            return /\/(jobs|careers|apply|job|position|vacancy|opening|hiring)\b/.test(u.pathname.toLowerCase());
          } catch { return false; }
        })();
        const finalUrl = (isValidCareerUrl && claudeUrl) ? claudeUrl : (resolvedUrlMap.get(job.id) ?? job.redirect_url);

        // If the URL is still on Adzuna after all resolution attempts, build a targeted
        // DuckDuckGo "I'm Feeling Lucky" URL so the Apply button goes straight to the
        // company career page via search — no Adzuna intermediary.
        const company = job.company?.display_name || "Unknown";
        const applyUrl = finalUrl.includes("adzuna.com")
          ? `https://duckduckgo.com/?q=!ducky+${encodeURIComponent(`"${company}" "${job.title}" careers apply`)}`
          : finalUrl;
        scoredJobs.push({
          user_id: userId,
          adzuna_id: job.id,
          company,
          role: job.title,
          location: job.location?.display_name || "",
          score: parsed.score,
          score_rationale: parsed.rationale,
          portal: parsed.portal,
          needs_login: parsed.needsLogin,
          steps: parsed.steps,
          estimated_time: `${parsed.estimatedMinutes} min`,
          status: "new",
          kit_ready: false,
          url: applyUrl,
          description: job.description || "",
          posted_date: job.created,
        });
      }
    }

    // Clear stale 'new' jobs before inserting fresh ones.
    // Try DELETE with service key first; if that fails (RLS / key not set), fall back to
    // PATCH status→'stale' using the user token (UPDATE is allowed by the upsert RLS policy).
    let deleteStatus = 0;
    let deleteBody = "";
    if (SERVICE_KEY) {
      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/jobs?user_id=eq.${userId}&status=eq.new`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "apikey": SERVICE_KEY, "Prefer": "return=minimal" },
      });
      deleteStatus = delRes.status;
      if (!delRes.ok) deleteBody = await delRes.text();
    }
    // Fallback: PATCH old 'new' jobs to 'stale' so dashboard ignores them
    if (!SERVICE_KEY || deleteStatus >= 400) {
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/jobs?user_id=eq.${userId}&status=eq.new`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "apikey": ANON_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ status: "stale" }),
      });
      deleteStatus = patchRes.status;
      if (!patchRes.ok) deleteBody = await patchRes.text();
    }

    // Upsert jobs via raw REST (bypasses SDK key issues)
    let upsertStatus = 0;
    let upsertBody = "";
    if (scoredJobs.length > 0) {
      const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/jobs`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "apikey": ANON_KEY,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates",
        },
        body: JSON.stringify(scoredJobs),
      });
      upsertStatus = upsertRes.status;
      if (!upsertRes.ok) upsertBody = await upsertRes.text();
    }

    // Update refresh counter via raw REST (skip for paid — unlimited)
    if (!checkRefreshLimit(user).unlimited) {
      const today = new Date().toDateString();
      const resetDate = user.daily_refreshes_reset_at
        ? new Date(user.daily_refreshes_reset_at).toDateString()
        : null;
      const refreshPayload = today !== resetDate
        ? { daily_refreshes_used: 1, daily_refreshes_reset_at: new Date().toISOString() }
        : { daily_refreshes_used: (user.daily_refreshes_used || 0) + 1 };

      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "apikey": ANON_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(refreshPayload),
      });
    }

    return NextResponse.json({
      success: true,
      count: scoredJobs.length,
      remaining: remaining === Infinity ? 999 : remaining - 1,
      debug: { searchQuery, adzunaCount, adzunaError, worldwideDebug, joobleKeySet: !!process.env.JOOBLE_API_KEY, jsearchKeySet: !!process.env.JSEARCH_API_KEY, serpApiKeySet: !!process.env.SERPAPI_KEY, scored: scoredJobs.length, scoringErrors, deleteStatus, deleteBody, upsertStatus, upsertBody, sampleUrls: scoredJobs.slice(0, 3).map((j: { company: string; url: string }) => ({ company: j.company, url: j.url })) },
    });
  } catch (err) {
    console.error("jobs/fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
