import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest) {
  const accessToken = req.headers.get("x-access-token");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [, rawPayload] = accessToken.split(".");
  if (!rawPayload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  const padded = rawPayload + "=".repeat((4 - rawPayload.length % 4) % 4);
  const payload = JSON.parse(Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")) as { sub?: string; email?: string };
  const authUserId = payload.sub;
  const authEmail = payload.email;

  // Try lookup by auth UUID (with user's token - subject to RLS)
  const byIdRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${authUserId}&select=id,email,name&limit=1`,
    { headers: { "Authorization": `Bearer ${accessToken}`, "apikey": ANON_KEY } }
  );
  const byId = await byIdRes.json();

  // Try lookup by email (with user's token - subject to RLS)
  const byEmailRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(authEmail ?? "")}&select=id,email,name&limit=1`,
    { headers: { "Authorization": `Bearer ${accessToken}`, "apikey": ANON_KEY } }
  );
  const byEmail = await byEmailRes.json();

  // Try with service key (bypasses RLS completely)
  let serviceRows: unknown[] = [];
  let serviceError = "";
  if (SERVICE_KEY) {
    try {
      const svcRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(authEmail ?? "")}&select=id,email,name&limit=1`,
        { headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "apikey": SERVICE_KEY } }
      );
      serviceRows = await svcRes.json() as unknown[];
    } catch (e) {
      serviceError = String(e);
    }
  } else {
    serviceError = "SUPABASE_SERVICE_ROLE_KEY not set";
  }

  return NextResponse.json({
    auth: { userId: authUserId, email: authEmail },
    byId: { status: byIdRes.status, rows: byId },
    byEmail: { status: byEmailRes.status, rows: byEmail },
    serviceKey: { rows: serviceRows, error: serviceError },
  });
}
