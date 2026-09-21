export default function TrustStrip({ items = [] }) {
  return (
    <div className="trust-strip">
      {items.map((item) => (
        <div key={item.label} className="trust-strip__item">
          <span className="trust-strip__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span>
            <b>{item.label}</b>
            <small>{item.sub}</small>
          </span>
        </div>
      ))}
    </div>
  );
}
