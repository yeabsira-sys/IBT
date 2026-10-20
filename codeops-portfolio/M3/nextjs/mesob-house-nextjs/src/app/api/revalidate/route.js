import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

/**
 * POST /api/revalidate — on-demand ISR. Call it from the menu backend's
 * webhook when a dish changes and every cached page refreshes immediately:
 *   curl -X POST -H "x-revalidate-secret: $REVALIDATE_SECRET" https://your-site/api/revalidate
 */
export async function POST(request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, message: "Invalid or missing secret." }, { status: 401 });
  }
  revalidateTag("menu", "max");
  return NextResponse.json({ ok: true, revalidated: "menu", at: new Date().toISOString() });
}
