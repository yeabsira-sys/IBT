# Data, Caching and Fetching

This document explains where data lives, how it is fetched, which SWR keys are live, and how the rebuilt persistence layer is migrated and seeded. The app is Postgres-only and runtime persistence goes through Prisma ORM.

## 1. Two kinds of data

| Kind | Source | Rendering / cache | Examples |
| --- | --- | --- | --- |
| Public catalogue | Prisma ORM -> Postgres (`restaurants`, `branches`, `menus`, `menu_items`, prices, options, reviews) | Server Components; menu/home ISR 5 min; dish pages dynamic for review state; React `cache` per request | dishes, specials, dish pages, sitemap |
| Private operational data | Prisma ORM -> Postgres | Dynamic server rendering + SWR polling + SSE order stream | users, sessions, role assignments, orders, kitchen queue, admin stats |

`src/lib/menu.js` reads the catalogue on the server through Prisma, so the browser never calls a separate menu backend. Admin menu writes live in `src/lib/adminMenu.js`; public review reads and admin moderation live in `src/lib/reviews.js`.

## 2. Database lifecycle

The schema is owned by **Prisma Migrate**, with one clean baseline:

```text
prisma/
  schema.prisma
  migrations/
    20261105140000_baseline/migration.sql
```

The baseline replaces the retired numbered SQL migration runner. It creates the
full schema, including the invariants Prisma cannot express:

- 43 application models, 26 enums and 44 public tables (including
  `_prisma_migrations`);
- generated `orders.total_minor` and `order_items.line_total_minor`;
- scope-validation triggers for role assignments, prices, categories, options,
  branch inventory, branch menu items, availability and orders;
- effective-date overlap triggers for menu prices and tax rates;
- the verified-review trigger;
- 34 triggers and 18 check constraints in total, plus the indexes used by the
  catalogue, order, kitchen and admin queries.

Prisma Client (`src/lib/prisma.js`, using `@prisma/adapter-pg`) is the
application data path. SQL triggers and constraints are the final authority for
the invariants they enforce.

### Commands

```bash
npm run db:deploy   # prisma migrate deploy: apply the baseline
npm run db:status   # prisma migrate status
npm run db:seed     # idempotent catalogue, branch and demo-account seed
npm run db:reset    # LOCAL ONLY: drop/recreate, migrate, seed
```

`DATABASE_URL` is required. A missing URL fails closed instead of falling back to
a file. `scripts/seed.mjs` refuses a non-local target unless `--allow-remote` is
passed. `scripts/reset-local-db.mjs` only targets a local database and uses
`prisma migrate reset --force --skip-seed` before applying the seed.

The legacy `.data/mesob-house.json` document and the old import,
reconciliation and custom-migration scripts are no longer part of the runtime
or deployment path. There is no backward-compatibility import layer.

### Seed contents

`scripts/seed.mjs` is idempotent and currently seeds:

- one restaurant, one branch (`Bole Medhanialem`, `Africa/Addis_Ababa`) and one
  active menu publication;
- six categories and 26 menu items, with 26 prices, media, translations and
  branch listings;
- four reusable option groups, 13 options and 57 pairings;
- 71 ingredients, 111 item-ingredient links, 14 allergen codes, 15
  item-allergen rows and 13 dietary claims;
- VAT 15% as an inclusive default tax category/rate;
- five radius-based delivery zones;
- the `GURSHA2025` fixed ETB 200 promotion (minimum order ETB 500);
- four demo accounts: admin, kitchen, delivery and guest.

All monetary values are integer minor units. The default currency is ETB and
currency is stored on every priced row; no implicit FX is applied.

## 3. Schema overview

### Tenancy and access

| Table | What it holds |
| --- | --- |
| `restaurants` | One restaurant business; default currency and status |
| `branches` | Branch address, timezone, operating configuration and service-charge settings |
| `branch_operating_hours` | Branch opening hours |
| `menu_publications` | Which menu is published to which branch and when |
| `users` | Customer or staff account, scrypt password hash |
| `sessions` | SHA-256 token hash, user, expiry, revocation |
| `role_assignments` | Staff role and optional branch scope |

`AccountType` separates `CUSTOMER` from `STAFF`; `StaffRole` carries
`RESTAURANT_OWNER`, `BRANCH_MANAGER`, `KITCHEN_STAFF`, `DELIVERY_STAFF` and
`CASHIER`. The existing UI still uses the legacy `customer | employee | admin`
shape, produced by `legacyRoleFor()` from the account type and role assignment.

