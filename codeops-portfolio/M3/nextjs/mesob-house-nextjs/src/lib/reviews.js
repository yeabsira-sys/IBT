import "server-only";

import { cache } from "react";
import { getPrisma } from "./prisma";

const iso = (value) => (value ? new Date(value).toISOString() : null);

export function mapReview(row) {
  return {
    id: row.id,
    menuItemId: row.menuItemId,
    rating: row.rating,
    message: row.message,
    status: row.status,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    author: row.user?.fullName || "Mesob guest",
    authorEmail: row.user?.email || "",
    dishName: row.menuItem?.name || "",
    verified: Boolean(row.orderId),
  };
}

/**
 * A review is only open to a customer with a completed order containing that
 * dish. The qualifying order is stored on the review so the public page can
 * show a verified badge without re-querying order history.
 */
export const getEligibleOrderForReview = cache(async (userId, menuItemId) => {
  if (!userId || !menuItemId) return null;
  return getPrisma().order.findFirst({
    where: {
      userId,
      status: "completed",
      items: { some: { menuItemId } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
});

export const getReviewForUser = cache(async (menuItemId, userId) => {
  if (!menuItemId || !userId) return null;
  const row = await getPrisma().review.findUnique({
    where: { menuItemId_userId: { menuItemId, userId } },
    include: { user: { select: { fullName: true, email: true } } },
  });
  return row ? mapReview(row) : null;
});

export async function getReviewContext(menuItemId, userId) {
  if (!userId) {
    return { existingReview: null, eligibleOrderId: null, canReview: false };
  }
  const [existingReview, eligibleOrder] = await Promise.all([
    getReviewForUser(menuItemId, userId),
    getEligibleOrderForReview(userId, menuItemId),
  ]);
  return {
    existingReview,
    eligibleOrderId: eligibleOrder?.id ?? null,
    canReview: Boolean(eligibleOrder),
  };
}

export const getReviewSummary = cache(async (menuItemId) => {
  if (!menuItemId) return { average: 0, count: 0 };
  const row = await getPrisma().review.aggregate({
    where: { menuItemId, status: "approved" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return {
    average: Math.round(Number(row._avg.rating ?? 0) * 10) / 10,
    count: row._count._all ?? 0,
  };
});

/** Admin moderation list. `status` is optional; all statuses are returned otherwise. */
export async function listReviews({ status } = {}) {
  const rows = await getPrisma().review.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 250,
    include: {
      user: { select: { fullName: true, email: true } },
      menuItem: { select: { name: true } },
    },
  });
  return rows.map(mapReview);
}

export async function setReviewStatus(id, status) {
  const row = await getPrisma().review.update({
    where: { id },
    data: { status },
    include: {
      user: { select: { fullName: true, email: true } },
      menuItem: { select: { name: true } },
    },
  });
  return mapReview(row);
}

export async function deleteReview(id) {
  const row = await getPrisma().review.delete({
    where: { id },
    include: {
      user: { select: { fullName: true, email: true } },
      menuItem: { select: { name: true } },
    },
  });
  return mapReview(row);
}
