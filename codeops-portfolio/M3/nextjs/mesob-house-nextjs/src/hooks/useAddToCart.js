"use client";

import { useCallback } from "react";
import { useStore } from "@/store/appStore";
import { useToast } from "@/store/toastStore";

/** Returns `add(dish, quantity?, options?)` — adds to the cart and confirms with a toast. */
export default function useAddToCart() {
  const addToCart = useStore((s) => s.addToCart);
  const toast = useToast();
  return useCallback(
    (dish, quantity = 1, options) => {
      addToCart(dish, quantity, options);
      toast(quantity > 1 ? `Added ${quantity} × ${dish.name} to your basket` : `Added ${dish.name} to your basket`);
    },
    [addToCart, toast],
  );
}
