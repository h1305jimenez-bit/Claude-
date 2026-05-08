import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin, createApiClient } from "@/lib/supabase";
import { anthropic } from "@/lib/anthropic";
import { fetchAdzunaJobs, AdzunaJob } from "@/lib/adzuna";
import { checkRefreshLimit } from "@/lib/gating";
import type { User } from "@/lib/types";

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

    // Score each job with Claude (batch to avoid rate limits)
    const scoredJobs = [];
    for (const job of adzunaJobs.slice(0, 15)) {
      try {
        const scoringPrompt = `You are a job matching expert. Score this job for this candidate.

CANDIDATE CV:
${user.cv_text.slice(0, 3000)}

CANDIDATE PREFERENCES:
Role: ${user.target_role}
Location: ${user.target_location || "Any"}
Seniority: ${user.seniority || "Not specified"}

JOB:
Company: ${job.company?.display_name || "Unknown"}
Title: ${job.title}
Description: ${(job.description || "").slice(0, 1000)}

Return ONLY valid JSON, no other text:
{
  "score": <number 0-100>,
  "rationale": "<one sentence why>",
  "portal": "<ATS portal name: Workday/Greenhouse/Lever/Amazon Jobs/Google Careers/Email/Other>",
  "needsLogin": <boolean>,
  "steps": <number of application steps 1-8>,
  "estimatedMinutes": <number>,
  "applicationFlow": [
    { "name": "<step name>", "detail": "<what happens>", "fields": ["<field1>", "<field2>"] }
  ],
  "tip": "<one specific tip about this portal or company>"
}`;

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: scoringPrompt }],
        });

        const content = response.content[0];
        if (content.type !== "text") continue;

        let parsed: {
          score: number;
          rationale: string;
          portal: string;
          needsLogin: boolean;
          steps: number;
          estimatedMinutes: number;
          applicationFlow: { name: string; detail: string; fields: string[] }[];
          tip: string;
        };
        try {
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) continue;
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          continue;
        }

        scoredJobs.push({
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
        });
      } catch {
        // Skip individual job scoring failures
        continue;
      }
    }

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
