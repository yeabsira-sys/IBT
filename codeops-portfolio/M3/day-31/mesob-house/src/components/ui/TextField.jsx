import { useId } from "react";

/**
 * TextField — labelled input with an optional leading icon, hint and error.
 *
 * <TextField label="Email address" icon={<FiMail />} type="email"
 *            value={email} onChange={...} hint="We never share it." />
 */
export default function TextField({
  label,
  optionalText,
  icon,
  hint,
  hintIcon,
  error,
  id,
  className = "",
  trailing,
  ...inputProps
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = `${inputId}-hint`;
  const message = error || hint;

  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label}
          {optionalText && <span className="field__optional">{optionalText}</span>}
        </label>
      )}

      <div className={`field__control${error ? " field__control--invalid" : ""}`}>
        {icon && (
          <span className="field__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className="field__input"
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? hintId : undefined}
          {...inputProps}
        />
        {trailing}
      </div>

      {message && (
        <p id={hintId} className={`field__hint${error ? " field__hint--error" : ""}`}>
          {!error && hintIcon}
          {message}
        </p>
      )}
    </div>
  );
}
