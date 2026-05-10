import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";

function getUserId(token: string): string | null {
  const [, raw] = token.split(".");
  if (!raw) return null;
  const padded = raw + "=".repeat((4 - raw.length % 4) % 4);
  try {
    const p = JSON.parse(Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()) as { sub?: string };
    return p.sub ?? null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const accessToken = req.headers.get("x-access-token");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getUserId(accessToken);
  if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { jobId, status } = await req.json() as { jobId?: string; status?: string };
  if (!jobId || !status) return NextResponse.json({ error: "Missing jobId or status" }, { status: 400 });

  const validStatuses = ["new", "open", "closing", "closed"];
  if (!validStatuses.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  // Verify the job belongs to this user before updating
  const authKey = SERVICE_KEY || ANON_KEY;
  const ownerRes = await fetch(
    `${SUPABASE_URL}/rest/v1/jobs?id=eq.${jobId}&user_id=eq.${userId}&select=id&limit=1`,
    { headers: { "Authorization": `Bearer ${authKey}`, "apikey": authKey } }
  );
  const owned = await ownerRes.json() as { id: string }[];
  if (!owned.length) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const now = new Date().toISOString();
  const update: Record<string, string | null> = { status };
  if (status === "closed") update.closed_date = now;

  // Use service key to bypass RLS; fall back to user token
  const writeKey = SERVICE_KEY || accessToken;
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/jobs?id=eq.${jobId}&user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${writeKey}`,
      "apikey": SERVICE_KEY || ANON_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(update),
  });

  // If closed_date column doesn't exist yet, retry with just status
  if (!patchRes.ok) {
    await fetch(`${SUPABASE_URL}/rest/v1/jobs?id=eq.${jobId}&user_id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${writeKey}`,
        "apikey": SERVICE_KEY || ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ status }),
    });
  }

  return NextResponse.json({ ok: true, status, closed_date: status === "closed" ? now : null });
}
