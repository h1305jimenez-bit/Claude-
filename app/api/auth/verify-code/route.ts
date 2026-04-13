import { NextResponse } from "next/server";
import {
  AUTH_COOKIES,
  SESSION_TTL_SECONDS,
  hashCode,
  signSessionToken,
  verifyOtpToken,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const code = (body.code || "").trim();
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Enter the 6-digit code we emailed you." },
      { status: 400 },
    );
  }

  const otpToken = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${AUTH_COOKIES.otp}=`))
    ?.split("=")[1];

  if (!otpToken) {
    return NextResponse.json(
      { error: "Your code expired. Request a new one." },
      { status: 400 },
    );
  }

  const payload = await verifyOtpToken(otpToken);
  if (!payload) {
    return NextResponse.json(
      { error: "Your code expired. Request a new one." },
      { status: 400 },
    );
  }

  const candidate = await hashCode(code, payload.email);
  if (candidate !== payload.codeHash) {
    return NextResponse.json({ error: "Incorrect code." }, { status: 400 });
  }

  const session = await signSessionToken({ email: payload.email });
  const res = NextResponse.json({ ok: true, email: payload.email });
  res.cookies.set(AUTH_COOKIES.session, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
  res.cookies.set(AUTH_COOKIES.otp, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return res;
}
