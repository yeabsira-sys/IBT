import { FiCheck } from "react-icons/fi";

/** Checkbox — styled box with free-form label content (links allowed). */
export default function Checkbox({ checked, onChange, children, ...rest }) {
  return (
    <label className="checkbox">
      <input
        type="checkbox"
        className="visually-hidden"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        {...rest}
      />
      <span className="checkbox__box" aria-hidden="true">
        <FiCheck />
      </span>
      <span>{children}</span>
    </label>
  );
}
