"use client";

import { useStore } from "@/store/appStore";
import useSession from "./useSession";

/** Live cart-pill figures + the server session (cached by SWR) for the navbar. */
export default function useNavbarState() {
  const cartItems = useStore((s) => s.cartItems);
  const subtotal = useStore((s) => s.totals.subtotal);
  const { user } = useSession();

  return {
    cart: {
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      currency: "ETB",
      amount: subtotal.toLocaleString("en-US"),
    },
    user: user ? { name: user.fullName, role: user.role } : undefined,
  };
}
