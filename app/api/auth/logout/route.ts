import { NextResponse } from "next/server";
import { AUTH_COOKIES } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIES.session, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return res;
}
