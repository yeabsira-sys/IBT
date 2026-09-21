import { Link } from "react-router-dom";

/**
 * Breadcrumbs — items: [{ label, to }]. The last item renders as current.
 * Pass `trailing` for a right-aligned note (e.g. a status badge).
 */
export default function Breadcrumbs({ items = [], trailing }) {
  return (
    <div className="breadcrumb-row">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <span key={item.label} style={{ display: "inline-flex", gap: 8 }}>
              <span className="breadcrumbs__sep" aria-hidden="true">
                /
              </span>
              {isLast || !item.to ? (
                <span className="breadcrumbs__item--current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
            </span>
          );
        })}
      </nav>
      {trailing && <div className="breadcrumb-row__trailing">{trailing}</div>}
    </div>
  );
}
