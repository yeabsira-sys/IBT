import Image from "next/image";
import Link from "next/link";
import { FiTrash2 } from "react-icons/fi";
import QuantityStepper from "../ui/QuantityStepper";
import { PriceTag, Tag } from "../ui/Primitives";

/**
 * BasketLineItem — thumbnail, tags, price, quantity stepper and remove.
 */
export default function BasketLineItem({ item, onQuantityChange, onRemove }) {
  const { id, name, note, price, currency = "ETB", description, image, imageAlt, tags = [], quantity } = item;

  return (
    <article className="basket-line">
      <Link className="basket-line__media" href={`/dish/${id}`} aria-label={`View ${name}`}>
        <Image className="basket-line__image" src={image} alt={imageAlt ?? name} width={176} height={152} />
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
          <Link className="dish-link" href={`/dish/${id}`}>
            {name} {note && <span className="basket-line__note">{note}</span>}
          </Link>
        </h3>
        <p className="basket-line__text">{description}</p>
      </div>

      <div className="basket-line__aside">
        <PriceTag currency={currency} amount={price} />
        <QuantityStepper value={quantity} onChange={(q) => onQuantityChange(item.key, q)} />
        <button
          type="button"
          className="basket-line__remove"
          onClick={() => onRemove(item.key)}
          aria-label={`Remove ${name}`}
        >
          <FiTrash2 />
        </button>
      </div>
    </article>
  );
}
