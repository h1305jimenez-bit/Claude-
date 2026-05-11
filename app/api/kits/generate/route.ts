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

    if (!user.cv_text) {
      return NextResponse.json({ error: "cv_required" }, { status: 400 });
    }

    const { data: job } = await supabaseAdmin.from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Check if kit already exists
    const { data: existingKit } = await supabaseAdmin.from("kits").select("*").eq("job_id", jobId).eq("user_id", userId).single();
    if (existingKit) return NextResponse.json({ kit: existingKit });

    const kitPrompt = `You are an expert job application coach. Generate a complete, highly tailored application kit for this candidate and job.

CANDIDATE PROFILE:
Name: ${user.name || ""}
Email: ${user.email || ""}
Phone: ${user.phone || ""}
LinkedIn: ${user.linkedin || ""}
Target Role: ${user.target_role || ""}
Seniority: ${user.seniority || ""}
Education: ${user.education || ""}
Work Authorization: ${user.work_authorization || ""}
CV / Background:
${(user.cv_text || "No CV provided").slice(0, 4000)}

JOB POSTING:
Company: ${job.company}
Role: ${job.role}
Location: ${job.location}
Description:
${(job.description || "No description available").slice(0, 2500)}

Generate ONLY a valid JSON object with these exact keys:

{
  "coverLetter": "<A professional cover letter, 4-5 paragraphs. Opening paragraph: enthusiastic hook mentioning the specific role and company. Second paragraph: why you are uniquely qualified referencing 2-3 specific requirements from the job description and your matching experience. Third paragraph: a specific achievement or project from your background that directly relates to this role. Fourth paragraph: cultural fit and genuine interest in the company. Closing: call to action and thank you. Do NOT include [Candidate Name] or address headers — start directly with the salutation like 'Dear Hiring Manager,'>",
  "tailoredCv": "<Full CV rewritten to highlight experience most relevant to this role. Structure: PROFESSIONAL SUMMARY (3-4 lines mirroring language from the job description) | WORK EXPERIENCE (reordered/reworded to lead with most relevant experience, strong action verbs, quantify achievements) | EDUCATION | SKILLS (keywords directly from the job description that the candidate has). Use plain text, ALL CAPS for section headers, no special characters>",
  "screeningAnswers": [
    { "question": "<specific likely screening question for this exact role at this company>", "answer": "<tailored answer in STAR format where applicable, referencing the candidate's actual background, 3-5 sentences>" },
    { "question": "...", "answer": "..." }
  ],
  "skillsGap": [
    { "skill": "<skill mentioned in job description that candidate lacks or could strengthen>", "tip": "<specific actionable tip to address this gap, e.g. a certification, project, or talking point>" }
  ],
  "overallVerdict": "<One sentence: strong/moderate/weak match and the single most important reason>"
}

Generate 6-8 screening questions. Focus on questions actually asked for this type of role (behavioral, technical, situational).`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
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
