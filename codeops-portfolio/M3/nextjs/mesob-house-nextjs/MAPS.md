# Mesob House — Leaflet delivery map

This document explains the Leaflet map that is integrated into the customer
order-tracking page: where it appears, how the data reaches it, why the library
is loaded the way it is, and what to change when the map needs to grow.

The short version: the server renders the order and its address as normal HTML.
A small client wrapper loads Leaflet only in the browser. The map shows the
restaurant, the delivery area, and an illustrative courier position. The same
delivery information is always printed as text next to the map, so the page is
still useful when tiles are blocked or the customer cannot see the map.

---

## 1. Where the map appears

The map is part of the customer order-detail page:

| Route | Access | What the map shows |
| --- | --- | --- |
| `/orders/[id]` | Signed-in customer, own orders only | Restaurant + delivery area + courier (delivery orders) |
| `/orders/[id]` with `fulfillment: "pickup"` | Signed-in customer, own orders only | Restaurant pickup point |

It is intentionally **not** on the public shop pages. Public pages remain
static/ISR; the map is a client-only enhancement on a private, dynamic page.

The map card sits between the status timeline and the order details:

```text
Breadcrumbs
Order status header
Status timeline
Delivery / pickup map        ← this feature
Your dishes | Delivery details
```

---

## 2. Why Leaflet

Leaflet is a good fit for this project because it is:

- free and open source;
- usable without an API key;
- small compared with a full commercial map SDK;
- built on OpenStreetMap tiles, which is enough for a coursework delivery
  preview.

A commercial provider would be a better choice for a production delivery
business that needs traffic-aware routing, live driver tracking, or a service
level agreement. The map is deliberately an approximate view, not a navigation
product.

> The public OpenStreetMap tile server is fine for coursework and low-volume
> demos. Its tile usage policy does not allow heavy production traffic. Before
> deploying a real restaurant site, switch the `TileLayer` URL to a paid or
> self-hosted tile provider and keep the attribution.

---

## 3. File map

| File | Responsibility |
| --- | --- |
| [`src/lib/deliveryMap.js`](./src/lib/deliveryMap.js) | Client-safe coordinates, delivery-area lookup, address formatter, courier position helper |
| [`src/components/orders/DeliveryMapPanel.jsx`](./src/components/orders/DeliveryMapPanel.jsx) | Client wrapper: dynamic import, loading placeholder, heading, text alternative, attribution note |
| [`src/components/orders/DeliveryMap.jsx`](./src/components/orders/DeliveryMap.jsx) | The actual Leaflet canvas: tiles, markers, popups, route line, fit-bounds behaviour |
| [`src/components/orders/OrderDetailLive.jsx`](./src/components/orders/OrderDetailLive.jsx) | Places `<DeliveryMapPanel order={order} />` in the order page |
| [`src/styles/portal.css`](./src/styles/portal.css) | Map card, fixed-height frame, marker pins, popup styling, responsive height |
| `leaflet`, `react-leaflet` | Runtime dependencies in `package.json` |

The helpers in `deliveryMap.js` do not import the database or any server-only
module, so they are safe to use from both server components (for text) and
client components (for the map).

---

## 4. Request and render flow

```text
Browser requests /orders/MH-...
  │
  ├─ src/proxy.js
  │    guest → /sign-in
  │    staff → /admin or /kitchen
  │    customer → continue
  │
  ├─ src/app/(auth)/orders/[id]/page.jsx        (Server Component)
  │    requireCustomerPage()                      checks the session and role
  │    getOrderForUser(user.id, orderId)           ownership is part of the query
  │    <OrderDetailLive initialOrder={order} />
  │
  ├─ OrderDetailLive                              (Client Component)
  │    renders the timeline, map card and details
  │    opens EventSource to /api/orders/[id]/stream
  │    SSE pushes a new order while the stream is active
  │
  ├─ DeliveryMapPanel                             (Client Component)
  │    next/dynamic(..., { ssr: false })
  │    server HTML contains a sized loading placeholder
  │
  └─ DeliveryMap                                  (browser only)
       react-leaflet MapContainer
       OpenStreetMap TileLayer
       Marker / Popup / Polyline
```

The server render already contains the address and route text. The map only
adds a visual layer on top; it never owns the authoritative delivery data.

The map redraws from the same `order` object that the SSE stream updates. A
status change therefore moves the timeline and (for `out_for_delivery`) adds or
removes the courier marker without a page reload. The courier position itself
is still interpolated, not GPS-derived.

---

## 5. Why `ssr: false` is mandatory

Leaflet assumes a browser as soon as its module runs. It touches `window` and
expects a DOM. If a Server Component imports `react-leaflet` directly, the
build fails with an error such as `window is not defined`.

The map is therefore loaded through a Client Component wrapper:

```jsx
// DeliveryMapPanel.jsx
"use client";

import dynamic from "next/dynamic";

const DeliveryMap = dynamic(() => import("./DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="delivery-map-frame delivery-map-frame--loading" role="status">
      Loading delivery map…
    </div>
  ),
});
```

Two details matter:

