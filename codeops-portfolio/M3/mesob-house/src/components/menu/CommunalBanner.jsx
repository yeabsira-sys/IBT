import { Link } from "react-router-dom";
import { FaUtensils } from "react-icons/fa6";
import { FiArrowRight } from "react-icons/fi";
import Button from "../ui/Button";

/** CommunalBanner — "Experience Communal Dining" callout with a CTA. */
export function CommunalBanner({ title, text, action }) {
  return (
    <div className="communal-banner">
      <span className="communal-banner__icon" aria-hidden="true">
        <FaUtensils />
      </span>
      <div className="communal-banner__body">
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
      <Button as={Link} to={action.to} variant="outline">
        {action.label}
      </Button>
    </div>
  );
}

/** StickyCartBar — fixed bottom bar summarising the current selection. */
export function StickyCartBar({ count, currency = "ETB", amount, note, ctaTo }) {
  if (!count) return null;
  return (
    <div className="sticky-cart">
      <div className="container sticky-cart__inner">
        <span className="sticky-cart__summary">
          <b>
            Selected: {count} items · {currency} {amount}
          </b>
          {note && <small>{note}</small>}
        </span>
        <Button as={Link} to={ctaTo} variant="primary" rightIcon={<FiArrowRight />}>
          Proceed to Cart
        </Button>
      </div>
    </div>
  );
}