### Catalogue

| Table group | What it holds |
| --- | --- |
| `menus`, `menu_categories`, `menu_item_categories` | Menu/category structure; a dish can belong to more than one category |
| `menu_items` | Restaurant-level dish master, base price fallback, spice, badges and soft-delete state |
| `menu_item_translations` | Localized name/description copy |
| `menu_item_media` | Gallery images and primary image |
| `ingredients`, `menu_item_ingredients` | Ingredient master and dish composition |
| `allergens`, `menu_item_allergens` | Admin-confirmed allergen declarations |
| `dietary_attributes`, `menu_item_dietary_attributes` | Dietary claims with verification state |
| `nutrition` | Optional nutrition data and its source |
| `menu_option_groups`, `menu_options`, `menu_item_option_groups` | Reusable option groups linked to dishes |
| `menu_pairings` | Suggested companion dishes |

Public allergen rules are in `src/lib/catalog/disclosure.ts`: a dish shows
`CONFIRMED` only when an admin has confirmed its allergen rows. Absence of rows
is never treated as "allergen-free"; the UI shows "Allergen information has not
been confirmed."

### Branch overrides

| Table | What it holds |
| --- | --- |
| `branch_menu_items` | Branch listing, enabled flag, availability status and temporary unavailability |
| `menu_item_availability` | Effective-dated day/time availability windows |
| `branch_menu_option_availability` | Branch-level option availability |
| `inventory_items`, `branch_inventory` | Stock definition and per-branch quantity |
| `menu_item_inventory`, `inventory_transactions` | Recipe links and stock movements |
| `inventory_transfers`, `inventory_transfer_lines` | Branch-to-branch transfers |

The catalogue stays central. Branches layer price, availability, stock and
preparation overrides only. There is no duplicate `BranchMenuItem.priceOverride`;
`MenuItemPrice` is the single price history source.

### Pricing, tax, promotions and delivery

| Table | What it holds |
| --- | --- |
| `menu_item_prices` | Effective-dated branch or catalog-wide price rows |
| `tax_categories`, `tax_rates` | Effective-dated tax configuration in basis points |
| `promotions` | Restaurant- or branch-scoped promotions, no stacking |
| `delivery_zones` | Branch delivery radius, fee and minimum order |

`src/lib/catalog/pricing.ts` resolves the effective price in this order:

1. the latest active branch-specific `MenuItemPrice`;
2. the latest active catalog-wide (`branchId = null`) `MenuItemPrice`;
3. `MenuItem.basePriceMinor` only as a bootstrap fallback when no price row
   exists.

Expired rows are never silently used. A currency mismatch is an error.

`src/lib/catalog/availability.ts` checks the branch listing, branch item status,
temporary-unavailable window and effective-dated `menu_item_availability`
windows in the branch timezone (`Africa/Addis_Ababa` by default).

`src/lib/catalog/promotions.ts` picks at most one promotion. The highest
discount wins; ties are resolved deterministically by priority/code.

### Orders and reviews

| Table | What it holds |
| --- | --- |
| `orders` | Order header, contact/delivery snapshot, money snapshot, status and fulfillment |
| `order_items` | Immutable line snapshot: dish name/description, unit price, options, allergens, dietary data |
| `order_status_history` | One row per status transition |
| `reviews` | Verified 1-5 star review, unique per customer/dish, moderated |
| `audit_log` | Catalogue and operational audit rows with before/after JSON |

`src/lib/orders/snapshot.ts` resolves all dish prices, options, modifiers, tax,
service charge and promotion server-side inside one transaction. The client sends
slugs and option values only. `src/lib/orders/totals.ts` is the pure integer
calculation used for the stored snapshot and for tests.

### Money

All money columns are integer minor units (`*_minor`, for example
`subtotal_minor`, `tax_minor`, `total_minor`). The UI converts to birr at the
repository/DTO boundary. There is no floating-point arithmetic in the order
path.

The stored totals follow these rules:

- `subtotal_minor` is the menu gross before discount;
- inclusive tax is informational and is not added again;
- exclusive tax is added to the payable total;
- mixed inclusive/exclusive lines are rejected;
- a percentage service charge is calculated on the discounted subtotal;
- a taxable service charge joins the tax base;
- discounts cannot make the order negative.

