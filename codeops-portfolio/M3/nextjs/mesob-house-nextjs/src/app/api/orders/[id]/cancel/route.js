import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { cancelOrderForUser } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** POST /api/orders/[id]/cancel — owner only; mirrors the cancelOrder action. */
export async function POST(request, { params }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "Cross-origin request refused." }, { status: 403 });
  }

  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const result = await cancelOrderForUser(id, user.id);
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ message: result.message, code: result.code }, { status });
  }
  return NextResponse.json({ order: result.order });
}
