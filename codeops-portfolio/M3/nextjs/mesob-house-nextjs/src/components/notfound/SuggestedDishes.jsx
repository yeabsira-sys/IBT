"use client";

import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import SuggestedDishCard from "./SuggestedDishCard";
import useAddToCart from "@/hooks/useAddToCart";

/**
 * SuggestedDishes — "House Favorites" recovery section: a heading with a
 * catalog link, and a row of dish cards to redirect the visitor's appetite.
 */
export default function SuggestedDishes({ eyebrow, title, viewAllHref, viewAllLabel, dishes = [] }) {
  const onOrder = useAddToCart();
  return (
    <section className="section suggested">
      <div className="suggested__head">
        <div>
          <p className="section-heading__eyebrow">{eyebrow}</p>
          <h2 className="suggested__title">{title}</h2>
        </div>
        {viewAllHref && (
          <Link className="suggested__view-all" href={viewAllHref}>
            {viewAllLabel} <FiArrowRight aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="suggested__grid">
        {dishes.map((dish) => (
          <SuggestedDishCard key={dish.id} dish={dish} onOrder={onOrder} />
        ))}
      </div>
    </section>
  );
}
