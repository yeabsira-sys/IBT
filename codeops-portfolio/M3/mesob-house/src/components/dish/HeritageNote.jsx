export function HeritageNote({ icon, eyebrow, title, text }) {
  return (
    <div className="heritage-note">
      <span className="heritage-note__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        {eyebrow && <p className="heritage-note__eyebrow">{eyebrow}</p>}
        <h3 className="heritage-note__title">{title}</h3>
        <p className="heritage-note__text">{text}</p>
      </div>
    </div>
  );
}

export function SpecSheet({ items = [] }) {
  return (
    <div className="spec-sheet">
      {items.map((item) => (
        <div key={item.label} className="spec-sheet__tile">
          <span>{item.label}</span>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}
