"use client";

/** Shared card, heading and empty state around a chart and its data table. */
export default function ChartFrame({
  title,
  subtitle,
  children,
  table,
  empty = false,
  emptyMessage,
  className = "",
}) {
  return (
    <figure className={`chart-card ${className}`.trim()}>
      <figcaption className="chart-card__head">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </figcaption>

      {empty ? (
        <div className="chart-empty" role="status">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="chart-card__canvas">{children}</div>
      )}

      {table}
    </figure>
  );
}
