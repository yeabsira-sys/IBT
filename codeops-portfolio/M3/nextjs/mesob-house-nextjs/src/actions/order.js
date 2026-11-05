"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { checkoutSchema } from "@/lib/schemas";
import { cancelOrderForUser, createOrder } from "@/lib/orders";

function optionSelections(selections) {
  const options = [];
  for (const [groupKey, raw] of Object.entries(selections ?? {})) {
    const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const value of values) {
      const optionValue = String(value ?? "").trim();
      if (groupKey && optionValue) {
        options.push({ groupKey, optionValue });
      }
    }
  }
  return options;
}

export async function submitOrder(payload) {
  const user = await getSession();
  if (!user) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Please sign in before placing an order.",
    };
  }

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      code: "INVALID",
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  const items = parsed.data.items.map((line) => ({
    menuItemSlug: String(line.id),
    quantity: line.quantity,
    options: optionSelections(line.options),
  }));

  try {
    const order = await createOrder({
      user,
      items,
      couponCode: parsed.data.couponCode,
      note: parsed.data.note,
      fulfillment: parsed.data.fulfillment,
      contact: parsed.data.contact,
      delivery: parsed.data.delivery,
      method: parsed.data.method,
    });

    if (!order) {
      return {
        ok: false,
        code: "ORDER_FAILED",
        message: "The kitchen could not create that order. Please try again.",
      };
    }

    revalidatePath("/orders");
    revalidatePath(`/orders/${order.id}`);
    revalidatePath("/kitchen");
    revalidatePath("/admin");
    revalidatePath("/admin/orders");

    return {
      ok: true,
      message: `Order ${order.id} is confirmed. Our kitchen is preparing your feast.`,
      order,
    };
  } catch (error) {
    if (error?.name === "OrderSnapshotError") {
      return {
        ok: false,
        code: error.code ?? "ORDER_FAILED",
        message: error.message,
      };
    }
    return {
      ok: false,
      code: "ORDER_FAILED",
      message: error?.message?.includes("delivery area")
        ? error.message
        : "The kitchen could not create that order. Please try again.",
    };
  }
}

/** Customer cancellation — ownership and status are enforced inside the query helper. */
export async function cancelOrder(orderId) {
  const user = await getSession();
  if (!user) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Please sign in to cancel an order.",
    };
  }

  const result = await cancelOrderForUser(orderId, user.id);
  if (result.ok) {
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/kitchen");
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
  }
  return result;
}
