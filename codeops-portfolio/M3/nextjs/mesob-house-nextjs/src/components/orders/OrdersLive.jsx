"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { FiArrowRight, FiClock, FiDownload, FiRefreshCw } from "react-icons/fi";
import Button from "../ui/Button";
import OrderFilters from "./OrderFilters";
import OrderPagination from "./OrderPagination";
import OrderStatusBadge from "./OrderStatusBadge";
import useOrderBrowser from "@/hooks/useOrderBrowser";
import { downloadCsv, orderHistoryCsv } from "@/lib/csv";
import { fetcher } from "@/lib/fetcher";
import { dateStamp, etb, when } from "@/lib/format";
import { isCancellable, isTerminal } from "@/lib/orderStatus";
import { useToast } from "@/store/toastStore";

/**
 * OrdersLive — server-rendered orders seed SWR, which then polls only while
 * at least one order is still moving through the kitchen.
 */
export default function OrdersLive({ initialOrders }) {
  const toast = useToast();
  const [cancelling, setCancelling] = useState(null);
  const { data, error, mutate, isValidating } = useSWR("/api/orders", fetcher, {
    fallbackData: { data: initialOrders },
    refreshInterval: (latest) =>
      (latest?.data ?? []).some((order) => !isTerminal(order.status)) ? 10000 : 0,
    revalidateOnFocus: true,
  });

  const orders = data?.data ?? initialOrders;
  const browser = useOrderBrowser(orders);

  const cancel = async (id) => {
    setCancelling(id);
    try {
      const response = await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "Could not cancel the order.");
      toast(body.message ?? "Order cancelled.", "info");
      await mutate();
    } catch (cancelError) {
      toast(cancelError.message, "error");
    } finally {
      setCancelling(null);
    }
  };

  const exportHistory = () => {
    downloadCsv(`mesob-house-orders-${dateStamp.format(new Date())}.csv`, orderHistoryCsv(orders));
    toast("Order history exported as CSV.", "info");
  };

  if (orders.length === 0) {
    return (
      <div className="orders-live">
        <div className="portal-toolbar">
          <p className="portal-toolbar__note">
            <FiRefreshCw aria-hidden="true" />
            No orders yet.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<FiDownload aria-hidden="true" />}
            disabled
          >
            Export CSV
          </Button>
        </div>
        <div className="portal-empty">
          <FiClock aria-hidden="true" />
          <h2>No orders yet</h2>
          <p>Your first feast will appear here with a live kitchen status.</p>
          <Button as={Link} href="/menu" variant="primary" rightIcon={<FiArrowRight />}>
            Explore the menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-live">
      <div className="portal-toolbar">
        <p className="portal-toolbar__note">
          <FiRefreshCw className={isValidating ? "is-spinning" : undefined} aria-hidden="true" />
          {isValidating ? "Checking the kitchen…" : "Status refreshes automatically while an order is active."}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<FiDownload aria-hidden="true" />}
          onClick={exportHistory}
        >
          Export CSV
        </Button>
      </div>

      {error && <p className="form-error">We could not refresh your orders. Showing the last known status.</p>}

      <OrderFilters
        query={browser.query}
        onQueryChange={browser.setQuery}
        status={browser.status}
        onStatusChange={browser.setStatus}
        filteredCount={browser.filteredCount}
        totalCount={orders.length}
      />

      {browser.filteredCount === 0 ? (
        <div className="order-no-results">
          <h2>No matching orders</h2>
          <p>Try another search term or status filter.</p>
          <Button type="button" variant="outline" size="sm" onClick={browser.reset}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="order-list" aria-live="polite">
          {browser.pageOrders.map((order) => (
            <article className="order-card" key={order.id}>
              <header className="order-card__head">
                <div>
                  <p className="order-card__id">{order.id}</p>
                  <p className="order-card__date">
                    {when.format(new Date(order.createdAt))} · {order.fulfillment === "pickup" ? "Pickup" : "Delivery"}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </header>

              <ul className="order-card__items">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.quantity} × {item.name}
                    </span>
                    <span>{etb.format(Number(item.price) * item.quantity || 0)}</span>
                  </li>
                ))}
              </ul>

              <footer className="order-card__foot">
                <strong>{etb.format(Number(order.totals?.total) || 0)}</strong>
                <div className="order-card__actions">
                  {isCancellable(order.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancel(order.id)}
                      disabled={cancelling === order.id}
                    >
                      {cancelling === order.id ? "Cancelling…" : "Cancel order"}
                    </Button>
                  )}
                  <Button as={Link} href={`/orders/${order.id}`} variant="outline" size="sm" rightIcon={<FiArrowRight />}>
                    View order
                  </Button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}

      <OrderPagination
        page={browser.page}
        totalPages={browser.totalPages}
        onPageChange={browser.setPage}
      />
    </div>
  );
}
