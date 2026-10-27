"use client";

import { useState } from "react";
import useSWR from "swr";
import { FiDownload, FiRefreshCw } from "react-icons/fi";
import Button from "../ui/Button";
import OrderFilters from "../orders/OrderFilters";
import OrderPagination from "../orders/OrderPagination";
import OrderStatusBadge from "../orders/OrderStatusBadge";
import useOrderBrowser from "@/hooks/useOrderBrowser";
import { downloadCsv, orderHistoryCsv } from "@/lib/csv";
import { fetcher } from "@/lib/fetcher";
import { dateStamp, etb, when } from "@/lib/format";
import { isTerminal, nextStatuses } from "@/lib/orderStatus";
import { useToast } from "@/store/toastStore";

const ACTION_LABEL = {
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Send out",
  completed: "Complete",
  cancelled: "Cancel",
};

/** AdminOrders — every order, with the same guarded status transitions as staff. */
export default function AdminOrders({ initialOrders }) {
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const { data, error, mutate, isValidating } = useSWR("/api/admin/orders", fetcher, {
    fallbackData: { data: initialOrders },
    refreshInterval: 10000,
    revalidateOnFocus: true,
  });

  const orders = data?.data ?? initialOrders;
  const browser = useOrderBrowser(orders);

  const update = async (id, status) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "Could not update the order.");
      toast(`${id} moved to ${status.replaceAll("_", " ")}.`, "success");
      await mutate();
    } catch (updateError) {
      toast(updateError.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const exportHistory = () => {
    setExporting(true);
    setTimeout(() => {
      try {
        downloadCsv(
          `mesob-house-all-orders-${dateStamp.format(new Date())}.csv`,
          orderHistoryCsv(orders),
        );
        toast("All orders exported as CSV.", "info");
      } catch (exportError) {
        toast(exportError.message ?? "Could not export orders.", "error");
      } finally {
        setExporting(false);
      }
    }, 0);
  };

  return (
    <div className="admin-orders">
      <div className="portal-toolbar">
        <p className="portal-toolbar__note">
          <FiRefreshCw className={isValidating ? "is-spinning" : undefined} aria-hidden="true" />
          {isValidating ? "Refreshing orders…" : `${orders.length} orders · refreshes every 10 seconds.`}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<FiDownload aria-hidden="true" />}
          onClick={exportHistory}
          disabled={orders.length === 0 || exporting}
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      {error && <p className="form-error">Could not refresh orders. Showing the last known list.</p>}

      {orders.length === 0 ? (
        <div className="order-no-results">
          <h2>No orders yet</h2>
          <p>Orders will appear here as customers check out.</p>
        </div>
      ) : (
        <>
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
            <div className="admin-order-list" aria-live="polite">
              {browser.pageOrders.map((order) => {
                const transitions = isTerminal(order.status)
                  ? []
                  : [...nextStatuses(order.status, order.fulfillment), "cancelled"];
                return (
                  <article className="admin-order" key={order.id}>
                    <header className="admin-order__head">
                      <div>
                        <strong>{order.id}</strong>
                        <span>{when.format(new Date(order.createdAt))}</span>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </header>

                    <div className="admin-order__grid">
                      <p><span>Customer</span>{order.customer?.name}</p>
                      <p><span>Contact</span>+251 {order.contact?.phone}</p>
                      <p><span>Fulfillment</span>{order.fulfillment === "pickup" ? "Pickup" : "Delivery"}</p>
                      <p><span>Total</span>{etb.format(Number(order.totals?.total) || 0)}</p>
                    </div>

                    <details className="admin-order__details">
                      <summary>Items and address</summary>
                      <ul className="order-card__items">
                        {order.items.map((item) => (
                          <li key={item.id}>
                            <span>{item.quantity} × {item.name}</span>
                            <span>{etb.format(Number(item.price) * item.quantity || 0)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="admin-order__address">
                        {order.fulfillment === "pickup"
                          ? "Pickup at Mesob House, Bole"
                          : `${order.delivery?.street}, ${order.delivery?.subCity}`}
                        {order.delivery?.landmark ? ` · ${order.delivery.landmark}` : ""}
                      </p>
                      {order.note && <p className="order-note">Kitchen note: {order.note}</p>}
                    </details>

                    {transitions.length > 0 && (
                      <div className="admin-order__actions">
                        {transitions.map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={status === "cancelled" ? "ghost" : "outline"}
                            onClick={() => update(order.id, status)}
                            disabled={busyId === order.id}
                          >
                            {busyId === order.id ? "Saving…" : ACTION_LABEL[status] ?? status}
                          </Button>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <OrderPagination
            page={browser.page}
            totalPages={browser.totalPages}
            onPageChange={browser.setPage}
          />
        </>
      )}
    </div>
  );
}
