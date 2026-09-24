import { OptionCard, OptionCardGroup } from "../ui/OptionCard";

/**
 * OptionGroup — "n. Title" heading, a required/optional/count badge, and a
 * row of OptionCards. Works for single-select (radio) or multi-select
 * (checkbox, with a `max` cap) groups.
 */
export default function OptionGroup({
  step,
  title,
  icon,
  badge,
  columns = 3,
  options,
  value,
  onChange,
  multi = false,
  max,
}) {
  const isSelected = (optionValue) =>
    multi ? (value || []).includes(optionValue) : value === optionValue;

  const toggle = (optionValue) => {
    if (!multi) return onChange(optionValue);
    const current = value || [];
    if (current.includes(optionValue)) {
      onChange(current.filter((v) => v !== optionValue));
    } else if (!max || current.length < max) {
      onChange([...current, optionValue]);
    }
  };

  return (
    <fieldset className="option-group">
      <legend className="option-group__legend">
        <span>
          {step && <span className="option-group__step">{step}.</span>} {title}{" "}
          {icon && <span aria-hidden="true">{icon}</span>}
        </span>
        {badge && <span className="option-group__badge">{badge}</span>}
      </legend>

      <OptionCardGroup columns={columns}>
        {options.map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            description={option.description}
            note={option.note}
            multi={multi}
            selected={isSelected(option.value)}
            onSelect={() => toggle(option.value)}
          />
        ))}
      </OptionCardGroup>
    </fieldset>
  );
}
