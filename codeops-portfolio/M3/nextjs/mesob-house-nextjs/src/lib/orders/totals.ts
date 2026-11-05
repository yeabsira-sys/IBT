export type ServiceChargeType = "NONE" | "PERCENTAGE" | "FIXED";
export type FulfillmentType = "DELIVERY" | "PICKUP";

export type OrderLineForTotals = {
  menuItemId: string;
  menuItemSlug: string;
  itemName: string;
  itemDescription: string;
  sku: string | null;
  quantity: number;
  unitPriceMinor: number;
  taxRateBasisPoints: number;
  taxInclusive: boolean;
  options: OrderOptionSnapshot[];
  allergens: string[];
  dietary: string[];
  /** Full immutable disclosure saved on the order item for audit. */
  allergenSnapshot?: unknown;
  dietarySnapshot?: unknown;
};

export type OrderOptionSnapshot = {
  groupKey: string;
  groupTitle: string;
  optionValue: string;
  optionTitle: string;
  priceDeltaMinor: number;
  quantity: number;
};

export type CalculatedOrderLine = OrderLineForTotals & {
  lineGrossMinor: number;
  lineDiscountMinor: number;
  lineTaxMinor: number;
  lineTotalMinor: number;
};

export type OrderTotals = {
  subtotalMinor: number;
  discountMinor: number;
  serviceChargeMinor: number;
  taxMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  currency: string;
  taxInclusive: boolean;
  taxRateBasisPoints: number;
  serviceChargeTaxable: boolean;
  lines: CalculatedOrderLine[];
};

export type CalculateOrderTotalsInput = {
  lines: OrderLineForTotals[];
  currency: string;
  serviceChargeType: ServiceChargeType;
  serviceChargeValue: number;
  serviceChargeTaxable: boolean;
  fulfillment: FulfillmentType;
  deliveryFeeMinor: number;
  discountMinor: number;
};

export class OrderPricingError extends Error {
  readonly code:
    | "EMPTY_ORDER"
    | "MIXED_TAX_INCLUSIVITY"
    | "INVALID_QUANTITY"
    | "INVALID_PRICE"
    | "INVALID_TAX_RATE"
    | "INVALID_SERVICE_CHARGE"
    | "INVALID_DELIVERY_FEE"
    | "INVALID_DISCOUNT";

  constructor(code: OrderPricingError["code"], message: string) {
    super(message);
    this.name = "OrderPricingError";
    this.code = code;
  }
}

function assertMinor(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new OrderPricingError("INVALID_PRICE", `${label} must be a non-negative integer minor amount.`);
  }
}

/**
 * Distributes an integer amount proportionally using the largest-remainder
 * method, so the parts always add back to the original amount.
 */
export function allocateProportionally(total: number, weights: number[]): number[] {
  if (total <= 0 || weights.length === 0) return weights.map(() => 0);
  const weightSum = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (weightSum <= 0) return weights.map(() => 0);

  const raw = weights.map((weight) => (total * Math.max(0, weight)) / weightSum);
  const allocated = raw.map(Math.floor);
  let remaining = total - allocated.reduce((sum, value) => sum + value, 0);
  const byRemainder = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let index = 0; remaining > 0 && index < byRemainder.length; index += 1) {
    allocated[byRemainder[index].index] += 1;
    remaining -= 1;
  }
  return allocated;
}

/**
 * Computes all order money fields in integer minor units.
 *
 * Tax-inclusive prices are the amount the customer sees. `taxMinor` is the
 * included tax component; it is not added again to the total. Tax-exclusive
 * prices are net, so tax is added to the total. Mixed inclusivity is rejected
 * because one order-level total cannot represent both safely.
 *
 * Service charge is computed on the discounted subtotal. When the branch marks
 * it taxable it joins the tax base, and for inclusive pricing the service
 * charge itself is treated as tax-inclusive.
 */
