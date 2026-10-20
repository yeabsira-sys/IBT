"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { FiArrowRight, FiClock, FiRefreshCw } from "react-icons/fi";
import Button from "../ui/Button";
import OrderStatusBadge from "./OrderStatusBadge";
import { fetcher } from "@/lib/fetcher";
import { formatETB, formatOrderDate, isCancellable, isTerminal } from "@/lib/orderStatus";
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

  if (orders.length === 0) {
    return (
      <div className="portal-empty">
        <FiClock aria-hidden="true" />
        <h2>No orders yet</h2>
        <p>Your first feast will appear here with a live kitchen status.</p>
        <Button as={Link} href="/menu" variant="primary" rightIcon={<FiArrowRight />}>
          Explore the menu
        </Button>
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
      </div>

      {error && <p className="form-error">We could not refresh your orders. Showing the last known status.</p>}

      <div className="order-list" aria-live="polite">
        {orders.map((order) => (
          <article className="order-card" key={order.id}>
            <header className="order-card__head">
              <div>
                <p className="order-card__id">{order.id}</p>
                <p className="order-card__date">
                  {formatOrderDate(order.createdAt)} · {order.fulfillment === "pickup" ? "Pickup" : "Delivery"}
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
                  <span>ETB {formatETB(Number(item.price) * item.quantity)}</span>
                </li>
              ))}
            </ul>

            <footer className="order-card__foot">
              <strong>ETB {formatETB(order.totals?.total)}</strong>
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
    </div>
  );
}
