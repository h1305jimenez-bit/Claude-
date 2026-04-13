import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-insecure-secret-please-change-me",
);

const OTP_COOKIE = "hec_otp";
const SESSION_COOKIE = "hec_session";
const OTP_TTL_MIN = 10;
const SESSION_TTL_DAYS = 30;

export const AUTH_COOKIES = {
  otp: OTP_COOKIE,
  session: SESSION_COOKIE,
};

export function isHecEmail(raw: string): boolean {
  return /^[^\s@]+@hec\.edu$/i.test(raw.trim());
}

export function generateOtp(): string {
  // 6 digit zero-padded numeric code
  const n = Math.floor(Math.random() * 1_000_000);
  return n.toString().padStart(6, "0");
}

export async function hashCode(code: string, email: string): Promise<string> {
  const data = new TextEncoder().encode(`${email.toLowerCase()}:${code}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface OtpPayload {
  email: string;
  codeHash: string;
}

interface SessionPayload {
  email: string;
}

export async function signOtpToken(payload: OtpPayload): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OTP_TTL_MIN}m`)
    .sign(SECRET);
}

export async function verifyOtpToken(token: string): Promise<OtpPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      email: payload.email as string,
      codeHash: payload.codeHash as string,
    };
  } catch {
    return null;
  }
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { email: payload.email as string };
  } catch {
    return null;
  }
}

export const OTP_TTL_SECONDS = OTP_TTL_MIN * 60;
export const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;
