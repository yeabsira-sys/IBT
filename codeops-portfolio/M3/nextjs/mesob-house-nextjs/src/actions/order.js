"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { getAllDishes } from "@/lib/menu";
import { checkoutSchema } from "@/lib/schemas";
import { getCartTotals } from "@/lib/pricing";
import { cancelOrderForUser, createOrder } from "@/lib/orders";

function chosenOptions(dish, selections) {
  const chosen = {};
  const labels = [];
  let deltaCents = 0;

  for (const group of dish.optionGroups ?? []) {
    const raw = selections?.[group.key];
    let values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    values = [...new Set(values.map(String).filter(Boolean))];

    if (!values.length) {
      const fallback = dish.optionDefaults?.[group.key];
      values = Array.isArray(fallback) ? fallback : fallback ? [fallback] : [];
    }
    if (!group.multi) values = values.slice(0, 1);
    else values = values.slice(0, group.max);

    for (const value of values) {
      const option = group.options.find((item) => item.value === value);
      if (!option) {
        return {
          error: `The ${group.title} choice is no longer available. Please reopen the dish and choose again.`,
        };
      }
      deltaCents += option.priceDeltaCents ?? 0;
      labels.push(`${group.title}: ${option.title}`);
    }

    chosen[group.key] = group.multi ? values : values[0] ?? "";
  }

  return { chosen, labels, deltaCents };
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

  const { dishes } = await getAllDishes();
  const menuById = new Map(dishes.map((dish) => [String(dish.id), dish]));
  const items = [];

  for (const line of parsed.data.items) {
    const dish = menuById.get(String(line.id));
    if (!dish) {
      return {
        ok: false,
        code: "DISH_UNAVAILABLE",
        message: `"${line.name}" is no longer on today's menu. Remove it and try again.`,
      };
    }

    const selection = chosenOptions(dish, line.options);
    if (selection.error) {
      return {
        ok: false,
        code: "OPTION_UNAVAILABLE",
        message: selection.error,
      };
    }

    const unitPriceCents = dish.priceCents + selection.deltaCents;
    items.push({
      id: String(dish.id),
      name: selection.labels.length
        ? `${dish.name} (${selection.labels.join(", ")})`
        : dish.name,
      price: unitPriceCents / 100,
      quantity: line.quantity,
      options: selection.chosen,
      optionLabels: selection.labels,
    });
  }

  const totals = getCartTotals(items, parsed.data.couponCode);
  const order = await createOrder({
    user,
    items,
    totals,
    couponCode: parsed.data.couponCode,
    note: parsed.data.note,
    fulfillment: parsed.data.fulfillment,
    contact: parsed.data.contact,
    delivery: parsed.data.delivery,
    method: parsed.data.method,
  });

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
