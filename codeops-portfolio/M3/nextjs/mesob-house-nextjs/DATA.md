# Data, Caching and Fetching

This document explains where data lives, how it is fetched, which SWR keys are live, and why the file database is a deliberate assessment choice rather than a production database.

## 1. Two kinds of data

| Kind | Source | Rendering / cache | Examples |
| --- | --- | --- | --- |
| Public catalogue | Remote menu API (`API_BASE_URL`) with curated fallback | Server Components + ISR (5 min) + React `cache` per render | dishes, specials, dish pages, sitemap |
| Private operational data | `.data/mesob-house.json` | Dynamic server rendering + SWR polling + SSE order stream | users, sessions, orders, kitchen queue, admin stats |

The browser never calls the menu backend directly. `src/lib/api.js` builds the URLs and `src/lib/menu.js` fetches them on the server, so missing CORS headers on the backend are irrelevant and the API host is not exposed as a client dependency.

## 2. File database

### Location and lifecycle

```text
DATA_DIR (default: ./.data)
└── mesob-house.json
```

`src/lib/db.js` creates the directory and file on first read. If the file is missing, `seedDb()` writes the three demo accounts. The file is JSON with three arrays:

```json
{
  "version": 1,
  "users": [
    {
      "id": "uuid",
      "fullName": "Guest Diner",
      "email": "guest@mesob.house",
      "phone": "911000003",
      "passwordHash": "salt:scrypt-hash",
      "role": "customer",
      "preference": "all-heritage",
      "provider": "password",
      "createdAt": "ISO-8601"
    }
  ],
  "sessions": [
    {
      "id": "uuid",
      "tokenHash": "sha256(token)",
      "userId": "uuid",
      "createdAt": "ISO-8601",
      "expiresAt": "ISO-8601"
    }
  ],
  "orders": [
    {
      "id": "MH-XXXXXXXX",
      "userId": "uuid",
      "customer": { "name": "", "email": "", "phone": "" },
      "status": "received",
      "items": [{ "id": "doro-wat", "name": "", "price": 650, "quantity": 1 }],
      "totals": { "subtotal": 650, "injera": 0, "packaging": 0, "vat": 98, "discount": 0, "total": 748 },
      "couponCode": null,
      "note": "",
      "fulfillment": "delivery",
      "contact": { "name": "", "phone": "", "email": "" },
      "delivery": { "subCity": "", "street": "", "landmark": "", "timing": "immediate" },
      "method": "telebirr",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601",
      "statusHistory": [{ "status": "received", "at": "ISO-8601", "by": "uuid", "byName": "Guest Diner" }]
    }
  ]
}
```

The real file contains hashed values, not the illustrative placeholders above.

### Reads

`readDb()` reads the file on **every call**:

```js
export async function readDb() {
  // Next dev can serve route handlers and server actions in different workers.
  return readFromDisk();
}
```

An earlier version cached the parsed database in a module variable. That caused a real bug: the API route worker kept a stale copy after a server action in another worker created an order, so `/orders/[id]` rendered but `/api/orders/[id]` returned 404. Reading the small file every time fixed cross-worker consistency. The file is a few kilobytes in this assessment.

### Writes

`mutateDb()` clones the current document, applies the mutator, then writes to a temporary file and renames it:

```js
const tmp = `${DB_FILE}.${process.pid}.tmp`;
await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
await fs.rename(tmp, DB_FILE);
```

`writeChain` serialises writes inside one process. The rename is atomic on the same filesystem, so a crash cannot leave a partially written JSON document.

### What this does not do

- **No cross-process lock.** Two Next workers (or two containers) can read the same version and overwrite each other's write. The dev server usually runs one process, so the assessment is safe; a production host is not.
- **No persistence on serverless.** Vercel functions have an ephemeral filesystem. Orders and sessions would vanish.
- **No indexes or transactions.** A real database should enforce unique emails/phones and use a transaction for order status changes.

### Production replacement

Only `src/lib/db.js` imports the filesystem. To move to Postgres:

1. Implement the same exported functions (`findUserByEmail`, `createUser`, `createSessionRecord`, `getSessionUserByToken`, `deleteSessionByToken`, `listUsers`, `updateUserRole`) and move the order queries in `src/lib/orders.js` to SQL.
2. Add unique indexes on `users.email`, `users.phone` and `sessions.token_hash`.
3. Use `SELECT ... FOR UPDATE` or an atomic update for order transitions.
4. Keep `toSafeUser` as the boundary that strips password/session fields.

`DATA_DIR` lets a container host point at a persistent volume in the meantime.

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
- **Order status** is validated against `nextStatuses(status, fulfillment)`; admins may additionally cancel a non-terminal order.
- **Roles** are validated against `ROLES` in `src/lib/roles.js`.

## 8. Data retention and privacy

- Sessions are pruned when a new session is created and rejected after `expiresAt`.
- Orders keep a `statusHistory` audit trail with the acting user id and display name.
- `toSafeUser` is the only user shape sent to the browser; `passwordHash` and `sessions` never leave the server.
- The file database is ignored by Git (`.data/` in `.gitignore`).
- Customer order APIs return `404` for another user's id rather than `403`, so the endpoint cannot confirm that an order exists.

## 9. Operational checklist

### Date-dispersed test orders

`scripts/seed-orders.mjs` fills the local database with realistic orders for
chart and queue testing. It replaces the orders table by default, keeps the
seeded admin/employee/guest accounts, and adds demo customers with the shared
password `Guest123!`.

```bash
# 1,500 orders over 120 days, plus 24 demo customers
npm run seed:orders

# A bigger or smaller spread
npm run seed:orders -- --count 2500 --days 180 --customers 30

# Keep existing orders and append another batch
npm run seed:orders -- --keep-orders

# Remove all orders and the @mesob.test demo customers
npm run seed:orders:clear
```

Every past day gets at least one order, with more weight on recent dates.
Today receives a separate batch, including active tickets for the kitchen
queue, so both dashboards have data immediately. Demo customers use addresses
such as `diner01@mesob.test` through `diner24@mesob.test`; all use
`Guest123!`.

```bash
# Fresh seed (destructive)
rm -rf .data
npm run dev

# Inspect the store without printing hashes
node -e "const d=require('./.data/mesob-house.json'); console.log(d.users.map(u=>({email:u.email,role:u.role}))); console.log(d.orders.map(o=>({id:o.id,status:o.status,userId:o.userId})))"
```

For production, add a migration runner, a real database, rate limiting and a backup policy. The rest of the application can stay unchanged because all persistence is behind `src/lib/db.js`.
