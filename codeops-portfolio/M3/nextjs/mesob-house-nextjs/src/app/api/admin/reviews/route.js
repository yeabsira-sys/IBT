import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { listReviews } from "@/lib/reviews";

export const dynamic = "force-dynamic";

/** GET /api/admin/reviews?status=approved — moderation queue. */
export async function GET(request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });

  const status = new URL(request.url).searchParams.get("status");
  if (status && !["pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ message: "Unknown review status." }, { status: 422 });
  }

  const data = await listReviews({ status: status || undefined });
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
