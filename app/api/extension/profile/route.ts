import { NextRequest, NextResponse } from "next/server";
import type { User } from "@/lib/types";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";

function getUserFromToken(token: string): { userId: string; email: string } | null {
  try {
    // Trim whitespace/newlines that can sneak in via clipboard copy
    const parts = token.trim().split(".");
    if (parts.length < 2) return null;
    const raw = parts[1];
    const padded = raw + "=".repeat((4 - raw.length % 4) % 4);
    const decoded = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    const p = JSON.parse(decoded) as Record<string, unknown>;
    // Supabase uses "sub"; fall back to alternative claim names
    const userId = (p.sub ?? p.user_id ?? p.userId) as string | undefined;
    if (!userId) return null;
    return { userId, email: (p.email as string) ?? "" };
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  // Allow Chrome extension cross-origin requests
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "x-access-token, content-type",
  };

  const token = req.headers.get("x-access-token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });

  const jwt = getUserFromToken(token);
  if (!jwt) return NextResponse.json({ error: "Invalid token" }, { status: 401, headers });

  // Use service key to bypass RLS; fall back to user's own token
  const authKey = SERVICE_KEY || token;
  const apiKey = SERVICE_KEY || ANON_KEY;

  async function fetchUser(filter: string): Promise<User | null> {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?${filter}&select=*&limit=1`,
      { headers: { "Authorization": `Bearer ${authKey}`, "apikey": apiKey } }
    );
    if (!res.ok) return null;
    const body = await res.json();
    const rows = Array.isArray(body) ? body : [];
    return (rows[0] as User) ?? null;
  }

  // Primary lookup by UUID (the normal path)
  let user = await fetchUser(`id=eq.${jwt.userId}`);

  // Fallback: some accounts have a mismatched id — try email lookup
  if (!user && jwt.email) {
    user = await fetchUser(`email=eq.${encodeURIComponent(jwt.email)}`);
  }

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404, headers });

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
  }, { headers });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "x-access-token, content-type",
    },
  });
}
