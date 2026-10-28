"use client";

import { FiSearch, FiX } from "react-icons/fi";
import { ORDER_FILTERS } from "@/lib/orderSearch";

const numberFormat = new Intl.NumberFormat("en-ET");

/** Search box and status filter buttons shared by customer, admin and kitchen order lists. */
export default function OrderFilters({
  query,
  onQueryChange,
  status,
  onStatusChange,
  filteredCount,
  totalCount,
  filters = ORDER_FILTERS,
}) {
  const countLabel =
    filteredCount === totalCount
      ? `${numberFormat.format(totalCount)} orders`
      : `${numberFormat.format(filteredCount)} of ${numberFormat.format(totalCount)} orders`;

  return (
    <section className="order-controls" aria-label="Order search and filters">
      <div className="order-controls__top">
        <label className="order-search">
          <FiSearch aria-hidden="true" />
          <span className="visually-hidden">Search orders</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search order, customer, phone, area or dish…"
          />
          {query && (
            <button
              type="button"
              className="order-search__clear"
              onClick={() => onQueryChange("")}
              aria-label="Clear order search"
            >
              <FiX aria-hidden="true" />
            </button>
          )}
        </label>
        <p className="order-controls__count" role="status" aria-live="polite">
          {countLabel}
        </p>
      </div>

      <div
        className="order-filter-chips"
        role="group"
        aria-label="Filter orders by status"
      >
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`filter-chip${status === filter.value ? " is-active" : ""}`}
            aria-pressed={status === filter.value}
            onClick={() => onStatusChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </section>
  );
}
