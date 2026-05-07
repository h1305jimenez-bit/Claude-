import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin, createApiClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest) {
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
      id: string;
      application_status?: string;
      posting_status?: string;
      follow_up_sent?: boolean;
      follow_up_message?: string;
    };

    const { id, ...updates } = body;

    const { data } = await supabaseAdmin
      .from("applications")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    return NextResponse.json({ application: data });
  } catch (err) {
    console.error("applications/update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
