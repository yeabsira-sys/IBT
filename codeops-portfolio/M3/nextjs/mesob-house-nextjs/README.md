# Mesob House

A production-shaped Next.js restaurant site for a Habesha kitchen in Addis Ababa. The public side is statically rendered and ISR-cached; the private side adds real sessions, scoped order history, a live kitchen queue and an admin console.

This repository is the Day 45 submission for the CodeOps M3 advanced Next.js assignment.

## What is implemented

- **Real authentication** — opaque session tokens in an `httpOnly` cookie, scrypt password hashes, 7-day sessions (30 days with “keep signed in”).
- **Three layers of protection** — `proxy.js` cookie gate, server-side page guards, and action/API guards. Ownership is part of every customer order query.
- **Three roles** — `customer`, `employee`, `admin`. Kitchen and admin routes are never public.
- **Live order flow** — `received → preparing → ready → out_for_delivery → completed`, with pickup skipping delivery and customer cancellation only while `received`.
- **Server-authoritative pricing** — dish ids and prices are resolved against the live menu inside the order action; a forged client price is ignored.
- **Live data + SWR** — session navbar, debounced menu search, customer order polling, kitchen queue polling, admin metrics/orders/users polling.
- **Metadata and discovery** — per-page metadata, per-dish Open Graph cards, JSON-LD `MenuItem`, sitemap, robots rules, web manifest, private-page `noindex`.
- **Documentation** — [`AUTH.md`](./AUTH.md), [`DATA.md`](./DATA.md) and [`PERF.md`](./PERF.md) explain the design, attacks and measurements.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router (Turbopack) |
| UI | React 19, CSS modules-free global styles |
| Client state | Zustand for cart, favourites and checkout draft |
| Server data | File-backed JSON store at `.data/mesob-house.json` |
| Client data | SWR 2 |
| Validation | Zod + react-hook-form |
| Passwords | Node `scrypt` with a per-user salt |
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

| Role | Email | Mobile | Password | Can open |
| --- | --- | --- | --- | --- |
| Admin | `admin@mesob.house` | `911000001` | `Admin123!` | everything |
| Employee | `kitchen@mesob.house` | `911000002` | `Kitchen123!` | `/kitchen` |
| Customer | `guest@mesob.house` | `911000003` | `Guest123!` | account, checkout, own orders |

Sign in with either the email (Email tab) or the nine digits after `+251` (Mobile tab).

> Change the seed passwords with `SEED_*_PASSWORD` in `.env.local` before deploying. Seed values are only used when the database file does not exist yet; delete `.data/` to reseed.

## Routes

### Public

| Route | Rendering | Notes |
| --- | --- | --- |
| `/` | Static + ISR 5 min | Home, specials, gallery |
| `/menu` | Static + ISR 5 min | Server-rendered dish grid; search/category filters are client-side and SWR-backed |
| `/dish/[slug]` | SSG + ISR 5 min | 20 dish pages pre-rendered; unknown slugs return 404 |
| `/cart` | Static | Cart is local-only; `noindex` |
| `/terms`, `/privacy` | Static | Public legal pages |
| `/sign-in`, `/register` | Dynamic | Signed-in users are redirected away |

### Customer (signed in)

| Route | Guard |
| --- | --- |
| `/account` | `requirePageUser` |
| `/checkout` | `requirePageUser` + `noindex` |
| `/orders` | `requirePageUser`; only the session user's orders |
| `/orders/[id]` | `requirePageUser`; ownership is part of the lookup |

### Staff

| Route | Allowed roles |
| --- | --- |
| `/kitchen` | `employee`, `admin` |
| `/admin` | `admin` |
| `/admin/orders` | `admin` |
| `/admin/users` | `admin` |

### API

| Method | Route | Access |
| --- | --- | --- |
| GET | `/api/auth/session` | public; returns `{ user: null }` when signed out |
| GET | `/api/menu`, `/api/menu/specials` | public, ISR-cached |
| GET | `/api/menu/search?q=&category=` | public, 60 s CDN cache + SWR |
| GET | `/api/orders` | signed-in customer; scoped to session |
| GET | `/api/orders/[id]` | owner only; 404 for another user's order |
| POST | `/api/orders/[id]/cancel` | owner + status `received` only |
| GET | `/api/kitchen/orders` | employee/admin |
| PATCH | `/api/kitchen/orders/[id]` | employee/admin; validated transition |
| GET | `/api/admin/stats` | admin |
| GET | `/api/admin/orders` | admin |
| PATCH | `/api/admin/orders/[id]` | admin; advance or cancel |
| GET | `/api/admin/users` | admin |
| PATCH | `/api/admin/users/[id]` | admin; cannot demote self |
| GET | `/api/health` | public liveness probe |
| POST | `/api/revalidate` | `x-revalidate-secret` header |

## Project layout

```text
src/
  actions/          server actions (auth, order)
  app/
    (shop)/         public shop, cart, checkout, dish pages
    (auth)/         sign-in, register, account, orders, kitchen, admin
    api/            route handlers
  components/       UI, including SWR live views
  data/             curated menu/content fallbacks
  hooks/            useSession, useDebouncedValue, useNavbarState
  lib/              db, auth, orders, menu, pricing, schemas
  proxy.js          Next.js 16 proxy (middleware equivalent)
  store/            Zustand cart/favourites/checkout draft
  styles/           global styles, including portal.css
```

## Scripts

```bash
npm run dev      # Next dev server
npm run build    # production build
npm start        # serve the production build
```

## Environment variables

See `.env.example` for the full list.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, sitemap and OG URLs |
| `API_BASE_URL` | Menu backend, read on the server only |
| `REVALIDATE_SECRET` | Shared secret for on-demand ISR |
| `DATA_DIR` | Directory for the file database (defaults to `./.data`) |
| `SEED_*_EMAIL`, `SEED_*_PASSWORD` | First-run demo accounts |
| `IMAGES_UNOPTIMIZED` | Set `true` to bypass the Next image optimiser |

## Deployment notes

The file database is intentionally self-contained for the assessment. It is **not** suitable for a serverless host with an ephemeral filesystem: sessions and orders would disappear between instances. For a real deployment:

1. Replace `src/lib/db.js` with a Postgres/Neon/Supabase adapter (the rest of the app only imports the functions in that module).
2. Keep the same session model: store a SHA-256 token hash, never the raw cookie value.
3. Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin.
4. Set a strong `REVALIDATE_SECRET` and seed passwords.
5. Run the Lighthouse/deployed checks in [`PERF.md`](./PERF.md).

## Verification

The final local run built 44 routes successfully. Runtime checks covered:

- seeded sign-in for all three roles, registration, sign-out;
- signed-out redirects from `/orders`, `/kitchen`, `/admin`;
- customer redirect away from `/kitchen` and `/admin`;
- 401/403 responses from private APIs;
- cross-user order reads and cancellation returning 404;
- cancellation after the kitchen starts returning 409;
- admin self-demotion returning 409;
- open-redirect payloads rejected;
- tampered localStorage price ignored by the server;
- SWR polling changing a customer order from `PREPARING` to `READY` without a reload;
- debounced search sending one request for a burst of keystrokes.

See [`AUTH.md`](./AUTH.md) for the attack table and [`PERF.md`](./PERF.md) for measured timings.
