"use client";

import { useState } from "react";
import useSWR from "swr";
import { FiClock, FiRefreshCw } from "react-icons/fi";
import Button from "../ui/Button";
import OrderFilters from "../orders/OrderFilters";
import OrderPagination from "../orders/OrderPagination";
import OrderStatusBadge from "../orders/OrderStatusBadge";
import KitchenQueueChart from "../charts/KitchenQueueChart";
import OrdersByHourChart from "../charts/OrdersByHourChart";
import useOrderBrowser from "@/hooks/useOrderBrowser";
import { fetcher } from "@/lib/fetcher";
import { etb, when } from "@/lib/format";
import { nextStatuses, STATUS_META } from "@/lib/orderStatus";
import { useToast } from "@/store/toastStore";

const COLUMNS = [
  { status: "received", title: "New orders" },
  { status: "preparing", title: "In the kitchen" },
  { status: "ready", title: "Ready" },
  { status: "out_for_delivery", title: "Out for delivery" },
];

const KITCHEN_FILTERS = [
  { value: "all", label: "All" },
  ...COLUMNS.map(({ status }) => ({
    value: status,
    label: STATUS_META[status].label,
  })),
];

const ACTION_LABEL = {
  preparing: "Start preparing",
  ready: "Mark ready",
  out_for_delivery: "Send out",
  completed: "Complete",
};

/** KitchenBoard — employee/admin queue, polled every 8 seconds with SWR. */
export default function KitchenBoard({ initialOrders, initialCharts }) {
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);
  const { data, error, mutate, isValidating } = useSWR(
    "/api/kitchen/orders",
    fetcher,
    {
      fallbackData: { data: initialOrders, charts: initialCharts },
      refreshInterval:
        parseInt(process.env.KITCHEN_PAGE_REFRESH_INTERVAL) || 30000,
      revalidateOnFocus: true,
    },
  );

  const orders = data?.data ?? initialOrders;
  const charts = data?.charts ?? initialCharts;
  const browser = useOrderBrowser(orders);

  const update = async (id, status) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/kitchen/orders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.message ?? "Could not update the order.");
      toast(`${id} moved to ${status.replaceAll("_", " ")}.`, "success");
      await mutate();
    } catch (updateError) {
      toast(updateError.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="kitchen">
      <div className="portal-toolbar">
        <p className="portal-toolbar__note">
          <FiRefreshCw
            className={isValidating ? "is-spinning" : undefined}
            aria-hidden="true"
          />
          {isValidating
            ? "Refreshing the queue…"
            : `Queue refreshes every ${(parseInt(process.env.KITCHEN_PAGE_REFRESH_INTERVAL) || 30000) / 1000} seconds.`}
        </p>
        <p className="portal-toolbar__count">
          <FiClock aria-hidden="true" /> {orders.length} active order
          {orders.length === 1 ? "" : "s"}
        </p>
      </div>

      {error && (
        <p className="form-error">
          The queue could not refresh. Showing the last known orders.
          <button
            type="button"
            className="form-error__retry"
            onClick={() => mutate()}
          >
            Retry
          </button>
        </p>
      )}

      <div className="chart-grid">
        <KitchenQueueChart data={charts?.queueByStatus} />
        <OrdersByHourChart data={charts?.ordersByHour} />
      </div>

      {orders.length > 0 && (
        <OrderFilters
          query={browser.query}
          onQueryChange={browser.setQuery}
          status={browser.status}
          onStatusChange={browser.setStatus}
          filteredCount={browser.filteredCount}
          totalCount={orders.length}
          filters={KITCHEN_FILTERS}
        />
      )}

      {orders.length > 0 && browser.filteredCount === 0 ? (
        <div className="order-no-results">
          <h2>No matching tickets</h2>
          <p>Try another search term or status filter.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={browser.reset}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="kitchen-board" aria-live="polite">
          {COLUMNS.map((column) => {
            const total = browser.filteredOrders.filter(
              (order) => order.status === column.status,
            ).length;
            const tickets = browser.pageOrders.filter(
              (order) => order.status === column.status,
            );
            return (
              <section className="kitchen-column" key={column.status}>
                <header>
                  <h2>{column.title}</h2>
                  <span
                    title={
                      tickets.length === total
                        ? `${total} ticket${total === 1 ? "" : "s"}`
                        : `${tickets.length} of ${total} tickets on this page`
                    }
                  >
                    {tickets.length === total
                      ? total
                      : `${tickets.length}/${total}`}
                  </span>
                </header>
                <div className="kitchen-column__body">
                  {tickets.length === 0 && (
                    <p className="kitchen-empty">
                      {total > 0
                        ? "Tickets are on another page."
                        : "Nothing here."}
                    </p>
                  )}
                  {tickets.map((order) => (
                    <article className="kitchen-ticket" key={order.id}>
                      <header>
                        <strong>{order.id}</strong>
                        <OrderStatusBadge status={order.status} />
                      </header>
                      <p className="kitchen-ticket__meta">
                        {order.customer?.name} ·{" "}
                        {order.fulfillment === "pickup" ? "Pickup" : "Delivery"}
                      </p>
                      <p className="kitchen-ticket__meta">
                        {when.format(new Date(order.createdAt))}
                      </p>
                      <ul>
                        {order.items.map((item) => (
                          <li key={item.id}>
                            {item.quantity} × {item.name}
                          </li>
                        ))}
                      </ul>
                      {order.note && (
                        <p className="kitchen-ticket__note">“{order.note}”</p>
                      )}
                      <div className="kitchen-ticket__foot">
                        <strong>
                          {etb.format(Number(order.totals?.total) || 0)}
                        </strong>
                        <div className="kitchen-ticket__actions">
                          {nextStatuses(order.status, order.fulfillment).map(
                            (next) => (
                              <Button
                                key={next}
                                size="sm"
                                variant={
                                  next === "completed" ? "primary" : "outline"
                                }
                                onClick={() => update(order.id, next)}
                                disabled={busyId === order.id}
                              >
                                {busyId === order.id
                                  ? "Saving…"
                                  : (ACTION_LABEL[next] ?? next)}
                              </Button>
                            ),
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {orders.length > 0 && (
        <OrderPagination
          page={browser.page}
          totalPages={browser.totalPages}
          onPageChange={browser.setPage}
        />
      )}
    </div>
  );
}
