"use client";

import { useCallback } from "react";
import { useStore } from "@/store/appStore";
import { useToast } from "@/store/toastStore";

/** Mirrors the server's default-option resolution for quick-add cards. */
function defaultSelection(dish) {
  const groups = dish.optionGroups ?? [];
  if (!groups.length) return { options: undefined, labels: undefined, price: dish.price };

  const options = {};
  const labels = {};
  let delta = 0;

  for (const group of groups) {
    const configured = dish.optionDefaults?.[group.key];
    let values = Array.isArray(configured)
      ? configured
      : configured
        ? [configured]
        : (group.options ?? [])
            .filter((option) => option.isDefault)
            .map((option) => option.value);

    values = [...new Set(values.filter(Boolean))];
    if (!values.length) {
      values = (group.options ?? []).slice(0, 1).map((option) => option.value);
    }
    if (!group.multi) values = values.slice(0, 1);
    else values = values.slice(0, group.max);

    const titles = [];
    for (const value of values) {
      const option = (group.options ?? []).find((item) => item.value === value);
      if (!option) continue;
      delta += Number(option.priceDeltaCents ?? 0);
      titles.push(option.title);
    }

    options[group.key] = group.multi ? values : values[0] ?? "";
    labels[group.key] = group.multi ? titles : titles[0] ?? "";
  }

  const baseCents = Number.isFinite(Number(dish.priceCents))
    ? Number(dish.priceCents)
    : Number(dish.price) * 100;

  return {
    options,
    labels,
    price: String((baseCents + delta) / 100),
  };
}

/** Returns `add(dish, quantity?, options?, optionLabels?)` — adds to the cart and confirms with a toast. */
export default function useAddToCart() {
  const addToCart = useStore((s) => s.addToCart);
  const toast = useToast();
  return useCallback(
    (dish, quantity = 1, options, optionLabels) => {
      if (options === undefined) {
        const defaults = defaultSelection(dish);
        addToCart(
          { ...dish, price: defaults.price },
          quantity,
          defaults.options,
          defaults.labels,
        );
      } else {
        addToCart(dish, quantity, options, optionLabels);
      }
      toast(quantity > 1 ? `Added ${quantity} × ${dish.name} to your basket` : `Added ${dish.name} to your basket`);
    },
    [addToCart, toast],
  );
}
