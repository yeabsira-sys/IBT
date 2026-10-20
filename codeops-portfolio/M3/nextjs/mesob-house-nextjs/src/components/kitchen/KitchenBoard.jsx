"use client";

import { useState } from "react";
import useSWR from "swr";
import { FiClock, FiRefreshCw } from "react-icons/fi";
import Button from "../ui/Button";
import OrderStatusBadge from "../orders/OrderStatusBadge";
import { fetcher } from "@/lib/fetcher";
import { formatETB, formatOrderDate, nextStatuses } from "@/lib/orderStatus";
import { useToast } from "@/store/toastStore";

const COLUMNS = [
  { status: "received", title: "New orders" },
  { status: "preparing", title: "In the kitchen" },
  { status: "ready", title: "Ready" },
  { status: "out_for_delivery", title: "Out for delivery" },
];

const ACTION_LABEL = {
  preparing: "Start preparing",
  ready: "Mark ready",
  out_for_delivery: "Send out",
  completed: "Complete",
};

/** KitchenBoard — employee/admin queue, polled every 8 seconds with SWR. */
export default function KitchenBoard({ initialOrders }) {
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);
  const { data, error, mutate, isValidating } = useSWR("/api/kitchen/orders", fetcher, {
    fallbackData: { data: initialOrders },
    refreshInterval: 8000,
    revalidateOnFocus: true,
  });

  const orders = data?.data ?? initialOrders;

  const update = async (id, status) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/kitchen/orders/${id}`, {
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
    <div className="kitchen">
      <div className="portal-toolbar">
        <p className="portal-toolbar__note">
          <FiRefreshCw className={isValidating ? "is-spinning" : undefined} aria-hidden="true" />
          {isValidating ? "Refreshing the queue…" : "Queue refreshes every 8 seconds."}
        </p>
        <p className="portal-toolbar__count">
          <FiClock aria-hidden="true" /> {orders.length} active order{orders.length === 1 ? "" : "s"}
        </p>
      </div>

      {error && <p className="form-error">The queue could not refresh. Showing the last known orders.</p>}

      <div className="kitchen-board" aria-live="polite">
        {COLUMNS.map((column) => {
          const tickets = orders.filter((order) => order.status === column.status);
          return (
            <section className="kitchen-column" key={column.status}>
              <header>
                <h2>{column.title}</h2>
                <span>{tickets.length}</span>
              </header>
              <div className="kitchen-column__body">
                {tickets.length === 0 && <p className="kitchen-empty">Nothing here.</p>}
                {tickets.map((order) => (
                  <article className="kitchen-ticket" key={order.id}>
                    <header>
                      <strong>{order.id}</strong>
                      <OrderStatusBadge status={order.status} />
                    </header>
                    <p className="kitchen-ticket__meta">
                      {order.customer?.name} · {order.fulfillment === "pickup" ? "Pickup" : "Delivery"}
                    </p>
                    <p className="kitchen-ticket__meta">{formatOrderDate(order.createdAt)}</p>
                    <ul>
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {item.quantity} × {item.name}
                        </li>
                      ))}
                    </ul>
                    {order.note && <p className="kitchen-ticket__note">“{order.note}”</p>}
                    <div className="kitchen-ticket__foot">
                      <strong>ETB {formatETB(order.totals?.total)}</strong>
                      <div className="kitchen-ticket__actions">
                        {nextStatuses(order.status, order.fulfillment).map((next) => (
                          <Button
                            key={next}
                            size="sm"
                            variant={next === "completed" ? "primary" : "outline"}
                            onClick={() => update(order.id, next)}
                            disabled={busyId === order.id}
                          >
                            {busyId === order.id ? "Saving…" : ACTION_LABEL[next] ?? next}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
