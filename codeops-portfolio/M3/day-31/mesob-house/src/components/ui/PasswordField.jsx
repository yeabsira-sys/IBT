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

export default function PasswordField({
  showStrength = false,
  passwordValue = "",
  ...rest
}) {
  const [visible, setVisible] = useState(false);

  const score = scorePassword(passwordValue);

  return (
    <div>
      <TextField
        {...rest}
        type={visible ? "text" : "password"}
        icon={<FiLock />}
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
      />

      {showStrength && (
        <div className="strength">
          <div className="strength__bars" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`strength__bar${
                  i < score ? " strength__bar--on" : ""
                }`}
              />
            ))}
          </div>

          <span className="strength__label">{LABELS[score]}</span>
        </div>
      )}
    </div>
  );
}
