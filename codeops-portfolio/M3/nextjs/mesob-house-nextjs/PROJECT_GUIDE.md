# Mesob House — Project Guide

> **New to this codebase? Read this file first.**  
> It explains the whole app, the main request flows, the folder map, and where to change things.  
> Deep dives live in [`AUTH.md`](./AUTH.md), [`DATA.md`](./DATA.md), [`PERF.md`](./PERF.md) and [`MAPS.md`](./MAPS.md).

## Quick orientation

| If you want to…                                | Go to                                        |
| ---------------------------------------------- | -------------------------------------------- |
| Understand the app in one minute               | Section 2 — The 60-second mental model       |
| Follow a feature from browser to database      | Section 3 — Main request flows               |
| Understand sign-in, roles and route protection | Section 4 — Authentication and authorization |
| Understand the order lifecycle                 | Section 5 — Order status model               |
| Find a file quickly                            | Section 7 — Folder map                       |
| Know where to make a change                    | Section 12 — Where to change what            |
| Start reading the code                         | Section 13 — Reading order for a newcomer    |
| Run the app and seed test data                 | Section 14 — Run it locally                  |
| Fix a problem                                  | Section 16 — Debugging map                   |

### If you only remember five things

1. **`src/app` is the route map.** Start at the page file, then follow its component imports.
2. **The server owns security and money.** Sessions, roles, prices, ownership and status transitions are checked in `src/lib` and the API/actions.
3. **The browser store is only a draft.** Cart, favourites and checkout form state live in Zustand/localStorage; real users, sessions and orders live in normalized Postgres tables.
4. **SWR and SSE are only for live refresh.** The first page render is server-rendered; SWR keeps order, kitchen and admin views current, while the active order detail uses an authenticated SSE stream.
5. **`src/lib/prisma.js` is the persistence boundary.** It owns the Prisma Client and pg adapter; `src/lib/db.js` and `src/lib/orders.js` expose user, session and order operations on top of it, including the actor context used by database triggers.

---

## 1. What this project is

Mesob House is a production-shaped restaurant web app built with **Next.js 16 App Router** and **React 19**.

It has two sides:

1. **Public restaurant site**
   - Home page
   - Menu with search and category filters
   - Individual dish pages
   - Cart
   - Checkout

2. **Private portal**
   - Customer account, order history, order tracking and cancellation
   - Kitchen queue for employees and admins
   - Admin dashboard, all-orders view and user-role management

The project uses **normalized PostgreSQL tables through Prisma ORM**. `DATABASE_URL` is required: there is no file or `/tmp` fallback. Versioned SQL migrations create the schema and its triggers/generated columns, a legacy import moves the old document into it, and the app reads and writes the tables through Prisma Client in `src/lib/prisma.js`, `src/lib/db.js` and `src/lib/orders.js`.

---

## 2. The 60-second mental model

Think of the app in three layers:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Browser                                                  │
│    • Server-rendered HTML from Server Components            │
│    • Client islands: cart, forms, menu search, SWR views    │
│    • Zustand store in localStorage: cart, favourites,       │
│      checkout draft                                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ fetch / Server Actions
┌──────────────────────────────▼──────────────────────────────┐
│ 2. Next.js server                                           │
│    • proxy.js: role-aware routing gate                      │
│    • Page guards: real session + role checks                │
│    • Server Actions: sign-in, register, checkout            │
│    • Route Handlers: /api/orders, /api/kitchen, /api/admin  │
│    • lib/: auth, db, orders, menu, pricing, analytics       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 3. Data                                                     │
│    • Prisma Client -> Postgres: users, sessions, menu,      │
│      orders, history, audit                                 │
│    • Remote menu API with ISR cache                         │
│    • Curated fallback menu if the API is unavailable        │
└─────────────────────────────────────────────────────────────┘
```

### The most important rule

**The server is the authority.**

- Passwords and sessions live on the server.
- Order prices are recalculated on the server.
- Order ownership is checked on the server.
- Order status transitions are validated on the server.
- The browser store only holds cart, favourites and checkout form state.

---

## 3. Main request flows

### A. Public menu page — `/menu`

```text
Browser
  → Server Component: src/app/(shop)/menu/page.jsx
  → getMenu() in src/lib/menu.js
  → remote API with 5-minute ISR cache
  → fallback dishes if the API fails
  → MenuBrowser (client component) for search + category tabs
```

Key points:

- The first HTML is server-rendered.
- `MenuBrowser` is the interactive island.
- Search is debounced by 300 ms.
- Search results come from `/api/menu/search`.
- Category and search text are stored in the URL, so a filtered menu is shareable.
- Adding a dish to the cart only updates the browser store; no order exists yet.

Files:

- [`src/app/(shop)/menu/page.jsx`](./src/app/%28shop%29/menu/page.jsx)
- [`src/components/menu/MenuBrowser.jsx`](./src/components/menu/MenuBrowser.jsx)
- [`src/lib/menu.js`](./src/lib/menu.js)
- [`src/app/api/menu/search/route.js`](./src/app/api/menu/search/route.js)

---

### B. Sign-in and session creation

```text
SignInForm
  → signInAction (Server Action)
  → Zod validates the form
  → find user by email or phone
  → verify scrypt password hash
  → create opaque session token
  → store SHA-256 token hash in the database
  → set httpOnly cookie "mh_session"
  → mutate("/api/auth/session") so the navbar updates
  → redirect by role
