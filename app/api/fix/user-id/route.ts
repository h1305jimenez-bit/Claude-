import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";

export async function POST(req: NextRequest) {
  const accessToken = req.headers.get("x-access-token");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Extract auth UUID and email from JWT
  const [, rawPayload] = accessToken.split(".");
  if (!rawPayload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  const padded = rawPayload + "=".repeat((4 - rawPayload.length % 4) % 4);
  const payload = JSON.parse(Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")) as { sub?: string; email?: string };
  const authUUID = payload.sub;
  const authEmail = payload.email;
  if (!authUUID || !authEmail) return NextResponse.json({ error: "Token missing sub or email" }, { status: 401 });

  const key = SERVICE_KEY || ANON_KEY;

  // Find user by email (bypasses id mismatch)
  const findRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(authEmail)}&select=id,email&limit=1`,
    { headers: { "Authorization": `Bearer ${key}`, "apikey": key } }
  );
  const findData = await findRes.json() as { id: string; email: string }[];
  const existing = findData[0];

  if (!existing) {
    // No row at all — create one with the correct auth UUID
    const createRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "apikey": key,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ id: authUUID, email: authEmail, plan: "free", name: "" }),
    });
    return NextResponse.json({
      action: "created",
      authUUID,
      status: createRes.status,
    });
  }

  if (existing.id === authUUID) {
    return NextResponse.json({ action: "already_correct", id: existing.id });
  }

  // ID mismatch — update to correct auth UUID
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(authEmail)}`,
    {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${key}`,
        "apikey": key,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ id: authUUID }),
    }
  );

  return NextResponse.json({
    action: "fixed",
    oldId: existing.id,
    newId: authUUID,
    patchStatus: patchRes.status,
  });
}
