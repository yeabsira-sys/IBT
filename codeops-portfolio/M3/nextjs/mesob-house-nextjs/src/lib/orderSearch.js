import { ORDER_STATUSES, STATUS_META } from "./orderStatus";

export const ORDERS_PER_PAGE = 20;

export const ORDER_FILTERS = [
  { value: "all", label: "All" },
  ...ORDER_STATUSES.map((status) => ({
    value: status,
    label: STATUS_META[status].label,
  })),
];

/** Search across the fields staff and customers actually use to find an order. */
export function orderMatches(order, query) {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    order.id,
    order.status,
    STATUS_META[order.status]?.label,
    order.customer?.name,
    order.customer?.email,
    order.customer?.phone,
    order.contact?.name,
    order.contact?.email,
    order.contact?.phone,
    order.fulfillment,
    order.delivery?.subCity,
    order.delivery?.street,
    order.delivery?.landmark,
    order.note,
    ...(order.items ?? []).flatMap((item) => [item.id, item.name]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

export function filterOrders(orders, status, query) {
  return (orders ?? []).filter(
    (order) => (status === "all" || order.status === status) && orderMatches(order, query),
  );
}
