import { FaStar } from "react-icons/fa6";

/**
 * Tag — small pill label used over imagery and on cards.
 * tone: "gold" | "green" | "dark" | "brand" | "mint"
 */
export function Tag({ tone = "gold", icon, children, className = "" }) {
  return (
    <span className={`tag tag--${tone} ${className}`.trim()}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

/** Stars — read-only rating row. */
export function Stars({ value = 5, max = 5, label }) {
  return (
    <span className="stars" role="img" aria-label={label ?? `${value} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <FaStar key={i} className={i < value ? "stars__on" : "stars__off"} aria-hidden="true" />
      ))}
    </span>
  );
}

/** Avatar — initials disc. Pass `src` to use a photo instead. */
export function Avatar({ name = "", src, size = 30 }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return src ? (
    <img className="avatar" src={src} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className="avatar avatar--initials" style={{ width: size, height: size }} aria-hidden="true">
      {initials}
    </span>
  );
}

/** PriceTag — currency + amount in the brand accent. */
export function PriceTag({ currency = "ETB", amount, tone = "brand" }) {
  return (
    <span className={`price price--${tone}`}>
      {currency} {amount}
    </span>
  );
}

/**
 * SectionHeading — eyebrow + title + optional lede and trailing slot.
 * align: "start" | "center"
 */
export function SectionHeading({ eyebrow, title, lede, align = "start", trailing }) {
  return (
    <header className={`section-heading section-heading--${align}`}>
      <div>
        {eyebrow && <p className="section-heading__eyebrow">{eyebrow}</p>}
        <h2 className="section-heading__title">{title}</h2>
        {lede && <p className="section-heading__lede">{lede}</p>}
      </div>
      {trailing && <div className="section-heading__trailing">{trailing}</div>}
    </header>
  );
}