1. `ssr: false` keeps the Leaflet module out of the server render.
2. The loading placeholder uses **the same height** as the final frame
   (`340px` desktop, `280px` on narrow screens). Without that, the page jumps
   when the map arrives.

`DeliveryMap.jsx` imports the Leaflet stylesheet:

```jsx
import "leaflet/dist/leaflet.css";
```

Without that import the map renders as broken tiles.

---

## 6. Coordinates and the data model

The order does **not** store GPS coordinates. Checkout asks for a sub-city and
a text address. That is the real source of truth.

`src/lib/deliveryMap.js` keeps a small lookup table of approximate
neighbourhood centres:

```js
export const RESTAURANT_LOCATION = {
  lat: 8.995,
  lng: 38.7896,
  label: "Mesob House",
  area: "Bole Medhanialem, Addis Ababa",
};

const DELIVERY_AREAS = {
  "Bole Medhanialem (Near Mesob House)": { lat: 8.997, lng: 38.792, label: "Bole Medhanialem" },
  Kazanchis: { lat: 9.0142, lng: 38.762, label: "Kazanchis" },
  Sarbet: { lat: 8.9975, lng: 38.744, label: "Sarbet" },
  "Old Airport": { lat: 8.986, lng: 38.757, label: "Old Airport" },
  CMC: { lat: 9.019, lng: 38.818, label: "CMC" },
};
```

If a sub-city is missing, `getDeliveryArea()` falls back to a central Addis
point and uses the text the customer chose as the label. The map never fails
just because a new neighbourhood was added to checkout.

**Latitude first.** Leaflet takes `[lat, lng]`. GeoJSON uses `[lng, lat]`.
Reversing them puts Bole somewhere in the Indian Ocean and is easy to miss.
Keeping all coordinates in named objects makes that mistake less likely.

To make the map precise later:

1. Add `lat` and `lng` to the checkout delivery schema in `src/lib/schemas.js`.
2. Capture a pin (Leaflet click) or geocode the address in `DeliveryLocationCard`.
3. Store those numbers on the order in `src/lib/orders.js`.
4. Change `getDeliveryArea()` / `getCourierLocation()` to prefer stored
   coordinates and fall back to the neighbourhood table.

---

## 7. What the map draws

### Delivery order

- a **restaurant marker** at Mesob House;
- a **delivery marker** at the approximate destination;
- a dashed **route line** between the two;
- a **courier marker** only while `status === "out_for_delivery"`.

### Pickup order

- one restaurant marker;
- the heading changes to “Pickup map”;
- the text says “Pickup at Mesob House”.

### Courier position

There is no GPS feed in this project. `getCourierLocation()` is honest about
that: it interpolates a point between the restaurant and the destination and
moves it along the line as time passes after the `out_for_delivery` transition:

```js
const progress = clamp(0.15 + elapsed / (20 * 60 * 1000), 0.15, 0.88);
```

The result is labelled “Courier (approximate)” in the popup, and the card says
“The courier dot is an illustrative position, not live GPS.” This gives the
customer a sense of progress without pretending to be a real dispatch system.

If real tracking is added later, replace this helper with the driver’s last
known coordinates and keep the same marker/legend.

---

## 8. Component walkthrough

### `DeliveryMapPanel`

Responsibilities:

- load the map only in the browser;
- show a correctly sized loading state;
- provide the heading and status pill;
- print the route and full address as text beside the map;
- show the OpenStreetMap attribution and the “approximate” note.

It receives the serialisable `order` object from `OrderDetailLive`. It does not
fetch anything itself.

### `DeliveryMap`

Responsibilities:

- create the Leaflet map;
- add the OpenStreetMap tile layer;
- create the three marker types;
- draw the route line;
- fit the view to the restaurant and destination.

Key pieces:

```jsx
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
  ...
</MapContainer>
```

`scrollWheelZoom={false}` prevents the map from hijacking page scrolling when
the customer scrolls past it.

### `FitToRoute`

A small component uses `useMap()` and `map.fitBounds()`:

```jsx
function FitToRoute({ points }) {
  const map = useMap();
  const signature = points.map((point) => `${point.lat},${point.lng}`).join("|");

  useEffect(() => {
    const positions = signature.split("|").map((pair) => pair.split(",").map(Number));
    map.fitBounds(positions, { padding: [36, 36], maxZoom: 15, animate: false });
  }, [map, signature]);

  return null;
}
```

`maxZoom` prevents a single neighbourhood from zooming in so far that the
customer loses context.

### Marker icons

Leaflet’s default icon points at image files that a bundler does not copy
automatically. Instead of patching `L.Icon.Default`, the map uses `L.divIcon`
with a CSS pin:

```js
const markerIcon = (tone) =>
  L.divIcon({
    className: "delivery-marker",
    html: `<span class="delivery-marker__pin delivery-marker__pin--${tone}" aria-hidden="true"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 27],
    popupAnchor: [0, -24],
  });
