import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin, createApiClient } from "@/lib/supabase";
import { anthropic } from "@/lib/anthropic";
import { fetchAdzunaJobs, AdzunaJob } from "@/lib/adzuna";
import { checkRefreshLimit } from "@/lib/gating";
import type { User } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createApiClient(
      () => cookieStore.getAll(),
      (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          );
        } catch {}
      }
    );
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Check refresh limit
    const { allowed, remaining } = checkRefreshLimit(user as User);
    if (!allowed) {
      return NextResponse.json({ error: "daily_limit_reached", remaining: 0 }, { status: 429 });
    }

    if (!user.target_role) {
      return NextResponse.json({ error: "Set a target role in your profile first." }, { status: 400 });
    }

    // Fetch jobs from Adzuna
    const adzunaJobs = await fetchAdzunaJobs(user.target_role, user.target_location || "");
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

    // Upsert jobs (avoid duplicates by adzuna_id)
    if (scoredJobs.length > 0) {
      await supabaseAdmin.from("jobs").upsert(scoredJobs, {
        onConflict: "adzuna_id",
        ignoreDuplicates: false,
      });
    }

    // Update refresh counter
    const today = new Date().toDateString();
    const resetDate = user.daily_refreshes_reset_at
      ? new Date(user.daily_refreshes_reset_at).toDateString()
      : null;

    if (today !== resetDate) {
      await supabaseAdmin.from("users").update({
        daily_refreshes_used: 1,
        daily_refreshes_reset_at: new Date().toISOString(),
      }).eq("id", userId);
    } else {
      await supabaseAdmin.from("users").update({
        daily_refreshes_used: (user.daily_refreshes_used || 0) + 1,
      }).eq("id", userId);
    }

    return NextResponse.json({
      success: true,
      count: scoredJobs.length,
      remaining: remaining - 1,
    });
  } catch (err) {
    console.error("jobs/fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
