"use client";

import dynamic from "next/dynamic";
import { FiMapPin, FiNavigation, FiTruck } from "react-icons/fi";
import { getOrderAddress, getRouteLabel } from "@/lib/deliveryMap";

/**
 * Leaflet accesses `window` as soon as its module runs. Loading it through
 * next/dynamic with `ssr: false` keeps it out of the server render and out of
 * the initial bundle. The placeholder matches the final map height so the
 * page does not jump when the tiles arrive.
 */
const DeliveryMap = dynamic(() => import("./DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="delivery-map-frame delivery-map-frame--loading" role="status">
      <span>
        <FiNavigation aria-hidden="true" /> Loading delivery map…
      </span>
    </div>
  ),
});

/** The map card, including the text version required for non-visual users. */
export default function DeliveryMapPanel({ order }) {
  const isPickup = order.fulfillment === "pickup";
  const isOutForDelivery = order.status === "out_for_delivery";
  const statusLabel = isOutForDelivery ? "Courier on the way" : isPickup ? "Pickup point" : "Approximate delivery area";

  return (
    <section className="portal-card order-map" aria-labelledby="order-map-title">
      <div className="order-map__head">
        <div>
          <p className="portal-eyebrow">Route</p>
          <h2 id="order-map-title">{isPickup ? "Pickup map" : "Delivery map"}</h2>
        </div>
        <span className="order-map__status">
          <FiTruck aria-hidden="true" />
          {statusLabel}
        </span>
      </div>

      <div className="delivery-map-frame">
        <DeliveryMap order={order} />
      </div>

      <div className="order-map__details">
        <p>
          <FiMapPin aria-hidden="true" />
          <span>
            <strong>{getRouteLabel(order)}</strong>
            <br />
            {getOrderAddress(order)}
          </span>
        </p>
        <p className="order-map__note">
          Map tiles © OpenStreetMap contributors.{" "}
          {isOutForDelivery
            ? "The courier dot is an illustrative position, not live GPS. The address above is the authoritative delivery detail."
            : isPickup
              ? "The pin marks the restaurant. Bring your order number when you arrive."
              : "The pin marks the approximate neighbourhood centre, not a precise door location. Use the address above for the exact drop-off."}
        </p>
      </div>
    </section>
  );
}
