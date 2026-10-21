"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ORDERS_PER_PAGE, filterOrders } from "@/lib/orderSearch";

/**
 * Client-side search, status filter and 20-row pagination for an order list.
 * The server still owns the data; this only decides which loaded rows to show.
 */
export default function useOrderBrowser(orders = []) {
  const [query, setQueryState] = useState("");
  const [status, setStatusState] = useState("all");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(
    () => filterOrders(orders, status, deferredQuery),
    [orders, status, deferredQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
  const pageOrders = filtered.slice(startIndex, startIndex + ORDERS_PER_PAGE);

  const setQuery = (value) => {
    setQueryState(value);
    setPage(1);
  };

  const setStatus = (value) => {
    setStatusState(value);
    setPage(1);
  };

  const reset = () => {
    setQueryState("");
    setStatusState("all");
    setPage(1);
  };

  return {
    query,
    setQuery,
    status,
    setStatus,
    page: currentPage,
    setPage,
    totalPages,
    pageOrders,
    filteredOrders: filtered,
    filteredCount: filtered.length,
    from: filtered.length === 0 ? 0 : startIndex + 1,
    to: Math.min(startIndex + ORDERS_PER_PAGE, filtered.length),
    reset,
  };
}
