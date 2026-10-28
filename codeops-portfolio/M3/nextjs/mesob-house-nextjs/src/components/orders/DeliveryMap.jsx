"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  RESTAURANT_LOCATION,
  getCourierLocation,
  getDeliveryArea,
  getOrderAddress,
} from "@/lib/deliveryMap";

/**
 * Leaflet's default marker icon points at image files that bundlers do not
 */
const markerIcon = (tone) =>
  L.divIcon({
    className: "delivery-marker",
    html: `<span class="delivery-marker__pin delivery-marker__pin--${tone}" aria-hidden="true"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 27],
    popupAnchor: [0, -24],
  });

const RESTAURANT_ICON = markerIcon("restaurant");
const DELIVERY_ICON = markerIcon("delivery");
const COURIER_ICON = markerIcon("courier");

/** Keeps the restaurant and destination visible after the map mounts. */
function FitToRoute({ points }) {
  const map = useMap();
  const signature = points
    .map((point) => `${point.lat},${point.lng}`)
    .join("|");

  useEffect(() => {
    const positions = signature
      .split("|")
      .map((pair) => pair.split(",").map(Number));
    if (positions.length < 2) {
      map.setView(positions[0], 14, { animate: false });
      return;
    }
    map.fitBounds(positions, {
      padding: [36, 36],
      maxZoom: 15,
      animate: false,
    });
  }, [map, signature]);

  return null;
}

/**
 * The browser-only Leaflet canvas. Its parent loads this module with
 * `ssr: false`;
 */
export default function DeliveryMap({ order }) {
  const delivery =
    order.fulfillment === "delivery"
      ? getDeliveryArea(order.delivery?.subCity)
      : null;
  const courier = getCourierLocation(order);
  const routePoints = delivery
    ? [RESTAURANT_LOCATION, delivery]
    : [RESTAURANT_LOCATION];

  return (
    <MapContainer
      center={[RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng]}
      zoom={13}
      scrollWheelZoom={false}
      className="delivery-map__canvas"
      aria-label="Map showing Mesob House and the delivery area"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <Marker
        position={[RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng]}
        icon={RESTAURANT_ICON}
      >
        <Popup>
          <strong>{RESTAURANT_LOCATION.label}</strong>
          <br />
          {RESTAURANT_LOCATION.area}
        </Popup>
      </Marker>

      {delivery && (
        <>
          <Polyline
            positions={routePoints.map((point) => [point.lat, point.lng])}
            pathOptions={{
              color: "#8c2116",
              dashArray: "7 9",
              weight: 3,
              opacity: 0.8,
            }}
          />
          <Marker position={[delivery.lat, delivery.lng]} icon={DELIVERY_ICON}>
            <Popup>
              <strong>Delivery address</strong>
              <br />
              {getOrderAddress(order)}
            </Popup>
          </Marker>
        </>
      )}

      {courier && (
        <Marker position={[courier.lat, courier.lng]} icon={COURIER_ICON}>
          <Popup>
            <strong>Courier</strong>
            <br />
            Approximate position, not live GPS.
          </Popup>
        </Marker>
      )}

      <FitToRoute points={routePoints} />
    </MapContainer>
  );
}
