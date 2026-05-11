import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin, createApiClient } from "@/lib/supabase";
import { anthropic } from "@/lib/anthropic";
import { randomUUID } from "crypto";

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
    const { company, role, location, url, description, posted_date } = await req.json() as {
      company: string; role: string; location?: string; url?: string; description: string; posted_date?: string;
    };

    if (!company?.trim() || !role?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "company, role, and description are required" }, { status: 400 });
    }

    // Fetch user CV + preferences for scoring
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("cv_text, target_role, target_location, seniority")
      .eq("id", userId)
      .single();

    // Insert with placeholder score first so we can return fast if scoring fails
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .insert({
        user_id: userId,
        company: company.trim(),
        role: role.trim(),
        location: location?.trim() ?? "",
        url: url?.trim() ?? "",
        description: description.trim(),
        posted_date: posted_date ?? new Date().toISOString().split("T")[0],
        adzuna_id: `manual_${randomUUID()}`,
        score: 0,
        score_rationale: "Scoring in progress…",
        portal: "manual",
        needs_login: false,
        steps: 0,
        estimated_time: "",
        status: "new",
        kit_ready: false,
        application_flow: [],
      })
      .select()
      .single();

    if (error) throw error;

    // Score the job with Claude Haiku in the background — don't block the response
    if (user && job) {
      const cvSnippet = (user.cv_text ?? "").slice(0, 2000);
      const scoringPrompt = `Score this job for the candidate. Return ONLY valid JSON.

CANDIDATE:
Role: ${user.target_role || "Not specified"}
Location: ${user.target_location || "Any"}
Seniority: ${user.seniority || "Not specified"}
CV: ${cvSnippet || "No CV uploaded"}

JOB:
Company: ${company.trim()}
Title: ${role.trim()}
Location: ${location?.trim() || "Not specified"}
Description: ${description.trim().slice(0, 1500)}

{"score":<0-100>,"rationale":"<3 sentences: overall match, specific aligned skills, main gap or caveat>","portal":"<Workday/Greenhouse/Lever/Other/Direct>","needsLogin":<bool>,"steps":<1-8>,"estimatedMinutes":<number>,"applicationFlow":[{"name":"<step>","detail":"<what happens>","fields":["<field>"]}],"tip":"<one actionable tip for this application>"}`;

      anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{ role: "user", content: scoringPrompt }],
      }).then(async (response) => {
        const text = response.content[0].type === "text" ? response.content[0].text : "";
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return;
        const parsed = JSON.parse(match[0]) as {
          score: number; rationale: string; portal: string; needsLogin: boolean;
          steps: number; estimatedMinutes: number; applicationFlow: { name: string; detail: string; fields: string[] }[]; tip: string;
        };
        await supabaseAdmin.from("jobs").update({
          score: parsed.score,
          score_rationale: parsed.rationale,
          portal: parsed.portal,
          needs_login: parsed.needsLogin,
          steps: parsed.steps,
          estimated_time: `${parsed.estimatedMinutes} min`,
          application_flow: parsed.applicationFlow ?? [],
          tip: parsed.tip ?? "",
        }).eq("id", job.id);
      }).catch(() => {
        // Non-critical — job is already saved, score stays 0
      });
    }

    return NextResponse.json({ job });
  } catch (err) {
    const msg = (err as { message?: string }).message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
