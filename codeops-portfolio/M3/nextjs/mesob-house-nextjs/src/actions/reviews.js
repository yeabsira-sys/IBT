"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  getEligibleOrderForReview,
  getReviewForUser,
  resolveMenuItemIdentifier,
} from "@/lib/reviews";

const reviewSchema = z.object({
  menuItemId: z.string().trim().min(1, "Choose a dish.").max(120),
  rating: z.coerce
    .number()
    .int()
    .min(1, "Choose a star rating.")
    .max(5, "Ratings run from one to five stars."),
  message: z
    .string()
    .trim()
    .min(3, "Write a few words about your meal.")
    .max(1200, "Keep your review under 1,200 characters."),
});

export async function submitReview(payload) {
  const user = await getSession();
  if (!user) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Please sign in to review a dish.",
    };
  }
  if (user.role !== "customer") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Reviews are submitted from customer accounts.",
    };
  }

  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: parsed.error.issues[0]?.message ?? "Check your review and try again.",
    };
  }

  const { menuItemId, rating, message } = parsed.data;
  const menuItem = await resolveMenuItemIdentifier(menuItemId);
  if (!menuItem) {
    return {
      ok: false,
      code: "INVALID",
      message: "That dish is no longer on the menu.",
    };
  }
  const [qualifyingOrder, existingReview] = await Promise.all([
    getEligibleOrderForReview(user.id, menuItem.id),
    getReviewForUser(menuItem.id, user.id),
  ]);
  if (!qualifyingOrder) {
    return {
      ok: false,
      code: "ORDER_REQUIRED",
      message:
        "Reviews open after a completed order containing this dish. Order it first, then share your experience.",
    };
  }

  // New reviews go live immediately. An edit to a hidden/pending review goes
  // back through moderation instead of silently bypassing the admin decision.
  const status =
    existingReview && existingReview.status !== "approved" ? "PENDING" : "APPROVED";

  const row = await getPrisma().review.upsert({
    where: { menuItemId_userId: { menuItemId: menuItem.id, userId: user.id } },
    update: {
      rating,
      message,
      orderId: qualifyingOrder.id,
      status,
    },
    create: {
      menuItemId: menuItem.id,
      userId: user.id,
      orderId: qualifyingOrder.id,
      rating,
      message,
      status,
    },
    include: {
      user: { select: { fullName: true } },
      menuItem: { select: { slug: true, name: true } },
    },
  });

  revalidatePath(`/dish/${menuItem.slug}`);
  revalidatePath("/menu");
  revalidatePath("/");
  revalidatePath("/api/menu");
  revalidatePath("/api/menu/specials");
  revalidatePath("/admin/reviews");

  return {
    ok: true,
    message:
      status === "APPROVED"
        ? "Thank you — your review is live."
        : "Thank you — your updated review is awaiting moderation.",
    review: {
      id: row.id,
      rating: row.rating,
      message: row.message,
      status: row.status.toLowerCase(),
      createdAt: row.createdAt.toISOString(),
      author: row.user?.fullName || user.fullName,
      verified: Boolean(row.orderId),
    },
  };
}
