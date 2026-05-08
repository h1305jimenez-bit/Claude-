import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin, createApiClient } from "@/lib/supabase";
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
        score_rationale: "Manually added job",
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

    return NextResponse.json({ job });
  } catch (err) {
    const msg = (err as { message?: string }).message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
