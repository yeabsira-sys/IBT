import { FiCheck } from "react-icons/fi";

/**
 * OptionCard — a single selectable tile with a title, small description and
 * a trailing note (price delta, "Included", a spice-level readout, …).
 * multi=true renders a checkbox mark; otherwise a radio dot.
 */
export function OptionCard({ title, description, note, selected, onSelect, multi = false }) {
  return (
    <button
      type="button"
      className={`option-card${selected ? " option-card--selected" : ""}`}
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
    >
      <span className={`option-card__mark option-card__mark--${multi ? "check" : "radio"}`} aria-hidden="true">
        {(multi ? selected : selected) && <FiCheck />}
      </span>
      <span className="option-card__body">
        <span className="option-card__title">{title}</span>
        {description && <span className="option-card__desc">{description}</span>}
      </span>
      {note && <span className="option-card__note">{note}</span>}
    </button>
  );
}

/**
 * OptionCardGroup — lays out a set of OptionCards in a responsive row.
 */
export function OptionCardGroup({ columns = 3, children }) {
  return (
    <div className="option-card-group" style={{ "--option-cols": columns }}>
      {children}
    </div>
  );
}

/**
 * Segmented — a two-or-more-way tab switch (e.g. "Ethiopian Mobile" / "Email").
 */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={`segmented__tab${value === option.value ? " segmented__tab--active" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
