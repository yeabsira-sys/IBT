import { useState } from "react";
import { FiEye, FiEyeOff, FiLock } from "react-icons/fi";
import TextField from "./TextField";

/** 0–4 score: length, mixed case, digit, symbol. */
export function scorePassword(value = "") {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

const LABELS = ["8+ chars", "Weak", "Fair", "Good", "Strong"];

/**
 * PasswordField — password input with show/hide and an optional strength meter.
 */
export default function PasswordField({
  showStrength = false,
  value = "",
  ...rest
}) {
  const [visible, setVisible] = useState(false);
  const score = scorePassword(value);

  return (
    <div>
      <TextField
        type={visible ? "text" : "password"}
        icon={<FiLock />}
        value={value}
        trailing={
          <button
            type="button"
            className="field__toggle"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <FiEyeOff /> : <FiEye />}
          </button>
        }
        {...rest}
      />

      {showStrength && (
        <div className="strength">
          <div className="strength__bars" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`strength__bar${i < score ? " strength__bar--on" : ""}`}
              />
            ))}
          </div>
          <span className="strength__label">{LABELS[score]}</span>
        </div>
      )}
    </div>
  );
}
