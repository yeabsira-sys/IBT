import { useStore } from "../stores/useStores";

export default function useNavbarState() {
  const { cartItems, getTotals: getTotalFn, session } = useStore();
  const totals = getTotalFn();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  return {
    cart: {
      itemCount,
      currency: "ETB",
      amount: totals.subtotal.toLocaleString(),
    },
    user: session ? { name: session.name } : undefined,
  };
}
