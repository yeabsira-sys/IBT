"use server";

import { updateTag } from "next/cache";

/**
 * Expires the cached menu and refreshes it in the same request, so the
 * "Retry" button immediately renders freshly fetched data (Next.js 16's
 * read-your-writes API for Server Actions).
 */
export async function refreshMenu() {
  updateTag("menu");
  return { ok: true };
}
