import { NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { getKitchenOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** GET /api/kitchen/orders — employee/admin active queue. */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  if (!isStaff(user)) return NextResponse.json({ message: "Staff access required." }, { status: 403 });

  const data = await getKitchenOrders();
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
