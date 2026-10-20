import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** GET /api/orders — scoped to the session user, used by SWR polling. */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const data = await getOrdersForUser(user.id);
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
