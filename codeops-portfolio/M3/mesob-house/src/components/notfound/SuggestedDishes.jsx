import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import SuggestedDishCard from "./SuggestedDishCard";

/**
 * SuggestedDishes — "House Favorites" recovery section: a heading with a
 * catalog link, and a row of dish cards to redirect the visitor's appetite.
 */
export default function SuggestedDishes({ eyebrow, title, viewAllHref, viewAllLabel, dishes = [], onOrder }) {
  return (
    <section className="section suggested">
      <div className="suggested__head">
        <div>
          <p className="section-heading__eyebrow">{eyebrow}</p>
          <h2 className="suggested__title">{title}</h2>
        </div>
        {viewAllHref && (
          <Link className="suggested__view-all" to={viewAllHref}>
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
