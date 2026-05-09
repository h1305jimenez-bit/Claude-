import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { fetchAdzunaJobs } from "@/lib/adzuna";
import { checkRefreshLimit } from "@/lib/gating";
import type { User } from "@/lib/types";

export const maxDuration = 60;

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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

    // Fetch jobs from Adzuna — try progressively simpler queries if needed
    let searchQuery = user.target_role;
    let adzunaError = "";
    let adzunaJobs: Awaited<ReturnType<typeof fetchAdzunaJobs>> = [];
    try {
      adzunaJobs = await fetchAdzunaJobs(searchQuery, user.target_location || "");
    } catch (e) {
      adzunaError = (e as { message?: string }).message ?? String(e);
    }

    if (!adzunaError && adzunaJobs.length === 0) {
      const simplified = user.target_role
        .replace(/[\s-]+(focused|roles?|positions?|opportunities?|specialist).*$/i, "")
        .split(/\s+(?:and|or|\/)\s+/)[0]
        .trim();
      if (simplified && simplified !== user.target_role) {
        searchQuery = simplified;
        try { adzunaJobs = await fetchAdzunaJobs(searchQuery, user.target_location || ""); } catch { /* ignore */ }
      }
    }

    if (adzunaJobs.length === 0 && !adzunaError) {
      const twoWords = user.target_role.trim().split(/\s+/).slice(0, 2).join(" ");
      if (twoWords && twoWords !== searchQuery) {
        searchQuery = twoWords;
        try { adzunaJobs = await fetchAdzunaJobs(searchQuery, user.target_location || ""); } catch { /* ignore */ }
      }
    }

    const adzunaCount = adzunaJobs.length;
    const jobsToScore = adzunaJobs.slice(0, 8);

    const candidateContext = `Role: ${user.target_role}
Location: ${user.target_location || "Any"}
Seniority: ${user.seniority || "Not specified"}
Background: ${(user.cv_text || "").slice(0, 1500)}`;

    // Score all jobs in parallel using Haiku for speed
    const results = await Promise.allSettled(
      jobsToScore.map(async (job) => {
        const scoringPrompt = `Score this job for this candidate. Return ONLY valid JSON.

CANDIDATE:
${candidateContext}

JOB:
Company: ${job.company?.display_name || "Unknown"}
Title: ${job.title}
Description: ${(job.description || "").slice(0, 800)}

JSON format:
{"score":<0-100>,"rationale":"<one sentence>","portal":"<Workday/Greenhouse/Lever/Other>","needsLogin":<bool>,"steps":<1-8>,"estimatedMinutes":<number>,"applicationFlow":[{"name":"<step>","detail":"<what>","fields":["<field>"]}],"tip":"<one tip>"}`;

        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          messages: [{ role: "user", content: scoringPrompt }],
        });

        const content = response.content[0];
        if (content.type !== "text") throw new Error("no text");
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("no json");
        const parsed = JSON.parse(jsonMatch[0]) as {
          score: number; rationale: string; portal: string; needsLogin: boolean;
          steps: number; estimatedMinutes: number;
          applicationFlow: { name: string; detail: string; fields: string[] }[];
          tip: string;
        };

        return {
          user_id: userId,
          adzuna_id: job.id,
          company: job.company?.display_name || "Unknown",
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
          url: job.redirect_url,
          description: job.description || "",
          posted_date: job.created,
          application_flow: parsed.applicationFlow,
          tip: parsed.tip,
        };
      })
    );

    const scoredJobs = results
      .filter((r): r is PromiseFulfilledResult<typeof results[0] extends PromiseFulfilledResult<infer T> ? T : never> => r.status === "fulfilled")
      .map((r) => r.value);

    const scoringErrors = results.filter(r => r.status === "rejected").map(r => (r as PromiseRejectedResult).reason?.message ?? String((r as PromiseRejectedResult).reason));

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

    // Update refresh counter via raw REST
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

    return NextResponse.json({
      success: true,
      count: scoredJobs.length,
      remaining: remaining - 1,
      debug: { searchQuery, adzunaCount, adzunaError, scored: scoredJobs.length, scoringErrors, upsertStatus, upsertBody },
    });
  } catch (err) {
    console.error("jobs/fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
