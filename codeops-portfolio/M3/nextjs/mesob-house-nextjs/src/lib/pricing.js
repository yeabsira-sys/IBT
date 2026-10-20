const number = (value) => Number(String(value ?? 0).replace(/,/g, "")) || 0;

/**
 * getCartTotals — pure pricing function shared by the browser (live basket
 * and checkout totals) and the server (the order Server Action recomputes it,
 * so the total a customer is charged never depends on a client-sent number).
 * Injera and packaging are complimentary, not paid add-ons.
 */
export function getCartTotals(items, couponCode) {
  const subtotal = items.reduce((sum, item) => sum + number(item.price) * item.quantity, 0);
  const vat = Math.round(subtotal * 0.15);
  const discount =
    subtotal > 500 && couponCode?.trim().toUpperCase() === "GURSHA2025" ? 200 : 0;
  return { subtotal, injera: 0, packaging: 0, vat, discount, total: Math.max(0, subtotal + vat - discount) };
}
