import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIES, verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const token = cookies().get(AUTH_COOKIES.session)?.value;
  if (!token) return NextResponse.json({ email: null });
  const payload = await verifySessionToken(token);
  return NextResponse.json({ email: payload?.email ?? null });
}
