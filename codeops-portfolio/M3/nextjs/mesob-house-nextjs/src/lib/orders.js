import "server-only";

import { getPrisma } from "./prisma";
import { setDbActor, withTransaction } from "./db";
import {
  ORDER_STATUSES,
  isTerminal,
  nextStatuses,
} from "./orderStatus";
import { buildAdminCharts, buildKitchenCharts } from "./analytics";
import { createOrderSnapshot } from "./orders/snapshot";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const iso = (value) => (value ? new Date(value).toISOString() : null);
const fromMinor = (value) => Number(value ?? 0) / 100;

const ACTIVE_DB_STATUSES = [
  "RECEIVED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
];

const orderInclude = {
  items: {
    orderBy: { lineNo: "asc" },
    select: {
      menuItemId: true,
      menuItemSlug: true,
      itemName: true,
      unitPriceMinor: true,
      quantity: true,
      options: true,
      taxMinor: true,
      discountMinor: true,
      lineTotalMinor: true,
    },
  },
  statusHistory: {
    orderBy: [{ changedAt: "asc" }, { id: "asc" }],
    select: {
      status: true,
      changedAt: true,
      changedBy: true,
      changedByName: true,
      note: true,
    },
  },
  promotion: { select: { code: true, name: true } },
};

function orderWhere(orderId) {
  const value = String(orderId ?? "");
  return UUID_RE.test(value) ? { id: value } : { publicId: value };
}

function mapOrder(row) {
  if (!row) return null;
  const serviceCharge = fromMinor(row.serviceChargeMinor);
  const deliveryFee = fromMinor(row.deliveryFeeMinor);
  const tax = fromMinor(row.taxMinor);
  return {
    id: row.publicId ?? row.id,
    orderUuid: row.id,
    publicId: row.publicId,
    userId: row.userId,
    customer: {
      name: row.customerName,
      email: row.customerEmail,
      phone: row.customerPhone,
    },
    status: String(row.status).toLowerCase(),
    paymentStatus: String(row.paymentStatus ?? "PENDING").toLowerCase(),
    items: (row.items ?? []).map((item) => ({
      id: item.menuItemSlug,
      menuItemId: item.menuItemId,
      name: item.itemName,
      price: fromMinor(item.unitPriceMinor),
      quantity: item.quantity,
      lineTotal: fromMinor(item.lineTotalMinor ?? item.unitPriceMinor * item.quantity),
      options: item.options ?? [],
    })),
    totals: {
      subtotal: fromMinor(row.subtotalMinor),
      injera: 0,
      packaging: 0,
      serviceCharge,
      delivery: deliveryFee,
      vat: tax,
      tax,
      discount: fromMinor(row.discountMinor),
      total: fromMinor(row.totalMinor),
      currency: row.currency,
      taxInclusive: row.taxInclusive,
      taxRateBasisPoints: row.taxRateBasisPoints,
    },
    couponCode: row.promotion?.code ?? null,
    promotion: row.promotion ?? null,
    note: row.note,
    fulfillment: String(row.fulfillment).toLowerCase(),
    contact: {
      name: row.contactName,
      phone: row.contactPhone,
      email: row.contactEmail,
    },
    delivery: {
      subCity: row.deliveryZoneName,
      street: row.deliveryAddressLine,
      landmark: row.deliveryLandmark,
      timing: row.scheduledFor ? "scheduled" : "immediate",
      scheduledFor: iso(row.scheduledFor),
      deliveryStaffId: row.deliveryStaffId,
    },
    method: row.paymentMethod,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    confirmedAt: iso(row.confirmedAt),
    completedAt: iso(row.completedAt),
    cancelledAt: iso(row.cancelledAt),
    statusHistory: (row.statusHistory ?? []).map((entry) => ({
      status: String(entry.status).toLowerCase(),
      at: iso(entry.changedAt),
      by: entry.changedBy,
      byName: entry.changedByName,
      note: entry.note,
    })),
  };
}

async function selectOrders(where, orderBy) {
  const rows = await getPrisma().order.findMany({
    where,
    orderBy,
    include: orderInclude,
  });
  return rows.map(mapOrder);
}

