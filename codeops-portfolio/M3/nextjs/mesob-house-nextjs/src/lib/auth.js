import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionRecord,
  deleteSessionByToken,
  getSessionUserByToken,
  toSafeUser,
} from "./db";
import { roleHome } from "./roleHome";

export const SESSION_COOKIE = "mh_session";

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  ...(maxAge ? { maxAge } : {}),
});

/** Reads the raw session token from the httpOnly cookie. */
export async function getSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/**
 * The single server-side source of truth for authentication. The cookie is
 * only a token; the session row and user are looked up here, so a forged
 * cookie value cannot create a session.
 */
export async function getSession() {
  const token = await getSessionToken();
  return getSessionUserByToken(token);
}

export async function createSession(userId, { remember = false } = {}) {
  const session = await createSessionRecord(userId, { remember });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, session.token, cookieOptions(remember ? session.days * 24 * 60 * 60 : undefined));
  return session;
}

export async function destroySession() {
  const token = await getSessionToken();
  await deleteSessionByToken(token);
  (await cookies()).delete(SESSION_COOKIE);
}

export async function requirePageUser(nextPath) {
  const user = await getSession();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requirePageRole(roles, nextPath) {
  const user = await requirePageUser(nextPath);
  if (!roles.includes(user.role)) redirect(roleHome(user.role));
  return user;
}

/**
 * Customer-only pages. Staff accounts work from /kitchen or /admin, so they
 * are sent back to their portal instead of seeing customer order screens.
 */
export async function requireCustomerPage(nextPath) {
  const user = await requirePageUser(nextPath);
  if (user.role !== "customer") redirect(roleHome(user.role));
  return user;
}

export const isStaff = (user) => Boolean(user && (user.role === "employee" || user.role === "admin"));
export const isAdmin = (user) => Boolean(user && user.role === "admin");

export { toSafeUser };