```

Role landing pages:

| Role       | Default landing page |
| ---------- | -------------------- |
| `admin`    | `/admin`             |
| `employee` | `/kitchen`           |
| `customer` | `/`                  |

If the visitor was bounced from a private page, the `next` query parameter is honoured after sign-in. Unsafe redirect targets are rejected. Staff accounts are then kept inside their portal: if the requested destination is a public shop or customer-only page, the proxy sends them to `/admin` or `/kitchen`. `/account` remains available for staff sign-out.

Files:

- [`src/components/auth/SignInForm.jsx`](./src/components/auth/SignInForm.jsx)
- [`src/actions/auth.js`](./src/actions/auth.js)
- [`src/lib/auth.js`](./src/lib/auth.js)
- [`src/lib/prisma.js`](./src/lib/prisma.js)
- [`src/lib/db.js`](./src/lib/db.js)
- [`src/lib/roleHome.js`](./src/lib/roleHome.js)
- [`src/app/(auth)/sign-in/page.jsx`](./src/app/%28auth%29/sign-in/page.jsx)

---

### C. Checkout and order creation

```text
CheckoutView
  → local Zod validation
  → submitOrder (Server Action)
  → getSession() on the server
  → validate payload again with Zod
  → getAllDishes() to resolve current menu prices
  → getCartTotals() to calculate subtotal, VAT and discount
  → createOrder() writes orders + order_items in one Postgres transaction
  → revalidatePath() for /orders, /orders/[id], /kitchen, /admin, /admin/orders
  → redirect to /orders/[order-id]
```

Why this matters:

- A client-sent price is ignored.
- The server uses the live menu price.
- The order is stored against `session.user.id`.
- The browser never decides who owns an order.

Files:

- [`src/components/checkout/CheckoutView.jsx`](./src/components/checkout/CheckoutView.jsx)
- [`src/actions/order.js`](./src/actions/order.js)
- [`src/lib/pricing.js`](./src/lib/pricing.js)
- [`src/lib/orders.js`](./src/lib/orders.js)
- [`src/lib/schemas.js`](./src/lib/schemas.js)

---

### D. Kitchen queue — `/kitchen`

```text
Server page guard
  → requirePageRole(["employee", "admin"])
  → getKitchenOverview()
  → active orders + chart summaries
  → KitchenBoard receives initialOrders + initialCharts
  → SWR polls /api/kitchen/orders every 8 seconds
```

The kitchen board:

- Shows four columns: `received`, `preparing`, `ready`, `out_for_delivery`.
- Has search, status filters and 20-ticket pagination.
- Distributes the visible 20 tickets across the four columns.
- Column badges show visible / total, e.g. `4/9`.
- Advances an order with `PATCH /api/kitchen/orders/[id]`.
- Refreshes the queue with `mutate()` after a status change.

Files:

- [`src/app/(auth)/kitchen/page.jsx`](./src/app/%28auth%29/kitchen/page.jsx)
- [`src/components/kitchen/KitchenBoard.jsx`](./src/components/kitchen/KitchenBoard.jsx)
- [`src/app/api/kitchen/orders/route.js`](./src/app/api/kitchen/orders/route.js)
- [`src/app/api/kitchen/orders/[id]/route.js`](./src/app/api/kitchen/orders/[id]/route.js)
- [`src/hooks/useOrderBrowser.js`](./src/hooks/useOrderBrowser.js)
- [`src/components/orders/OrderFilters.jsx`](./src/components/orders/OrderFilters.jsx)
- [`src/components/orders/OrderPagination.jsx`](./src/components/orders/OrderPagination.jsx)

---

### E. Customer order tracking — `/orders` and `/orders/[id]`

```text
Server page guard
  → requireCustomerPage()
  → getOrdersForUser(user.id) or getOrderForUser(user.id, orderId)
  → initial data passed to client component
  → /orders polls with SWR while an order is still active
  → /orders/[id] opens an authenticated SSE stream
    (/api/orders/[id]/stream) that pushes a new order when updatedAt changes
```

Rules:

- A customer only sees their own orders.
- Another customer's order returns `404`, not `403`.
- Cancellation is allowed only while the order is `received`.
- Once the kitchen starts preparing, online cancellation is refused.
- The timeline is derived from the current status; `statusHistory` stores the full audit trail.
- The order-detail page also renders a Leaflet map: restaurant, destination and an illustrative courier marker. The route and address are repeated as text; see [`MAPS.md`](./MAPS.md).
- The SSE route sends the current order immediately, polls every 2 seconds and closes on `completed` or `cancelled`. The client shows connecting/live/reconnecting/final states and closes the connection on unmount.
- `/orders` and the individual order page can export the customer's order history as CSV.

Files:

- [`src/app/(auth)/orders/page.jsx`](./src/app/%28auth%29/orders/page.jsx)
- [`src/app/(auth)/orders/[id]/page.jsx`](./src/app/%28auth%29/orders/[id]/page.jsx)
- [`src/components/orders/OrdersLive.jsx`](./src/components/orders/OrdersLive.jsx)
- [`src/components/orders/OrderDetailLive.jsx`](./src/components/orders/OrderDetailLive.jsx)
- [`src/components/orders/DeliveryMapPanel.jsx`](./src/components/orders/DeliveryMapPanel.jsx)
- [`src/components/orders/DeliveryMap.jsx`](./src/components/orders/DeliveryMap.jsx)
- [`src/lib/deliveryMap.js`](./src/lib/deliveryMap.js)
- [`src/lib/format.js`](./src/lib/format.js)
- [`src/lib/csv.js`](./src/lib/csv.js)
- [`src/app/api/orders/route.js`](./src/app/api/orders/route.js)
- [`src/app/api/orders/[id]/route.js`](./src/app/api/orders/[id]/route.js)
- [`src/app/api/orders/[id]/stream/route.js`](./src/app/api/orders/%5Bid%5D/stream/route.js)
- [`src/app/api/orders/[id]/cancel/route.js`](./src/app/api/orders/[id]/cancel/route.js)

---

### F. Admin area — `/admin`, `/admin/orders`, `/admin/users`

```text
/admin
  → getAdminStats()
  → metrics + recent orders + chart summaries
  → SWR /api/admin/stats every 15 seconds

