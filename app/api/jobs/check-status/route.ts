import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin, createApiClient } from "@/lib/supabase";
import axios from "axios";

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
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: jobs } = await supabaseAdmin
      .from("jobs")
      .select("id, url, status")
      .eq("user_id", userId)
      .neq("status", "closed")
      .or(`last_checked.is.null,last_checked.lt.${cutoff}`);

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ checked: 0 });
    }

    let closedCount = 0;
    for (const job of jobs) {
      try {
        const response = await axios.head(job.url, {
          timeout: 5000,
          maxRedirects: 3,
        });
        const status = response.status;
        await supabaseAdmin.from("jobs").update({
          status: status === 404 ? "closed" : "open",
          last_checked: new Date().toISOString(),
          ...(status === 404 ? { closed_date: new Date().toISOString() } : {}),
        }).eq("id", job.id);
        if (status === 404) closedCount++;
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 404) {
          await supabaseAdmin.from("jobs").update({
            status: "closed",
            closed_date: new Date().toISOString(),
            last_checked: new Date().toISOString(),
          }).eq("id", job.id);
          closedCount++;
        } else {
          await supabaseAdmin.from("jobs").update({
            last_checked: new Date().toISOString(),
          }).eq("id", job.id);
        }
      }
    }

    return NextResponse.json({ checked: jobs.length, closed: closedCount });
  } catch (err) {
    console.error("check-status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
