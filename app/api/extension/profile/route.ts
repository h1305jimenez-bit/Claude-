import { NextRequest, NextResponse } from "next/server";
import type { User } from "@/lib/types";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getUserFromToken(token: string): { userId: string; email: string } | null {
  const [, raw] = token.split(".");
  if (!raw) return null;
  const padded = raw + "=".repeat((4 - raw.length % 4) % 4);
  try {
    const p = JSON.parse(Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()) as { sub?: string; email?: string };
    if (!p.sub) return null;
    return { userId: p.sub, email: p.email ?? "" };
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

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${jwt.userId}&select=*&limit=1`,
    { headers: { "Authorization": `Bearer ${token}`, "apikey": ANON_KEY } }
  );
  const rows = await res.json() as User[];
  const user = rows[0];
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
