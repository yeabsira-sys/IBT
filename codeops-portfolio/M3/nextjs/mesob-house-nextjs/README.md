# Mesob House

A production-shaped Next.js restaurant site for a Habesha kitchen in Addis Ababa. The public side is statically rendered and ISR-cached; the private side adds real sessions, scoped order history, a live kitchen queue and an admin console.

DEPLOYED ON VERCEL [mesob-house / addis-eats](https://mesob-house-phi.vercel.app/).

DEPLOYED ON ONRENDER [mesob-house / addis-eats](https://addis-eats-9f08.onrender.com/).

> This repository is the Day 45 submission for the CodeOps M3 advanced Next.js assignment.

> **New to the codebase? Start with [`PROJECT_GUIDE.md`](./PROJECT_GUIDE.md).**
> It explains the whole app, the main request flows, the folder map and where to change things.

## What is implemented

- **Real authentication** — opaque session tokens in an `httpOnly` cookie, scrypt password hashes, 7-day sessions (30 days with “keep signed in”).
- **Three layers of protection** — role-aware `proxy.js` routing gate, server-side page guards, and action/API guards. Ownership is part of every customer order query.
- **Three roles** — `customer`, `employee`, `admin`. Kitchen and admin routes are never public, and staff accounts are kept inside their portal: public shop and customer-only pages redirect them to `/admin` or `/kitchen`, while public menu and customer order APIs return `403`. `/account` stays available so staff can sign out.
- **Backend-owned menu** — categories, dishes, complimentary sides, add-ons, pairings and per-dish option groups are stored in Postgres and edited from `/admin/menu`; there is no external menu API or client-side fallback catalogue.
- **Verified reviews** — a customer can rate a dish 1–5 stars only after a completed order containing it. Reviews are unique per customer/dish, moderated at `/admin/reviews`, and enforced by both the Server Action and a database trigger.
- **Live order flow** — `received → preparing → ready → out_for_delivery → completed`, with pickup skipping delivery and customer cancellation only while `received`.
- **Server-authoritative pricing** — dish ids and prices are resolved against the live menu inside the order action; a forged client price is ignored.
- **Live data + SWR and SSE** — session navbar, debounced menu search, order-history polling, kitchen queue polling, admin metrics/orders/users polling, and an authenticated SSE stream for the active order detail.
- **Admin charts** — daily order volume, completed revenue by area, the full menu-item sales mix by units sold and the top ten customers by completed lifetime spend, each with an accessible data table.
- **Shared formatters + CSV export** — `src/lib/format.js` builds the `etb`, `when`, `relative` and `number` formatters once; `/orders`, an individual order page, and `/admin/orders` can download order history through `src/lib/csv.js`, which quotes commas, quotes and newlines correctly.
- **Leaflet delivery map** — a browser-only map on `/orders/[id]` with restaurant, destination and illustrative courier markers, plus the same route and address as text. See [`MAPS.md`](./MAPS.md).
- **Metadata and discovery** — per-page metadata, per-dish Open Graph cards, JSON-LD `MenuItem`, sitemap, robots rules, web manifest, private-page `noindex`.
- **Documentation** — [`PROJECT_GUIDE.md`](./PROJECT_GUIDE.md) is the big-picture codebase tour; [`AUTH.md`](./AUTH.md), [`DATA.md`](./DATA.md), [`PERF.md`](./PERF.md), [`MAPS.md`](./MAPS.md), and [`docs/DB_REBUILD_REPORT.md`](./docs/DB_REBUILD_REPORT.md) cover security, data/caching, performance, the map, and the database rebuild.

## Stack

| Layer         | Choice                                                |
| ------------- | ----------------------------------------------------- |
| Framework     | Next.js 16 App Router (Turbopack)                     |
| UI            | React 19, CSS modules-free global styles              |
| Client state  | Zustand for cart, favourites and checkout draft       |
| Server data   | Prisma ORM over normalized Postgres tables            |
| Client data   | SWR 2 + EventSource for the order status stream       |
| Validation    | Zod + react-hook-form                                 |
| Passwords     | Node `scrypt` with a per-user salt                    |
| Session token | 256-bit random token; SHA-256 hash stored server-side |

## Quick start

```bash
npm install
cp .env.example .env.local
# Set DATABASE_URL in .env.local to a Postgres database.
npm run db:deploy
npm run db:seed
npm run dev
```

Open <http://localhost:3000>. Runtime queries use Prisma Client through the
`PrismaPg` adapter. Prisma Migrate owns schema history; the baseline migration
also supplies the triggers, generated columns, checks and indexes Prisma cannot
express. The app is Postgres-only; it does not create a JSON file or seed
accounts on first request.

For a fresh local database, `npm run db:reset` combines migrate, reset and seed.
Both reset and seed refuse remote targets unless `--allow-remote` is passed.

See [`DATA.md`](./DATA.md) and
[`docs/DB_REBUILD_REPORT.md`](./docs/DB_REBUILD_REPORT.md).

The menu catalogue is read from Postgres through Prisma. `/menu` and the home specials keep a 5-minute ISR cache; dish pages are dynamic because they carry the signed-in customer's review state. Admin edits call `revalidatePath`, so a saved dish or moderated review is visible immediately.

### Demo accounts

| Role     | Email                 | Mobile      | Password      | Can open                                    |
| -------- | --------------------- | ----------- | ------------- | ------------------------------------------- |
| Admin    | `admin@mesob.house`   | `911000001` | `Admin123!`   | `/account` (sign out), `/kitchen`, `/admin` |
| Employee | `kitchen@mesob.house` | `911000002` | `Kitchen123!` | `/account` (sign out), `/kitchen`           |
| Delivery | `delivery@mesob.house`| `911000004` | `MesobDelivery2026!` | `/account` (sign out), `/kitchen`    |
| Customer | `guest@mesob.house`   | `911000003` | `Guest123!`   | public shop, account, checkout, own orders  |

Sign in with either the email (Email tab) or the nine digits after `+251` (Mobile tab).

> These accounts are created by `scripts/seed.mjs` (with `SEED_*_EMAIL` / `SEED_*_PASSWORD` overrides) and are for local development only. Change their passwords before any shared or production deployment.

## Routes

### Public

| Route                   | Rendering          | Notes                                                                             |
| ----------------------- | ------------------ | --------------------------------------------------------------------------------- |
| `/`                     | Static + ISR 5 min | Home, specials, gallery                                                           |
| `/menu`                 | Static + ISR 5 min | Server-rendered dish grid; search/category filters are client-side and SWR-backed |
| `/dish/[slug]`          | Dynamic            | DB dish, options and reviews; unknown or retired slugs return a real 404          |
| `/cart`                 | Static             | Cart is local-only; `noindex`                                                     |
| `/terms`, `/privacy`    | Static             | Public legal pages                                                                |
| `/sign-in`, `/register` | Dynamic            | Signed-in users are redirected away                                               |

### Customer (signed in)

| Route          | Guard                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/account`     | `requirePageUser`; every signed-in role, so staff can also sign out                                              |
| `/checkout`    | `requireCustomerPage` + `noindex`                                                                                |
| `/orders`      | `requireCustomerPage`; only the session user's orders; CSV export                                                |
| `/orders/[id]` | `requireCustomerPage`; ownership is part of the lookup; includes the Leaflet map, SSE live status and CSV export |

### Staff

| Route           | Allowed roles                       |
| --------------- | ----------------------------------- |
| `/kitchen`      | `employee`, `admin`                 |
| `/admin`        | `admin`                             |
| `/admin/orders` | `admin`; all orders with CSV export |
| `/admin/menu`   | `admin`; create, edit and retire dishes, options and pairings |
| `/admin/reviews`| `admin`; approve, hide, return to pending or delete reviews   |
| `/admin/users`  | `admin`                             |

Staff sessions are redirected away from the public shop (`/`, `/menu`, `/dish/*`, `/cart`, `/terms`, `/privacy`) and customer-only pages (`/orders`, `/checkout`) to their portal. `/account` stays available to staff so they can review their profile and sign out.

### API

| Method | Route                             | Access                                                                 |
| ------ | --------------------------------- | ---------------------------------------------------------------------- |
| GET    | `/api/auth/session`               | public; returns `{ user: null }` when signed out                       |
| GET    | `/api/menu`, `/api/menu/specials` | public, ISR-cached; `403` for staff                                    |
| GET    | `/api/menu/search?q=&category=`   | public, 60 s CDN cache + SWR; `403` for staff                          |
| GET    | `/api/orders`                     | signed-in customer; scoped to session; `403` for staff                 |
| GET    | `/api/orders/[id]`                | owner only; 404 for another user's order; `403` for staff              |
| GET    | `/api/orders/[id]/stream`         | owner only SSE; polls status every 2 s and closes on a terminal status |
| POST   | `/api/orders/[id]/cancel`         | owner + status `received` only; `403` for staff                        |
| GET    | `/api/kitchen/orders`             | employee/admin                                                         |
| PATCH  | `/api/kitchen/orders/[id]`        | employee/admin; validated transition                                   |
| GET    | `/api/admin/stats`                | admin                                                                  |
| GET    | `/api/admin/orders`               | admin                                                                  |
| PATCH  | `/api/admin/orders/[id]`          | admin; advance or cancel                                               |
| GET    | `/api/admin/users`                | admin                                                                  |
| PATCH  | `/api/admin/users/[id]`           | admin; cannot demote self                                              |
| GET/POST | `/api/admin/menu`               | admin; list, create and validate dishes                                |
| PATCH/DELETE | `/api/admin/menu/[id]`      | admin; edit or soft-retire a dish                                      |
| GET    | `/api/admin/reviews`              | admin; moderation queue filtered by status                            |
| PATCH/DELETE | `/api/admin/reviews/[id]`   | admin; approve, hide, return to pending or delete                     |
| GET    | `/api/health`                     | public liveness probe                                                  |
| POST   | `/api/revalidate`                 | `x-revalidate-secret` header                                           |

## Project layout

```text
src/
  actions/          server actions (auth, order)
  app/
    (shop)/         public shop, cart, checkout, dish pages
    (auth)/         sign-in, register, account, orders, kitchen, admin
    api/            route handlers
  components/       UI, including SWR live views, the SSE order detail and the Leaflet map card
  data/             static page copy and marketing content
  hooks/            useSession, useDebouncedValue, useNavbarState
  lib/              db, auth, orders, menu, pricing, schemas, format, csv, deliveryMap
  proxy.js          Next.js 16 proxy (middleware equivalent)
  store/            Zustand cart/favourites/checkout draft
  styles/           global styles, including portal.css
```

## Delivery map

`/orders/[id]` includes a Leaflet map for the customer's order:

- restaurant marker, delivery-area marker and dashed route line;
- a courier marker while the order is `out_for_delivery`;
- the same route and full address printed as text beside the map;
- a pickup variant with one restaurant marker.

The map is isolated behind `next/dynamic(..., { ssr: false })` because Leaflet
touches `window` on import. The server still renders the address and order
details, and public shop pages stay static/ISR.

The coordinates are approximate neighbourhood centres, not live GPS. The
courier dot is intentionally labelled as illustrative. For the full design,
extension points and testing checklist, see [`MAPS.md`](./MAPS.md).

## Live status and history export

`/orders/[id]` opens an `EventSource` to
`/api/orders/[id]/stream`. The route checks the session and order ownership,
sends the current order immediately, then polls the database every 2
seconds and sends only when `updatedAt` changes. It closes itself when the
order reaches `completed` or `cancelled`, and the client closes the connection
on unmount.

`/orders` keeps its SWR polling and adds **Export CSV**. The individual order
page has the same button and exports the customer's full history; `/admin/orders`
exports all orders. The export uses `src/lib/csv.js`, which doubles quotes and
wraps any value containing a comma, quote or newline. Money stays numeric in
the file; the column names carry the ETB unit. Money and date display across the
app goes through `src/lib/format.js` (`etb`, `when`, `relative`, `number`), so a
formatter is built once rather than inside a render loop.

## Scripts

```bash
npm run dev      # Next dev server
npm run build    # production build
npm start        # serve the production build

npm run prisma:generate  # regenerate Prisma Client from prisma/schema.prisma
npm run db:deploy       # apply Prisma Migrate migrations
npm run db:status       # show migration status
npm run db:seed         # idempotent catalogue/branch/demo-account seed
npm run db:reset        # LOCAL ONLY: drop/recreate, migrate and seed
npm run typecheck       # TypeScript check
npm run test            # Vitest unit tests
npm run smoke:orders    # end-to-end order snapshot/status smoke test
npm run smoke:admin-menu # admin catalogue CRUD/price-history smoke test
```

Application reads and writes use Prisma. The baseline migration intentionally
uses SQL for generated columns, triggers, checks and indexes. Seed, reset and
smoke scripts refuse non-local targets unless `--allow-remote` is passed. This
prevents an accidental write to the production database. See
[`docs/DB_REBUILD_REPORT.md`](./docs/DB_REBUILD_REPORT.md).

## Environment variables

See `.env.example` for the full list.

| Variable                          | Purpose                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`            | Canonical origin for metadata, sitemap and OG URLs                                                                       |
| `APP_ORIGIN`                      | Public origin used by the same-origin check on mutations                                                                 |
| `REVALIDATE_SECRET`               | Shared secret for on-demand ISR                                                                                          |
| `DATABASE_URL`                    | Postgres connection string. Also accepts `POSTGRES_URL` / `POSTGRES_PRISMA_URL`; required for all persistence |
| `PG_POOL_MAX`                     | Maximum app connection pool size (default `10`)                                                              |
| `SEED_*_EMAIL`, `SEED_*_PASSWORD` | Demo credentials used by the security/load-test scripts; they do not create accounts                         |
| `IMAGES_UNOPTIMIZED`              | Set `true` to bypass the Next image optimiser                                                                            |

## Deployment notes

Postgres is required. There is no file or `/tmp` fallback, so a missing
`DATABASE_URL` fails closed: `/api/health` returns `503` and the
persistence layer refuses to start. `postinstall` runs `prisma generate`, so the
Prisma Client is present before `next build`; keep `prisma/schema.prisma` in the
deployment checkout.

1. Create a Postgres database and copy its connection string.
2. Set `DATABASE_URL` in the Vercel project's environment variables. `POSTGRES_URL` also works.
3. Run the baseline migration against a staging copy first:

   ```bash
   DATABASE_URL=postgres://... npm run db:deploy
   # Demo/staging only: seed the sample restaurant, branch and accounts.
   DATABASE_URL=postgres://... npm run db:seed -- --allow-remote
   ```

   The seed refuses a non-local host unless `--allow-remote` is passed. Take and verify a backup before the first remote migration.

4. Redeploy, then verify `/api/health` reports `{"database":"postgres"}`.
5. Set `NEXT_PUBLIC_SITE_URL` and `APP_ORIGIN` to the public HTTPS origin, for example `https://mesob-house-phi.vercel.app`. Do not reuse the `http://localhost:3000` values from `.env` in Vercel.
6. Set a strong `REVALIDATE_SECRET` and change the demo passwords.
7. Replace the public OpenStreetMap tile URL with a production tile provider; keep the attribution.
8. Run the Lighthouse/deployed checks in [`PERF.md`](./PERF.md).

The schema, seed counts, smoke tests and local rebuild record are documented in
[`docs/DB_REBUILD_REPORT.md`](./docs/DB_REBUILD_REPORT.md).

## Verification

The final local production build succeeded. Runtime checks covered:

- seeded sign-in for all demo accounts, registration, sign-out;
- signed-out redirects from `/orders`, `/kitchen`, `/admin`;
- customer redirect away from `/kitchen` and `/admin`;
- staff redirect away from public shop and customer-only pages, while `/account` stays available for sign-out;
- `403` from public menu/customer APIs for staff sessions;
- 401/403 responses from private APIs;
- cross-user order reads and cancellation returning 404;
- cancellation after the kitchen starts returning 409;
- admin self-demotion returning 409;
- open-redirect payloads rejected;
- tampered localStorage price ignored by the server;
- SSE order detail receiving a status change and closing the stream on `completed`, with a visible connection state;
- `/api/orders/[id]/stream` returning `401` to guests, `403` to staff and `404` for another customer's order;
- order-history CSV export containing quoted comma/quote/newline values and no malformed columns;
- SWR polling changing a customer order from `PREPARING` to `READY` without a reload outside the order detail;
- delivery and pickup order maps rendering with the text address, markers and OpenStreetMap attribution;
- debounced search sending one request for a burst of keystrokes.

Database checks:

- one Prisma Migrate baseline applied cleanly to a fresh PostgreSQL database;
- the seed is idempotent and leaves 26 menu items, 26 prices, 4 option groups,
  71 ingredients, five delivery zones and four demo accounts;
- the order smoke test created, priced, cancelled and completed real orders;
- inclusive VAT, discount, service-charge and delivery-fee arithmetic stayed
  exact in integer minor units;
- the admin smoke test created, updated, price-versioned and retired a dish
  without leaving test rows behind;
- the full unit suite (43 tests) and the production build passed.

See [`docs/DB_REBUILD_REPORT.md`](./docs/DB_REBUILD_REPORT.md),
[`AUTH.md`](./AUTH.md) for the attack table, and [`PERF.md`](./PERF.md) for
measured timings.
