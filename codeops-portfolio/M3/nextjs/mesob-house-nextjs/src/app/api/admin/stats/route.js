import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { getAdminStats } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** GET /api/admin/stats — admin-only dashboard metrics. */
export async function GET() {
  const user = await getSession();
  if (!user)
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  if (!isAdmin(user))
    return NextResponse.json(
      { message: "Admin access required." },
      { status: 403 },
    );

  const data = await getAdminStats();
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
