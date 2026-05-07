import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin, createApiClient } from "@/lib/supabase";
import { anthropic } from "@/lib/anthropic";
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
    const { applicationId } = await req.json() as { applicationId: string };

    const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
    const { data: application } = await supabaseAdmin.from("applications").select("*").eq("id", applicationId).eq("user_id", userId).single();

    if (!user || !application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const daysSinceApplied = Math.floor(
      (Date.now() - new Date(application.applied_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    const followUpPrompt = `Write a short, professional follow-up email for a job application with no response.

Applicant: ${(user as User).name || "the applicant"}
Company: ${application.company}
Role: ${application.role}
Days since applied: ${daysSinceApplied}

Return ONLY valid JSON:
{
  "subject": "<email subject line>",
  "body": "<email body, 3-4 sentences, professional and direct>"
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: followUpPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as { subject: string; body: string };
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("follow-up error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
