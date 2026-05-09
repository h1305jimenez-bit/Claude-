import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getUserFromToken(accessToken: string): { userId: string; email: string } | null {
  const [, rawPayload] = accessToken.split(".");
  if (!rawPayload) return null;
  const padded = rawPayload + "=".repeat((4 - rawPayload.length % 4) % 4);
  try {
    const payload = JSON.parse(
      Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
    ) as { sub?: string; email?: string };
    if (!payload.sub) return null;
    return { userId: payload.sub, email: payload.email ?? "" };
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const accessToken = req.headers.get("x-access-token");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const jwt = getUserFromToken(accessToken);
  if (!jwt) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${jwt.userId}&select=*&limit=1`,
    { headers: { "Authorization": `Bearer ${accessToken}`, "apikey": ANON_KEY } }
  );
  const data = await res.json() as unknown[];
  return NextResponse.json({ user: data[0] ?? null });
}

export async function PATCH(req: NextRequest) {
  const accessToken = req.headers.get("x-access-token");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const jwt = getUserFromToken(accessToken);
  if (!jwt) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const updates = await req.json() as Record<string, unknown>;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${jwt.userId}`,
    {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "apikey": ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(updates),
    }
  );

  if (res.status === 204 || res.status === 200) {
    return NextResponse.json({ success: true });
  }
  const body = await res.text();
  return NextResponse.json({ error: body }, { status: 500 });
}
