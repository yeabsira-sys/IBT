/**
 * Approximate map data for the delivery-tracking view.
 */

export const RESTAURANT_LOCATION = Object.freeze({
  lat: 8.995,
  lng: 38.7896,
  label: "Mesob House",
  area: "Bole Medhanialem, Addis Ababa",
});
/**
 * mock delivery areas for the map view. These are not real boundaries
 */
const DELIVERY_AREAS = Object.freeze({
  "Bole Medhanialem (Near Mesob House)": {
    lat: 8.997,
    lng: 38.792,
    label: "Bole Medhanialem",
  },
  Kazanchis: { lat: 9.0142, lng: 38.762, label: "Kazanchis" },
  Sarbet: { lat: 8.9975, lng: 38.744, label: "Sarbet" },
  "Old Airport": { lat: 8.986, lng: 38.757, label: "Old Airport" },
  CMC: { lat: 9.019, lng: 38.818, label: "CMC" },
});

const FALLBACK_AREA = Object.freeze({
  lat: 9.005,
  lng: 38.77,
  label: "Addis Ababa",
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Returns the approximate map point for a checkout sub-city. */
export function getDeliveryArea(subCity) {
  if (subCity && DELIVERY_AREAS[subCity]) return DELIVERY_AREAS[subCity];
  return {
    ...FALLBACK_AREA,
    label: subCity || FALLBACK_AREA.label,
  };
}

/**
 * The courier dot is deliberately illustrative. The app has no GPS feed, so
 * we place the dot on the straight restaurant-to-door line and move it along
 * that line as time passes after the "out_for_delivery" transition.
 *
 * Nothing here is a routing engine. It gives the customer a useful sense of
 * progress without pretending that a real driver is being tracked.
 */
export function getCourierLocation(order, now = Date.now()) {
  if (
    !order ||
    order.fulfillment !== "delivery" ||
    order.status !== "out_for_delivery"
  ) {
    return null;
  }

  const destination = getDeliveryArea(order.delivery?.subCity);
  const outForDelivery = order.statusHistory?.find(
    (entry) => entry.status === "out_for_delivery",
  );
  const startedAt = outForDelivery?.at
    ? new Date(outForDelivery.at).getTime()
    : Number.NaN;
  const elapsed = Number.isFinite(startedAt) ? Math.max(0, now - startedAt) : 0;
  const progress = clamp(0.15 + elapsed / (20 * 60 * 1000), 0.15, 0.88);

  return {
    lat:
      RESTAURANT_LOCATION.lat +
      (destination.lat - RESTAURANT_LOCATION.lat) * progress,
    lng:
      RESTAURANT_LOCATION.lng +
      (destination.lng - RESTAURANT_LOCATION.lng) * progress,
    label: "Courier (approximate)",
    progress,
  };
}

/** The address exactly as the customer entered it, with sensible fallbacks. */
export function getOrderAddress(order) {
  if (!order) return "Address unavailable";
  if (order.fulfillment === "pickup") {
    return `${RESTAURANT_LOCATION.label}, ${RESTAURANT_LOCATION.area}`;
  }

  const { street, subCity, landmark } = order.delivery ?? {};
  const parts = [street, subCity, landmark].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Address unavailable";
}

/** A short, human-readable route label for the map card. */
export function getRouteLabel(order) {
  if (!order) return "Delivery area";
  if (order.fulfillment === "pickup") return "Pickup at Mesob House";
  return `${RESTAURANT_LOCATION.area} → ${getDeliveryArea(order.delivery?.subCity).label}`;
}
