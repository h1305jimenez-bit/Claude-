import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIES, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth"];

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
  // Protect all routes except the Next.js static assets, the manifest
  // and the login/API-auth endpoints. The matcher below does that by
  // excluding the common static paths.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
