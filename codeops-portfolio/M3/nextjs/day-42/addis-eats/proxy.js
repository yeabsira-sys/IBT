import { NextResponse } from "next/server";

export function proxy(request) {
  const pathname = request.nextUrl.pathname;
  const session = request.cookies.get("session")?.value;

  if (!session) {
    const signInUrl = new URL("/signin", request.url);

    signInUrl.searchParams.set("next", pathname + request.nextUrl.search);

    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/checkout/:path*", "/orders/:path*", "/kitchen/:path*"],
};
