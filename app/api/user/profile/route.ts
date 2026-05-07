import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin, createApiClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
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

    const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", session.user.id).single();
    return NextResponse.json({ user });
  } catch (err) {
    console.error("user/profile GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const updates = await req.json() as Record<string, string | number | boolean | null>;
    const { data: user } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", session.user.id)
      .select()
      .single();

    return NextResponse.json({ user });
  } catch (err) {
    console.error("user/profile PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
