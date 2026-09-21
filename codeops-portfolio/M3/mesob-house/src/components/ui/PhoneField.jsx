import { useId } from "react";
import FlagET from "./FlagET";

/**
 * PhoneField — dial-code prefix + national number.
 * Defaults to Ethiopia (+251); pass `dialCode` / `flag` for other markets.
 */
export default function PhoneField({
  label,
  optionalText,
  dialCode = "+251",
  flag = <FlagET />,
  hint,
  hintIcon,
  error,
  id,
  ...inputProps
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = `${inputId}-hint`;
  const message = error || hint;

  return (
    <div className="field phone-field">
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label}
          {optionalText && <span className="field__optional">{optionalText}</span>}
        </label>
      )}

      <div className="phone-field__row">
        <span className="phone-field__prefix">
          {flag}
          {dialCode}
        </span>
        <div className={`field__control${error ? " field__control--invalid" : ""}`}>
          <input
            id={inputId}
            className="field__input"
            type="tel"
            inputMode="numeric"
            aria-invalid={error ? true : undefined}
            aria-describedby={message ? hintId : undefined}
            {...inputProps}
          />
        </div>
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
