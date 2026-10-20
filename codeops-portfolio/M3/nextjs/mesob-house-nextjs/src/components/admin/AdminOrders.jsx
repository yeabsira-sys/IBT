"use client";

import { useState } from "react";
import useSWR from "swr";
import { FiRefreshCw } from "react-icons/fi";
import Button from "../ui/Button";
import OrderStatusBadge from "../orders/OrderStatusBadge";
import { fetcher } from "@/lib/fetcher";
import { formatETB, formatOrderDate, isTerminal, nextStatuses } from "@/lib/orderStatus";
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
  const { data, error, mutate, isValidating } = useSWR("/api/admin/orders", fetcher, {
    fallbackData: { data: initialOrders },
    refreshInterval: 10000,
    revalidateOnFocus: true,
  });

  const orders = data?.data ?? initialOrders;

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

  return (
    <div className="admin-orders">
      <div className="portal-toolbar">
        <p className="portal-toolbar__note">
          <FiRefreshCw className={isValidating ? "is-spinning" : undefined} aria-hidden="true" />
          {isValidating ? "Refreshing orders…" : `${orders.length} orders · refreshes every 10 seconds.`}
        </p>
      </div>

      {error && <p className="form-error">Could not refresh orders. Showing the last known list.</p>}

      <div className="admin-order-list" aria-live="polite">
        {orders.map((order) => {
          const transitions = isTerminal(order.status)
            ? []
            : [...nextStatuses(order.status, order.fulfillment), "cancelled"];
          return (
            <article className="admin-order" key={order.id}>
              <header className="admin-order__head">
                <div>
                  <strong>{order.id}</strong>
                  <span>{formatOrderDate(order.createdAt)}</span>
                </div>
                <OrderStatusBadge status={order.status} />
              </header>

              <div className="admin-order__grid">
                <p><span>Customer</span>{order.customer?.name}</p>
                <p><span>Contact</span>+251 {order.contact?.phone}</p>
                <p><span>Fulfillment</span>{order.fulfillment === "pickup" ? "Pickup" : "Delivery"}</p>
                <p><span>Total</span>ETB {formatETB(order.totals?.total)}</p>
              </div>

              <details className="admin-order__details">
                <summary>Items and address</summary>
                <ul className="order-card__items">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <span>{item.quantity} × {item.name}</span>
                      <span>ETB {formatETB(Number(item.price) * item.quantity)}</span>
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
    </div>
  );
}
