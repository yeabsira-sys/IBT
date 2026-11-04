import { FaStar, FaStarHalfStroke, FaRegStar } from "react-icons/fa6";

const SIZE = { sm: 12, md: 16, lg: 22 };

/** Accessible star row. `value` may be fractional (e.g. a 4.6 average). */
export default function Stars({
  value = 0,
  count,
  size = "sm",
  showValue = false,
  className = "",
}) {
  const px = SIZE[size] ?? SIZE.sm;
  const rounded = Math.round(Number(value ?? 0) * 2) / 2;

  return (
    <span
      className={`stars ${className}`.trim()}
      aria-label={`${Number(value ?? 0).toFixed(1)} out of 5 stars${count ? ` from ${count} reviews` : ""}`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rounded >= star;
        const half = !filled && rounded >= star - 0.5;
        return filled ? (
          <FaStar key={star} size={px} aria-hidden="true" />
        ) : half ? (
          <FaStarHalfStroke key={star} size={px} aria-hidden="true" />
        ) : (
          <FaRegStar key={star} size={px} aria-hidden="true" />
        );
      })}
      {showValue && <b className="stars__value">{Number(value ?? 0).toFixed(1)}</b>}
      {count !== undefined && <span className="stars__count">({count})</span>}
    </span>
  );
}
