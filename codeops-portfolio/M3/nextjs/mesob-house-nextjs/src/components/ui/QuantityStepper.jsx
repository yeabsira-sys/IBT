import { FiMinus, FiPlus } from "react-icons/fi";

/**
 * QuantityStepper — minus / value / plus. Controlled: pass value + onChange.
 */
export default function QuantityStepper({ value, onChange, min = 1, max = 20, size = "md" }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className={`stepper stepper--${size}`}>
      <button type="button" className="stepper__btn" onClick={dec} disabled={value <= min} aria-label="Decrease quantity">
        <FiMinus />
      </button>
      <span className="stepper__value" aria-live="polite">
        {value}
      </span>
      <button type="button" className="stepper__btn" onClick={inc} disabled={value >= max} aria-label="Increase quantity">
        <FiPlus />
      </button>
    </div>
  );
}
