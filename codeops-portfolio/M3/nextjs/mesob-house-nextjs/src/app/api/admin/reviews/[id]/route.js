import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, isAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { deleteReview, setReviewStatus } from "@/lib/reviews";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "approved", "rejected"];

function revalidateReview(menuItemId) {
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/api/menu");
  revalidatePath("/api/menu/specials");
  revalidatePath("/admin/reviews");
  if (menuItemId) revalidatePath(`/dish/${menuItemId}`);
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

/** PATCH /api/admin/reviews/[id] — approve, reject or return a review to pending. */
export async function PATCH(request, { params }) {
  const gate = await admin(request);
  if (gate.error) return gate.error;

  const body = await request.json().catch(() => ({}));
  if (!body || typeof body !== "object" || !STATUSES.includes(body.status)) {
    return NextResponse.json({ message: "Choose pending, approved or rejected." }, { status: 422 });
  }

  try {
    const { id } = await params;
    const review = await setReviewStatus(id, body.status);
    revalidateReview(review.menuItemId);
    return NextResponse.json({ review });
  } catch (error) {
    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Review not found." }, { status: 404 });
    }
    console.error("[admin/reviews/:id]", error);
    return NextResponse.json(
      { message: "The review could not be updated." },
      { status: 500 },
    );
  }
}

/** DELETE /api/admin/reviews/[id] — permanently remove a review. */
export async function DELETE(request, { params }) {
  const gate = await admin(request);
  if (gate.error) return gate.error;

  try {
    const { id } = await params;
    const review = await deleteReview(id);
    revalidateReview(review.menuItemId);
    return NextResponse.json({ review });
  } catch (error) {
    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Review not found." }, { status: 404 });
    }
    console.error("[admin/reviews/:id]", error);
    return NextResponse.json(
      { message: "The review could not be deleted." },
      { status: 500 },
    );
  }
}