`orders.total_minor` and `order_items.line_total_minor` are generated by
Postgres and stored, so a header total cannot silently drift from its
components.

### Status transitions

The database stores uppercase `OrderStatus` values. The existing UI/API keeps
lowercase legacy statuses and fulfillment values.

```text
RECEIVED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> COMPLETED
RECEIVED -> CANCELLED       (customer only while received)
any non-terminal -> CANCELLED (admin)
```

Pickup orders skip `OUT_FOR_DELIVERY`. The application checks role and transition
rules in `src/lib/orders.js`; it inserts each `order_status_history` row
explicitly in the same transaction. The kitchen/admin status routes and the
customer cancellation route both go through that module.

### Sessions

`createSessionRecord()` inserts a random 256-bit token and stores only its
SHA-256 hash. Sign-out sets `revoked_at` rather than deleting the row.
`getSessionUserByToken()` requires `revoked_at IS NULL AND expires_at > now()`.
Expired rows are ignored immediately and can be cleaned up operationally.

## 4. Menu data and ISR

`src/lib/menu.js` reads the catalogue from Postgres through Prisma:

- `getMenu()` returns active dishes, categories, option groups/defaults,
  pairings, branch price/availability and approved review aggregates.
- `getSpecials()` filters the same catalogue by `isSpecial`.
- `getAllDishes()` is the canonical checkout list.
- The functions use React `cache`, so one request pass does not repeat the same
  query.
- `/` and `/menu` keep a 5-minute ISR window. `/dish/[slug]` is
  `force-dynamic` because it renders the signed-in customer's review state.
- Admin menu writes and review moderation call `revalidatePath`, so changed
  dishes and ratings appear immediately instead of waiting for ISR.

The order action does not trust the client's price. It resolves every line
through the same branch price/availability functions used by the public
catalogue.

## 5. Server rendering vs client fetching

| Route / component | Initial data | Live update |
| --- | --- | --- |
| `/` | Server Component; specials from `getSpecials()` | none (ISR) |
| `/menu` | Server Component; full dish list from `getMenu()` | debounced SWR search after typing |
| `/dish/[slug]` | Dynamic Server Component; DB dish, options, pairings and approved reviews | review submit refreshes the route |
| Navbar session | `useSession()` SWR, seeded by `/api/auth/session` | revalidate on focus; mutated after sign-in/out |
| `/account` | Server page guard + user prop | `mutate(SESSION_KEY)` after sign-out |
| `/orders` | Server page guard + `getOrdersForUser` | SWR `/api/orders`, 10 s while active |
| `/orders/[id]` | Server page guard + `getOrderForUser` | SSE `/api/orders/[id]/stream`, checks every 2 s, closes on terminal |
| `/kitchen` | Server page guard + `getKitchenOverview` | SWR `/api/kitchen/orders`, 8 s |
| `/admin` | Server page guard + `getAdminStats` | SWR `/api/admin/stats`, 15 s |
| `/admin/orders` | Server page guard + `getAllOrders` | SWR `/api/admin/orders`, 10 s |
| `/admin/users` | Server page guard + `listUsers` | SWR `/api/admin/users`, 30 s |

### Why not make every page client-rendered?

The public catalogue is mostly static and benefits from ISR, streaming and zero
client fetch on first paint. The private pages need a server session check before
any HTML is sent, so they are dynamic. SWR then handles only the changing part,
seeded with server data via `fallbackData` to avoid a loading flash. The active
order detail uses SSE instead: the server sends the initial order and pushes
changes, so the page does not need a client fetch loop.

### Dashboard chart summaries

`src/lib/analytics.js` is server-only. It turns the fetched orders into the small
arrays the charts need; the browser never receives the raw orders just to draw a
dashboard.

| Summary | Used by | Shape | Rules |
| --- | --- | --- | --- |
| `ordersPerDay` | Admin | 14 rows: `{ date, label, orders }` | All orders placed in the last 14 Addis days |
| `revenueByArea` | Admin | Up to 6 rows: `{ area, orders, revenue }` | Completed orders only; pickup is its own bucket |
| `bestSellingItems` | Admin | Up to 8 rows | Completed orders only; ranked by units sold |
| `menuItemShare` | Admin | One row per sold item | Completed units; shares add up to 1 |
| `topCustomers` | Admin | Up to 10 rows | Completed orders only; lifetime spend |
| `queueByStatus` | Kitchen | 4 rows | Active tickets only |
| `ordersByHour` | Kitchen | 12 rows | Every order received today, two-hour Addis slots |

