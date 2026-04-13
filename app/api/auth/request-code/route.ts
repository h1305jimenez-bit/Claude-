import { NextResponse } from "next/server";
import {
  AUTH_COOKIES,
  OTP_TTL_SECONDS,
  generateOtp,
  hashCode,
  isHecEmail,
  signOtpToken,
} from "@/lib/auth";
import { sendLoginCodeEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email || "").trim().toLowerCase();

  if (!isHecEmail(email)) {
    return NextResponse.json(
      { error: "Please use your @hec.edu email address." },
      { status: 400 },
    );
  }

  const code = generateOtp();
  const codeHash = await hashCode(code, email);
  const token = await signOtpToken({ email, codeHash });

  const result = await sendLoginCodeEmail({ to: email, code });
  if (!result.ok) {
    return NextResponse.json(
      { error: `Could not send the code: ${result.reason}` },
      { status: 502 },
    );
  }

  const res = NextResponse.json({
    ok: true,
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
  res.cookies.set(AUTH_COOKIES.otp, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OTP_TTL_SECONDS,
    path: "/",
  });
  return res;
}