/admin/orders
  → getAllOrders()
  → SWR /api/admin/orders every 10 seconds
  → search, status filters, 20 orders per page
  → CSV export of all orders

/admin/users
  → listUsers()
  → SWR /api/admin/users every 30 seconds
  → role changes through PATCH /api/admin/users/[id]
```

Rules:

- Only `admin` can open these pages.
- Admins can advance or cancel any non-terminal order.
- Admins cannot remove their own admin role.
- `toSafeUser()` removes password hashes before data leaves the server.

Files:

- [`src/app/(auth)/admin/page.jsx`](./src/app/%28auth%29/admin/page.jsx)
- [`src/app/(auth)/admin/orders/page.jsx`](./src/app/%28auth%29/admin/orders/page.jsx)
- [`src/app/(auth)/admin/users/page.jsx`](./src/app/%28auth%29/admin/users/page.jsx)
- [`src/components/admin/AdminOverview.jsx`](./src/components/admin/AdminOverview.jsx)
- [`src/components/admin/AdminOrders.jsx`](./src/components/admin/AdminOrders.jsx)
- [`src/components/admin/AdminUsers.jsx`](./src/components/admin/AdminUsers.jsx)
- [`src/lib/analytics.js`](./src/lib/analytics.js)

---

## 4. Authentication and authorization

There are **three protection layers**:

| Layer                 | File                                   | What it does                                                                                                  |
| --------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1. Proxy routing gate | [`src/proxy.js`](./src/proxy.js)       | Looks up the session and routes by role: guests go to sign-in from private pages, staff stay in their portal. |
| 2. Page guard         | [`src/lib/auth.js`](./src/lib/auth.js) | Looks up the session in the database and checks the role before rendering.                                    |
| 3. API / action guard | Route handlers and Server Actions      | Re-checks the session, role, ownership and allowed status transition.                                         |

The proxy is a routing layer, not the security boundary. It verifies the session so it can distinguish guests, customers and staff, but the page and action layers still make the authorization decision. A forged cookie does not create a session because the database lookup fails.

### Roles

| Role       | Can use                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `customer` | Public site, account, checkout, own orders                                                                                             |
| `employee` | `/account` (sign out), `/kitchen`; public shop and customer-only pages redirect to `/kitchen`                                          |
| `admin`    | `/account` (sign out), `/kitchen`, `/admin`, `/admin/orders`, `/admin/users`; public shop and customer-only pages redirect to `/admin` |

Staff accounts are intentionally not customer accounts. The public menu APIs (`/api/menu*`) and customer order APIs (`/api/orders*`) return `403` for staff sessions. `/api/auth/session`, `/api/health` and `/api/revalidate` remain reachable.

The role check lives in `proxy.js`, not `(shop)/layout.jsx`, so the public shop keeps its static/ISR rendering.

The staff-facing chrome follows the same policy: the navbar links to `/admin` or `/kitchen`, hides customer order/cart links, and the minimal footer omits the public legal links.

### Session details

- Cookie name: `mh_session`
- Cookie flags: `httpOnly`, `sameSite=lax`, `secure` in production
- Default lifetime: 7 days
- "Keep signed in": 30 days
- The cookie stores an opaque random token.
- The database stores only the SHA-256 hash of that token.
- Passwords use Node `scrypt` with a per-user salt.

More detail: [`AUTH.md`](./AUTH.md).

---

## 5. Order status model

```text
received
   │
   ▼
preparing
   │
   ▼
ready
   ├──────────────► completed        (pickup orders)
   │
   ▼
out_for_delivery
   │
   ▼
completed

