import { FaMugHot, FaBreadSlice } from "react-icons/fa6";
import { FiArrowRight } from "react-icons/fi";
import Button from "../ui/Button";
import { PriceTag, Tag } from "../ui/Primitives";

export function BeverageCard({ item, onAdd }) {
  const {
    name,
    price,
    currency = "ETB",
    description,
    note,
    tag,
    action,
  } = item;
  return (
    <article className="beverage">
      <div className="beverage__head">
        <Tag tone={tag.tone}>{tag.text}</Tag>
        <PriceTag currency={currency} amount={price} />
      </div>
      <h3 className="beverage__name">{name}</h3>
      <p className="beverage__text">{description}</p>
      <div className="beverage__foot">
        <span className="beverage__note">{note}</span>
        <Button size="sm" variant="outline" onClick={() => onAdd?.(item)}>
          {action ?? `Add ${name}`}
        </Button>
      </div>
    </article>
  );
}

/** AddOnRow — a single wide upsell strip (injera baskets, sides). */
export function AddOnRow({ item, onAdd }) {
  const { name, description, price, currency = "ETB", action } = item;
  return (
    <div className="addon">
      <span className="addon__icon" aria-hidden="true">
        <FaBreadSlice />
      </span>
      <div className="addon__body">
        <h4 className="addon__name">{name}</h4>
        <p className="addon__text">{description}</p>
      </div>
      <span className="addon__price">
        {currency} {price}
      </span>
      <Button size="sm" onClick={() => onAdd?.(item)}>
        {action ?? "Add"}
      </Button>
    </div>
  );
}

export function CeremonyNote({ title, text, action }) {
  return (
    <div className="ceremony">
      <h3 className="ceremony__title">
        <FaMugHot aria-hidden="true" />
        {title}
      </h3>
      <p className="ceremony__text">{text}</p>
      {action && (
        <a className="link-brand" href={action.href}>
          {action.label}
          <FiArrowRight aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

/**
 * GurshaSection — the two-column band: the gursha story on the left,
 * house drinks and an add-on strip on the right.
 */
export default function GurshaSection({
  eyebrow,
  quote,
  body,
  ceremony,
  beverages = [],
  addOn,
  onAdd,
}) {
  return (
    <section className="gursha">
      <div className="container gursha__grid">
        <div>
          <p className="section-heading__eyebrow">{eyebrow}</p>
          <h2 className="gursha__quote">“{quote}”</h2>
          <p className="gursha__text">{body}</p>
          {ceremony && <CeremonyNote {...ceremony} />}
        </div>

        <div className="gursha__side">
          <div className="gursha__drinks">
            {beverages.map((item) => (
              <BeverageCard key={item.name} item={item} onAdd={onAdd} />
            ))}
          </div>
          {addOn && <AddOnRow item={addOn} onAdd={onAdd} />}
        </div>
      </div>
    </section>
  );
}
