import "server-only";

import { cache } from "react";
import { getPrisma } from "./prisma";

const iso = (value) => (value ? new Date(value).toISOString() : null);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REVIEW_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"]);

function normaliseStatus(status) {
  if (!status) return undefined;
  const value = String(status).trim().toUpperCase();
  if (!REVIEW_STATUSES.has(value)) {
    throw new Error(`Unknown review status: ${status}`);
  }
  return value;
}

export function mapReview(row) {
  return {
    id: row.id,
    menuItemId: row.menuItem?.slug ?? row.menuItemId,
    menuItemUuid: row.menuItemId,
    rating: row.rating,
    message: row.message,
    status: String(row.status).toLowerCase(),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    author: row.user?.fullName || "Mesob guest",
    authorEmail: row.user?.email || "",
    dishName: row.menuItem?.name || "",
    verified: Boolean(row.orderId),
  };
}

const defaultRestaurantId = cache(async () => {
  const slug = process.env.MESOB_RESTAURANT_SLUG || "mesob-house";
  const restaurant = await getPrisma().restaurant.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { id: true },
  });
  if (!restaurant) {
    throw new Error(
      `No active restaurant found for slug "${slug}". Run npm run db:seed.`,
    );
  }
  return restaurant.id;
});

/**
 * Public dish links carry the slug. Admin records carry UUIDs. Resolve either
 * form once so every review query can use the canonical UUID.
 */
export const resolveMenuItemIdentifier = cache(async (identifier) => {
  if (!identifier) return null;
  const prisma = getPrisma();
  if (UUID_RE.test(identifier)) {
    return prisma.menuItem.findFirst({
      where: { id: identifier, deletedAt: null },
      select: { id: true, slug: true, name: true },
    });
  }
  const restaurantId = await defaultRestaurantId();
  return prisma.menuItem.findFirst({
    where: { restaurantId, slug: identifier, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
});

/**
 * A review is only open to a customer with a completed order containing that
 * dish. The qualifying order is stored on the review so the public page can
 * show a verified badge without re-querying order history.
 */
export const getEligibleOrderForReview = cache(
  async (userId, menuItemIdentifier) => {
    if (!userId || !menuItemIdentifier) return null;
    const menuItem = await resolveMenuItemIdentifier(menuItemIdentifier);
    if (!menuItem) return null;
    return getPrisma().order.findFirst({
      where: {
        userId,
        status: "COMPLETED",
        items: { some: { menuItemId: menuItem.id } },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });
  },
);

export const getReviewForUser = cache(
  async (menuItemIdentifier, userId) => {
    if (!menuItemIdentifier || !userId) return null;
    const menuItem = await resolveMenuItemIdentifier(menuItemIdentifier);
    if (!menuItem) return null;
    const row = await getPrisma().review.findUnique({
      where: { menuItemId_userId: { menuItemId: menuItem.id, userId } },
      include: {
        user: { select: { fullName: true, email: true } },
        menuItem: { select: { name: true, slug: true } },
      },
    });
    return row ? mapReview(row) : null;
  },
);

export async function getReviewContext(menuItemIdentifier, userId) {
  if (!userId) {
    return { existingReview: null, eligibleOrderId: null, canReview: false };
  }
  const [existingReview, eligibleOrder] = await Promise.all([
    getReviewForUser(menuItemIdentifier, userId),
    getEligibleOrderForReview(userId, menuItemIdentifier),
  ]);
  return {
    existingReview,
    eligibleOrderId: eligibleOrder?.id ?? null,
    canReview: Boolean(eligibleOrder),
  };
}

export const getReviewSummary = cache(async (menuItemIdentifier) => {
  if (!menuItemIdentifier) return { average: 0, count: 0 };
  const menuItem = await resolveMenuItemIdentifier(menuItemIdentifier);
  if (!menuItem) return { average: 0, count: 0 };
  const row = await getPrisma().review.aggregate({
    where: { menuItemId: menuItem.id, status: "APPROVED" },
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
    where: status ? { status: normaliseStatus(status) } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 250,
    include: {
      user: { select: { fullName: true, email: true } },
      menuItem: { select: { name: true, slug: true } },
    },
  });
  return rows.map(mapReview);
}

export async function setReviewStatus(id, status) {
  const row = await getPrisma().review.update({
    where: { id },
    data: { status: normaliseStatus(status) },
    include: {
      user: { select: { fullName: true, email: true } },
      menuItem: { select: { name: true, slug: true } },
    },
  });
  return mapReview(row);
}

export async function deleteReview(id) {
  const row = await getPrisma().review.delete({
    where: { id },
    include: {
      user: { select: { fullName: true, email: true } },
      menuItem: { select: { name: true, slug: true } },
    },
  });
  return mapReview(row);
}
