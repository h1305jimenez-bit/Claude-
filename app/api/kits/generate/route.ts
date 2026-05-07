import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin, createApiClient } from "@/lib/supabase";
import { anthropic } from "@/lib/anthropic";
import { checkPaidAccess } from "@/lib/gating";
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
    const { jobId } = await req.json() as { jobId: string };

    const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!checkPaidAccess(user as User)) {
      return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
    }

    const { data: job } = await supabaseAdmin.from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Check if kit already exists
    const { data: existingKit } = await supabaseAdmin.from("kits").select("*").eq("job_id", jobId).eq("user_id", userId).single();
    if (existingKit) return NextResponse.json({ kit: existingKit });

    const kitPrompt = `You are an expert job application writer. Generate a complete application kit.

CANDIDATE:
Name: ${user.name || ""}
CV: ${(user.cv_text || "").slice(0, 4000)}
Education: ${user.education || ""}
LinkedIn: ${user.linkedin || ""}
Target Role: ${user.target_role || ""}
Seniority: ${user.seniority || ""}

JOB:
Company: ${job.company}
Role: ${job.role}
Location: ${job.location}
Description: ${(job.description || "").slice(0, 2000)}

Return ONLY valid JSON, no other text:
{
  "coverLetter": "<full personalized cover letter, 4-5 paragraphs>",
  "tailoredCv": "<full CV rewritten with ATS keywords from job description, proper formatting>",
  "screeningAnswers": [
    { "question": "<likely screening question>", "answer": "<tailored answer>" }
  ],
  "skillsGap": [
    { "skill": "<missing skill>", "tip": "<how to address it>" }
  ],
  "overallVerdict": "<strong/moderate/weak match and one sentence why>"
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: kitPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI returned invalid format" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      coverLetter: string;
      tailoredCv: string;
      screeningAnswers: { question: string; answer: string }[];
      skillsGap: { skill: string; tip: string }[];
      overallVerdict: string;
    };

    const kitData = {
      job_id: jobId,
      user_id: userId,
      cover_letter: parsed.coverLetter,
      tailored_cv: parsed.tailoredCv,
      personal_info: {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        linkedin: user.linkedin || "",
        location: user.target_location || "",
      },
      screening_answers: parsed.screeningAnswers,
      skills_gap: parsed.skillsGap,
      preview_data: { overallVerdict: parsed.overallVerdict },
    };

    const { data: kit } = await supabaseAdmin.from("kits").insert(kitData).select().single();

    // Mark job as kit_ready
    await supabaseAdmin.from("jobs").update({ kit_ready: true }).eq("id", jobId);

    return NextResponse.json({ kit });
  } catch (err) {
    console.error("kits/generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