/** Start of the business day in Africa/Addis_Ababa (UTC+3, no DST). */
function startOfAddisDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00+03:00`);
}

async function defaultBranch(prisma) {
  const slug = process.env.MESOB_RESTAURANT_SLUG || "mesob-house";
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { id: true, name: true },
  });
  if (!restaurant) {
    throw new Error(
      `No active restaurant found for slug "${slug}". Run npm run db:seed.`,
    );
  }
  const branch =
    (await prisma.branch.findFirst({
      where: {
        restaurantId: restaurant.id,
        isDefault: true,
        status: "ACTIVE",
      },
      select: { id: true, slug: true, name: true },
    })) ??
    (await prisma.branch.findFirst({
      where: { restaurantId: restaurant.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, name: true },
    }));
  if (!branch) {
    throw new Error(
      `No active branch found for "${restaurant.name}". Run npm run db:seed.`,
    );
  }
  return { restaurant, branch };
}

function normalizedArea(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveDeliveryZone(prisma, branchId, subCity) {
  const zones = await prisma.deliveryZone.findMany({
    where: { branchId, isActive: true },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
  const area = normalizedArea(subCity);
  return (
    zones.find((zone) => normalizedArea(zone.name) === area) ??
    zones.find(
      (zone) =>
        area.includes(normalizedArea(zone.name)) ||
        normalizedArea(zone.name).includes(area),
    ) ??
    null
  );
}

function scheduledTime(timing) {
  if (timing !== "scheduled") return null;
  const at = new Date();
  at.setHours(at.getHours() + 2);
  return at;
}

/** Inserts an immutable order snapshot for the signed-in customer. */
export async function createOrder({
  user,
  items,
  couponCode,
  note,
  fulfillment,
  contact,
  delivery,
  method,
}) {
  const prisma = getPrisma();
  const { branch } = await defaultBranch(prisma);
  const deliveryMode = fulfillment === "pickup" ? "PICKUP" : "DELIVERY";
  const zone =
    deliveryMode === "DELIVERY"
      ? await resolveDeliveryZone(prisma, branch.id, delivery?.subCity)
      : null;

  if (deliveryMode === "DELIVERY" && !zone) {
    throw new Error(
      "That delivery area is not available. Choose another sub-city.",
    );
  }

  const snapshot = await createOrderSnapshot({
    actor: {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? "",
      accountType: user.accountType ?? "CUSTOMER",
    },
    restaurantSlug: process.env.MESOB_RESTAURANT_SLUG || "mesob-house",
    branchSlug: branch.slug,
    fulfillment: deliveryMode,
    contact: {
      name: contact?.name ?? user.fullName,
      phone: contact?.phone ?? user.phone ?? "",
      email: contact?.email ?? user.email,
    },
    delivery:
      deliveryMode === "DELIVERY"
        ? {
            zoneId: zone.id,
            addressLine: [delivery?.street, delivery?.subCity]
              .filter(Boolean)
              .join(", "),
            landmark: delivery?.landmark ?? "",
            scheduledFor: scheduledTime(delivery?.timing),
          }
        : undefined,
    paymentMethod: method,
    couponCode: couponCode || null,
    note: note || null,
    items: items.map((item) => ({
      menuItemSlug: String(item.menuItemSlug ?? item.id),
      quantity: Number(item.quantity),
      options: (item.options ?? []).map((option) => ({
        groupKey: option.groupKey ?? option.group,
        optionValue: option.optionValue ?? option.value,
      })),
    })),
  });

  const row = await prisma.order.findUnique({
    where: { id: snapshot.id },
    include: orderInclude,
  });
  return mapOrder(row);
}

/** The only customer order read: scoped to the session's user id. */
export async function getOrdersForUser(userId) {
  return selectOrders({ userId }, { createdAt: "desc" });
}

/** Ownership is part of the lookup, not a check the caller can forget. */
export async function getOrderForUser(userId, orderId) {
  const row = await getPrisma().order.findFirst({
    where: { ...orderWhere(orderId), userId },
    include: orderInclude,
  });
  return mapOrder(row);
}

export async function getOrderById(orderId) {
  const row = await getPrisma().order.findFirst({
    where: orderWhere(orderId),
    include: orderInclude,
  });
  return mapOrder(row);
}

export async function getAllOrders() {
  return selectOrders(undefined, { createdAt: "asc" });
}

/** Active queue for /kitchen; completed and cancelled orders are archived. */
export async function getKitchenOrders() {
  return selectOrders(
    { status: { in: ACTIVE_DB_STATUSES } },
    { createdAt: "asc" },
  );
}

/**
 * One read for the kitchen page and its polled API: the live queue plus the
 * small chart summaries. Only the summaries cross to the client.
 */
export async function getKitchenOverview() {
  const [active, today] = await Promise.all([
    getKitchenOrders(),
    selectOrders(
      { createdAt: { gte: startOfAddisDay() } },
      { createdAt: "asc" },
    ),
  ]);

  const byId = new Map();
  for (const order of [...today, ...active]) byId.set(order.id, order);
  const rows = [...byId.values()].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );

  return {
    orders: rows.filter((order) => !isTerminal(order.status)),
    charts: buildKitchenCharts(rows),
  };
}

export async function cancelOrderForUser(orderId, userId) {
  return withTransaction(async (tx) => {
    await setDbActor(tx, { id: userId, role: "customer" });

    const updated = await tx.order.updateMany({
      where: {
        ...orderWhere(orderId),
        userId,
        status: "RECEIVED",
      },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    if (updated.count === 0) {
      const existing = await tx.order.findFirst({
        where: { ...orderWhere(orderId), userId },
        select: { status: true },
      });
      if (!existing) {
        return { ok: false, code: "NOT_FOUND", message: "Order not found." };
      }
      return {
        ok: false,
        code: "NOT_CANCELLABLE",
        message:
          "This order has already moved into the kitchen and can no longer be cancelled online.",
      };
    }

    const target = await tx.order.findFirstOrThrow({
      where: { ...orderWhere(orderId), userId },
      select: { id: true },
    });
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: target.id,
        status: "CANCELLED",
        changedBy: userId,
        changedByName: user?.fullName ?? "Customer",
        note: "Cancelled by customer",
      },
    });

    const row = await tx.order.findUnique({
      where: { id: target.id },
      include: orderInclude,
    });
    return { ok: true, order: mapOrder(row) };
  });
}

/**
 * Staff-only transition. The role is checked here as well as in the route so
 * a future caller cannot bypass the route's guard by importing this helper.
 */
export async function updateOrderStatus(orderId, status, staff) {
  if (!staff || !["employee", "admin"].includes(staff.role)) {
    return { ok: false, code: "FORBIDDEN", message: "Staff access required." };
  }
  if (!ORDER_STATUSES.includes(status)) {
    return {
      ok: false,
      code: "INVALID_STATUS",
      message: "Unknown order status.",
    };
  }

  return withTransaction(async (tx) => {
    await setDbActor(tx, staff);

    const current = await tx.order.findFirst({
      where: orderWhere(orderId),
      select: {
        id: true,
        status: true,
        fulfillment: true,
        confirmedAt: true,
      },
    });
    if (!current) {
      return { ok: false, code: "NOT_FOUND", message: "Order not found." };
    }

    const currentStatus = String(current.status).toLowerCase();
    const fulfillment = String(current.fulfillment).toLowerCase();
    const allowed = nextStatuses(currentStatus, fulfillment);
    if (staff.role === "admin" && !isTerminal(currentStatus)) {
      allowed.push("cancelled");
    }
    if (!allowed.includes(status)) {
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `An order in "${currentStatus}" cannot move to "${status}".`,
      };
    }

    const now = new Date();
    const updated = await tx.order.updateMany({
      where: { id: current.id, status: current.status },
      data: {
        status: status.toUpperCase(),
        ...(status === "preparing" && !current.confirmedAt
          ? { confirmedAt: now }
          : {}),
        ...(status === "completed" ? { completedAt: now } : {}),
        ...(status === "cancelled" ? { cancelledAt: now } : {}),
      },
    });
    if (updated.count === 0) {
      return {
        ok: false,
        code: "CONFLICT",
        message: "The order changed while you were updating it. Refresh and retry.",
      };
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: current.id,
        status: status.toUpperCase(),
        changedBy: staff.id,
        changedByName: staff.fullName ?? "",
        note: `Status changed to ${status}`,
      },
    });

    const row = await tx.order.findUnique({
      where: { id: current.id },
      include: orderInclude,
    });
    return { ok: true, order: mapOrder(row) };
  });
}

export async function getAdminStats() {
  const [statusRows, userRows, allOrders] = await Promise.all([
    getPrisma().order.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { totalMinor: true },
    }),
    getPrisma().user.groupBy({
      by: ["accountType"],
      _count: { _all: true },
    }),
    selectOrders(undefined, { createdAt: "asc" }),
  ]);

  const counts = Object.fromEntries(
    statusRows.map((row) => [
      String(row.status).toLowerCase(),
      {
        count: row._count._all,
        totalMinor: Number(row._sum.totalMinor ?? 0),
      },
    ]),
  );
  const orders = statusRows.reduce((total, row) => total + row._count._all, 0);
  const active = ACTIVE_DB_STATUSES.reduce(
    (total, status) =>
      total + (counts[status.toLowerCase()]?.count ?? 0),
    0,
  );
  const pipelineMinor = ACTIVE_DB_STATUSES.reduce(
    (total, status) =>
      total + (counts[status.toLowerCase()]?.totalMinor ?? 0),
    0,
  );
  const users = Object.fromEntries(
    userRows.map((row) => [row.accountType, row._count._all]),
  );

  return {
    orders,
    active,
    completed: counts.completed?.count ?? 0,
    cancelled: counts.cancelled?.count ?? 0,
    revenue: fromMinor(counts.completed?.totalMinor ?? 0),
    pipeline: fromMinor(pipelineMinor),
    customers: users.CUSTOMER ?? 0,
    staff: users.STAFF ?? 0,
    recent: allOrders.slice(-6).reverse(),
    charts: buildAdminCharts(allOrders),
  };
}