received ───────────► cancelled       (customer or admin, only before preparation)
```

Rules:

- Customer cancellation is allowed only from `received`.
- Staff use `nextStatuses(status, fulfillment)` to know the legal next step.
- Pickup orders skip `out_for_delivery`.
- Admins may cancel any non-terminal order.
- Every transition is appended to `statusHistory`.

Files:

- [`src/lib/orderStatus.js`](./src/lib/orderStatus.js)
- [`src/lib/orders.js`](./src/lib/orders.js)

---

## 6. Data model

Persistence is normalized PostgreSQL. The schema is created by versioned
migrations in `migrations/`:

| Table | What it holds |
| --- | --- |
| `users` | account, role, scrypt password hash |
| `sessions` | SHA-256 token hash, user, expiry, `revoked_at` |
| `menu_items` | menu catalogue with integer-cent prices |
| `orders` | order header, customer/contact/delivery snapshot, generated total |
| `order_items` | item snapshot, quantity, generated line total |
| `order_status_history` | one row per status transition |
| `audit_log` | order creation, status changes, role changes |

Money is stored as integer cents and converted to birr only at the repository
boundary. The API still exposes a nested order shape:

```json
{
  "id": "MH-1A2B3C4D",
  "userId": "uuid",
  "status": "received",
  "items": [{ "id": "doro-wat", "name": "Doro Wat", "price": 650, "quantity": 2 }],
  "totals": { "subtotal": 1300, "injera": 0, "packaging": 0, "vat": 195, "discount": 0, "total": 1495 },
  "fulfillment": "delivery",
  "delivery": { "subCity": "...", "street": "...", "landmark": "...", "timing": "immediate" },
  "statusHistory": [{ "status": "received", "at": "...", "by": "uuid", "byName": "Guest Diner" }]
}
```

### Users and sessions

`mapUser()` converts a Prisma `User` model to the app's user shape.
`toSafeUser()` is the only user shape that reaches the browser; it removes
`passwordHash`. Session tokens are random 256-bit values; only their SHA-256
hash is stored. Sign-out sets `revoked_at` instead of deleting the row.

### Orders and transitions

Order writes go through [`src/lib/orders.js`](./src/lib/orders.js), which uses
Prisma nested writes for `orders` and `order_items`; the triggers write
`order_status_history` / `audit_log`. `createOrder()` runs in a Prisma
transaction with `setDbActor()`; a status update does the same. Cancellation
uses a conditional `updateMany` on `status = 'received'` instead of
`SELECT ... FOR UPDATE`, so concurrent callers cannot both win. The Postgres
trigger remains the final authority, so an API bug cannot smuggle in an invalid
transition.

The database enforces:

```text
received -> preparing -> ready -> out_for_delivery -> completed
received -> cancelled       (customer only while received)
any non-terminal -> cancelled (admin only)
```

### Why the repository is split

- [`src/lib/prisma.js`](./src/lib/prisma.js) owns the cached Prisma Client,
  `PrismaPg` adapter and database URL / pool configuration.
- [`src/lib/db.js`](./src/lib/db.js) owns user/session repositories, password
  hashing, transactions and actor context.
- [`src/lib/orders.js`](./src/lib/orders.js) owns Prisma order reads, the
  kitchen/admin views, analytics inputs and the checkout transaction.
- `analytics.js` is a pure server-side transformer over the fetched rows.

More detail, including the migration report and EXPLAIN plans:
[`DATA.md`](./DATA.md), [`docs/DB_MIGRATION_REPORT.md`](./docs/DB_MIGRATION_REPORT.md),
[`docs/DB_PERFORMANCE.md`](./docs/DB_PERFORMANCE.md).

More detail: [`DATA.md`](./DATA.md).

---

## 7. Folder map

```text
src/
  actions/            Server Actions
    auth.js           sign-in, register, social demo sign-in, sign-out
    order.js          submitOrder, cancelOrder
    menu.js           refreshMenu (read-your-writes cache refresh)

  app/                Next.js App Router
    (shop)/           Public shop route group (URLs unchanged)
    (auth)/           Private portal route group (URLs unchanged)
    api/              Route Handlers
    layout.jsx        Root layout: fonts, navbar, global CSS
    error.jsx         Route-level error boundary
    not-found.jsx     404 page with live specials

  components/         UI by domain
    layout/           Navbar, Footer, SiteShell, Breadcrumbs
    marketing/        Home-page sections
    menu/             Menu hero, search, cards
    dish/             Dish gallery, order panel, pairings
    basket/           Cart UI
    checkout/         Checkout form and summary
    auth/             Sign-in and register UI
    account/          Account page UI
    orders/           Order lists, detail, status badge, filters, pagination
    kitchen/          Kitchen board
    admin/            Admin overview, orders, users
    charts/           Recharts wrappers + accessible data tables
    ui/               Button, TextField, Surface, etc.
    error/            Error boundary UI

  data/               Static copy/content (not the database)
  hooks/              Client hooks: useSession, useDebouncedValue, etc.
  lib/                Server and shared logic
  store/              Zustand stores: app store + toast store
  styles/             Global CSS, theme tokens, page styles
