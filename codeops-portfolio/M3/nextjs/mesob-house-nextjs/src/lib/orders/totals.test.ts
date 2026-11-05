import { describe, expect, it } from "vitest";
import {
  allocateProportionally,
  calculateOrderTotals,
  OrderPricingError,
  type OrderLineForTotals,
} from "@/lib/orders/totals";

function line(overrides: Partial<OrderLineForTotals> = {}): OrderLineForTotals {
  return {
    menuItemId: overrides.menuItemId ?? "item-1",
    menuItemSlug: overrides.menuItemSlug ?? "doro-wat",
    itemName: overrides.itemName ?? "Doro Wat",
    itemDescription: overrides.itemDescription ?? "Slow-simmered chicken stew",
    sku: overrides.sku ?? null,
    quantity: overrides.quantity ?? 1,
    unitPriceMinor: overrides.unitPriceMinor ?? 10000,
    taxRateBasisPoints: overrides.taxRateBasisPoints ?? 1500,
    taxInclusive: overrides.taxInclusive ?? true,
    options: overrides.options ?? [],
    allergens: overrides.allergens ?? [],
    dietary: overrides.dietary ?? [],
  };
}

const base = {
  currency: "ETB",
  serviceChargeType: "NONE" as const,
  serviceChargeValue: 0,
  serviceChargeTaxable: false,
  fulfillment: "PICKUP" as const,
  deliveryFeeMinor: 0,
  discountMinor: 0,
};

describe("calculateOrderTotals", () => {
  it("reports included VAT without adding it again", () => {
    const totals = calculateOrderTotals({ ...base, lines: [line()] });
    expect(totals.subtotalMinor).toBe(10000);
    expect(totals.taxMinor).toBe(1304);
    expect(totals.totalMinor).toBe(10000);
    expect(totals.lines[0].lineTaxMinor).toBe(1304);
  });

  it("adds VAT for tax-exclusive prices", () => {
    const totals = calculateOrderTotals({
      ...base,
      lines: [line({ taxInclusive: false })],
    });
    expect(totals.taxMinor).toBe(1500);
    expect(totals.totalMinor).toBe(11500);
  });

  it("computes service charge on the discounted subtotal", () => {
    const totals = calculateOrderTotals({
      ...base,
      serviceChargeType: "PERCENTAGE",
      serviceChargeValue: 1000,
      discountMinor: 2000,
      lines: [line()],
    });
    expect(totals.discountMinor).toBe(2000);
    expect(totals.serviceChargeMinor).toBe(800);
    expect(totals.taxMinor).toBe(1043);
    expect(totals.totalMinor).toBe(8800);
  });

  it("adds service tax when the branch marks service charge taxable", () => {
    const totals = calculateOrderTotals({
      ...base,
      serviceChargeType: "PERCENTAGE",
      serviceChargeValue: 1000,
      serviceChargeTaxable: true,
      discountMinor: 2000,
      lines: [line()],
    });
    expect(totals.taxMinor).toBe(1147);
    expect(totals.totalMinor).toBe(8800);
  });

  it("charges delivery fees only for delivery orders", () => {
    const pickup = calculateOrderTotals({
      ...base,
      deliveryFeeMinor: 5000,
      lines: [line()],
    });
    expect(pickup.deliveryFeeMinor).toBe(0);
    expect(pickup.totalMinor).toBe(10000);

    const delivery = calculateOrderTotals({
      ...base,
      fulfillment: "DELIVERY",
      deliveryFeeMinor: 5000,
      lines: [line()],
    });
    expect(delivery.deliveryFeeMinor).toBe(5000);
    expect(delivery.totalMinor).toBe(15000);
  });

  it("supports fixed service charges", () => {
    const totals = calculateOrderTotals({
      ...base,
      serviceChargeType: "FIXED",
      serviceChargeValue: 500,
      lines: [line()],
    });
    expect(totals.serviceChargeMinor).toBe(500);
    expect(totals.totalMinor).toBe(10500);
  });

  it("allocates discounts and tax back to lines without losing a cent", () => {
    const totals = calculateOrderTotals({
      ...base,
      discountMinor: 3000,
      lines: [
        line({ menuItemId: "item-1", unitPriceMinor: 10000 }),
        line({ menuItemId: "item-2", unitPriceMinor: 5000 }),
      ],
    });
    expect(totals.subtotalMinor).toBe(15000);
    expect(
      totals.lines.reduce((sum, row) => sum + row.lineDiscountMinor, 0),
    ).toBe(3000);
    expect(totals.lines.reduce((sum, row) => sum + row.lineTaxMinor, 0)).toBe(
      totals.taxMinor,
    );
    expect(totals.taxMinor).toBe(1565);
  });

  it("rejects mixed tax inclusivity and invalid quantities", () => {
    expect(() =>
      calculateOrderTotals({
        ...base,
        lines: [line(), line({ taxInclusive: false })],
      }),
    ).toThrow(OrderPricingError);

    expect(() =>
      calculateOrderTotals({ ...base, lines: [line({ quantity: 0 })] }),
    ).toThrow(OrderPricingError);
  });

  it("clamps discounts to the subtotal and never returns a negative total", () => {
    const totals = calculateOrderTotals({
      ...base,
      discountMinor: 50000,
      deliveryFeeMinor: 5000,
      lines: [line()],
    });
    expect(totals.discountMinor).toBe(10000);
    expect(totals.totalMinor).toBe(0);
  });
});

describe("allocateProportionally", () => {
  it("always adds back to the original amount", () => {
    expect(allocateProportionally(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocateProportionally(0, [1, 2])).toEqual([0, 0]);
    expect(allocateProportionally(10, [0, 0])).toEqual([0, 0]);
  });
});
