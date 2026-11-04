import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, isAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { getMenuForAdmin } from "@/lib/menu";
import { AdminMenuError, createMenuItem } from "@/lib/adminMenu";

export const dynamic = "force-dynamic";

function failure(error) {
  if (error instanceof AdminMenuError) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("[admin/menu]", error);
  return NextResponse.json({ message: "The dish could not be saved." }, { status: 500 });
}

async function admin(request, mutate = false) {
  if (mutate && !isSameOrigin(request)) {
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
  if (id) revalidatePath(`/dish/${id}`);
}

/** GET /api/admin/menu — every dish, including inactive rows, for the editor. */
export async function GET(request) {
  const gate = await admin(request);
  if (gate.error) return gate.error;
  const data = await getMenuForAdmin();
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/admin/menu — create a dish with its option groups and pairings. */
export async function POST(request) {
  const gate = await admin(request, true);
  if (gate.error) return gate.error;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Send the dish as JSON." }, { status: 400 });
    }
    const item = await createMenuItem(body, gate.user);
    revalidateMenu(item.id);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
