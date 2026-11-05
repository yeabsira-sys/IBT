const number = (value) => Number(String(value ?? 0).replace(/,/g, "")) || 0;

/**
 * Illustrative client-side estimates for the five seeded Addis delivery zones.
 * The server always resolves the authoritative zone and fee from Postgres; this
 * map only keeps the basket and checkout summary from disagreeing with it.
 */
const DELIVERY_FEES = {
  "bole medhanialem": 5000,
  kazanchis: 8000,
  sarbet: 10000,
  "old airport": 9000,
  cmc: 15000,
};

function normalizeArea(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deliveryFeeFor(fulfillment, subCity) {
  if (fulfillment === "pickup") return 0;
  return DELIVERY_FEES[normalizeArea(subCity)] ?? 0;
}

/**
 * getCartTotals — pure pricing estimate shared by the browser (live basket and
 * checkout totals) and the server action. The server recomputes the immutable
 * order snapshot from the database, so a client-sent total is never trusted.
 *
 * Menu prices are tax-inclusive by default, matching the seeded VAT category.
 * Included VAT is shown for transparency and is not added to the total again.
 * Delivery fees are estimates until the signed-in checkout resolves the zone.
 */
export function getCartTotals(items, couponCode, options = {}) {
  const {
    fulfillment = "delivery",
    subCity = "",
    taxRateBasisPoints = 1500,
    taxInclusive = true,
    serviceChargeType = "NONE",
    serviceChargeValue = 0,
    serviceChargeTaxable = false,
  } = options;

  const subtotal = items.reduce(
    (sum, item) => sum + number(item.price) * item.quantity,
    0,
  );
  const discount =
    couponCode?.trim().toUpperCase() === "GURSHA2025" && subtotal >= 500
      ? Math.min(200, subtotal)
      : 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);

  const serviceCharge =
    serviceChargeType === "FIXED"
      ? serviceChargeValue / 100
      : serviceChargeType === "PERCENTAGE"
        ? (discountedSubtotal * serviceChargeValue) / 10000
        : 0;
  const taxableBase = discountedSubtotal + (serviceChargeTaxable ? serviceCharge : 0);
  const vat = taxInclusive
    ? (taxableBase * taxRateBasisPoints) / (10000 + taxRateBasisPoints)
    : (taxableBase * taxRateBasisPoints) / 10000;
  const delivery = deliveryFeeFor(fulfillment, subCity);
  const total = taxInclusive
    ? discountedSubtotal + serviceCharge + delivery
    : discountedSubtotal + serviceCharge + delivery + vat;

  return {
    subtotal,
    injera: 0,
    packaging: 0,
    serviceCharge,
    delivery,
    vat,
    discount,
    total: Math.max(0, total),
    currency: "ETB",
    taxInclusive,
    taxRateBasisPoints,
  };
}