```

The pin colours are defined in `portal.css`:

- brand red for the restaurant;
- gold for the destination;
- green with a pulse for the courier.

The courier pulse is disabled by the global
`prefers-reduced-motion: reduce` rule.

---

## 9. Accessibility and trust

A map is not accessible on its own. The integration always provides:

- the full address as text in `.order-map__details`;
- a route label such as “Bole Medhanialem → Old Airport”;
- the same address again in the existing “Delivery details” card;
- a note explaining that the courier dot is approximate;
- OpenStreetMap attribution, which is a licence condition, not decoration.

A screen reader user can skip the map and still know exactly where the order is
going. A customer with a blocked tile server sees a blank frame but still sees
the address and route text.

The map is not the only signal for pickup versus delivery: the page heading,
status badge and “Delivery details” section all repeat the fulfilment method.

---

## 10. Performance

- The Leaflet code is **not** in the public shop bundle. `next/dynamic` creates
  a separate chunk that is requested only on the order-detail page.
- The server sends a placeholder with a fixed height, so there is no layout
  shift when the map mounts.
- The map adds no new API route and no extra database query; the separate SSE status stream is the only new order-detail route.
- Tiles come directly from OpenStreetMap; the server does not proxy them.
- Public pages remain static/ISR because the map lives on a private dynamic
  page, not in the `(shop)` layout.

Use the browser network panel to confirm that `leaflet` and the map chunk are
only fetched when a customer opens an order.

---

## 11. How to extend it

### Add a new delivery neighbourhood

1. Add the option to `delivery.subCities` in `src/data/checkout.jsx`.
2. Add an approximate entry to `DELIVERY_AREAS` in `src/lib/deliveryMap.js`.
3. Test an order in that area.

If you forget step 2, the map still works and falls back to central Addis, but
the route label uses the new text.

### Change the restaurant pin

Edit `RESTAURANT_LOCATION` in `src/lib/deliveryMap.js`. The map centre and
popup update automatically.

### Put a map on another page

Follow the same pattern:

1. keep the Leaflet import in a `"use client"` module;
2. wrap it with `next/dynamic(..., { ssr: false })`;
3. give the placeholder the final height;
4. pass only serialisable props (no functions or class instances);
5. add a text version of the same information.

### Add multiple couriers

Store an array of driver locations, then:

```jsx
{couriers.map((courier) => (
  <Marker key={courier.id} position={[courier.lat, courier.lng]} icon={COURIER_ICON}>
    <Popup>{courier.name}</Popup>
  </Marker>
))}
```

### Use production tiles

Replace the `TileLayer` URL with your provider’s URL and add the key through an
environment variable. Keep the attribution string; removing it breaks the tile
provider’s licence.

---

## 12. Manual test checklist

1. `npm run build` succeeds.
2. Sign in as a customer and open an active delivery order.
3. The map card says “Delivery map”.
4. Three markers are visible: restaurant, destination, courier.
5. Tiles load and the OpenStreetMap attribution is visible.
6. The connection label reaches “Live status”.
7. Move the order to `completed` in the database (or the kitchen board): the timeline, badge and courier marker update without a reload, the label becomes “Final status”, and the stream closes.
8. The route and full address are readable as text under the map.
9. Open a pickup order: one marker, “Pickup map”, no courier.
10. Resize to a narrow viewport: the frame becomes `280px` and the map remains
    usable.
11. Disable the network: the frame may stay blank, but the address text remains.
12. Sign in as staff and open `/orders/[id]`: the proxy redirects to the staff
    portal, so the map is not shown.
13. Check the browser console for hydration or Leaflet errors.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `window is not defined` during build | Leaflet imported on the server | Keep the import inside the `ssr: false` dynamic module |
| Map is a blank grey box | No explicit height or missing Leaflet CSS | Keep `.delivery-map-frame` height and `leaflet/dist/leaflet.css` |
| Marker icons are broken images | Leaflet default icon paths | Use the `divIcon` helper |
| Map shows the wrong part of Addis | Latitude/longitude swapped | Leaflet uses `[lat, lng]` |
| Map covers other UI | Leaflet pane stacking | `.delivery-map-frame` has `position: relative; z-index: 0` |
| Page jumps when the map loads | Placeholder height differs | Keep the loading placeholder the same height as the frame |
| Tiles never load | Network blocked or OSM policy | Check the network panel; switch tile provider for production |
| Courier dot does not move continuously | SSE re-renders on status changes only | It is illustrative; continuous movement needs a GPS feed |

---

## 14. Limitations and production notes

- **No live GPS.** The courier marker is interpolated, not tracked.
- **No routing engine.** The dashed line is a straight line, not a road route.
- **No geocoding.** The destination is a neighbourhood centre plus the text
  address.
- **OpenStreetMap tiles are for development/coursework.** Use a production tile
  provider before real traffic.
- **The map is customer-only.** Staff are redirected by `src/proxy.js` before
  the page renders.
- **The address is authoritative.** The map is a visual aid; the confirmed
  address and the kitchen’s delivery process remain the source of truth.

For a real delivery product, the next step would be to add coordinates to the
order, stream driver positions over a controlled real-time channel, and use a
routing provider for the line and ETA.