```

### Route groups

`(shop)` and `(auth)` are **route groups**. They organise layouts without changing the URL.

Examples:

```text
src/app/(shop)/menu/page.jsx        → /menu
src/app/(auth)/orders/page.jsx      → /orders
src/app/(auth)/admin/page.jsx       → /admin
```

---

## 8. Server vs client

| Concern                  | Where it lives                     | Why                                                                                  |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------ |
| Session lookup           | Server                             | Cookie is `httpOnly`; the browser must not read it                                   |
| Password hashing         | Server                             | Never ship password logic to the client                                              |
| Order creation           | Server Action                      | Prices and ownership must be authoritative                                           |
| Order status changes     | Route Handler + server helper      | Transition rules must be enforced server-side                                        |
| Cart                     | Zustand + `localStorage`           | It is a pre-order draft, not a real order                                            |
| Favourites               | Zustand + `localStorage`           | Personal browser preference                                                          |
| Checkout draft           | Zustand + `localStorage`           | Convenience only                                                                     |
| Menu data                | Server + ISR                       | Cached, fast, no CORS problems                                                       |
| Menu search              | Client + SWR                       | Debounced interaction                                                                |
| Order lists              | Server seed + SWR                  | Fast first paint, then live updates                                                  |
| Order detail status      | Client + EventSource               | Server sends changes only; stream closes on a terminal status                        |
| Money/time display       | Client or server + `lib/format.js` | One formatter per locale/time zone, built once                                       |
| Charts                   | Server aggregates + client render  | Chart data is a small summary; the kitchen also receives the active queue it renders |
| Search/filter/pagination | Client over loaded rows            | No extra API round trip per keystroke                                                |

### Client components

A file starts with `"use client"` when it needs:

- React state or effects
- event handlers
- browser APIs
- SWR
- Zustand
- `usePathname`, `useSearchParams`, etc.

Everything else is a Server Component by default.

### `server-only`

These modules import `server-only` and must never be imported into a client component:

- `src/lib/prisma.js`
- `src/lib/db.js`
- `src/lib/auth.js`
- `src/lib/orders.js`
- `src/lib/menu.js`
- `src/lib/analytics.js`

Shared, client-safe modules include:

- `src/lib/orderStatus.js`
- `src/lib/pricing.js`
- `src/lib/roles.js`
- `src/lib/orderSearch.js`
- `src/lib/schemas.js`
- `src/lib/format.js`
- `src/lib/csv.js`

---

## 9. Key files by feature

### Authentication

| File                                                   | Purpose                                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| [`src/proxy.js`](./src/proxy.js)                       | Role-aware routing gate for private, public and customer URL prefixes |
| [`src/lib/auth.js`](./src/lib/auth.js)                 | Session read/create/destroy + page guards                             |
| [`src/lib/prisma.js`](./src/lib/prisma.js)             | Cached Prisma Client, `PrismaPg` adapter and pool configuration      |
| [`src/lib/db.js`](./src/lib/db.js)                     | Users, sessions, password hashing                                     |
| [`src/actions/auth.js`](./src/actions/auth.js)         | Sign-in, register, sign-out actions                                   |
| [`src/hooks/useSession.js`](./src/hooks/useSession.js) | Client session cache                                                  |
| [`src/lib/roleHome.js`](./src/lib/roleHome.js)         | Post-login landing page                                               |

### Orders

| File                                                                                         | Purpose                                                               |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`src/lib/orders.js`](./src/lib/orders.js)                                                   | Create, read, cancel and transition orders                            |
| [`src/lib/orderStatus.js`](./src/lib/orderStatus.js)                                         | Status vocabulary and legal transitions                               |
| [`src/actions/order.js`](./src/actions/order.js)                                             | Checkout Server Action                                                |
| [`src/components/orders/OrdersLive.jsx`](./src/components/orders/OrdersLive.jsx)             | Customer order list and CSV export                                    |
| [`src/components/orders/OrderDetailLive.jsx`](./src/components/orders/OrderDetailLive.jsx)   | Customer order detail with SSE live status                            |
| [`src/app/api/orders/[id]/stream/route.js`](./src/app/api/orders/%5Bid%5D/stream/route.js)   | Authenticated SSE stream for one owned order                          |
| [`src/lib/format.js`](./src/lib/format.js)                                                   | Shared `etb`, `when`, `relative`, `number` and `dateStamp` formatters |
| [`src/lib/csv.js`](./src/lib/csv.js)                                                         | CSV escaping, order-history serialisation and browser download        |
| [`src/components/orders/DeliveryMapPanel.jsx`](./src/components/orders/DeliveryMapPanel.jsx) | Map card, loading state and text alternative                          |
| [`src/components/orders/DeliveryMap.jsx`](./src/components/orders/DeliveryMap.jsx)           | Browser-only Leaflet canvas                                           |
| [`src/lib/deliveryMap.js`](./src/lib/deliveryMap.js)                                         | Approximate coordinates, address and courier helpers                  |
| [`src/components/admin/AdminOrders.jsx`](./src/components/admin/AdminOrders.jsx)             | All orders                                                            |
| [`src/components/kitchen/KitchenBoard.jsx`](./src/components/kitchen/KitchenBoard.jsx)       | Kitchen queue                                                         |
| [`src/hooks/useOrderBrowser.js`](./src/hooks/useOrderBrowser.js)                             | Shared search/filter/pagination state                                 |
| [`src/lib/orderSearch.js`](./src/lib/orderSearch.js)                                         | Search matcher and status filters                                     |
| [`src/components/orders/OrderFilters.jsx`](./src/components/orders/OrderFilters.jsx)         | Search box and filter buttons                                         |
| [`src/components/orders/OrderPagination.jsx`](./src/components/orders/OrderPagination.jsx)   | 20-row pagination                                                     |

### Menu and dishes

| File                                                                                   | Purpose                                   |
| -------------------------------------------------------------------------------------- | ----------------------------------------- |
| [`src/lib/menu.js`](./src/lib/menu.js)                                                 | Server-side menu fetch + fallback + cache |
| [`src/lib/api.js`](./src/lib/api.js)                                                   | API base URL and site URL                 |
| [`src/lib/dishAdapters.js`](./src/lib/dishAdapters.js)                                 | Normalises raw API dishes                 |
| [`src/components/menu/MenuBrowser.jsx`](./src/components/menu/MenuBrowser.jsx)         | Search and category UI                    |
| [`src/components/dish/DishOrder.jsx`](./src/components/dish/DishOrder.jsx)             | Dish options, quantity, add to cart       |
| [`src/app/(shop)/dish/[slug]/page.jsx`](./src/app/%28shop%29/dish/%5Bslug%5D/page.jsx) | SSG/ISR dish page + JSON-LD               |

### Cart and checkout

| File                                                                                     | Purpose                           |
| ---------------------------------------------------------------------------------------- | --------------------------------- |
| [`src/store/appStore.js`](./src/store/appStore.js)                                       | Cart, favourites, checkout draft  |
| [`src/components/StoreHydrator.jsx`](./src/components/StoreHydrator.jsx)                 | Loads persisted store after mount |
| [`src/lib/pricing.js`](./src/lib/pricing.js)                                             | VAT, discount and totals          |
| [`src/components/checkout/CheckoutView.jsx`](./src/components/checkout/CheckoutView.jsx) | Checkout form + submit            |
| [`src/lib/schemas.js`](./src/lib/schemas.js)                                             | Zod schemas for auth and checkout |

### Admin and charts

| File                                                                                                   | Purpose                                             |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| [`src/components/admin/AdminOverview.jsx`](./src/components/admin/AdminOverview.jsx)                   | Metrics + recent orders                             |
| [`src/components/admin/AdminUsers.jsx`](./src/components/admin/AdminUsers.jsx)                         | Role management                                     |
| [`src/lib/analytics.js`](./src/lib/analytics.js)                                                       | Server-side chart aggregation                       |
| [`src/components/charts/BestSellingItemsChart.jsx`](./src/components/charts/BestSellingItemsChart.jsx) | Horizontal bar: top dishes by units sold            |
| [`src/components/charts/MenuItemSalesChart.jsx`](./src/components/charts/MenuItemSalesChart.jsx)       | Donut: every sold menu item's share of units        |
| [`src/components/charts/PieChartCard.jsx`](./src/components/charts/PieChartCard.jsx)                   | Shared donut chart card with centre total and table |
| [`src/components/charts/TopCustomersChart.jsx`](./src/components/charts/TopCustomersChart.jsx)         | Horizontal bar: top ten customers by lifetime spend |
| [`src/components/charts/ChartFrame.jsx`](./src/components/charts/ChartFrame.jsx)                       | Shared chart card                                   |
| [`src/components/charts/ChartTable.jsx`](./src/components/charts/ChartTable.jsx)                       | Accessible table for chart data                     |

### Styling

| File                                               | Purpose                                              |
| -------------------------------------------------- | ---------------------------------------------------- |
| [`src/styles/theme.css`](./src/styles/theme.css)   | Colour, spacing, radius and font tokens              |
| [`src/styles/app.css`](./src/styles/app.css)       | Global additions: skip link, skeletons, errors       |
| [`src/styles/portal.css`](./src/styles/portal.css) | Account, orders, kitchen, admin, filters, pagination |
| [`src/app/layout.jsx`](./src/app/layout.jsx)       | Imports all global CSS and fonts                     |

---

## 10. API map

| Method  | Route                           | Access                  | Used by                     |
| ------- | ------------------------------- | ----------------------- | --------------------------- |
| `GET`   | `/api/auth/session`             | Public                  | Navbar session cache        |
| `GET`   | `/api/menu`                     | Public                  | Menu data                   |
| `GET`   | `/api/menu/specials`            | Public                  | Home specials               |
| `GET`   | `/api/menu/search?q=&category=` | Public                  | Menu search                 |
| `GET`   | `/api/orders`                   | Signed-in customer      | Customer order list polling |
| `GET`   | `/api/orders/[id]`              | Owner only              | Order detail polling        |
| `GET`   | `/api/orders/[id]/stream`       | Owner only              | SSE order status stream     |
| `POST`  | `/api/orders/[id]/cancel`       | Owner + `received` only | Customer cancellation       |
| `GET`   | `/api/kitchen/orders`           | Employee/admin          | Kitchen queue polling       |
| `PATCH` | `/api/kitchen/orders/[id]`      | Employee/admin          | Advance a ticket            |
| `GET`   | `/api/admin/stats`              | Admin                   | Admin dashboard polling     |
| `GET`   | `/api/admin/orders`             | Admin                   | All-orders polling          |
| `PATCH` | `/api/admin/orders/[id]`        | Admin                   | Advance/cancel any order    |
| `GET`   | `/api/admin/users`              | Admin                   | User list polling           |
| `PATCH` | `/api/admin/users/[id]`         | Admin                   | Change a role               |
| `GET`   | `/api/health`                   | Public                  | Liveness probe              |
| `POST`  | `/api/revalidate`               | Secret header           | On-demand ISR               |

All private API responses use `Cache-Control: no-store`.

---

## 11. SWR keys, SSE and intervals

| SWR key                | Component             | Interval                      |
| ---------------------- | --------------------- | ----------------------------- |
| `/api/auth/session`    | Navbar / `useSession` | On focus                      |
| `/api/menu/search?...` | `MenuBrowser`         | On debounced key change       |
| `/api/orders`          | `OrdersLive`          | 10 s while an order is active |
| `/api/kitchen/orders`  | `KitchenBoard`        | 8 s                           |
| `/api/admin/stats`     | `AdminOverview`       | 15 s                          |
| `/api/admin/orders`    | `AdminOrders`         | 10 s                          |
| `/api/admin/users`     | `AdminUsers`          | 30 s                          |

`OrderDetailLive` is the exception: it opens an `EventSource` to
`/api/orders/[id]/stream` instead of polling with SWR. The route polls the
database every 2 seconds, sends only when `updatedAt` changes, and closes
on a terminal status.

The data views (`OrdersLive`, `KitchenBoard`, `AdminOverview`, `AdminOrders`,
`AdminUsers`) receive initial data through `fallbackData`, so their first render
does not wait for a client fetch. `OrderDetailLive` receives `initialOrder` as
a prop and renders that before the stream's first event.

---

## 12. Where to change what

| I want to…                             | Open                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Change the home page                   | `src/app/(shop)/page.jsx` + `src/components/marketing/*`                                            |
| Add a public page                      | `src/app/(shop)/...`                                                                                |
| Add a private page                     | `src/app/(auth)/...` + `requirePageUser` / `requirePageRole` / `requireCustomerPage`                |
| Add a new protected URL prefix         | `src/proxy.js` matcher                                                                              |
| Change staff/public access             | `src/proxy.js` + `requireCustomerPage`                                                              |
| Add an API route                       | `src/app/api/.../route.js` + a guard                                                                |
| Change sign-in behaviour               | `src/actions/auth.js` + `src/lib/auth.js`                                                           |
| Change roles                           | `src/lib/roles.js` + admin user API                                                                 |
| Change order statuses or transitions   | `src/lib/orderStatus.js` + `src/lib/orders.js`                                                      |
| Change prices, VAT or coupon rules     | `src/lib/pricing.js`                                                                                |
| Change checkout validation             | `src/lib/schemas.js`                                                                                |
| Change menu fallback data              | `src/data/menu.jsx` + `src/data/home.jsx`                                                           |
| Change menu API URL                    | `src/lib/api.js` + `.env.local`                                                                     |
| Change polling intervals               | The SWR config in the relevant component, or `POLL_MS` in `src/app/api/orders/[id]/stream/route.js` |
| Change money/time formatting           | `src/lib/format.js`                                                                                 |
| Change CSV columns or escaping         | `src/lib/csv.js`                                                                                    |
| Change map locations or delivery areas | `src/lib/deliveryMap.js`; see [`MAPS.md`](./MAPS.md)                                                |
| Change colours, spacing or fonts       | `src/styles/theme.css`                                                                              |
| Change portal layout                   | `src/styles/portal.css`                                                                             |
| Change cart persistence                | `src/store/appStore.js`                                                                             |
| Seed large order data                  | `scripts/seed-orders.mjs`                                                                           |
| Change the schema                      | Add a numbered migration, update `prisma/schema.prisma`, regenerate Prisma Client, keep repository boundaries |

---

## 13. Reading order for a newcomer

Read in this order:

1. [`README.md`](./README.md) — setup, routes, demo accounts.
2. [`src/app/layout.jsx`](./src/app/layout.jsx) — global shell, fonts, CSS.
3. [`src/components/layout/SiteShell.jsx`](./src/components/layout/SiteShell.jsx) and [`Navbar.jsx`](./src/components/layout/Navbar.jsx) — shared layout.
4. [`src/lib/api.js`](./src/lib/api.js) and [`src/lib/menu.js`](./src/lib/menu.js) — menu data.
5. [`src/app/(shop)/menu/page.jsx`](./src/app/%28shop%29/menu/page.jsx) and [`MenuBrowser.jsx`](./src/components/menu/MenuBrowser.jsx) — server/client split.
6. [`src/store/appStore.js`](./src/store/appStore.js) — cart and checkout state.
7. [`src/actions/order.js`](./src/actions/order.js), [`src/lib/orders.js`](./src/lib/orders.js), [`src/lib/db.js`](./src/lib/db.js) — order write path over Prisma Client.
8. [`src/proxy.js`](./src/proxy.js), [`src/lib/auth.js`](./src/lib/auth.js), [`src/actions/auth.js`](./src/actions/auth.js) — auth.
9. [`src/app/(auth)/orders/page.jsx`](./src/app/%28auth%29/orders/page.jsx) and [`OrdersLive.jsx`](./src/components/orders/OrdersLive.jsx) — customer portal.
10. [`src/components/orders/OrderDetailLive.jsx`](./src/components/orders/OrderDetailLive.jsx) and [`src/app/api/orders/[id]/stream/route.js`](./src/app/api/orders/%5Bid%5D/stream/route.js) — SSE order tracking.
11. [`src/components/kitchen/KitchenBoard.jsx`](./src/components/kitchen/KitchenBoard.jsx) — live kitchen queue.
12. [`src/components/admin/AdminOverview.jsx`](./src/components/admin/AdminOverview.jsx) and [`src/lib/analytics.js`](./src/lib/analytics.js) — admin + charts.
13. [`src/styles/theme.css`](./src/styles/theme.css) and [`src/styles/portal.css`](./src/styles/portal.css) — visual system.

---

## 14. Run it locally

```bash
npm install
cp .env.example .env.local
# set DATABASE_URL to a Postgres database
npm run db:migrate
# only when moving an existing deployment:
npm run db:import -- --file .data/mesob-house.json
npm run dev
```

Open <http://localhost:3000>. The app does not create tables or seed accounts
on the first request. If you have no legacy document, register a customer and
promote that account with SQL, or import your production export.

### Demo accounts

| Role     | Email                 | Mobile      | Password      |
| -------- | --------------------- | ----------- | ------------- |
| Admin    | `admin@mesob.house`   | `911000001` | `Admin123!`   |
| Employee | `kitchen@mesob.house` | `911000002` | `Kitchen123!` |
| Customer | `guest@mesob.house`   | `911000003` | `Guest123!`   |

You can sign in with the email tab or the mobile tab.

### Useful commands

```bash
npm run dev                 # development server
npm run build               # production build
npm start                   # serve the production build
npm run db:migrate          # apply versioned migrations
npm run db:status           # show applied/pending migrations
npm run db:import           # import the legacy document
npm run db:reconcile        # compare source and Postgres counts/revenue
npm run seed:orders         # replace orders with 1,500 test orders + 24 demo customers
npm run seed:orders:clear   # remove @mesob.test demo orders/customers
npm run db:load-test        # 50 concurrent checkouts
npm run db:verify           # trigger invariants + session revocation
npm run db:backup-drill     # pg_dump/pg_restore comparison
```

`seed:orders` writes only to Postgres. It prints the target and refuses a
remote host unless `--allow-remote` is passed. `--dry-run` generates the same
set without writing; `--clear --dry-run` reports what would be removed.

The seed script never changes imported admin/employee/guest passwords. The
migration, import, seed and restore commands are documented in
[`docs/DB_MIGRATION_REPORT.md`](./docs/DB_MIGRATION_REPORT.md).

---

## 15. Common tasks

### Add a new page

1. Create a file under `src/app/(shop)` or `src/app/(auth)`.
2. If it is private, call `requirePageUser()`, `requirePageRole()` or `requireCustomerPage()`.
3. If it introduces a new private or public-shop URL prefix, add that prefix to the `src/proxy.js` matcher so guests and staff are routed correctly.
4. Add a `loading.jsx` if the page fetches slow data.
5. Add `robots: { index: false }` for private or transactional pages.

### Add a new API route

1. Create `src/app/api/<name>/route.js`.
2. Read the session with `getSession()`.
3. Check the role with `isStaff()` or `isAdmin()`.
4. Check ownership in the query helper, not in the UI.
5. Return `Cache-Control: no-store` for private data.
6. For mutations, check `isSameOrigin(request)`.

### Change the order flow

1. Update `ORDER_STATUSES` and `STATUS_META` in `src/lib/orderStatus.js`.
2. Update `nextStatuses()`.
3. Update `updateOrderStatus()` if admins need special rules.
4. Update the kitchen columns and labels.
5. Update `buildKitchenCharts()` in `src/lib/analytics.js`.
6. Update the seed script if you want test data in the new status.

### Change pricing

Edit `src/lib/pricing.js`. The same function is used by:

- the cart total
- the checkout summary
- the server-side order creation

That keeps the displayed total and the stored total consistent.

### Extend the database

Add a new numbered migration; never edit an applied file because its checksum
is recorded. Keep the repository boundaries intact:

- `prisma/schema.prisma`: Prisma models that mirror the migrated tables
- `src/lib/prisma.js`: Prisma Client, `PrismaPg` adapter and pool configuration
- `src/lib/db.js`: users, sessions, password hashing, actor context
- `src/lib/orders.js`: order reads/writes, kitchen/admin queries, checkout
- `src/lib/analytics.js`: pure summaries over fetched rows

Export the new data through `toSafeUser()` or `mapOrder()` rather than leaking
Prisma models to components. Run `npm run db:migrate`, update the Prisma schema
if the table shape changed, run `npm run prisma:generate`, then run the
reconciliation and the build.

---

## 16. Debugging map

| Symptom                                   | Look at                                                                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Redirected to `/sign-in` unexpectedly     | `src/proxy.js`, session cookie, `requirePageUser`                                                                                       |
| Staff sent back to `/admin` or `/kitchen` | Expected: public shop and customer-only pages are blocked for staff in `src/proxy.js`; `/account` is intentionally allowed for sign-out |
| Signed in but still see guest UI          | `useSession`, `/api/auth/session`, SWR mutate after sign-in                                                                             |
| `403` from kitchen/admin API              | Role check in `src/lib/auth.js` and the route handler                                                                                   |
| Another user's order returns `404`        | Correct: ownership is part of `getOrderForUser`                                                                                         |
| Order total differs from the cart         | `src/lib/pricing.js` and `submitOrder`                                                                                                  |
| Cart disappears after refresh             | `StoreHydrator`, `skipHydration`, localStorage                                                                                          |
| Menu is stale                             | ISR `revalidate`, `/api/revalidate`, `revalidateTag("menu")`                                                                            |
| Menu search fires too often               | `useDebouncedValue` and the SWR key                                                                                                     |
| Kitchen queue does not update             | SWR interval, `/api/kitchen/orders`, `mutate()` after PATCH                                                                             |
| Order detail stays on “Reconnecting…”     | Session cookie, `/api/orders/[id]/stream`, `proxy.js`, server logs                                                                      |
| CSV fails to open cleanly                 | `src/lib/csv.js` escaping and the exported number columns                                                                               |
| Status button is missing                  | `nextStatuses(status, fulfillment)`                                                                                                     |
| Status change returns `409`               | The transition is not legal from the current status                                                                                     |
| Chart is empty                            | Date range, Addis timezone bucketing, no matching orders                                                                                |
| Build fails on `server-only` import       | A server module was imported into a client component                                                                                    |

---

## 17. What is intentionally demo-only

This project is shaped like a production app, but some parts are deliberately local:

- **Database** — Postgres is required. The schema, migrations, legacy import and validation scripts are real; the demo deployment still depends on an operator running them against a managed database.
- **Payments** — the checkout records a payment method; there is no real Telebirr/CBE/card gateway.
- **Email and SMS** — no real receipt or rider notifications are sent.
- **Social sign-in** — the Telebirr/Google buttons create demo customer sessions, not real OAuth sessions.
- **Reservations** — the marketing copy mentions them, but there is no reservation backend.
- **Automated tests** — there is no test suite; verification is a production build plus manual smoke checks.

For a real deployment, replace the database, add a payment provider, add notification services, and add automated tests.

---

## 18. Documentation map

| Document                                 | Read it for                                            |
| ---------------------------------------- | ------------------------------------------------------ |
| [`README.md`](./README.md)               | Setup, routes, demo accounts, deployment notes         |
| [`PROJECT_GUIDE.md`](./PROJECT_GUIDE.md) | This big-picture guide                                 |
| [`AUTH.md`](./AUTH.md)                   | Sessions, password hashing, route guards, attack tests |
| [`DATA.md`](./DATA.md)                   | Postgres schema, ISR, SWR, caching, seed data          |
| [`docs/DB_MIGRATION_REPORT.md`](./docs/DB_MIGRATION_REPORT.md) | Reconciliation, load, invariants, restore drill |
| [`docs/DB_PERFORMANCE.md`](./docs/DB_PERFORMANCE.md) | EXPLAIN plans and index rationale                    |
| [`PERF.md`](./PERF.md)                   | Build size, Lighthouse notes, performance decisions    |

---

## 19. Glossary

| Term                 | Meaning here                                                             |
| -------------------- | ------------------------------------------------------------------------ |
| **App Router**       | Next.js file-based routing under `src/app`                               |
| **Server Component** | React component rendered on the server; default in App Router            |
| **Client Component** | Component marked `"use client"`; can use state, effects and browser APIs |
| **Server Action**    | Server function called directly from a form or client component          |
| **Route Handler**    | API endpoint under `src/app/api`                                         |
| **proxy.js**         | Next.js 16 middleware equivalent; runs before matched routes             |
| **ISR**              | Incremental Static Regeneration; static pages refreshed on a schedule    |
| **SWR**              | Client data cache that revalidates on an interval or focus               |
| **Zustand**          | Small client state store used for cart/favourites/checkout               |
| **Zod**              | Schema validation used on forms and on the server                        |
| **scrypt**           | Password hashing function used by `src/lib/db.js`                        |
| **httpOnly**         | Cookie flag that hides the cookie from JavaScript                        |
| **Fallback data**    | Curated menu used when the remote menu API is unavailable                |

---

If you are ever unsure where to start, open the route file in `src/app`, follow the component it renders, then follow the imports into `src/lib`. That path usually explains the whole feature.
