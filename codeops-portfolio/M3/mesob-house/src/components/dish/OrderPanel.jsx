import { FiPackage, FiShoppingBag } from "react-icons/fi";
import { FaHeart, FaRegHeart } from "react-icons/fa6";
import Button from "../ui/Button";
import QuantityStepper from "../ui/QuantityStepper";
import InfoStrip from "./InfoStrip";
import OptionGroup from "./OptionGroup";

/**
 * OrderPanel — the dish detail page's right column: name, price, info strip,
 * every OptionGroup, the quantity stepper and the add-to-order button.
 */
export default function OrderPanel({
  name,
  note,
  price,
  currency = "ETB",
  description,
  info,
  groups,
  values,
  onGroupChange,
  quantity,
  onQuantityChange,
  onAddToOrder,
  onSaveFavorite,
  isFavorite = false,
  onOrderAsGroup,
}) {
  return (
    <section className="order-panel">
      <div className="order-panel__head">
        <h1>
          {name} <span>{note}</span>
        </h1>
        <span className="order-panel__price">
          {currency} <b>{price}</b>
        </span>
      </div>

      <p className="order-panel__lede">{description}</p>

      <InfoStrip items={info} />

      {groups.map((group) => (
        <OptionGroup
          key={group.key}
          {...group}
          value={values[group.key]}
          onChange={(v) => onGroupChange(group.key, v)}
        />
      ))}

      <div className="order-panel__cta">
        <QuantityStepper value={quantity} onChange={onQuantityChange} size="lg" />
        <Button variant="primary" size="lg" block leftIcon={<FiShoppingBag />} onClick={onAddToOrder}>
          Add to Order · {currency} {price}
        </Button>
      </div>

      <div className="order-panel__foot">
        <button type="button" className="link-quiet" onClick={onSaveFavorite}>
          {isFavorite ? <FaHeart aria-hidden="true" color="var(--c-brand)" /> : <FaRegHeart aria-hidden="true" />}{" "}
          {isFavorite ? "Saved to Favorites" : "Save to Favorites"}
        </button>
        <button type="button" className="link-brand" onClick={onOrderAsGroup}>
          <FiPackage aria-hidden="true" /> Order as Group Mesob Feast
        </button>
      </div>
    </section>
  );
}
