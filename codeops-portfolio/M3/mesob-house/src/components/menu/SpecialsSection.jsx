import { useMemo, useState } from "react";
import { FiShoppingBag } from "react-icons/fi";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import ChipGroup from "../ui/ChipGroup";
import { PriceTag, SectionHeading, Tag } from "../ui/Primitives";

/**
 * DishCard — photo, labels, price, description and the add-to-cart row.
 * Reuse anywhere a menu item appears (menu page, search results, upsells).
 */
export function DishCard({ dish, onAdd, onView }) {
  const { name, price, currency = "ETB", description, image, imageAlt, label, heat } = dish;

  return (
    <article className="dish">
      <div className="dish__media">
        <img src={image} alt={imageAlt ?? name} />
        {label && (
          <Tag tone={label.tone} className="dish__label">
            {label.text}
          </Tag>
        )}
        {heat && (
          <Tag tone="dark" className="dish__heat">
            {heat}
          </Tag>
        )}
      </div>

      <div className="dish__body">
        <div className="dish__head">
          <h3 className="dish__name">
            <Link to={`/dish/${dish.id}`}>{name}</Link>
          </h3>
          <PriceTag currency={currency} amount={price} />
        </div>
        <p className="dish__text">{description}</p>
      </div>

      <div className="dish__foot">
        <Link className="link-quiet" to={`/dish/${dish.id}`}>
          View Details
        </Link>
        <Button size="sm" leftIcon={<FiShoppingBag />} onClick={() => onAdd?.(dish)}>
          Quick Add
        </Button>
      </div>
    </article>
  );
}

/**
 * SpecialsSection — heading, filter pills and the dish grid.
 * Filtering is local; pass `onFilterChange` if the server should do it instead.
 */
export default function SpecialsSection({
  eyebrow,
  title,
  lede,
  filters = [],
  dishes = [],
  onAdd,
  onView,
  onFilterChange,
}) {
  const [filter, setFilter] = useState(filters[0]?.value ?? "all");

  const visible = useMemo(
    () => (filter === "all" ? dishes : dishes.filter((d) => d.tags?.includes(filter))),
    [dishes, filter]
  );

  const handleFilter = (value) => {
    const next = value ?? "all";
    setFilter(next);
    onFilterChange?.(next);
  };

  return (
    <section className="section">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        lede={lede}
        trailing={
          filters.length > 0 && (
            <div className="filter">
              <span className="filter__label">Filter</span>
              <ChipGroup
                label="Filter specials"
                options={filters}
                value={filter}
                onChange={handleFilter}
              />
            </div>
          )
        }
      />

      <div className="dish-grid">
        {visible.map((dish) => (
          <DishCard key={dish.id} dish={dish} onAdd={onAdd} onView={onView} />
        ))}
      </div>
    </section>
  );
}
