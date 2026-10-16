"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "../../lib/session";
import { getOrderById, cancelOrderRecord } from "../../lib/orders";

export async function cancelCustomerOrder(orderId) {
  // Authentication check: who is making the request?
  const user = await getSession();

  if (!user) {
    throw new Error("Unauthorized: sign in first.");
  }

  if (typeof orderId !== "string" || !orderId) {
    throw new Error("Invalid order ID.");
  }

  // Load the order from the trusted data source.
  const order = await getOrderById(orderId);

  if (!order) {
    throw new Error("Order not found.");
  }

  // Authorization check: does this user own the order?
  if (order.userId !== user.id) {
    throw new Error("Forbidden: this order does not belong to you.");
  }

  if (order.status === "Cancelled" || order.status === "Delivered") {
    throw new Error("This order cannot be cancelled.");
  }

  await cancelOrderRecord(orderId);

  revalidatePath("/orders");

  return { success: true };
}
