import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { updateUserRole } from "@/lib/db";
import { ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/users/[id] — change a user's role (admins cannot demote themselves). */
export async function PATCH(request, { params }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "Cross-origin request refused." }, { status: 403 });
  }

  const user = await getSession();
  if (!user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  if (!ROLES.includes(body.role)) {
    return NextResponse.json({ message: "Choose customer, employee or admin." }, { status: 422 });
  }

  const { id } = await params;
  if (id === user.id && body.role !== "admin") {
    return NextResponse.json({ message: "You cannot remove your own admin role." }, { status: 409 });
  }

  const result = await updateUserRole(id, body.role);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: 404 });
  return NextResponse.json({ user: result.user });
}
