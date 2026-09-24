export default function PageLoader() {
  return (
    <main className="container">
      <div className="page-loader" role="status" aria-live="polite">
        <div className="page-loader__spinner" aria-hidden="true" />
        <p>Loading Mesob House...</p>
      </div>
    </main>
  );
}
