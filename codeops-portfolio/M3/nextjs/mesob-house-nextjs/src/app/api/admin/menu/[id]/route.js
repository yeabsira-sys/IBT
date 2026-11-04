import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, isAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { AdminMenuError, deactivateMenuItem, updateMenuItem } from "@/lib/adminMenu";

export const dynamic = "force-dynamic";

function failure(error) {
  if (error instanceof AdminMenuError) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("[admin/menu/:id]", error);
  return NextResponse.json({ message: "The dish could not be saved." }, { status: 500 });
}

async function admin(request) {
  if (!isSameOrigin(request)) {
    return { error: NextResponse.json({ message: "Cross-origin request refused." }, { status: 403 }) };
  }
  const user = await getSession();
  if (!user) return { error: NextResponse.json({ message: "Sign in required." }, { status: 401 }) };
  if (!isAdmin(user)) return { error: NextResponse.json({ message: "Admin access required." }, { status: 403 }) };
  return { user };
}

function revalidateMenu(id) {
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/api/menu");
  revalidatePath("/api/menu/specials");
  revalidatePath("/admin/menu");
  revalidatePath(`/dish/${id}`);
}

/** PATCH /api/admin/menu/[id] — replace the editable dish record. */
export async function PATCH(request, { params }) {
  const gate = await admin(request);
  if (gate.error) return gate.error;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Send the dish as JSON." }, { status: 400 });
    }
    const { id } = await params;
    const item = await updateMenuItem(id, body, gate.user);
    revalidateMenu(id);
    return NextResponse.json({ item });
  } catch (error) {
    return failure(error);
  }
}

/** DELETE /api/admin/menu/[id] — soft delete so historical receipts keep their dish. */
export async function DELETE(request, { params }) {
  const gate = await admin(request);
  if (gate.error) return gate.error;

  try {
    const { id } = await params;
    const item = await deactivateMenuItem(id, gate.user);
    revalidateMenu(id);
    return NextResponse.json({ item });
  } catch (error) {
    return failure(error);
  }
}
