/**
 * Shared order status vocabulary. Safe to import from client components:
 * no database or server-only code lives here.
 */
export const ORDER_STATUSES = [
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
];

export const STATUS_META = {
  received: { label: "Received", tone: "brand", step: 0 },
  preparing: { label: "Preparing", tone: "gold", step: 1 },
  ready: { label: "Ready", tone: "green", step: 2 },
  out_for_delivery: { label: "Out for delivery", tone: "dark", step: 3 },
  completed: { label: "Completed", tone: "green", step: 4 },
  cancelled: { label: "Cancelled", tone: "muted", step: -1 },
};

export const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);
export const CANCELLABLE_STATUSES = new Set(["received"]);

export const isTerminal = (status) => TERMINAL_STATUSES.has(status);
export const isCancellable = (status) => CANCELLABLE_STATUSES.has(status);

/** The statuses staff may move an order to, given how it is being fulfilled. */
export function nextStatuses(status, fulfillment) {
  switch (status) {
    case "received":
      return ["preparing"];
    case "preparing":
      return ["ready"];
    case "ready":
      return fulfillment === "pickup" ? ["completed"] : ["out_for_delivery"];
    case "out_for_delivery":
      return ["completed"];
    default:
      return [];
  }
}

/** Customer-facing progress: cancelled orders do not show a step. */
export function statusStep(status) {
  return STATUS_META[status]?.step ?? 0;
}

export const formatOrderDate = (value) =>
  new Intl.DateTimeFormat("en-ET", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Addis_Ababa",
  }).format(new Date(value));

export const formatETB = (value) =>
  new Intl.NumberFormat("en-ET", { maximumFractionDigits: 0 }).format(Number(value) || 0);
