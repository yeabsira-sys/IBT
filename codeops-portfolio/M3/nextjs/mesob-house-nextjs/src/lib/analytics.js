import "server-only";

import { STATUS_META, isTerminal } from "./orderStatus";

export const CHART_TIME_ZONE = "Africa/Addis_Ababa";

const DAY_MS = 24 * 60 * 60 * 1000;
const ORDERS_PER_DAY = 14;
const BEST_SELLING_ITEMS = 8;
const TOP_CUSTOMERS = 10;
const ACTIVE_STATUSES = ["received", "preparing", "ready", "out_for_delivery"];

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHART_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabelFormatter = new Intl.DateTimeFormat("en-ET", {
  timeZone: CHART_TIME_ZONE,
  month: "short",
  day: "numeric",
});

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: CHART_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

function dateKey(value) {
  const parts = dateKeyFormatter.formatToParts(new Date(value));
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function localHour(value) {
  return Number(hourFormatter.format(new Date(value))) || 0;
}

function total(order) {
  return Number(order.totals?.total ?? 0) || 0;
}

/**
 * Orders per day for the last 14 days, completed revenue by delivery area,
 * the full menu-item sales mix and the top customers by completed lifetime
 * spend. Pickup orders have no sub-city, so they get their own explicit bucket
 * instead of silently disappearing from the neighbourhood chart.
 */
export function buildAdminCharts(orders, now = new Date()) {
  const today = new Date(now);
  const days = Array.from({ length: ORDERS_PER_DAY }, (_, index) => {
    const date = new Date(today.getTime() - (ORDERS_PER_DAY - 1 - index) * DAY_MS);
    const key = dateKey(date);
    return {
      date: key,
      label: dayLabelFormatter.format(date),
      orders: 0,
    };
  });

  const dayByKey = new Map(days.map((day) => [day.date, day]));

  for (const order of orders) {
    const bucket = dayByKey.get(dateKey(order.createdAt));
    if (bucket) bucket.orders += 1;
  }

  const areas = new Map();
  const items = new Map();
  const customers = new Map();

  for (const order of orders) {
    if (order.status !== "completed") continue;

    const area = order.fulfillment === "pickup"
      ? "Pickup (Bole)"
      : order.delivery?.subCity || "Unknown area";
    const currentArea = areas.get(area) ?? { area, orders: 0, revenue: 0 };
    currentArea.orders += 1;
    currentArea.revenue += total(order);
    areas.set(area, currentArea);

    const customerKey =
      order.userId || order.customer?.email || order.customer?.name;
    if (customerKey) {
      const currentCustomer = customers.get(customerKey) ?? {
        id: customerKey,
        name: order.customer?.name || "Guest",
        email: order.customer?.email || "",
        orders: 0,
        revenue: 0,
      };
      if (!currentCustomer.name && order.customer?.name) {
        currentCustomer.name = order.customer.name;
      }
      if (!currentCustomer.email && order.customer?.email) {
        currentCustomer.email = order.customer.email;
      }
      currentCustomer.orders += 1;
      currentCustomer.revenue += total(order);
      customers.set(customerKey, currentCustomer);
    }

    for (const item of order.items ?? []) {
      const itemKey = item.id || item.name;
      const quantity = Number(item.quantity) || 0;
      if (!itemKey || quantity <= 0) continue;

      const currentItem = items.get(itemKey) ?? {
        id: itemKey,
        name: item.name || itemKey,
        quantity: 0,
        revenue: 0,
      };
      currentItem.quantity += quantity;
      currentItem.revenue += (Number(item.price) || 0) * quantity;
      items.set(itemKey, currentItem);
    }
  }

  const sortedItems = [...items.values()].sort(
    (a, b) =>
      b.quantity - a.quantity ||
      b.revenue - a.revenue ||
      a.name.localeCompare(b.name),
  );

  const bestSellingItems = sortedItems
    .slice(0, BEST_SELLING_ITEMS)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  const totalUnits = sortedItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const menuItemShare = sortedItems.map((item, index) => ({
    ...item,
    rank: index + 1,
    share: totalUnits > 0 ? item.quantity / totalUnits : 0,
  }));

  const topCustomers = [...customers.values()]
    .sort(
      (a, b) =>
        b.revenue - a.revenue ||
        b.orders - a.orders ||
        a.name.localeCompare(b.name),
    )
    .slice(0, TOP_CUSTOMERS)
    .map((customer, index) => ({ ...customer, rank: index + 1 }));

  return {
    ordersPerDay: days,
    revenueByArea: [...areas.values()].sort(
      (a, b) => b.revenue - a.revenue || a.area.localeCompare(b.area),
    ),
    bestSellingItems,
    menuItemShare,
    topCustomers,
  };
}

/**
 * The kitchen sees the shape of the live queue and today's order pace.
 * Queue counts only include non-terminal tickets; the hourly line includes
 * every order received today so completed work still contributes to the day.
 */
export function buildKitchenCharts(orders, now = new Date()) {
  const queueByStatus = ACTIVE_STATUSES.map((status) => ({
    status,
    label: STATUS_META[status].label,
    tickets: 0,
  }));
  const queueByStatusMap = new Map(queueByStatus.map((row) => [row.status, row]));

  const todayKey = dateKey(now);
  const hourly = Array.from({ length: 12 }, (_, index) => {
    const hour = index * 2;
    return {
      hour,
      label: `${String(hour).padStart(2, "0")}:00–${String(hour + 2).padStart(2, "0")}:00`,
      orders: 0,
    };
  });

  for (const order of orders) {
    if (!isTerminal(order.status)) {
      const row = queueByStatusMap.get(order.status);
      if (row) row.tickets += 1;
    }

    if (dateKey(order.createdAt) === todayKey) {
      const bucket = hourly[Math.floor(localHour(order.createdAt) / 2)];
      if (bucket) bucket.orders += 1;
    }
  }

  return {
    queueByStatus,
    ordersByHour: hourly,
  };
}
