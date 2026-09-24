import { FiTrash2 } from "react-icons/fi";
import QuantityStepper from "../ui/QuantityStepper";
import { PriceTag, Tag } from "../ui/Primitives";
import { Link } from "react-router-dom";

export default function BasketLineItem({ item, onQuantityChange, onRemove }) {
  const {
    name,
    note,
    price,
    currency = "ETB",
    description,
    image,
    imageAlt,
    tags = [],
    quantity,
  } = item;

  return (
    <article className="basket-line">
      <Link to={`/dish/${item.id}`} className="basket-line__image">
        <img
          className="basket-line__image"
          src={image}
          alt={imageAlt ?? name}
        />
      </Link>

      <div className="basket-line__body">
        <div className="basket-line__tags">
          {tags.map((tag) => (
            <Tag key={tag.text} tone={tag.tone}>
              {tag.text}
            </Tag>
          ))}
        </div>
        <h3 className="basket-line__name">
          {name} {note && <span className="basket-line__note">{note}</span>}
        </h3>
        <p className="basket-line__text">{description}</p>
      </div>

      <div className="basket-line__aside">
        <PriceTag currency={currency} amount={price} />
        <QuantityStepper
          value={quantity}
          onChange={(q) => onQuantityChange(item.id, q)}
        />
        <button
          type="button"
          className="basket-line__remove"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${name}`}
        >
          <FiTrash2 />
        </button>
      </div>
    </article>
  );
}
