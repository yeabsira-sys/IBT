/** PageLoader — centred spinner used by loading.jsx and Suspense fallbacks. */
export default function PageLoader({ label = "Loading" }) {
  return (
    <div className="page-loader" role="status" aria-label={label}>
      <span className="page-loader__spinner" />
    </div>
  );
}
