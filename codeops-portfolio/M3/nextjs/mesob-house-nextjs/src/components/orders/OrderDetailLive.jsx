"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiClock, FiDownload, FiMapPin, FiPhone, FiRefreshCw } from "react-icons/fi";
import Button from "../ui/Button";
import DeliveryMapPanel from "./DeliveryMapPanel";
import OrderStatusBadge from "./OrderStatusBadge";
import { downloadCsv, orderHistoryCsv } from "@/lib/csv";
import { dateStamp, etb, timeAgo, when } from "@/lib/format";
import { isCancellable, isTerminal, statusStep } from "@/lib/orderStatus";
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

const CONNECTION_LABEL = {
  connecting: "Connecting to live status…",
  live: "Live status",
  reconnecting: "Reconnecting… showing last known status",
  closed: "Final status",
};

/**
 * OrderDetailLive — the server-rendered order plus a live SSE status stream.
 *
 * The server sends the order immediately and then again whenever `updatedAt`
 * changes. The stream closes itself on a terminal status, and the client also
 * closes on unmount so navigating away does not leak connections.
 */
export default function OrderDetailLive({ initialOrder }) {
  const toast = useToast();
  const [order, setOrder] = useState(initialOrder);
  const [connection, setConnection] = useState(isTerminal(initialOrder.status) ? "closed" : "connecting");
  const [cancelling, setCancelling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (isTerminal(initialOrder.status)) {
      setConnection("closed");
      return undefined;
    }

    let disposed = false;
    const source = new EventSource(`/api/orders/${initialOrder.id}/stream`);
    sourceRef.current = source;

    const closeSource = () => {
      disposed = true;
      source.close();
      if (sourceRef.current === source) sourceRef.current = null;
    };

    source.onopen = () => {
      if (!disposed) setConnection("live");
    };

    source.onmessage = (message) => {
      if (disposed) return;
      try {
        const next = JSON.parse(message.data);
        if (!next || next.id !== initialOrder.id) return;

        setOrder(next);

        if (isTerminal(next.status)) {
          closeSource();
          setConnection("closed");
        }
      } catch {
        // Ignore a malformed frame; a later valid event can still update the page.
      }
    };

    source.onerror = () => {
      if (!disposed) setConnection("reconnecting");
    };

    return () => {
      closeSource();
    };
  }, [initialOrder.id, initialOrder.status]);

  const steps = order.fulfillment === "pickup" ? PICKUP_STEPS : DELIVERY_STEPS;
  const currentStep = statusStep(order.status);
  const isConnecting = connection === "connecting" || connection === "reconnecting";

  const cancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "Could not cancel the order.");

      if (body.order) setOrder(body.order);
      if (body.order && isTerminal(body.order.status)) setConnection("closed");
      toast(body.message ?? "Order cancelled.", "info");
    } catch (cancelError) {
      toast(cancelError.message, "error");
    } finally {
      setCancelling(false);
    }
  };

  const exportHistory = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/orders");
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "Could not export your orders.");

      downloadCsv(
        `mesob-house-orders-${dateStamp.format(new Date())}.csv`,
        orderHistoryCsv(body.data ?? []),
      );
      toast("Order history exported as CSV.", "info");
    } catch (exportError) {
      toast(exportError.message, "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="order-detail">
      <div className="portal-toolbar">
        <Link className="portal-back" href="/orders">
          <FiArrowLeft aria-hidden="true" /> All orders
        </Link>
        <div className="portal-toolbar__links">
          <p className="portal-toolbar__note" role="status" aria-live="polite">
            <FiRefreshCw className={isConnecting ? "is-spinning" : undefined} aria-hidden="true" />
            {CONNECTION_LABEL[connection] ?? CONNECTION_LABEL.connecting}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<FiDownload aria-hidden="true" />}
            onClick={exportHistory}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      <section className="portal-card order-detail__head" aria-live="polite">
        <div>
          <p className="order-card__id">{order.id}</p>
          <h1>{order.fulfillment === "pickup" ? "Pickup order" : "Delivery order"}</h1>
          <p className="order-card__date">
            Placed {when.format(new Date(order.createdAt))} · Updated {timeAgo(order.updatedAt)}
          </p>
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

      <DeliveryMapPanel order={order} />

      <div className="order-detail__grid">
        <section className="portal-card">
          <h2>Your dishes</h2>
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
          <dl className="order-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{etb.format(Number(order.totals?.subtotal) || 0)}</dd>
            </div>
            <div>
              <dt>VAT &amp; tourism levy</dt>
              <dd>{etb.format(Number(order.totals?.vat) || 0)}</dd>
            </div>
            {order.totals?.discount > 0 && (
              <div>
                <dt>Coupon {order.couponCode}</dt>
                <dd>− {etb.format(Number(order.totals.discount) || 0)}</dd>
              </div>
            )}
            <div className="order-totals__grand">
              <dt>Total</dt>
              <dd>{etb.format(Number(order.totals?.total) || 0)}</dd>
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
