import { NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { updateOrderStatus } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** PATCH /api/kitchen/orders/[id] — staff advance one order. */
export async function PATCH(request, { params }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "Cross-origin request refused." }, { status: 403 });
  }

  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  if (!isStaff(user)) return NextResponse.json({ message: "Staff access required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { id } = await params;
  const result = await updateOrderStatus(id, body.status, user);
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ message: result.message, code: result.code }, { status });
  }
  return NextResponse.json({ order: result.order });
}
