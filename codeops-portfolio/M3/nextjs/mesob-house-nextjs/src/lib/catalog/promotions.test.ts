import { describe, expect, it } from "vitest";
import {
  calculatePromotionDiscount,
  chooseBestPromotion,
  type PromotionCandidate,
} from "@/lib/catalog/promotions";

const at = new Date("2026-11-05T09:00:00.000Z");

function promotion(
  overrides: Partial<PromotionCandidate> = {},
): PromotionCandidate {
  return {
    id: overrides.id ?? "promo-1",
    restaurantId: "restaurant-1",
    branchId: null,
    code: null,
    name: "Promotion",
    scope: "RESTAURANT",
    type: "FIXED",
    value: 1000,
    minOrderMinor: 0,
    maxDiscountMinor: null,
    startsAt: new Date("2026-01-01T00:00:00.000Z"),
    endsAt: null,
    isActive: true,
    priority: 0,
    ...overrides,
  };
}

describe("calculatePromotionDiscount", () => {
  it("respects the minimum order", () => {
    const candidate = promotion({ minOrderMinor: 50000, value: 20000 });
    expect(calculatePromotionDiscount(candidate, 49999)).toBe(0);
    expect(calculatePromotionDiscount(candidate, 50000)).toBe(20000);
  });

  it("calculates percentage discounts and caps them", () => {
    const candidate = promotion({
      type: "PERCENTAGE",
      value: 1000,
      maxDiscountMinor: 5000,
    });
    expect(calculatePromotionDiscount(candidate, 60000)).toBe(5000);
    expect(
      calculatePromotionDiscount(
        promotion({ type: "PERCENTAGE", value: 1000 }),
        60000,
      ),
    ).toBe(6000);
  });
});

describe("chooseBestPromotion", () => {
  it("chooses one promotion, never a stack", () => {
    const result = chooseBestPromotion({
      promotions: [
        promotion({ id: "fixed", value: 1000 }),
        promotion({ id: "percent", type: "PERCENTAGE", value: 2000 }),
      ],
      subtotalMinor: 10000,
      branchId: "branch-1",
      at,
    });
    expect(result.promotion?.id).toBe("percent");
    expect(result.discountMinor).toBe(2000);
  });

  it("breaks ties by priority, then newest start", () => {
    const result = chooseBestPromotion({
      promotions: [
        promotion({ id: "low", priority: 1 }),
        promotion({ id: "high", priority: 5 }),
        promotion({
          id: "newer",
          priority: 5,
          startsAt: new Date("2026-10-01T00:00:00.000Z"),
        }),
      ],
      subtotalMinor: 10000,
      branchId: "branch-1",
      at,
    });
    expect(result.promotion?.id).toBe("newer");
  });

  it("filters by coupon code and ignores coupon-only promos by default", () => {
    const coupon = promotion({ id: "coupon", code: "GURSHA2025", value: 2000 });
    const automatic = promotion({ id: "auto", code: null, value: 1000 });
    expect(
      chooseBestPromotion({
        promotions: [coupon, automatic],
        subtotalMinor: 10000,
        branchId: "branch-1",
        at,
      }).promotion?.id,
    ).toBe("auto");
    expect(
      chooseBestPromotion({
        promotions: [coupon, automatic],
        subtotalMinor: 10000,
        branchId: "branch-1",
        at,
        code: "gursha2025",
      }).promotion?.id,
    ).toBe("coupon");
  });

  it("rejects expired promotions and branch scope mismatches", () => {
    const result = chooseBestPromotion({
      promotions: [
        promotion({
          id: "expired",
          endsAt: new Date("2026-06-01T00:00:00.000Z"),
        }),
        promotion({ id: "other-branch", scope: "BRANCH", branchId: "branch-2" }),
      ],
      subtotalMinor: 10000,
      branchId: "branch-1",
      at,
    });
    expect(result.promotion).toBeNull();
    expect(result.discountMinor).toBe(0);
  });
});
