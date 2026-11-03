# Data, Caching and Fetching

This document explains where data lives, how it is fetched, which SWR keys are live, and how persistence works. The app is Postgres-only after the normalized migration, and runtime persistence goes through Prisma ORM. `.data/mesob-house.json` is retained only as the one-time legacy import and reconciliation source; it is not read at runtime.

## 1. Two kinds of data

| Kind | Source | Rendering / cache | Examples |
| --- | --- | --- | --- |
| Public catalogue | Remote menu API (`API_BASE_URL`) with curated fallback | Server Components + ISR (5 min) + React `cache` per render | dishes, specials, dish pages, sitemap |
| Private operational data | Prisma ORM -> Postgres normalized tables | Dynamic server rendering + SWR polling + SSE order stream | users, sessions, orders, kitchen queue, admin stats |

The browser never calls the menu backend directly. `src/lib/api.js` builds the URLs and `src/lib/menu.js` fetches them on the server, so missing CORS headers on the backend are irrelevant and the API host is not exposed as a client dependency.

## 2. Postgres schema

The repository runs versioned SQL migrations from `migrations/`; it does not
create tables on request. `DATABASE_URL` is required. If it is missing,
`/api/health` returns `503` and the persistence layer throws instead of falling
back to a file.

Application reads and writes use Prisma Client (`prisma/schema.prisma`) through
the `@prisma/adapter-pg` driver adapter. SQL migrations remain the schema
authority because Prisma cannot express generated columns, PL/pgSQL triggers,
check constraints, or expression/partial indexes. The schema mirrors those
tables for the client; `scripts/db-migrate.mjs` owns their creation.

| Table | Contents | Important constraints |
| --- | --- | --- |
| `users` | accounts and roles | case-insensitive unique email, unique non-empty phone, `user_role` enum |
| `sessions` | opaque login sessions | unique SHA-256 token hash, FK to users, `revoked_at`, expiry |
| `menu_items` | menu catalogue | text id, integer cents, active flag |
| `orders` | order header and customer/contact/delivery snapshot | FK to users, status/fulfillment enums, generated total |
| `order_items` | line items | FK to orders and menu, unique `(order_id, line_no)` |
| `order_status_history` | per-order timeline | FK to orders/users, unique `(order_id, status, changed_at)` |
| `audit_log` | order/role audit | actor, role, before/after JSON, entity/time indexes |

### Money

All money columns are integers in cents (`price_cents`, `subtotal_cents`,
`vat_cents`, `total_cents`). The app converts to birr only when mapping rows to
the UI. `orders.total_cents` and `order_items.line_total_cents` are generated
and stored, so a total cannot drift from its components.

### Status transitions

`orders.status` is an `order_status` enum. A `BEFORE INSERT OR UPDATE OF status`
trigger enforces the state machine in the database:

```text
received -> preparing -> ready -> out_for_delivery -> completed
received -> cancelled       (customer only while received)
any non-terminal -> cancelled (admin only)
```

Customers cannot advance an order. Employees cannot cancel. A terminal order
cannot be rewritten. The application still performs role checks before it
issues a write. Each Prisma transaction calls `set_config('app.actor_id', ...,
true)` and `set_config('app.actor_role', ..., true)` through `$queryRaw`; this
is the only raw statement in the runtime repositories, and it keeps the actor
visible to the trigger and audit rows in the same transaction.

### Sessions

`createSessionRecord()` inserts a random 256-bit token and stores only its
SHA-256 hash. Sign-out calls `deleteSessionByToken()`, which sets `revoked_at`
rather than deleting the row. `getSessionUserByToken()` requires
`revoked_at IS NULL AND expires_at > now()`. Expired rows are ignored
immediately and can be cleaned up operationally.

### Migrations and legacy import

```bash
npm run db:migrate                    # apply pending SQL migrations
npm run db:status                     # show applied/pending and checksums
npm run db:import -- --file .data/mesob-house.json
npm run db:reconcile -- --file .data/mesob-house.json
npm run prisma:generate               # regenerate Prisma Client after schema edits
```

