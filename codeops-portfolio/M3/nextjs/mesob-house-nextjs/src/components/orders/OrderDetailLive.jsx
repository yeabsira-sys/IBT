"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { FiArrowLeft, FiClock, FiMapPin, FiPhone, FiRefreshCw } from "react-icons/fi";
import Button from "../ui/Button";
import OrderStatusBadge from "./OrderStatusBadge";
import { fetcher } from "@/lib/fetcher";
import { formatETB, formatOrderDate, isCancellable, isTerminal, statusStep } from "@/lib/orderStatus";
import { useToast } from "@/store/toastStore";

const DELIVERY_STEPS = ["received", "preparing", "ready", "out_for_delivery", "completed"];
const PICKUP_STEPS = ["received", "preparing", "ready", "completed"];
const STEP_LABEL = {
  received: "Order received",
  preparing: "In the kitchen",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
};

/** OrderDetailLive — the server-rendered order plus a polled status timeline. */
export default function OrderDetailLive({ initialOrder }) {
  const toast = useToast();
  const [cancelling, setCancelling] = useState(false);
  const { data, error, mutate, isValidating } = useSWR(`/api/orders/${initialOrder.id}`, fetcher, {
    fallbackData: { order: initialOrder },
    refreshInterval: (latest) => (latest?.order && !isTerminal(latest.order.status) ? 10000 : 0),
    revalidateOnFocus: true,
  });

  const order = data?.order ?? initialOrder;
  const steps = order.fulfillment === "pickup" ? PICKUP_STEPS : DELIVERY_STEPS;
  const currentStep = statusStep(order.status);

  const cancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "Could not cancel the order.");
      toast(body.message ?? "Order cancelled.", "info");
      await mutate();
    } catch (cancelError) {
      toast(cancelError.message, "error");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="order-detail">
      <div className="portal-toolbar">
        <Link className="portal-back" href="/orders">
          <FiArrowLeft aria-hidden="true" /> All orders
        </Link>
        <p className="portal-toolbar__note">
          <FiRefreshCw className={isValidating ? "is-spinning" : undefined} aria-hidden="true" />
          {isValidating ? "Checking the kitchen…" : "Live status"}
        </p>
      </div>

      {error && <p className="form-error">We could not refresh this order. Showing the last known status.</p>}

      <section className="portal-card order-detail__head" aria-live="polite">
        <div>
          <p className="order-card__id">{order.id}</p>
          <h1>{order.fulfillment === "pickup" ? "Pickup order" : "Delivery order"}</h1>
          <p className="order-card__date">Placed {formatOrderDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </section>

      {order.status === "cancelled" ? (
        <p className="portal-notice">This order was cancelled. Nothing was charged.</p>
      ) : (
        <ol className="order-timeline">
          {steps.map((step, index) => {
            const done = currentStep > index;
            const current = currentStep === index;
            return (
              <li key={step} className={done ? "is-done" : current ? "is-current" : undefined}>
                <span className="order-timeline__dot" aria-hidden="true" />
                <span>{STEP_LABEL[step]}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="order-detail__grid">
        <section className="portal-card">
          <h2>Your dishes</h2>
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
          <dl className="order-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>ETB {formatETB(order.totals?.subtotal)}</dd>
            </div>
            <div>
              <dt>VAT &amp; tourism levy</dt>
              <dd>ETB {formatETB(order.totals?.vat)}</dd>
            </div>
            {order.totals?.discount > 0 && (
              <div>
                <dt>Coupon {order.couponCode}</dt>
                <dd>− ETB {formatETB(order.totals.discount)}</dd>
              </div>
            )}
            <div className="order-totals__grand">
              <dt>Total</dt>
              <dd>ETB {formatETB(order.totals?.total)}</dd>
            </div>
          </dl>
        </section>

        <section className="portal-card">
          <h2>Delivery details</h2>
          <ul className="order-facts">
            <li>
              <FiMapPin aria-hidden="true" />
              <span>
                {order.fulfillment === "pickup"
                  ? "Pickup at Mesob House, Bole"
                  : `${order.delivery?.street}, ${order.delivery?.subCity}`}
                {order.delivery?.landmark ? ` · ${order.delivery.landmark}` : ""}
              </span>
            </li>
            <li>
              <FiPhone aria-hidden="true" />
              <span>
                {order.contact?.name} · +251 {order.contact?.phone}
              </span>
            </li>
            <li>
              <FiClock aria-hidden="true" />
              <span>{order.delivery?.timing === "scheduled" ? "Scheduled delivery" : "As soon as possible"}</span>
            </li>
          </ul>
          {order.note && <p className="order-note">Kitchen note: {order.note}</p>}
          {isCancellable(order.status) && (
            <Button variant="ghost" size="sm" onClick={cancel} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel this order"}
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
