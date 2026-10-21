"use client";

/**
 * The same data as the chart in real table markup. The caption and scoped
 * headers are what make it usable with a screen reader, and the numeric class
 * keeps ETB and order counts right-aligned and tabular.
 */
export default function ChartTable({ caption, columns = [], rows = [], emptyMessage = "No data for this range." }) {
  return (
    <div className="chart-table-wrap">
      <table className="chart-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align === "right" ? "is-numeric" : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <tr key={row.id ?? `${caption}-${index}`}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.align === "right" ? "is-numeric" : undefined}
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="chart-table__empty">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