`001_core.sql` creates the enums, tables, foreign keys, checks, generated
totals and triggers. `002_indexes.sql` adds the query indexes.
`003_covering_indexes.sql` replaces the area-revenue index with a covering
index and adds the top-customer covering index. The migration runner records
checksums in `schema_migrations`.

`prisma/schema.prisma` is the Prisma Client model, not the migration source.
When a migration changes a table, update the schema to match and run
`npm run prisma:generate`. `postinstall` also regenerates the client so a fresh
deployment has it. The database-only features live in SQL:

- generated `orders.total_cents` / `order_items.line_total_cents`;
- order status, created/updated-at and audit/history triggers;
- check constraints and the expression index on `lower(btrim(email))`;
- partial and covering indexes.

Operational scripts for migration, bulk import, reconciliation, `EXPLAIN`,
backup/restore and independent invariant checks still use `pg`/SQL. They are
verification tooling, not the application data path.

The importer is transactional and sets `app.importing = 'on'` so historical
timestamps, statuses and history rows are preserved. The migration, import,
seed and restore scripts refuse a non-local host unless `--allow-remote` is
passed, so a local test cannot accidentally write to Neon.

The detailed results are in
[`docs/DB_MIGRATION_REPORT.md`](./docs/DB_MIGRATION_REPORT.md) and
[`docs/DB_PERFORMANCE.md`](./docs/DB_PERFORMANCE.md).

## 3. Menu data and ISR

`src/lib/menu.js`:

```js
const response = await fetch(url, {
  next: { revalidate: 300, tags },
  signal: AbortSignal.timeout(10_000),
});
```

- `getMenu()` and `getSpecials()` are wrapped in React `cache`, so a single render pass does not fetch the same list twice.
- Each has a curated fallback. If the remote API is down or slow, the page still renders and `source === "fallback"` shows a notice.
- `getAllDishes()` merges specials and menu, de-duplicates by slug, and is used by dish pages, the sitemap and the order action.
- `revalidate = 300` on `/`, `/menu` and `/dish/[slug]` gives a 5-minute ISR window.
- `POST /api/revalidate` calls `revalidateTag("menu", "max")` for an on-demand refresh from the menu backend's webhook.

The order action calls `getAllDishes()` as well. That is deliberate: the same cached menu that renders a dish page is the authority for the price stored in an order.

## 4. Server rendering vs client fetching

| Route / component | Initial data | Live update |
| --- | --- | --- |
| `/` | Server Component; specials from `getSpecials()` | none (ISR) |
| `/menu` | Server Component; full dish list from `getMenu()` | debounced SWR search after typing |
| `/dish/[slug]` | SSG/ISR with `generateStaticParams` | none |
| Navbar session | `useSession()` SWR, seeded by `/api/auth/session` | revalidate on focus; mutated after sign-in/out |
| `/account` | Server page guard + user prop | `mutate(SESSION_KEY)` after sign-out |
| `/orders` | Server page guard + `getOrdersForUser` | SWR `/api/orders`, 10 s while active |
| `/orders/[id]` | Server page guard + `getOrderForUser` | SSE `/api/orders/[id]/stream`, checks every 2 s, closes on terminal |
| `/kitchen` | Server page guard + `getKitchenOverview` (queue + chart summaries) | SWR `/api/kitchen/orders`, 8 s |
| `/admin` | Server page guard + `getAdminStats` (metrics + chart summaries) | SWR `/api/admin/stats`, 15 s |
| `/admin/orders` | Server page guard + `getAllOrders` | SWR `/api/admin/orders`, 10 s |
| `/admin/users` | Server page guard + `listUsers` | SWR `/api/admin/users`, 30 s |

### Why not make every page client-rendered?

The public catalogue is mostly static and benefits from ISR, streaming and zero client fetch on first paint. The private pages need a server session check before any HTML is sent, so they are dynamic. SWR then handles only the changing part, seeded with server data via `fallbackData` to avoid a loading flash. The active order detail uses SSE instead: the server sends the initial order and pushes changes, so the page does not need a client fetch loop.

