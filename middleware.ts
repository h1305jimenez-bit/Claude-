import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIES, verifySessionToken } from "@/lib/auth";

// Paths that bypass the student OTP login. `/admin` has its own password.
const PUBLIC_PATHS = ["/login", "/api/auth", "/admin", "/api/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = req.cookies.get(AUTH_COOKIES.session)?.value;
  const payload = session ? await verifySessionToken(session) : null;

  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
