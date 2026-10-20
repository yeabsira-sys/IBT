import { NextResponse } from "next/server";

const SESSION_COOKIE = "mh_session";

/**
 * proxy — Next.js 16's middleware equivalent.
 *
 * This layer only proves that a session cookie exists. It deliberately does
 * not try to verify the session: the cookie is an opaque token and the user
 * row is checked again in every private page and action. That separation is
 * what the three attacks in AUTH.md test.
 */
export function proxy(request) {
  const { pathname } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE);

  const protectedRoute =
    pathname.startsWith("/account") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/kitchen") ||
    pathname.startsWith("/admin");

  if (protectedRoute && !signedIn) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/orders/:path*",
    "/checkout/:path*",
    "/kitchen/:path*",
    "/admin/:path*",
  ],
};
