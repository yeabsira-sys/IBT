"use client";

import { useSpecials } from "../hooks/useSpecials";
import DishCard from "./DishCard";

export default function SpecialsSection() {
  const { data, error, isLoading } = useSpecials();

  const specials = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <section className="container" style={{ paddingBottom: 48 }}>
      <div className="page-heading">
        <span className="eyebrow">Selected for you</span>
        <h2>Today's Specials</h2>
        <p>Discover something delicious from our special menu.</p>
      </div>

      {isLoading ? (
        <p>Loading today's specials...</p>
      ) : error ? (
        <div className="empty-state">
          <h2>Specials unavailable</h2>
          <p>Please try again later.</p>
        </div>
      ) : specials.length > 0 ? (
        <div className="dish-grid">
          {specials.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No specials available</h2>
          <p>Please check back later for our latest specials.</p>
        </div>
      )}
    </section>
  );
}
