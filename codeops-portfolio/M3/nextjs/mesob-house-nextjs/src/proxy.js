import { NextResponse } from "next/server";
import { getSessionUserByToken } from "@/lib/db";
import { roleHome } from "@/lib/roleHome";

const SESSION_COOKIE = "mh_session";

const AUTHENTICATED_PAGE_PREFIXES = ["/account", "/orders", "/checkout"];
const CUSTOMER_ONLY_PAGE_PREFIXES = ["/orders", "/checkout"];
const STAFF_PAGE_PREFIXES = ["/kitchen", "/admin"];
const PUBLIC_PAGE_PREFIXES = ["/menu", "/dish", "/cart", "/terms", "/privacy"];
const CUSTOMER_API_PREFIXES = ["/api/orders"];
const PUBLIC_MENU_API_PREFIXES = ["/api/menu"];

const matches = (pathname, prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`);
const matchesAny = (pathname, prefixes) => prefixes.some((prefix) => matches(pathname, prefix));

const isAuthenticatedPage = (pathname) => matchesAny(pathname, AUTHENTICATED_PAGE_PREFIXES);
const isCustomerOnlyPage = (pathname) => matchesAny(pathname, CUSTOMER_ONLY_PAGE_PREFIXES);
const isStaffPage = (pathname) => matchesAny(pathname, STAFF_PAGE_PREFIXES);
const isPublicPage = (pathname) => pathname === "/" || matchesAny(pathname, PUBLIC_PAGE_PREFIXES);
const isStaffBlockedApi = (pathname) =>
  matchesAny(pathname, [...CUSTOMER_API_PREFIXES, ...PUBLIC_MENU_API_PREFIXES]);

/**
 * proxy — Next.js 16's middleware equivalent.
 *
 * This is the routing-policy layer, not the authorization layer. It verifies
 * the session so it can route by role: guests are sent to sign-in from private
 * pages, and staff are kept out of public/customer surfaces while still being
 * able to open /account to sign out. Pages and route handlers still verify the
 * session and ownership themselves.
 */
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await getSessionUserByToken(token) : null;

  if ((isAuthenticatedPage(pathname) || isStaffPage(pathname)) && !user) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isStaffPage(pathname)) {
    const adminPage = matches(pathname, "/admin");
    const wrongRole = adminPage ? user.role !== "admin" : user.role === "customer";
    if (wrongRole) {
      return NextResponse.redirect(new URL(roleHome(user.role), request.url));
    }
  }

  const staff = user?.role === "employee" || user?.role === "admin";

  if (staff && (isPublicPage(pathname) || isCustomerOnlyPage(pathname))) {
    return NextResponse.redirect(new URL(roleHome(user.role), request.url));
  }

  if (staff && isStaffBlockedApi(pathname)) {
    return NextResponse.json(
      { message: "Staff accounts use the portal. Public ordering is for customers." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/menu",
    "/menu/:path*",
    "/dish/:path*",
    "/cart",
    "/terms",
    "/privacy",
    "/account",
    "/account/:path*",
    "/orders",
    "/orders/:path*",
    "/checkout",
    "/kitchen",
    "/kitchen/:path*",
    "/admin",
    "/admin/:path*",
    "/api/menu",
    "/api/menu/:path*",
    "/api/orders",
    "/api/orders/:path*",
  ],
};
