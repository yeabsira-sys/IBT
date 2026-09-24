import { Link } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiPlus, FiShield } from "react-icons/fi";
import Button from "../ui/Button";
import { PriceTag, Tag } from "../ui/Primitives";

function SummaryLine({ item }) {
  return (
    <div className="summary-line">
      <img src={item.image} alt="" />
      <div className="summary-line__body">
        <div className="summary-line__head">
          <h4>{item.name}</h4>
          <PriceTag currency="ETB" amount={item.price} />
        </div>
        <p>{item.description}</p>
        <span className="summary-line__meta">
          <Tag tone={item.tag.tone}>{item.tag.text}</Tag>
          <span>Qty: {item.quantity}</span>
        </span>
      </div>
    </div>
  );
}

export default function CheckoutSummary({
  eyebrow,
  title,
  editHref,
  items = [],
  deliveringTo,
  costs = [],
  total,
  currency = "ETB",
  guarantee,
  ctaLabel,
  onConfirm,
  support,
}) {
  return (
    <aside className="checkout-summary">
      <div className="checkout-summary__head">
        <div>
          <p className="section-heading__eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        {editHref && (
          <Link className="checkout-summary__edit" to={editHref}>
            Edit Cart
          </Link>
        )}
      </div>

      <div className="summary-lines">
        {items.map((item) => (
          <SummaryLine key={item.name} item={item} />
        ))}
      </div>

      {deliveringTo && (
        <div className="delivering-to">
          <div className="delivering-to__head">
            <span>Delivering To</span>
            <span className="delivering-to__status">
              <FiCheckCircle aria-hidden="true" /> {deliveringTo.status}
            </span>
          </div>
          <p className="delivering-to__address">{deliveringTo.address}</p>
          <p className="delivering-to__eta">{deliveringTo.eta}</p>
        </div>
      )}

      <div className="summary-costs">
        {costs.map((row) => (
          <div
            key={row.label}
            className={`summary-costs__row${row.tone ? ` summary-costs__row--${row.tone}` : ""}`}
          >
            <span>{row.label}</span>
            <span>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="summary-total">
        <span className="summary-total__caption">Total Amount Due</span>
        <div className="summary-total__row">
          <span className="summary-total__label">Grand Total</span>
          <span className="summary-total__value">
            {currency} {total}
          </span>
        </div>
        <span className="summary-total__note">VAT inclusive</span>
      </div>

      {guarantee && (
        <p className="summary-guarantee">
          <FiShield aria-hidden="true" />
          {guarantee}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        leftIcon={<FiCheckCircle />}
        onClick={onConfirm}
      >
        {ctaLabel}
      </Button>

      <div className="checkout-summary__links">
        <Link to="/cart">
          <FiArrowLeft aria-hidden="true" /> Return to Cart
        </Link>
        <Link to="/menu">
          <FiPlus aria-hidden="true" /> Add More Dishes
        </Link>
      </div>

      {support && (
        <div className="support-card">
          <span className="support-card__icon" aria-hidden="true">
            {support.icon}
          </span>
          <div className="support-card__body">
            <h4>{support.title}</h4>
            <p>{support.text}</p>
          </div>
          <a className="btn btn--light btn--sm" href={`tel:${support.phone}`}>
            Call Now
          </a>
        </div>
      )}
    </aside>
  );
}
