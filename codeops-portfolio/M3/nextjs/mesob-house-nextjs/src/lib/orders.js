import "server-only";

import { randomUUID } from "node:crypto";
import { getPrisma } from "./prisma";
import { setDbActor, withTransaction } from "./db";
import {
  ORDER_STATUSES,
  isCancellable,
  isTerminal,
  nextStatuses,
} from "./orderStatus";
import { buildAdminCharts, buildKitchenCharts } from "./analytics";

const iso = (value) => (value ? new Date(value).toISOString() : null);
const toCents = (value) =>
  Math.round((Number(String(value ?? 0).replace(/,/g, "")) || 0) * 100);
const fromCents = (value) => Number(value ?? 0) / 100;

const ACTIVE_STATUSES = [
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
];

const orderInclude = {
  items: {
    orderBy: { lineNo: "asc" },
    select: {
      menuItemId: true,
      itemName: true,
      unitPriceCents: true,
      quantity: true,
    },
  },
  statusHistory: {
    orderBy: [{ changedAt: "asc" }, { id: "asc" }],
    select: {
      status: true,
      changedAt: true,
      changedBy: true,
      changedByName: true,
    },
  },
};

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    customer: {
      name: row.customerName,
      email: row.customerEmail,
      phone: row.customerPhone,
    },
    status: row.status,
    items: (row.items ?? []).map((item) => ({
      id: item.menuItemId,
      name: item.itemName,
      price: fromCents(item.unitPriceCents),
      quantity: item.quantity,
    })),
    totals: {
      subtotal: fromCents(row.subtotalCents),
      injera: fromCents(row.injeraCents),
      packaging: fromCents(row.packagingCents),
      vat: fromCents(row.vatCents),
      discount: fromCents(row.discountCents),
      total: fromCents(row.totalCents),
    },
    couponCode: row.couponCode,
    note: row.note,
    fulfillment: row.fulfillment,
    contact: {
      name: row.contactName,
      phone: row.contactPhone,
      email: row.contactEmail,
    },
    delivery: {
      subCity: row.deliverySubCity,
      street: row.deliveryStreet,
      landmark: row.deliveryLandmark,
      timing: row.deliveryTiming,
    },
    method: row.paymentMethod,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    statusHistory: (row.statusHistory ?? []).map((entry) => ({
      status: entry.status,
      at: iso(entry.changedAt),
      by: entry.changedBy,
      byName: entry.changedByName,
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

/** Inserts an order for the signed-in customer. */
export async function createOrder({
  user,
  items,
  totals,
  couponCode,
  note,
  fulfillment,
  contact,
  delivery,
  method,
}) {
  const normalizedItems = items.map((item) => ({
    id: String(item.id),
    name: String(item.name ?? item.id),
    priceCents: toCents(item.price),
    quantity: Math.trunc(Number(item.quantity) || 0),
  }));

  if (!normalizedItems.length) {
    throw new Error("An order must contain at least one item.");
  }

  const orderNote = String(note ?? "").slice(0, 500);
  const normalizedCoupon = couponCode
    ? String(couponCode).trim().toUpperCase()
    : null;

  // Sort by id so simultaneous checkouts touch menu rows in a stable order.
  // The createMany/updateMany pair behaves like a conditional upsert: a row is
  // only rewritten when its menu snapshot actually changed.
  const menuById = new Map();
  for (const item of normalizedItems) menuById.set(item.id, item);
  const menuRows = [...menuById.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const orderId = `MH-${randomUUID().slice(0, 8).toUpperCase()}`;

    try {
      return await withTransaction(async (tx) => {
        await setDbActor(tx, user);

        if (menuRows.length) {
          await tx.menuItem.createMany({
            data: menuRows.map((item) => ({
              id: item.id,
              name: item.name,
              priceCents: item.priceCents,
              category: "menu",
            })),
            skipDuplicates: true,
          });

          for (const item of menuRows) {
            await tx.menuItem.updateMany({
              where: {
                id: item.id,
                OR: [
                  { name: { not: item.name } },
                  { priceCents: { not: item.priceCents } },
                ],
              },
              data: {
                name: item.name,
                priceCents: item.priceCents,
              },
            });
          }
        }

        await tx.order.create({
          data: {
            id: orderId,
            user: { connect: { id: user.id } },
            fulfillment,
            customerName: user.fullName,
            customerEmail: user.email,
            customerPhone: user.phone ?? "",
            contactName: contact?.name ?? user.fullName,
            contactPhone: contact?.phone ?? user.phone ?? "",
            contactEmail: contact?.email ?? user.email,
            deliverySubCity: delivery?.subCity ?? "",
            deliveryStreet: delivery?.street ?? "",
            deliveryLandmark: delivery?.landmark ?? "",
            deliveryTiming: delivery?.timing ?? "immediate",
            paymentMethod: method,
            couponCode: normalizedCoupon,
            note: orderNote,
            subtotalCents: toCents(totals?.subtotal),
            injeraCents: toCents(totals?.injera),
            packagingCents: toCents(totals?.packaging),
            vatCents: toCents(totals?.vat),
            discountCents: toCents(totals?.discount),
            items: {
              create: normalizedItems.map((item, index) => ({
                lineNo: index + 1,
                itemName: item.name,
                unitPriceCents: item.priceCents,
                quantity: item.quantity,
                menuItem: { connect: { id: item.id } },
              })),
            },
          },
        });

        const row = await tx.order.findUnique({
          where: { id: orderId },
          include: orderInclude,
        });
        return mapOrder(row);
      });
    } catch (error) {
      const retryable = error?.code === "P2002" && attempt < 2;
      if (!retryable) throw error;
    }
  }

  throw new Error("Could not allocate a unique order id.");
}

/** The only customer order read: scoped to the session's user id. */
export async function getOrdersForUser(userId) {
  return selectOrders({ userId }, { createdAt: "desc" });
}

/** Ownership is part of the lookup, not a check the caller can forget. */
export async function getOrderForUser(userId, orderId) {
  const row = await getPrisma().order.findFirst({
    where: { id: orderId, userId },
    include: orderInclude,
  });
  return mapOrder(row);
}

export async function getOrderById(orderId) {
  const row = await getPrisma().order.findUnique({
    where: { id: orderId },
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
    { status: { in: ACTIVE_STATUSES } },
    { createdAt: "asc" },
  );
}

/**
 * One read for the kitchen page and its polled API: the live queue plus the
 * small chart summaries. Only the summaries cross to the client.
 *
 * The two predicates are separate so the partial live-queue index and the
 * created-at index can each do their job; the result is deduplicated by id.
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

    // Conditional update instead of SELECT ... FOR UPDATE: only the request
    // that still sees `received` can cancel, and the trigger checks the role.
    const updated = await tx.order.updateMany({
      where: { id: orderId, userId, status: "received" },
      data: { status: "cancelled" },
    });

    if (updated.count === 0) {
      const existing = await tx.order.findFirst({
        where: { id: orderId, userId },
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

    const row = await tx.order.findUnique({
      where: { id: orderId },
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

    const current = await tx.order.findUnique({
      where: { id: orderId },
      select: { status: true, fulfillment: true },
    });
    if (!current) {
      return { ok: false, code: "NOT_FOUND", message: "Order not found." };
    }

    const allowed = nextStatuses(current.status, current.fulfillment);
    if (staff.role === "admin" && !isTerminal(current.status)) {
      allowed.push("cancelled");
    }
    if (!allowed.includes(status)) {
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `An order in "${current.status}" cannot move to "${status}".`,
      };
    }

    const updated = await tx.order.updateMany({
      where: { id: orderId, status: current.status },
      data: { status },
    });
    if (updated.count === 0) {
      return {
        ok: false,
        code: "CONFLICT",
        message: "The order changed while you were updating it. Refresh and retry.",
      };
    }

    const row = await tx.order.findUnique({
      where: { id: orderId },
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
      _sum: { totalCents: true },
    }),
    getPrisma().user.groupBy({
      by: ["role"],
      _count: { _all: true },
    }),
    selectOrders(undefined, { createdAt: "asc" }),
  ]);

  const counts = Object.fromEntries(
    statusRows.map((row) => [
      row.status,
      {
        count: row._count._all,
        totalCents: Number(row._sum.totalCents ?? 0),
      },
    ]),
  );
  const orders = statusRows.reduce((total, row) => total + row._count._all, 0);
  const active = ACTIVE_STATUSES.reduce(
    (total, status) => total + (counts[status]?.count ?? 0),
    0,
  );
  const pipelineCents = ACTIVE_STATUSES.reduce(
    (total, status) => total + (counts[status]?.totalCents ?? 0),
    0,
  );
  const users = Object.fromEntries(
    userRows.map((row) => [row.role, row._count._all]),
  );

  return {
    orders,
    active,
    completed: counts.completed?.count ?? 0,
    cancelled: counts.cancelled?.count ?? 0,
    revenue: fromCents(counts.completed?.totalCents ?? 0),
    pipeline: fromCents(pipelineCents),
    customers: users.customer ?? 0,
    staff: (users.employee ?? 0) + (users.admin ?? 0),
    recent: allOrders.slice(-6).reverse(),
    charts: buildAdminCharts(allOrders),
  };
}
