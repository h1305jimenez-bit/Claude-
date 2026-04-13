import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const ADMIN_COOKIE = "hec_admin";
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-insecure-secret-please-change-me",
);

/** Returns true if the current request has a valid admin session cookie. */
export async function isAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.role === "admin";
  } catch {
    return false;
  }
}
