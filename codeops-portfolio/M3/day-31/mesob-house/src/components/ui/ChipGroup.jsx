export function Chip({ selected = false, children, ...rest }) {
  return (
    <button type="button" className="chip" aria-pressed={selected} {...rest}>
      {children}
    </button>
  );
}

export default function ChipGroup({
  options = [],
  value,
  onChange,
  multiple = false,
  label,
}) {
  const isSelected = (option) =>
    multiple ? (value || []).includes(option.value) : value === option.value;

  const toggle = (option) => {
    if (!onChange) return;
    if (!multiple) {
      onChange(value === option.value ? null : option.value);
      return;
    }
    const current = value || [];
    onChange(
      current.includes(option.value)
        ? current.filter((v) => v !== option.value)
        : [...current, option.value],
    );
  };

  return (
    <div className="chip-group" role="group" aria-label={label}>
      {options.map((option) => (
        <Chip
          key={option.value}
          selected={isSelected(option)}
          onClick={() => toggle(option)}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
}
