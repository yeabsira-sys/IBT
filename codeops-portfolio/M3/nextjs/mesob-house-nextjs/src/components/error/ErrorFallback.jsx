import Button from "../ui/Button";

/** ErrorFallback — the friendly "something went wrong" card used by every error boundary. */
export default function ErrorFallback({
  title = "Something Went Wrong in the Kitchen",
  message,
  onRetry,
  compact = false,
}) {
  return (
    <div
      className={`error-fallback${compact ? " error-fallback--compact" : ""}`}
      role="alert"
    >
      <h1 className="error-fallback__title">{title}</h1>
      <p className="error-fallback__text">
        {message ??
          "An unexpected error interrupted this page. You can try again, or head back to the menu."}
      </p>
      <div className="error-fallback__actions">
        {onRetry && (
          <Button variant="primary" onClick={onRetry}>
            Try Again
          </Button>
        )}
        <Button as="a" href="/menu" variant="outline">
          Back to the Menu
        </Button>
      </div>
    </div>
  );
}
