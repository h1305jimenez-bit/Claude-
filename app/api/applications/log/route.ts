import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin, createApiClient } from "@/lib/supabase";

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
    const body = await req.json() as {
      job_id: string;
      kit_id?: string;
      company: string;
      role: string;
      portal: string;
    };

    const { data: application } = await supabaseAdmin.from("applications").insert({
      user_id: userId,
      job_id: body.job_id,
      kit_id: body.kit_id || null,
      company: body.company,
      role: body.role,
      portal: body.portal,
      applied_date: new Date().toISOString(),
      posting_status: "open",
      application_status: "applied",
    }).select().single();

    // Update job status to reflect applied
    await supabaseAdmin.from("jobs").update({ status: "open" }).eq("id", body.job_id);

    return NextResponse.json({ application });
  } catch (err) {
    console.error("applications/log error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
