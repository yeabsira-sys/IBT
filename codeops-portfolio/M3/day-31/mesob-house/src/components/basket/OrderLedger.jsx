import { useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import { Link } from "react-router-dom";
import Button from "../ui/Button";

function LedgerRow({ label, value, tone, hint }) {
  return (
    <div className={`ledger-row${tone ? ` ledger-row--${tone}` : ""}`}>
      <span>
        {label}
        {hint && <span className="ledger-row__hint"> {hint}</span>}
      </span>
      <span>{value}</span>
    </div>
  );
}

export default function OrderLedger({
  title,
  rows = [],
  coupon,
  couponPlaceholder,
  onApplyCoupon,
  total,
  currency = "ETB",
  ctaLabel,
  ctaTo,
  exploreLabel,
  exploreTo,
  trust = [],
  upsell,
  onAddUpsell,
}) {
  const [couponInput, setCouponInput] = useState("");

  return (
    <aside className="ledger">
      <div className="ledger__head">
        <h3>{title}</h3>
        <span className="ledger__unit">Birr (ETB)</span>
      </div>

      <div className="ledger__rows">
        {rows.map((row) => (
          <LedgerRow key={row.label} {...row} />
        ))}
      </div>

      <div className="ledger__coupon">
        <input
          type="text"
          placeholder={couponPlaceholder}
          value={couponInput}
          onChange={(e) => setCouponInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onApplyCoupon?.(couponInput)}
        />
        <Button
          size="sm"
          variant="soft"
          onClick={() => onApplyCoupon?.(couponInput)}
        >
          Apply
        </Button>
      </div>

      {coupon && (
        <div className="ledger__applied">
          <span>{coupon.label}</span>
          <span>{coupon.value}</span>
        </div>
      )}

      <div className="ledger__total">
        <div>
          <span className="ledger__total-label">Grand Total</span>
          <span className="ledger__total-note">Taxes included</span>
        </div>
        <span className="ledger__total-value">
          {currency} {total}
        </span>
      </div>

      <Button
        as={Link}
        to={ctaTo}
        variant="primary"
        size="lg"
        block
        rightIcon={<FiArrowRight />}
      >
        {ctaLabel}
      </Button>

      {exploreLabel && (
        <Link className="ledger__explore" to={exploreTo}>
          {exploreLabel}
        </Link>
      )}

      {trust.length > 0 && (
        <ul className="ledger__trust">
          {trust.map((item) => (
            <li key={item.text}>
              <span aria-hidden="true">{item.icon}</span>
              {item.text}
            </li>
          ))}
        </ul>
      )}

      {upsell && (
        <div className="ledger__upsell">
          <span className="ledger__upsell-icon" aria-hidden="true">
            {upsell.icon}
          </span>
          <div>
            <h4>{upsell.title}</h4>
            <p>{upsell.text}</p>
            <button type="button" onClick={() => onAddUpsell?.(upsell)}>
              {upsell.action} <FiArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
