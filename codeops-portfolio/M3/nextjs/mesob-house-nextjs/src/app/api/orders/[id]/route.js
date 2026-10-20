import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOrderForUser } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** GET /api/orders/[id] — the id is always combined with the session user id. */
export async function GET(_request, { params }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const order = await getOrderForUser(user.id, id);
  if (!order) return NextResponse.json({ message: "Order not found." }, { status: 404 });

  return NextResponse.json({ order }, { headers: { "Cache-Control": "no-store" } });
}
