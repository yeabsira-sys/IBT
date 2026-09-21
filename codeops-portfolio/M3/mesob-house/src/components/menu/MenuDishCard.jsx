import { Link } from "react-router-dom";
import Button from "../ui/Button";
import { PriceTag, Tag } from "../ui/Primitives";

/** MenuDishCard — photo with corner label, name, description, price + Add. */
export default function MenuDishCard({ dish, onAdd }) {
  const { id, name, price, currency = "ETB", description, image, label } = dish;
  return (
    <article className="menu-card">
      <Link className="menu-card__media" to={`/dish/${id}`}>
        <img src={image} alt={name} />
        {label && <Tag tone={label.tone}>{label.text}</Tag>}
      </Link>
      <div className="menu-card__body">
        <h3>
          <Link to={`/dish/${id}`}>{name}</Link>
        </h3>
        <p>{description}</p>
      </div>
      <div className="menu-card__foot">
        <PriceTag currency={currency} amount={price} />
        <Button size="sm" onClick={() => onAdd?.(dish)}>
          Add
        </Button>
      </div>
    </article>
  );
}
