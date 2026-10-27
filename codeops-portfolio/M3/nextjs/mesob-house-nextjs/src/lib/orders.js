import "server-only";

import { randomUUID } from "node:crypto";
import { readDb, mutateDb } from "./db";
import {
  ORDER_STATUSES,
  isCancellable,
  isTerminal,
  nextStatuses,
} from "./orderStatus";
import { buildAdminCharts, buildKitchenCharts } from "./analytics";

const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
const byOldest = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);

/** Inserts an order for the signed-in customer.  */
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
  return mutateDb((db) => {
    const now = new Date().toISOString();
    const order = {
      id: `MH-${randomUUID().slice(0, 8).toUpperCase()}`,
      userId: user.id,
      customer: { name: user.fullName, email: user.email, phone: user.phone },
      status: "received",
      items,
      totals,
      couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null,
      note: String(note ?? "").slice(0, 500),
      fulfillment,
      contact,
      delivery,
      method,
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        { status: "received", at: now, by: user.id, byName: user.fullName },
      ],
    };
    db.orders.push(order);
    return order;
  });
}

/** The only customer order read: scoped to the session's user id. */
export async function getOrdersForUser(userId) {
  const db = await readDb();
  return db.orders.filter((order) => order.userId === userId).sort(byNewest);
}

/** Ownership is part of the lookup, not a check the caller can forget. */
export async function getOrderForUser(userId, orderId) {
  const db = await readDb();
  return (
    db.orders.find(
      (order) => order.id === orderId && order.userId === userId,
    ) ?? null
  );
}

export async function getOrderById(orderId) {
  const db = await readDb();
  return db.orders.find((order) => order.id === orderId) ?? null;
}

export async function getAllOrders() {
  const db = await readDb();
  return [...db.orders].sort(byNewest);
}

/** Active queue for /kitchen; completed and cancelled orders are archived. */
export async function getKitchenOrders() {
  const db = await readDb();
  return db.orders.filter((order) => !isTerminal(order.status)).sort(byOldest);
}

/**
 * One read for the kitchen page and its polled API: the live queue plus the
 * small chart summaries. Only the summaries cross to the client.
 */
export async function getKitchenOverview() {
  const db = await readDb();
  const orders = db.orders
    .filter((order) => !isTerminal(order.status))
    .sort(byOldest);
  return {
    orders,
    charts: buildKitchenCharts(db.orders),
  };
}

export async function cancelOrderForUser(orderId, userId) {
  return mutateDb((db) => {
    const order = db.orders.find((entry) => entry.id === orderId);
    // A missing row and someone else's row deliberately return the same
    // response, so the endpoint cannot be used to discover order ids.
    if (!order || order.userId !== userId) {
      return { ok: false, code: "NOT_FOUND", message: "Order not found." };
    }
    if (!isCancellable(order.status)) {
      return {
        ok: false,
        code: "NOT_CANCELLABLE",
        message:
          "This order has already moved into the kitchen and can no longer be cancelled online.",
      };
    }
    const now = new Date().toISOString();
    order.status = "cancelled";
    order.updatedAt = now;
    order.statusHistory.push({
      status: "cancelled",
      at: now,
      by: userId,
      byName: "Customer",
    });
    return { ok: true, order };
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

  return mutateDb((db) => {
    const order = db.orders.find((entry) => entry.id === orderId);
    if (!order)
      return { ok: false, code: "NOT_FOUND", message: "Order not found." };

    const allowed = nextStatuses(order.status, order.fulfillment);
    if (staff.role === "admin" && !isTerminal(order.status))
      allowed.push("cancelled");
    if (!allowed.includes(status)) {
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `An order in "${order.status}" cannot move to "${status}".`,
      };
    }

    const now = new Date().toISOString();
    order.status = status;
    order.updatedAt = now;
    order.statusHistory.push({
      status,
      at: now,
      by: staff.id,
      byName: staff.fullName,
    });
    return { ok: true, order };
  });
}

export async function getAdminStats() {
  const db = await readDb();
  const orders = db.orders;
  const active = orders.filter((order) => !isTerminal(order.status));
  const completed = orders.filter((order) => order.status === "completed");
  const cancelled = orders.filter((order) => order.status === "cancelled");
  const revenue = completed.reduce(
    (sum, order) => sum + Number(order.totals?.total ?? 0),
    0,
  );
  const pipeline = active.reduce(
    (sum, order) => sum + Number(order.totals?.total ?? 0),
    0,
  );

  return {
    orders: orders.length,
    active: active.length,
    completed: completed.length,
    cancelled: cancelled.length,
    revenue,
    pipeline,
    customers: db.users.filter((user) => user.role === "customer").length,
    staff: db.users.filter((user) => user.role !== "customer").length,
    recent: [...orders].sort(byNewest).slice(0, 6),
    charts: buildAdminCharts(orders),
  };
}
