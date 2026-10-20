import Image from "next/image";
import Link from "next/link";
import Button from "../ui/Button";
import { PriceTag, Tag } from "../ui/Primitives";

/**
 * SuggestedDishCard — a compact dish card for the 404 page's "you might like
 * this instead" grid: name + price share a row, a short note sits above the
 * order button.
 */
export default function SuggestedDishCard({ dish, onOrder }) {
  const { id, name, price, currency = "ETB", description, image, label, note } = dish;

  return (
    <article className="suggested-card">
      <Link className="suggested-card__media" href={`/dish/${id}`}>
        <Image src={image} alt={name} width={500} height={375} sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw" />
        {label && <Tag tone={label.tone}>{label.text}</Tag>}
      </Link>

      <div className="suggested-card__body">
        <div className="suggested-card__head">
          <h3>
            <Link className="dish-link" href={`/dish/${id}`}>{name}</Link>
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
