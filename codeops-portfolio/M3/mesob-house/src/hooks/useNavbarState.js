import { useStore } from "../context/StoreContext";

/**
 * useNavbarState — derives the Navbar's live cart-pill total and signed-in
 * user from the shared store, so every page shows the same real cart and
 * account state instead of the old static demo numbers.
 */
export default function useNavbarState() {
  const { cartItems, totals, session } = useStore();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  return {
    cart: { itemCount, currency: "ETB", amount: totals.subtotal.toLocaleString() },
    user: session ? { name: session.name } : undefined,
  };
}
