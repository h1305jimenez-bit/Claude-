import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";

export async function POST(req: NextRequest) {
  const accessToken = req.headers.get("x-access-token");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [, rawPayload] = accessToken.split(".");
  if (!rawPayload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  const padded = rawPayload + "=".repeat((4 - rawPayload.length % 4) % 4);
  const payload = JSON.parse(
    Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
  ) as { email?: string };
  const authEmail = payload.email;
  if (!authEmail) return NextResponse.json({ error: "No email in token" }, { status: 401 });

  const key = SERVICE_KEY || ANON_KEY;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(authEmail)}`,
    {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${key}`,
        "apikey": key,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ daily_refreshes_used: 0, daily_refreshes_reset_at: null }),
    }
  );

  if (res.status === 204 || res.status === 200) {
    return NextResponse.json({ success: true });
  }
  const body = await res.text();
  return NextResponse.json({ error: body }, { status: 500 });
}