Date and hour bucketing uses `Africa/Addis_Ababa`, not the server timezone.

## 6. SWR keys, intervals and SSE

| SWR key | Used by | Interval | Notes |
| --- | --- | --- | --- |
| `/api/auth/session` | `useSession` / navbar | on focus | `shouldRetryOnError: false`; `mutate` after auth actions |
| `/api/menu/search?q=…&category=…` | `MenuBrowser` | on key change only | 300 ms debounce; `keepPreviousData: true` |
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

`src/lib/fetcher.js` is shared: it sends `accept: application/json`, includes
cookies, parses JSON, and throws an `Error` with `status` and `body` on non-2xx.

### Mutations and revalidation

- **Sign-in/register/sign-out** call the server action, then `mutate(SESSION_KEY)`.
- **Order creation** is a Server Action. It calls `revalidatePath` for `/orders`,
  `/orders/[id]`, `/kitchen`, `/admin` and `/admin/orders`, then the checkout page
  navigates to the new order.
- **Customer cancel** calls `POST /api/orders/[id]/cancel`, then `mutate()` on the
  list SWR key; the detail page's SSE stream also receives the cancelled status.
- **Kitchen/admin status changes** call `PATCH`, then `mutate()` on their queue
  key. The next poll also picks up changes made by another user.

## 7. Search debounce

`MenuBrowser` keeps two values: the immediate input and a 300 ms debounced value.

```js
const debouncedSearch = useDebouncedValue(search.trim(), 300);
const searchKey = debouncedSearch
  ? `/api/menu/search?q=${encodeURIComponent(debouncedSearch)}&category=${encodeURIComponent(category)}`
  : null;
```

`searchKey` is `null` for an empty query, so clearing the box does not make a
request; the server-seeded list is shown again. While a request is in flight, the
component keeps the previous results (`keepPreviousData`) and displays
"Searching the live menu…".

The search API filters name, native name, description and category and returns
`Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

## 8. Data validation

- **Auth forms** use Zod schemas from `src/lib/schemas.js`.
- **Checkout** uses `checkoutSchema`. The server re-validates the whole payload,
  including item quantity bounds and fulfillment-specific fields.
- **Dish slugs and option values** are resolved against the live catalogue;
  unknown values return `DISH_UNAVAILABLE` or `INVALID_OPTION`.
- **Prices and totals** are recomputed by `createOrderSnapshot()` and
  `calculateOrderTotals()`; client totals are display-only.
- **Order status** is validated by `nextStatuses(status, fulfillment)` and the
  role checks in `src/lib/orders.js`.
- **Roles** are validated by `AccountType`, `StaffRole` and the central policy
  module in `src/lib/policy.ts`.

## 9. Data retention and privacy

- Sign-out revokes a session by setting `sessions.revoked_at`; the row is kept
  for audit.
- Orders keep an `order_status_history` timeline with the acting user id and
  display name; `audit_log` records catalogue changes and operational actions.
- `toSafeUser()` is the only user shape sent to the browser; `passwordHash` and
  session rows never leave the server.
- Customer order APIs return `404` for another user's id rather than `403`, so
  the endpoint cannot confirm that an order exists.
- The old `.data/` document is ignored by Git and is not read at runtime.

## 10. Operational checklist

### Fresh local database

```bash
# Start local Postgres, then:
npm run db:reset     # local target only; migrates + seeds
```

### Existing empty database

```bash
npm run db:deploy
npm run db:seed
```

### Verification

```bash
npm run typecheck
npm run test
npm run build
npm run smoke:orders
npm run smoke:admin-menu
```

The two smoke scripts exercise the order snapshot/status flow and the admin
catalogue CRUD/price-history flow against the seeded local database. They clean
up their own test rows and are intentionally local development checks.

For production, take a verified backup, apply `prisma migrate deploy` on a
staging copy, run the seed only for a demo environment, and rotate the demo
credentials. The detailed rebuild record is in
[`docs/DB_REBUILD_REPORT.md`](./docs/DB_REBUILD_REPORT.md).
