import { FaRegCreditCard } from "react-icons/fa6";
import { FiLock } from "react-icons/fi";
import CheckoutSection from "./CheckoutSection";
import Button from "../ui/Button";
import { Tag } from "../ui/Primitives";

function PaymentOptionRow({ method, selected, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`payment-row${selected ? " payment-row--selected" : ""}`}
      onClick={onSelect}
    >
      <span className="payment-row__radio" aria-hidden="true" />
      <span className="payment-row__logo" style={{ background: method.tint }}>
        {method.mark}
      </span>
      <span className="payment-row__body">
        <b>{method.name}</b>
        <small>{method.text}</small>
      </span>
      <span className="payment-row__icon" aria-hidden="true">
        {method.icon}
      </span>
    </button>
  );
}

/**
 * PaymentMethodCard — step 3: Telebirr as the expanded default method, then
 * a stacked list of alternative radio methods.
 */
export default function PaymentMethodCard({
  telebirr,
  phone,
  onPhoneChange,
  onVerify,
  otherMethods,
  selectedMethod,
  onSelectMethod,
}) {
  const telebirrSelected = selectedMethod === "telebirr";

  return (
    <CheckoutSection
      number={3}
      icon={<FaRegCreditCard />}
      title="Payment Method"
      trailing={
        <span className="checkout-card__link checkout-card__link--muted">
          <FiLock aria-hidden="true" /> Encrypted & Direct
        </span>
      }
    >
      <div
        className={`payment-row payment-row--expanded${telebirrSelected ? " payment-row--selected" : ""}`}
      >
        <button
          type="button"
          role="radio"
          aria-checked={telebirrSelected}
          className="payment-row__head"
          onClick={() => onSelectMethod("telebirr")}
        >
          <span className="payment-row__radio" aria-hidden="true" />
          <span
            className="payment-row__logo"
            style={{ background: telebirr.tint }}
          >
            {telebirr.mark}
          </span>
          <span className="payment-row__body">
            <b>
              {telebirr.name} <Tag tone="gold">{telebirr.badge}</Tag>
            </b>
            <small>{telebirr.text}</small>
          </span>
          <span className="payment-row__icon" aria-hidden="true">
            {telebirr.icon}
          </span>
        </button>

        {telebirrSelected && (
          <div className="telebirr-panel">
            <div className="telebirr-panel__qr" aria-hidden="true">
              {telebirr.qrIcon}
            </div>
            <div className="telebirr-panel__body">
              <h4>{telebirr.panelTitle}</h4>
              <p>{telebirr.panelText}</p>
              <div className="telebirr-panel__row">
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                />
                <Button size="sm" variant="dark" onClick={onVerify}>
                  Verify
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="payment-list">
        {otherMethods.map((method) => (
          <PaymentOptionRow
            key={method.name}
            method={method}
            selected={selectedMethod === method.name}
            onSelect={() => onSelectMethod(method.name)}
          />
        ))}
      </div>
    </CheckoutSection>
  );
}
