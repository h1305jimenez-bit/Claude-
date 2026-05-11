import { NextRequest, NextResponse } from "next/server";
import type { User } from "@/lib/types";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-access-token, content-type",
};

function getUserFromToken(token: string): { userId: string; email: string } | null {
  try {
    const parts = token.trim().split(".");
    if (parts.length < 2) return null;
    const raw = parts[1];
    const padded = raw + "=".repeat((4 - raw.length % 4) % 4);
    const decoded = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    const p = JSON.parse(decoded) as Record<string, unknown>;
    const userId = (p.sub ?? p.user_id ?? p.userId) as string | undefined;
    if (!userId) return null;
    // Email may live at top-level or inside user_metadata / app_metadata
    const meta = (p.user_metadata ?? p.app_metadata ?? {}) as Record<string, unknown>;
    const email = ((p.email ?? meta.email ?? "") as string).trim();
    return { userId, email };
  } catch { return null; }
}

async function sbFetch(filter: string, authKey: string, apiKey: string): Promise<User | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?${filter}&select=*&limit=1`,
      { headers: { "Authorization": `Bearer ${authKey}`, "apikey": apiKey } }
    );
    if (!res.ok) return null;
    const body = await res.json();
    const rows = Array.isArray(body) ? body : [];
    return (rows[0] as User) ?? null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-access-token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const jwt = getUserFromToken(token);
  if (!jwt) return NextResponse.json({ error: "Invalid token" }, { status: 401, headers: CORS });

  const svcKey = SERVICE_KEY || token;
  const apiKey = SERVICE_KEY || ANON_KEY;

  // 1. Normal path: lookup by UUID
  let user = await sbFetch(`id=eq.${jwt.userId}`, svcKey, apiKey);

  // 2. ID mismatch fallback: lookup by email (only works if service key is set or RLS allows email lookup)
  if (!user && jwt.email) {
    user = await sbFetch(`email=eq.${encodeURIComponent(jwt.email)}`, svcKey, apiKey);

    // 3. If found by email but ID is wrong, repair it in-place so next lookup works normally
    if (user && user.id !== jwt.userId && SERVICE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(jwt.email)}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${SERVICE_KEY}`,
            "apikey": SERVICE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ id: jwt.userId }),
        });
      } catch { /* non-critical — return user anyway */ }
    }
  }

  // 4. No row at all + service key: create a minimal profile so the extension can connect
  if (!user && SERVICE_KEY && jwt.email) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "apikey": SERVICE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ id: jwt.userId, email: jwt.email, plan: "free", name: "" }),
      });
      user = await sbFetch(`id=eq.${jwt.userId}`, SERVICE_KEY, SERVICE_KEY);
    } catch { /* fall through */ }
  }

  if (!user) {
    return NextResponse.json(
      {
        error: "User not found. Open ApplyPilot in a tab, log in, then try connecting again.",
        debug: {
          userId: jwt.userId,
          email: jwt.email || "(none in token)",
          serviceKey: !!SERVICE_KEY,
        },
      },
      { status: 404, headers: CORS }
    );
  }

  return NextResponse.json({
    user: {
      name: user.name,
      email: user.email ?? jwt.email,
      phone: user.phone,
      linkedin: user.linkedin,
      education: user.education,
      target_role: user.target_role,
      target_location: user.target_location,
      seniority: user.seniority,
      work_authorization: user.work_authorization,
      salary_expectation: user.salary_expectation,
      cv_url: user.cv_url,
      cv_text: (user.cv_text ?? "").slice(0, 4000),
    },
  }, { headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
