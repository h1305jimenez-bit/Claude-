import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";

export async function POST(req: NextRequest) {
  const steps: string[] = [];

  const accessToken = req.headers.get("x-access-token");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [, rawPayload] = accessToken.split(".");
  if (!rawPayload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  const padded = rawPayload + "=".repeat((4 - rawPayload.length % 4) % 4);
  const payload = JSON.parse(
    Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
  ) as { sub?: string; email?: string };

  const authUUID = payload.sub;
  const authEmail = payload.email;
  steps.push(`JWT decoded: uuid=${authUUID}, email=${authEmail}`);

  if (!authUUID || !authEmail) {
    return NextResponse.json({ error: "Token missing sub or email", steps }, { status: 401 });
  }

  const hasServiceKey = !!SERVICE_KEY;
  const key = SERVICE_KEY || ANON_KEY;
  steps.push(`Service key present: ${hasServiceKey}`);

  // Step 1: Try to find user by email using whichever key we have
  const findRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(authEmail)}&select=*&limit=1`,
    { headers: { "Authorization": `Bearer ${key}`, "apikey": key } }
  );
  const findStatus = findRes.status;
  const findData = await findRes.json() as Record<string, unknown>[];
  const existing = findData[0];
  steps.push(`Find by email status=${findStatus}, found=${!!existing}, rows=${findData.length}`);

  if (!existing) {
    // Row not found — either doesn't exist or RLS is blocking (service key required)
    if (!hasServiceKey) {
      steps.push("ERROR: No service key set — cannot bypass RLS to find or create user");
      return NextResponse.json({
        error: "SUPABASE_SERVICE_ROLE_KEY not set in Vercel. Add it and redeploy.",
        steps,
      }, { status: 500 });
    }

    // Create fresh row with auth UUID
    const createRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`, "apikey": key,
        "Content-Type": "application/json", "Prefer": "return=representation",
      },
      body: JSON.stringify({ id: authUUID, email: authEmail, plan: "free", name: "" }),
    });
    const createBody = await createRes.text();
    steps.push(`Create status=${createRes.status}, body=${createBody.slice(0, 200)}`);
    return NextResponse.json({ action: "created", authUUID, steps, createStatus: createRes.status });
  }

  const existingId = existing.id as string;
  if (existingId === authUUID) {
    steps.push("IDs already match — no fix needed");
    return NextResponse.json({ action: "already_correct", id: existingId, steps });
  }

  steps.push(`ID mismatch: db=${existingId} auth=${authUUID}`);

  // Step 2: Try PATCH (update primary key) — works if no FK constraints
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(authEmail)}`,
    {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${key}`, "apikey": key,
        "Content-Type": "application/json", "Prefer": "return=representation",
      },
      body: JSON.stringify({ id: authUUID }),
    }
  );
  const patchBody = await patchRes.text();
  steps.push(`PATCH id status=${patchRes.status}, body=${patchBody.slice(0, 300)}`);

  if (patchRes.status === 200 || patchRes.status === 204) {
    return NextResponse.json({ action: "patched", oldId: existingId, newId: authUUID, steps });
  }

  // Step 3: PATCH failed — try delete + reinsert
  steps.push("PATCH failed, trying delete + reinsert");

  const deleteRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(authEmail)}`,
    {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${key}`, "apikey": key, "Prefer": "return=minimal" },
    }
  );
  steps.push(`DELETE status=${deleteRes.status}`);

  const insertBody = { ...existing, id: authUUID };
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`, "apikey": key,
      "Content-Type": "application/json", "Prefer": "return=minimal",
    },
    body: JSON.stringify(insertBody),
  });
  const insertBodyText = await insertRes.text();
  steps.push(`INSERT status=${insertRes.status}, body=${insertBodyText.slice(0, 200)}`);

  if (insertRes.status === 201) {
    return NextResponse.json({ action: "reinserted", oldId: existingId, newId: authUUID, steps });
  }

  return NextResponse.json({ action: "failed", steps, error: "All fix attempts failed" }, { status: 500 });
}