### Dashboard chart summaries

`src/lib/analytics.js` is server-only. It turns the full order table into the
small arrays the charts need; the browser never receives the raw orders just
to draw a dashboard.

| Summary | Used by | Shape | Rules |
| --- | --- | --- | --- |
| `ordersPerDay` | Admin | 14 rows: `{ date, label, orders }` | All orders placed in the last 14 Addis days |
| `revenueByArea` | Admin | Up to 6 rows: `{ area, orders, revenue }` | Completed orders only; pickup is its own `Pickup (Bole)` bucket |
| `bestSellingItems` | Admin | Up to 8 rows: `{ id, name, quantity, revenue, rank }` | Completed orders only; grouped by item and ranked by units sold |
| `menuItemShare` | Admin | One row per sold item: `{ id, name, quantity, revenue, rank, share }` | Every menu item with completed sales; `share` is the fraction of completed units sold and all shares add up to 1 |
| `topCustomers` | Admin | Up to 10 rows: `{ id, name, email, orders, revenue, rank }` | Completed orders only; grouped by customer and ranked by lifetime spend |
| `queueByStatus` | Kitchen | 4 rows: `{ status, label, tickets }` | Active tickets only |
| `ordersByHour` | Kitchen | 12 rows: `{ hour, label, orders }` | Every order received today, bucketed into two-hour Addis slots |

Date and hour bucketing uses `Africa/Addis_Ababa`, not the server timezone.
`getAdminStats()` returns these under `charts`; `getKitchenOverview()` returns
`{ orders, charts }` and `/api/kitchen/orders` responds with
`{ data: orders, charts }`. The existing SWR polls therefore refresh the
charts with the queue/metrics instead of adding a second request.

## 5. SWR keys, intervals and SSE

| SWR key | Used by | Interval | Notes |
| --- | --- | --- | --- |
| `/api/auth/session` | `useSession` / navbar | on focus | `shouldRetryOnError: false`; `mutate` after auth actions |
| `/api/menu/search?q=…&category=…` | `MenuBrowser` | on key change only | 300 ms debounce; `keepPreviousData: true`; no focus revalidation |
| `/api/orders` | `OrdersLive` | 10 s while any order is active | stops when all orders are terminal |
| `/api/kitchen/orders` | `KitchenBoard` | 8 s | employee/admin queue plus chart summaries |
| `/api/admin/stats` | `AdminOverview` | 15 s | metrics plus chart summaries |
| `/api/admin/orders` | `AdminOrders` | 10 s | all orders |
| `/api/admin/users` | `AdminUsers` | 30 s | role management |

`OrderDetailLive` does not use SWR. It opens an `EventSource` to
`/api/orders/[id]/stream`; the route checks the session and ownership, sends the
current order immediately, then checks the database every 2 seconds and sends a
frame only when `updatedAt` changes. The route and client both close the stream
once the order is `completed` or `cancelled`.

`src/lib/fetcher.js` is shared: it sends `accept: application/json`, includes cookies, parses JSON, and throws an `Error` with `status` and `body` on non-2xx. That lets components distinguish 401/403/404/409 without parsing strings.

### Mutations and revalidation

- **Sign-in/register/sign-out** call the server action, then `mutate(SESSION_KEY)` so the navbar updates immediately. Sign-out also clears the client store's auth keys (the store was bumped to version 4 for that migration).
- **Order creation** is a Server Action. It calls `revalidatePath` for `/orders`, `/orders/[id]`, `/kitchen`, `/admin` and `/admin/orders`, then the checkout page navigates to the new order.
- **Customer cancel** calls `POST /api/orders/[id]/cancel`, then `mutate()` on the list SWR key; the detail page's SSE stream also receives the cancelled status.
- **Kitchen/admin status changes** call `PATCH`, then `mutate()` on their queue key. The next poll also picks up changes made by another user.

