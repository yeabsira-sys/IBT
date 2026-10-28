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
- **Live order flow** — `received → preparing → ready → out_for_delivery → completed`, with pickup skipping delivery and customer cancellation only while `received`.
- **Server-authoritative pricing** — dish ids and prices are resolved against the live menu inside the order action; a forged client price is ignored.
- **Live data + SWR and SSE** — session navbar, debounced menu search, order-history polling, kitchen queue polling, admin metrics/orders/users polling, and an authenticated SSE stream for the active order detail.
- **Admin charts** — daily order volume, completed revenue by area, the full menu-item sales mix by units sold and the top ten customers by completed lifetime spend, each with an accessible data table.
- **Shared formatters + CSV export** — `src/lib/format.js` builds the `etb`, `when`, `relative` and `number` formatters once; `/orders`, an individual order page, and `/admin/orders` can download order history through `src/lib/csv.js`, which quotes commas, quotes and newlines correctly.
- **Leaflet delivery map** — a browser-only map on `/orders/[id]` with restaurant, destination and illustrative courier markers, plus the same route and address as text. See [`MAPS.md`](./MAPS.md).
- **Metadata and discovery** — per-page metadata, per-dish Open Graph cards, JSON-LD `MenuItem`, sitemap, robots rules, web manifest, private-page `noindex`.
- **Documentation** — [`PROJECT_GUIDE.md`](./PROJECT_GUIDE.md) is the big-picture codebase tour; [`AUTH.md`](./AUTH.md), [`DATA.md`](./DATA.md), [`PERF.md`](./PERF.md) and [`MAPS.md`](./MAPS.md) cover security, data/caching, performance and the map.

## Stack

| Layer         | Choice                                                |
| ------------- | ----------------------------------------------------- |
| Framework     | Next.js 16 App Router (Turbopack)                     |
| UI            | React 19, CSS modules-free global styles              |
| Client state  | Zustand for cart, favourites and checkout draft       |
| Server data   | File-backed JSON store at `.data/mesob-house.json`    |
| Client data   | SWR 2 + EventSource for the order status stream       |
| Validation    | Zod + react-hook-form                                 |
| Passwords     | Node `scrypt` with a per-user salt                    |
| Session token | 256-bit random token; SHA-256 hash stored server-side |

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. The first request creates `.data/mesob-house.json` and seeds the demo accounts.

The menu is fetched from `API_BASE_URL` on the server with a 5-minute ISR cache. If the remote menu is unavailable, curated fallback dishes are used and the UI shows a “fallback” notice. The site remains usable offline.

### Demo accounts

| Role     | Email                 | Mobile      | Password      | Can open                                    |
| -------- | --------------------- | ----------- | ------------- | ------------------------------------------- |
| Admin    | `admin@mesob.house`   | `911000001` | `Admin123!`   | `/account` (sign out), `/kitchen`, `/admin` |
| Employee | `kitchen@mesob.house` | `911000002` | `Kitchen123!` | `/account` (sign out), `/kitchen`           |
| Customer | `guest@mesob.house`   | `911000003` | `Guest123!`   | public shop, account, checkout, own orders  |

Sign in with either the email (Email tab) or the nine digits after `+251` (Mobile tab).

> Change the seed passwords with `SEED_*_PASSWORD` in `.env.local` before deploying. Seed values are only used when the database file does not exist yet; delete `.data/` to reseed.

## Routes

### Public

| Route                   | Rendering          | Notes                                                                             |
| ----------------------- | ------------------ | --------------------------------------------------------------------------------- |
| `/`                     | Static + ISR 5 min | Home, specials, gallery                                                           |
| `/menu`                 | Static + ISR 5 min | Server-rendered dish grid; search/category filters are client-side and SWR-backed |
| `/dish/[slug]`          | SSG + ISR 5 min    | 20 dish pages pre-rendered; unknown slugs return 404                              |
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
  data/             curated menu/content fallbacks
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
```

## Environment variables

See `.env.example` for the full list.

| Variable                          | Purpose                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`            | Canonical origin for metadata, sitemap and OG URLs                                                                       |
| `APP_ORIGIN`                      | Public origin used by the same-origin check on mutations                                                                 |
| `API_BASE_URL`                    | Menu backend, read on the server only                                                                                    |
| `REVALIDATE_SECRET`               | Shared secret for on-demand ISR                                                                                          |
| `DATABASE_URL`                    | Postgres connection string. Also accepts `POSTGRES_URL` / `POSTGRES_PRISMA_URL`; required for reliable sign-in on Vercel |
| `DATA_DIR`                        | Directory for the file fallback (defaults to `./.data`)                                                                  |
| `SEED_*_EMAIL`, `SEED_*_PASSWORD` | First-run demo accounts                                                                                                  |
| `IMAGES_UNOPTIMIZED`              | Set `true` to bypass the Next image optimiser                                                                            |

## Deployment notes

The file database is fine locally, but it is **not** reliable on a serverless host with an ephemeral filesystem. Vercel functions do not share `/tmp`, so a session created by one instance can be invisible to the proxy or page on another instance. That is what makes sign-in appear to bounce between `/` and `/sign-in`.

Use Postgres (Neon, Supabase or Vercel Postgres) for a Vercel deployment:

1. Create a Postgres database and copy its connection string.
2. Set `DATABASE_URL` in the Vercel project's environment variables. `POSTGRES_URL` also works.
3. Redeploy. `src/lib/db.js` creates the `mesob_house_db` table and seeds the demo accounts automatically.
4. Seed test orders from your machine. The script reads `DATABASE_URL` from `.env` and prints `Target: Postgres (DATABASE_URL)`:

   ```bash
   npm run seed:orders -- --count 3000 --days 365 --customers 50
   ```

5. Set `NEXT_PUBLIC_SITE_URL` and `APP_ORIGIN` to the public HTTPS origin, for example `https://mesob-house-phi.vercel.app`. Do not reuse the `http://localhost:3000` values from `.env` in Vercel.
6. Set a strong `REVALIDATE_SECRET` and seed passwords.
7. Replace the public OpenStreetMap tile URL with a production tile provider; keep the attribution.
8. Run the Lighthouse/deployed checks in [`PERF.md`](./PERF.md).

Without `DATABASE_URL`, Vercel falls back to `/tmp/mesob-house`. That prevents the `mkdir '.data'` crash but remains ephemeral and per-instance; it is only a demo fallback.

The Postgres adapter stores the whole document in one JSONB row. That is deliberate: it keeps the assessment's file model and works across serverless instances. Keep demo seeds in the low thousands rather than tens of thousands for usable page times. See [`DATA.md`](./DATA.md) for the tradeoffs and the normalised schema path.

## Verification

The final local production build succeeded. Runtime checks covered:

- seeded sign-in for all three roles, registration, sign-out;
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

See [`AUTH.md`](./AUTH.md) for the attack table and [`PERF.md`](./PERF.md) for measured timings.
