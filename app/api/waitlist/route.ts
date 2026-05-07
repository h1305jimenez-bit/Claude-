import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email: string };
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    await supabaseAdmin.from("waitlist").upsert({ email }, { onConflict: "email" });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("waitlist error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { count } = await supabaseAdmin
      .from("waitlist")
      .select("*", { count: "exact", head: true });
    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
