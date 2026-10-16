"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "../context/CartProvider";

export default function DishDetailActions({ dish }) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  function add() { addToCart(dish, quantity); }
  return (
    <div>
      <div className="quantity-control" style={{ marginBottom: 20 }}>
        <button aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
        <strong>{quantity}</strong>
        <button aria-label="Increase quantity" onClick={() => setQuantity((q) => q + 1)}>+</button>
      </div>
      <div className="hero-actions">
        <button className="btn" onClick={add}>Add to cart · {(Number(dish.price) * quantity).toLocaleString()} ETB</button>
        <Link href="/cart" className="btn btn-secondary" onClick={add}>Buy now</Link>
      </div>
    </div>
  );
}
