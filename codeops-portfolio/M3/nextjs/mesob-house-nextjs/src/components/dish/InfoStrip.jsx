/** InfoStrip — small icon+label facts in a row (serves, refills, taxes). */
export default function InfoStrip({ items = [] }) {
  return (
    <div className="info-strip">
      {items.map((item, i) => (
        <span key={item.label} className="info-strip__item">
          {item.icon && (
            <span className={`info-strip__icon${item.tone ? ` info-strip__icon--${item.tone}` : ""}`} aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span>
            <b>{item.label}</b>
            {item.sub && <small>{item.sub}</small>}
          </span>
          {i < items.length - 1 && <i className="info-strip__dot" aria-hidden="true" />}
        </span>
      ))}
    </div>
  );
}
