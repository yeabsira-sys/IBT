import { FaStar } from "react-icons/fa6";

/** Divider — hairline rule with optional centred caption. */
export function Divider({ children }) {
  return <div className="divider">{children}</div>;
}

/** Badge — gold membership marker with the mesob-weave dots. */
export function Badge({ children, icon = <FaStar />, dots = 6 }) {
  return (
    <span className="badge">
      <span aria-hidden="true">{icon}</span>
      <span className="badge__dots" aria-hidden="true">
        {Array.from({ length: dots }, (_, i) => (
          <span key={i} className="badge__dot" />
        ))}
      </span>
      {children}
    </span>
  );
}

/**
 * Card — surface container.
 * variant: "flat" | "raised" | "panel"
 */
export function Card({ variant = "flat", as: Tag = "section", className = "", children, ...rest }) {
  return (
    <Tag className={`card card--${variant} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
