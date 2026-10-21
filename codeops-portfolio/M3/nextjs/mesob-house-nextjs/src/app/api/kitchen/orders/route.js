import { NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { getKitchenOverview } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** GET /api/kitchen/orders — employee/admin active queue. */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  if (!isStaff(user)) return NextResponse.json({ message: "Staff access required." }, { status: 403 });

  const { orders, charts } = await getKitchenOverview();
  return NextResponse.json({ data: orders, charts }, { headers: { "Cache-Control": "no-store" } });
}
