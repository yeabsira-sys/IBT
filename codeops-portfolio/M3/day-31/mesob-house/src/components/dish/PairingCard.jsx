import Button from "../ui/Button";
import { PriceTag, Tag } from "../ui/Primitives";

// PairingCard
export default function PairingCard({ item, onAdd }) {
  const { name, price, currency = "ETB", description, image, label } = item;
  return (
    <article className="pairing-card">
      <div className="pairing-card__media">
        <img src={image} alt={name} />
        {label && <Tag tone={label.tone}>{label.text}</Tag>}
      </div>
      <div className="pairing-card__body">
        <div className="pairing-card__head">
          <h4>{name}</h4>
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