export function calculateOrderTotals({
  lines,
  currency,
  serviceChargeType,
  serviceChargeValue,
  serviceChargeTaxable,
  fulfillment,
  deliveryFeeMinor,
  discountMinor,
}: CalculateOrderTotalsInput): OrderTotals {
  if (lines.length === 0) {
    throw new OrderPricingError("EMPTY_ORDER", "An order must contain at least one item.");
  }

  const taxInclusive = lines[0].taxInclusive;
  for (const line of lines) {
    if (line.taxInclusive !== taxInclusive) {
      throw new OrderPricingError(
        "MIXED_TAX_INCLUSIVITY",
        "An order cannot mix tax-inclusive and tax-exclusive dishes.",
      );
    }
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new OrderPricingError("INVALID_QUANTITY", "Every line needs a positive quantity.");
    }
    assertMinor(line.unitPriceMinor, "Unit price");
    if (
      !Number.isInteger(line.taxRateBasisPoints) ||
      line.taxRateBasisPoints < 0 ||
      line.taxRateBasisPoints > 10000
    ) {
      throw new OrderPricingError("INVALID_TAX_RATE", "Tax rate must be between 0 and 10000 basis points.");
    }
  }

  if (
    serviceChargeType !== "NONE" &&
    serviceChargeType !== "PERCENTAGE" &&
    serviceChargeType !== "FIXED"
  ) {
    throw new OrderPricingError("INVALID_SERVICE_CHARGE", "Unknown service charge type.");
  }
  if (
    serviceChargeType === "PERCENTAGE" &&
    (!Number.isInteger(serviceChargeValue) ||
      serviceChargeValue < 0 ||
      serviceChargeValue > 10000)
  ) {
    throw new OrderPricingError(
      "INVALID_SERVICE_CHARGE",
      "Percentage service charge must be between 0 and 10000 basis points.",
    );
  }
  if (
    serviceChargeType === "FIXED" &&
    (!Number.isInteger(serviceChargeValue) || serviceChargeValue < 0)
  ) {
    throw new OrderPricingError(
      "INVALID_SERVICE_CHARGE",
      "Fixed service charge must be a non-negative integer minor amount.",
    );
  }

  assertMinor(deliveryFeeMinor, "Delivery fee");
  assertMinor(discountMinor, "Discount");

  const grossLines = lines.map((line) => line.unitPriceMinor * line.quantity);
  const subtotalMinor = grossLines.reduce((sum, value) => sum + value, 0);
  const appliedDiscount = Math.min(discountMinor, subtotalMinor);
  const lineDiscounts = allocateProportionally(appliedDiscount, grossLines);
  const discountedSubtotal = subtotalMinor - appliedDiscount;

  const serviceChargeMinor =
    serviceChargeType === "NONE"
      ? 0
      : serviceChargeType === "FIXED"
        ? serviceChargeValue
        : Math.round((discountedSubtotal * serviceChargeValue) / 10000);

  // Tax the discounted line amounts. Grouping by rate keeps one rounding step
  // per rate, then the result is allocated back to lines for the snapshot.
  const groups = new Map<number, number[]>();
  lines.forEach((line, index) => {
    const netGross = grossLines[index] - lineDiscounts[index];
    const indexes = groups.get(line.taxRateBasisPoints) ?? [];
    indexes.push(index);
    groups.set(line.taxRateBasisPoints, indexes);
  });

  const lineTaxes = new Array<number>(lines.length).fill(0);
  let itemTaxMinor = 0;
  for (const [rate, indexes] of groups) {
    const groupGross = indexes.reduce(
      (sum, index) => sum + grossLines[index] - lineDiscounts[index],
      0,
    );
    const groupTax = taxInclusive
      ? Math.round((groupGross * rate) / (10000 + rate))
      : Math.round((groupGross * rate) / 10000);
    itemTaxMinor += groupTax;
    const allocated = allocateProportionally(
      groupTax,
      indexes.map((index) => grossLines[index] - lineDiscounts[index]),
    );
    indexes.forEach((index, position) => {
      lineTaxes[index] = allocated[position];
    });
  }

  const primaryRate = Math.max(...lines.map((line) => line.taxRateBasisPoints));
  const serviceTaxMinor =
    serviceChargeTaxable && serviceChargeMinor > 0
      ? taxInclusive
        ? Math.round((serviceChargeMinor * primaryRate) / (10000 + primaryRate))
        : Math.round((serviceChargeMinor * primaryRate) / 10000)
      : 0;

  const taxMinor = itemTaxMinor + serviceTaxMinor;
  const deliveryFee = fulfillment === "PICKUP" ? 0 : deliveryFeeMinor;
  const totalMinor = Math.max(
    0,
    subtotalMinor -
      appliedDiscount +
      serviceChargeMinor +
      deliveryFee +
      (taxInclusive ? 0 : taxMinor),
  );

  return {
    subtotalMinor,
    discountMinor: appliedDiscount,
    serviceChargeMinor,
    taxMinor,
    deliveryFeeMinor: deliveryFee,
    totalMinor,
    currency: currency.trim().toUpperCase(),
    taxInclusive,
    taxRateBasisPoints: primaryRate,
    serviceChargeTaxable,
    lines: lines.map((line, index) => ({
      ...line,
      lineGrossMinor: grossLines[index],
      lineDiscountMinor: lineDiscounts[index],
      lineTaxMinor: lineTaxes[index],
      lineTotalMinor: grossLines[index],
    })),
  };
}
