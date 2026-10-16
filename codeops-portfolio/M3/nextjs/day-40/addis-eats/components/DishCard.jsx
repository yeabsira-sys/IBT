"use client";

import Link from "next/link";
import { useCart } from "../context/CartProvider";

export default function DishCard({ dish }) {
  const { addToCart } = useCart();
  return (
    <article className="dish-card">
      <Link href={`/menu/${dish.id}`} aria-label={`View ${dish.name}`}>
        <img src={dish.image} alt={dish.name} loading="lazy" />
      </Link>
      <div className="dish-card-body">
        {dish.popular && <span className="tag">Guest favorite</span>}
        <h3><Link href={`/menu/${dish.id}`}>{dish.name}</Link></h3>
        <p>{dish.description}</p>
        <div className="dish-card-footer">
          <span className="price">{Number(dish.price).toLocaleString()} ETB</span>
          <button className="btn btn-sm" onClick={() => addToCart(dish)}>Add to cart +</button>
        </div>
      </div>
    </article>
  );
}
