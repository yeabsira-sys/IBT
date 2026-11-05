import type { PrismaClient } from "@prisma/client";

export type PromotionScope = "RESTAURANT" | "BRANCH";
export type PromotionType = "PERCENTAGE" | "FIXED";

export type PromotionCandidate = {
  id: string;
  restaurantId: string;
  branchId: string | null;
  code: string | null;
  name: string;
  scope: PromotionScope;
  type: PromotionType;
  value: number;
  minOrderMinor: number;
  maxDiscountMinor: number | null;
  startsAt: Date;
  endsAt: Date | null;
  isActive: boolean;
  priority: number;
};

export type PromotionChoice = {
  promotion: PromotionCandidate | null;
  discountMinor: number;
};

export type PromotionDb = Pick<PrismaClient, "promotion">;

function isWithinWindow(promotion: PromotionCandidate, at: Date): boolean {
  if (!promotion.isActive) return false;
  if (promotion.startsAt.getTime() > at.getTime()) return false;
  if (promotion.endsAt && promotion.endsAt.getTime() <= at.getTime()) {
    return false;
  }
  return true;
}

export function calculatePromotionDiscount(
  promotion: PromotionCandidate,
  subtotalMinor: number,
): number {
  if (subtotalMinor < promotion.minOrderMinor) return 0;
  const raw =
    promotion.type === "FIXED"
      ? promotion.value
      : Math.round((subtotalMinor * promotion.value) / 10000);
  const capped =
    promotion.maxDiscountMinor === null
      ? raw
      : Math.min(raw, promotion.maxDiscountMinor);
  return Math.max(0, Math.min(capped, subtotalMinor));
}

/**
 * No stacking: choose the single best applicable promotion. Ties prefer the
 * higher priority, then the more recently started promotion, then the id.
 */
export function chooseBestPromotion({
  promotions,
  subtotalMinor,
  branchId,
  at,
  code,
}: {
  promotions: PromotionCandidate[];
  subtotalMinor: number;
  branchId: string;
  at: Date;
  code?: string | null;
}): PromotionChoice {
  const normalizedCode = code?.trim().toUpperCase() || null;
  const eligible = promotions.filter((promotion) => {
    if (!isWithinWindow(promotion, at)) return false;
    if (promotion.scope === "BRANCH" && promotion.branchId !== branchId) {
      return false;
    }
    if (promotion.scope === "RESTAURANT" && promotion.branchId !== null) {
      return false;
    }
    const promotionCode = promotion.code?.trim().toUpperCase() || null;
    if (normalizedCode) return promotionCode === normalizedCode;
    return promotionCode === null;
  });

  const ranked = eligible
    .map((promotion) => ({
      promotion,
      discountMinor: calculatePromotionDiscount(promotion, subtotalMinor),
    }))
    .filter((entry) => entry.discountMinor > 0)
    .sort(
      (a, b) =>
        b.discountMinor - a.discountMinor ||
        b.promotion.priority - a.promotion.priority ||
        b.promotion.startsAt.getTime() - a.promotion.startsAt.getTime() ||
        a.promotion.id.localeCompare(b.promotion.id),
    );

  return ranked[0] ?? { promotion: null, discountMinor: 0 };
}

export async function resolvePromotion(
  db: PromotionDb,
  {
    restaurantId,
    branchId,
    subtotalMinor,
    code,
    at = new Date(),
  }: {
    restaurantId: string;
    branchId: string;
    subtotalMinor: number;
    code?: string | null;
    at?: Date;
  },
): Promise<PromotionChoice> {
  const normalizedCode = code?.trim().toUpperCase() || null;
  const rows = await db.promotion.findMany({
    where: {
      restaurantId,
      isActive: true,
      startsAt: { lte: at },
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gt: at } }] },
        {
          OR: [
            { scope: "RESTAURANT", branchId: null },
            { scope: "BRANCH", branchId },
          ],
        },
        normalizedCode ? { code: normalizedCode } : { code: null },
      ],
    },
    orderBy: [{ priority: "desc" }, { startsAt: "desc" }],
  });

  return chooseBestPromotion({
    promotions: rows,
    subtotalMinor,
    branchId,
    at,
    code: normalizedCode,
  });
}
