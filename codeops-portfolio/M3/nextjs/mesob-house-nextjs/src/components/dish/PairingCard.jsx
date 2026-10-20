import Image from "next/image";
import Link from "next/link";
import Button from "../ui/Button";
import { PriceTag, Tag } from "../ui/Primitives";

/** PairingCard — a suggested drink or side to order alongside the main dish. */
export default function PairingCard({ item, onAdd }) {
  const { id, name, price, currency = "ETB", description, image, label } = item;
  return (
    <article className="pairing-card">
      <Link className="pairing-card__media" href={`/dish/${id}`} aria-label={`View ${name}`}>
        <Image src={image} alt={name} width={500} height={312} sizes="(max-width: 640px) 100vw, 33vw" />
        {label && <Tag tone={label.tone}>{label.text}</Tag>}
      </Link>
      <div className="pairing-card__body">
        <div className="pairing-card__head">
          <h4>
            <Link className="dish-link" href={`/dish/${id}`}>{name}</Link>
          </h4>
          <PriceTag currency={currency} amount={price} />
        </div>
        <p>{description}</p>
      </div>
      <Button size="sm" variant="soft" onClick={() => onAdd?.(item)}>
        Add
      </Button>
    </article>
  );
}
