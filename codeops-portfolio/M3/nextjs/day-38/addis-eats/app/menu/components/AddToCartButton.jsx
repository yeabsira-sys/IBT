"use client";

import { useCart } from "../../../context/CartProvider";

export default function AddToCartButton({ dish }) {
  const { addToCart } = useCart();

  return (
    <button
      onClick={() => addToCart(dish)}
      className="rounded-lg bg-orange-500 px-4 py-2 text-white"
    >
      Add to Cart
    </button>
  );
}
