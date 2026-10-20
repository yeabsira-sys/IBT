"use client";

import PairingCard from "./PairingCard";
import useAddToCart from "@/hooks/useAddToCart";

/** DishPairings — suggested drinks/sides with working "Add" buttons. */
export default function DishPairings({ eyebrow, title, lede, items }) {
  const addToCart = useAddToCart();
  return (
    <section className="pairing">
      <header className="pairing__head">
        <div>
          <p className="section-heading__eyebrow">{eyebrow}</p>
          <h2 className="pairing__title">{title}</h2>
        </div>
        <p className="pairing__lede">{lede}</p>
      </header>
      <div className="pairing__grid">
        {items.map((item) => (
          <PairingCard key={item.name} item={item} onAdd={addToCart} />
        ))}
      </div>
    </section>
  );
}
