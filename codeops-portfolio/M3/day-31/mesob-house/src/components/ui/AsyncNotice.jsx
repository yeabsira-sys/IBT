import { FiAlertCircle, FiLoader } from "react-icons/fi";

export default function AsyncNotice({ variant = "loading", message, onRetry }) {
  return (
    <p
      className={`async-notice async-notice--${variant}`}
      role={variant === "error" ? "alert" : "status"}
    >
      {variant === "loading" ? (
        <FiLoader className="async-notice__spin" />
      ) : (
        <FiAlertCircle />
      )}
      {message}
      {onRetry && (
        <button type="button" className="async-notice__retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </p>
  );
}
