"use client";

function pageItems(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const visible = [...new Set([1, totalPages, page - 1, page, page + 1])]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const items = [];
  let previous = 0;
  for (const value of visible) {
    if (previous && value - previous > 1) items.push(`gap-${value}`);
    items.push(value);
    previous = value;
  }
  return items;
}

/** Bottom pagination for a 20-row page. Hidden when everything fits on one page. */
export default function OrderPagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const items = pageItems(page, totalPages);

  return (
    <nav className="order-pagination" aria-label="Order pagination">
      <p className="order-pagination__label">
        Page {page} of {totalPages} · 20 orders per page
      </p>

      <div className="order-pagination__controls">
        <button
          type="button"
          className="order-pagination__step"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>

        <div className="order-pagination__pages">
          {items.map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                type="button"
                className="order-page-button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}`}
              >
                {item}
              </button>
            ) : (
              <span key={item} className="order-pagination__gap" aria-hidden="true">
                …
              </span>
            ),
          )}
        </div>

        <button
          type="button"
          className="order-pagination__step"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
