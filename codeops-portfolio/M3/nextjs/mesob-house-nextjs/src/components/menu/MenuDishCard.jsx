import Image from "next/image";
import Link from "next/link";
import Button from "../ui/Button";
import { PriceTag, Tag } from "../ui/Primitives";

/** MenuDishCard — photo with corner label, name, description, price + Add. */
export default function MenuDishCard({ dish, onAdd }) {
  const { id, name, price, currency = "ETB", description, image, label } = dish;
  return (
    <article className="menu-card">
      <Link className="menu-card__media" href={`/dish/${id}`}>
        <Image
          src={image}
          alt={name}
          width={500}
          height={375}
          sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 25vw"
          loading="lazy"
        />
        {label && <Tag tone={label.tone}>{label.text}</Tag>}
      </Link>
      <div className="menu-card__body">
        <h3>
          <Link className="dish-link" href={`/dish/${id}`}>
            {name}
          </Link>
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