## 6. Search debounce

`MenuBrowser` keeps two values: the immediate input and a 300 ms debounced value.

```js
const debouncedSearch = useDebouncedValue(search.trim(), 300);
const searchKey = debouncedSearch
  ? `/api/menu/search?q=${encodeURIComponent(debouncedSearch)}&category=${encodeURIComponent(category)}`
  : null;
```

`searchKey` is `null` for an empty query, so clearing the box does not make a request; the server-seeded list is shown again. While a request is in flight, the component keeps the previous results (`keepPreviousData`) and displays “Searching the live menu…”.

The search API itself filters name, native name, description and category, and returns `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

## 7. Data validation

- **Auth forms** use `signInSchema` and `registerSchema` from `src/lib/schemas.js` with Zod.
- **Checkout** uses `checkoutSchema`. The server re-validates the whole payload, including item quantity bounds and fulfillment-specific fields.
- **Dish ids** are resolved against `getAllDishes()`. Unknown ids return `DISH_UNAVAILABLE`.
- **Prices and totals** are recomputed with `getCartTotals`; client totals are display-only.
- **Order status** is validated against `nextStatuses(status, fulfillment)` in the app and again by the Postgres trigger. Admins may additionally cancel a non-terminal order; customers may cancel only `received`; employees cannot cancel.
- **Roles** are validated against `ROLES` in `src/lib/roles.js` and the `user_role` enum.

## 8. Data retention and privacy

- Sign-out revokes a session by setting `sessions.revoked_at`; the row is kept for audit. Expired/revoked rows are rejected by every lookup and can be removed by an operational cleanup job.
- Orders keep an `order_status_history` timeline with the acting user id and display name; `audit_log` records order creation, status changes and role changes.
- `toSafeUser` is the only user shape sent to the browser; `password_hash` and session rows never leave the server.
- `.data/` is ignored by Git. It is the legacy import/reconciliation input, not a runtime store.
- Customer order APIs return `404` for another user's id rather than `403`, so the endpoint cannot confirm that an order exists.

## 9. Operational checklist

### Date-dispersed test orders

`scripts/seed-orders.mjs` fills the normalized Postgres tables with realistic
orders for chart and queue testing. It replaces the orders table by default,
keeps the imported admin/employee/guest accounts, and adds `@mesob.test` demo
customers with the shared password `Guest123!`. It writes only to Postgres;
the old `--file` mode is gone.

The script loads `.env.local` and `.env`, prints the target, and refuses a
non-local database unless `--allow-remote` is passed. Its connection pool uses
two connections because one is held for validation while the seed writes run
in a second transaction.

```bash
# 1,500 orders over 120 days, plus 24 demo customers
npm run seed:orders

# A bigger or smaller spread
npm run seed:orders -- --count 2500 --days 180 --customers 30

# Keep existing orders and append another batch
npm run seed:orders -- --keep-orders

# Remove only the @mesob.test demo orders/customers
npm run seed:orders:clear
npm run seed:orders -- --clear --dry-run

# Inspect what would be generated without writing
npm run seed:orders -- --count 25 --days 5 --customers 3 --dry-run
```

Every past day gets at least one order, with more weight on recent dates.
Today receives a separate batch, including active tickets for the kitchen
queue, so both dashboards have data immediately. Demo customers use
`diner01@mesob.test` through `diner24@mesob.test` by default.

The smoke test for the rewritten script is in
[`docs/seed-orders-smoke.txt`](./docs/seed-orders-smoke.txt): a scratch database
seeded 25 orders, the dry-run reported 25 demo orders and 50 demo customers,
the clear removed only those rows, and a post-clear dry run reported zero demo
accounts before creating its preview set.

For production, take a verified backup, run migrations on a staging copy, set
`PG_POOL_MAX` for the host, and schedule session/audit retention. The rest of
the application stays unchanged because all persistence is behind the Prisma
client in `src/lib/prisma.js`, with user/session operations in `src/lib/db.js`
and order operations in `src/lib/orders.js`.
