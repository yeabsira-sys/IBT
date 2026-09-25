import { Link } from "react-router-dom";
import Button from "../ui/Button";
import { PriceTag, Tag } from "../ui/Primitives";

export default function SuggestedDishCard({ dish, onOrder }) {
  const {
    id,
    name,
    price,
    currency = "ETB",
    description,
    image,
    label,
    note,
  } = dish;

  return (
    <article className="suggested-card">
      <Link className="suggested-card__media" to={`/dish/${id}`}>
        <img src={image} alt={name} />
        {label && <Tag tone={label.tone}>{label.text}</Tag>}
      </Link>

      <div className="suggested-card__body">
        <div className="suggested-card__head">
          <h3>
            <Link to={`/dish/${id}`}>{name}</Link>
          </h3>
          <PriceTag currency={currency} amount={price} />
        </div>
        <p>{description}</p>
      </div>

      <div className="suggested-card__foot">
        <span>{note}</span>
        <Button size="sm" onClick={() => onOrder?.(dish)}>
          Order Now
        </Button>
      </div>
    </article>
  );
}
