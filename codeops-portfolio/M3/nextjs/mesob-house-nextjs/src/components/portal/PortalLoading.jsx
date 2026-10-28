/** Chart-shaped route skeleton used by the admin and kitchen loading files. */
export default function PortalLoading({
  cards = 0,
  charts = 2,
  board = false,
  label = "Loading dashboard",
}) {
  return (
    <div
      className="container portal-page portal-page--wide"
      aria-busy="true"
      aria-label={label}
    >
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" style={{ width: "58%" }} />
      <div
        className="skeleton"
        style={{ height: 30, width: "42%", margin: "24px 0" }}
      />

      {cards > 0 && (
        <div className="portal-skeleton-stats">
          {Array.from({ length: cards }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 92 }} />
          ))}
        </div>
      )}

      {charts > 0 && (
        <div className="chart-grid">
          {Array.from({ length: charts }).map((_, index) => (
            <div className="skeleton portal-skeleton-chart" key={index} />
          ))}
        </div>
      )}

      {board && (
        <div className="portal-skeleton-board">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 380 }} />
          ))}
        </div>
      )}
    </div>
  );
}
