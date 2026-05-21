import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin, createApiClient } from "@/lib/supabase";
import { anthropic, callAnthropic, AiBusyError } from "@/lib/anthropic";

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
    const { jobId } = await req.json() as { jobId: string };
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const [jobRes, userRes] = await Promise.all([
      supabaseAdmin.from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single(),
      supabaseAdmin.from("users").select("cv_text, target_role, education, seniority").eq("id", userId).single(),
    ]);

    if (!jobRes.data) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const job = jobRes.data;
    const userData = userRes.data;

    const msg = await callAnthropic(() => anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Analyze this job description and generate structured insights for a job applicant.

Job: ${job.role} at ${job.company}${job.location ? ` (${job.location})` : ""}

Job Description:
${job.description.substring(0, 5000)}

Applicant background (CV excerpt):
${userData?.cv_text ? userData.cv_text.substring(0, 2000) : "Not provided"}

Return ONLY a valid JSON object with exactly these keys:
{
  "key_skills": [{"skill": string, "required": boolean, "description": string}],
  "company_mission": string,
  "word_cloud": [{"word": string, "count": number}],
  "gap_analysis": [{"skill": string, "have": boolean, "gap_level": "strong"|"partial"|"missing", "action": string}],
  "suggested_insights": [{"title": string, "content": string}],
  "research_topics": [{"topic": string, "why": string}]
}

Rules:
- key_skills: exactly 5 items, most important skills from the JD
- company_mission: 1-2 sentences extracted or inferred from the JD
- word_cloud: top 15 significant terms/phrases from JD (exclude stop words), count = relative frequency 1-10
- gap_analysis: 6 skills — assess whether the applicant has them based on their CV
- suggested_insights: 3 ready-to-use talking points the applicant can include in a cover letter
- research_topics: 3 topics the applicant should research before applying`,
      }],
    }));

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Failed to parse insights from Claude" }, { status: 500 });

    const insights = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const { data: saved, error: upsertErr } = await supabaseAdmin
      .from("job_insights")
      .upsert(
        { job_id: jobId, user_id: userId, ...insights, generated_at: new Date().toISOString() },
        { onConflict: "job_id" }
      )
      .select()
      .single();

    if (upsertErr) throw upsertErr;

    return NextResponse.json({ insights: saved });
  } catch (err) {
    if (err instanceof AiBusyError) return NextResponse.json({ error: "ai_busy" }, { status: 429 });
    const msg = (err as { message?: string }).message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
