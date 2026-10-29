# Mesob House + Next.js — A Codebase Field Guide

> A code-first guide to the Mesob House restaurant app and the Next.js
> patterns it uses. Read it with the repository open: every section points at
> real files in this project and explains **what the code does, why it was
> written that way, and what would break if you changed it carelessly**.
>
> Versions in this repo: **Next.js 16.4.2**, **React 19.3.1**, JavaScript/JSX
> (not TypeScript), App Router, `src/` directory.

---

## Table of contents

1. [What Mesob House is](#1-what-mesob-house-is)
2. [The stack and why each piece is here](#2-the-stack-and-why-each-piece-is-here)
3. [The Next.js mental model](#3-the-nextjs-mental-model)
4. [Repository map](#4-repository-map)
5. [Routing: files become URLs](#5-routing-files-become-urls)
6. [Layouts and the shared shell](#6-layouts-and-the-shared-shell)
7. [Server Components and Client Components](#7-server-components-and-client-components)
8. [Data fetching](#8-data-fetching)
9. [Caching, ISR and revalidation](#9-caching-isr-and-revalidation)
10. [Server Actions](#10-server-actions)
11. [Route Handlers and the HTTP API](#11-route-handlers-and-the-http-api)
12. [Proxy, authentication and authorization](#12-proxy-authentication-and-authorization)
13. [Params, searchParams and metadata](#13-params-searchparams-and-metadata)
14. [Live data: SWR and Server-Sent Events](#14-live-data-swr-and-server-sent-events)
15. [Forms and validation](#15-forms-and-validation)
16. [Images, fonts, dynamic imports and styling](#16-images-fonts-dynamic-imports-and-styling)
17. [Loading, errors and not-found](#17-loading-errors-and-not-found)
18. [Performance choices](#18-performance-choices)
19. [Security model](#19-security-model)
20. [Deployment, data backends and environment](#20-deployment-data-backends-and-environment)
21. [Debugging guide](#21-debugging-guide)
22. [Reading order, cheat sheet and exercises](#22-reading-order-cheat-sheet-and-exercises)

---

## 1. What Mesob House is

Mesob House is a restaurant site for a Habesha kitchen in Addis Ababa. It is
deliberately **part storefront and part operations dashboard**:

| Surface | Routes | Who uses it | Main job |
| --- | --- | --- | --- |
| Public shop | `/`, `/menu`, `/dish/[slug]`, `/cart`, `/terms`, `/privacy` | Anyone | Browse dishes, search, build a basket, start checkout |
| Customer portal | `/checkout`, `/account`, `/orders`, `/orders/[id]` | `customer` | Place an order, see its live status, cancel before preparation, export CSV |
| Kitchen portal | `/kitchen` | `employee`, `admin` | See the live queue, advance tickets |
| Admin portal | `/admin`, `/admin/orders`, `/admin/users` | `admin` | Metrics, all orders, user roles |

There are three roles:

- `customer` — public shop plus their own orders.
- `employee` — kitchen queue; kept out of customer ordering screens.
- `admin` — everything, including user role management.

### The main request flows

```text
Guest browses
  /menu (static/ISR)
    -> src/lib/menu.js fetches the remote menu on the server
    -> MenuBrowser (client) adds search, filters and cart interaction

Customer checks out
  /checkout (dynamic; session required)
    -> CheckoutView calls submitOrder() Server Action
    -> server re-validates the payload, re-prices from the real menu
    -> createOrder() writes the order
    -> revalidatePath() invalidates portal pages
    -> browser goes to /orders/[id]

Kitchen updates an order
  PATCH /api/kitchen/orders/[id]
    -> staff session + same-origin check
    -> updateOrderStatus()
    -> customer's EventSource on /api/orders/[id]/stream receives the new status

Admin watches the business
  /admin (dynamic; admin-only)
    -> getAdminStats() builds metrics + chart data on the server
    -> AdminOverview (client) seeds SWR with that data and polls /api/admin/stats
```

> **Why Next.js for this?** The app needs both extremes: pages that are cheap
> to serve to anonymous visitors and pages that must be personal, dynamic and
> protected. The App Router lets both live in one codebase, with Server
> Components for the static/cached side and Route Handlers/Server Actions for
> the private side.

---

## 2. The stack and why each piece is here

| Tool | Version | Used for | Why this project chose it |
| --- | --- | --- | --- |
| `next` | 16.4.2 | App Router, routing, rendering, caching, metadata, image/font optimisation | One framework for static storefront + dynamic portals |
| `react` / `react-dom` | 19.3.1 | UI, Server Components, `useTransition`, `useDeferredValue` | Required by Next 16; modern concurrent UI primitives |
| Plain CSS files | — | Global design system and page styles | Small portfolio app; CSS variables make a coherent theme without a build-time CSS framework |
| `zustand` | 5.0.15 | Cart, favourites, checkout draft, toasts | Small client state store with `persist` middleware for `localStorage` |
| `swr` | 2.5.1 | Client-side polling/caching for session, orders, admin data | Stale-while-revalidate fits dashboards and lists; no global state boilerplate |
| `zod` | 3.25.76 | Schema validation shared by client and server | One schema for instant UI feedback and authoritative server checks |
| `react-hook-form` | 7.90.0 | Sign-in, register and checkout forms | Controlled form state without re-rendering the whole page on every keystroke |
| `@hookform/resolvers` | 5.9.1 | Connects Zod to React Hook Form | `zodResolver` gives field-level errors |
| `recharts` | 3.10.1 | Admin/kitchen charts | Declarative SVG charts that work as client components |
| `leaflet` / `react-leaflet` | 1.9.4 / 5.0.0 | Delivery-area map | Browser-only map without a paid map SDK; loaded lazily |
| `pg` | 8.23.1 | Optional Postgres backend | Production-capable shared storage for serverless deployments |
| `react-icons` | 5.7.0 | Icons | Tree-shakeable icon components, no icon-font request |
| `server-only` | 0.0.1 | Marks server modules | Build-time guard against accidentally bundling secrets/DB code into the browser |

### Important project conventions

- The `@/*` alias maps to `src/*` (`jsconfig.json`), so `@/lib/auth` means
  `src/lib/auth.js`.
- The app is JavaScript, not TypeScript. The same architectural rules still
  apply; types are replaced by Zod validation and careful data shaping.
- Server-only modules explicitly import `"server-only"`. That is not
  decoration: it makes the build fail if a Client Component imports one of
  them.

---

## 3. The Next.js mental model

### 3.1 The request lifecycle in this app

```text
HTTP request
  |
  v
src/proxy.js                 <- routing policy, session lookup, role redirects
  |
  v
matching app segment
  |
  +--> layout.jsx            <- shared shell, persisted across navigation
  |
  +--> page.jsx              <- Server Component by default
  |      |
  |      +--> async data fetch on the server
  |      +--> render HTML
  |      +--> hydrate Client Components ("islands")
  |
  +--> route.js              <- Route Handler (JSON API / SSE / webhook)
         |
         +--> Request -> Response
```

Two consequences matter more than anything else in this guide:

1. **Everything is a Server Component unless it says `"use client"`.**
2. **A Client Component is a boundary.** Code above the boundary runs on the
   server; code below it is sent to the browser and can use state, effects and
   browser APIs.

### 3.2 The three rendering modes you will see

| Mode | How this app gets it | Example |
| --- | --- | --- |
| Static / prerendered | A page with no request-specific data, often with `generateStaticParams` | `/`, `/menu`, `/dish/[slug]` |
| ISR (incremental static regeneration) | `export const revalidate = 300` and/or cached `fetch` | Home, menu, dish pages, `/api/menu` |
| Dynamic | `cookies()`, request data, or explicit `dynamic = "force-dynamic"` | `/account`, `/orders`, `/admin`, `/api/orders` |

> **Why not make everything dynamic?** The public catalogue is the same for
> every visitor. Serving it from a cache is faster, cheaper and more resilient
> than hitting the menu backend on every request. Private pages, by contrast,
> must never be shared between users, so they stay dynamic.

### 3.3 Server-first, client where interaction lives

A useful rule for reading this codebase:

```text
Can the browser avoid knowing about it?
  -> keep it on the server (DB, secrets, API host, session lookup)

Does it need a click, a keystroke, localStorage, a map, or a chart?
  -> make that one island a Client Component
```

That is why `AdminPage` is a Server Component while `AdminOverview` is a
Client Component, and why `DishPage` is a Server Component while `DishOrder`
is a Client Component.

---

## 4. Repository map

```text
src/
  app/
    layout.jsx                     root layout: fonts, metadata, providers, CSS
    loading.jsx                    global loading fallback
    error.jsx                      route-level error boundary
    global-error.jsx               last-resort root error boundary
    not-found.jsx                  custom 404
    manifest.js                    PWA manifest
    robots.js                      robots.txt
    sitemap.js                     sitemap.xml
    opengraph-image.jsx            generated social card

    (shop)/                        route group; does NOT affect the URL
      layout.jsx                   public shell (SiteShell variant="shop")
      page.jsx                     /
      menu/page.jsx                /menu
      menu/loading.jsx             menu skeleton
      dish/[slug]/page.jsx         /dish/:slug
      dish/[slug]/loading.jsx      dish skeleton
      cart/page.jsx                /cart
      checkout/page.jsx            /checkout (customer-only)
      terms/page.jsx               /terms
      privacy/page.jsx             /privacy

    (auth)/                        route group; does NOT affect the URL
      layout.jsx                   account shell + noindex metadata
      account/page.jsx             /account
      sign-in/page.jsx             /sign-in
      register/page.jsx            /register
      orders/page.jsx              /orders
      orders/[id]/page.jsx         /orders/:id
      kitchen/page.jsx             /kitchen
      kitchen/loading.jsx          kitchen skeleton
      admin/page.jsx               /admin
      admin/loading.jsx            admin skeleton
      admin/orders/page.jsx        /admin/orders
      admin/users/page.jsx         /admin/users

    api/
      auth/session/route.js
      menu/route.js
      menu/search/route.js
      menu/specials/route.js
      orders/route.js
      orders/[id]/route.js
      orders/[id]/cancel/route.js
      orders/[id]/stream/route.js
      kitchen/orders/route.js
      kitchen/orders/[id]/route.js
      admin/stats/route.js
      admin/orders/route.js
      admin/orders/[id]/route.js
      admin/users/route.js
      admin/users/[id]/route.js
      revalidate/route.js
      health/route.js

  actions/                         Server Actions ("use server")
    auth.js
    menu.js
    order.js

  components/
    layout/                        Navbar, Footer, SiteShell, Breadcrumbs
    marketing/                     home page sections
    menu/                          menu browser and cards
    dish/                          dish page interactions
    basket/                        cart UI
    checkout/                      checkout form and payment/delivery cards
    orders/                        customer order list/detail, SSE, map
    kitchen/                       kitchen board
    admin/                         admin nav, overview, orders, users
    charts/                        Recharts cards + accessible tables
    auth/                          sign-in/register UI
    account/                       account and register form
    ui/                            small reusable primitives
    error/                         ErrorBoundary + fallback

  data/                            curated copy, seed-ish demo content
  hooks/                           small client hooks
  lib/                             server/data/format/auth/order logic
  store/                           Zustand stores (cart, toast)
  styles/                          global CSS + design tokens

scripts/
  seed-orders.mjs                  generates demo orders for charts/lists
```

> **Why `(shop)` and `(auth)`?** Route groups let two different layouts share
> one URL tree. `/menu` should use the shop shell, while `/account` should use
> the account shell, but neither URL should contain `/shop` or `/auth`. The
> parentheses tell Next.js "this folder is organizational only".

---

## 5. Routing: files become URLs

The App Router maps folders to URL segments and special filenames to behavior.

| File | URL | Notes |
| --- | --- | --- |
| `src/app/(shop)/page.jsx` | `/` | The group is invisible in the URL |
| `src/app/(shop)/menu/page.jsx` | `/menu` | Static/ISR menu page |
| `src/app/(shop)/dish/[slug]/page.jsx` | `/dish/doro-wat` | `slug` is a dynamic segment |
| `src/app/(auth)/orders/[id]/page.jsx` | `/orders/MH-ABC123` | Order detail, customer-only |
| `src/app/(auth)/admin/page.jsx` | `/admin` | Admin-only |
| `src/app/api/menu/route.js` | `/api/menu` | Route Handler, not a page |
| `src/app/api/orders/[id]/stream/route.js` | `/api/orders/:id/stream` | Nested API segment |

### Dynamic segments

`[slug]` and `[id]` are placeholders. In Next 15+ (and therefore Next 16),
`params` is a **Promise**, so pages await it:

```jsx
// src/app/(shop)/dish/[slug]/page.jsx
export default async function DishPage({ params }) {
  const { slug } = await params;
  const dish = await getDish(slug);
  if (!dish) notFound();

  // ...
}
```

The same pattern appears in API routes:

```js
// src/app/api/orders/[id]/route.js
export async function GET(_request, { params }) {
  const { id } = await params;
  // ...
}
```

> **Why is `params` a Promise?** It lets Next.js start rendering the layout
> before all dynamic data is available. Always `await params` and
> `await searchParams`; do not expect a plain object.

### `notFound()` and `redirect()`

- `notFound()` stops rendering and shows `not-found.jsx` (or the nearest
  `not-found` boundary).
- `redirect()` throws a special navigation signal. It is used in page guards
  and sign-in flows.

```jsx
// src/app/(auth)/orders/[id]/page.jsx
const user = await requireCustomerPage(`/orders/${id}`);
const order = await getOrderForUser(user.id, id);
if (!order) notFound();
```

### Config-based redirects

Not every redirect belongs in code. `next.config.mjs` handles legacy URLs:

```js
async redirects() {
  return [
    { source: "/featured", destination: "/dish/doro-wat", permanent: false },
    { source: "/menu/:slug", destination: "/dish/:slug", permanent: true },
    { source: "/signin", destination: "/sign-in", permanent: false },
  ];
}
```

> **Why?** Redirects that are pure URL policy are cheaper and clearer in
> `next.config.mjs`. Redirects that depend on a session/role belong in
> `proxy.js` or a page guard.

---

## 6. Layouts and the shared shell

### 6.1 The root layout

`src/app/layout.jsx` is the only layout that renders `<html>` and `<body>`.

```jsx
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <StoreHydrator />
        <Navbar links={navLinks} />
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
```

It does five jobs:

1. Loads and self-hosts fonts through `next/font/google`.
2. Declares global `metadata` and `viewport`.
3. Imports every global stylesheet exactly once.
4. Mounts client-side infrastructure (`StoreHydrator`, `ToastViewport`).
5. Renders the `Navbar` once so it persists across client-side navigation.

> **Why is `Navbar` here?** In the App Router, layouts preserve state and do
> not re-render on navigation between their children. Putting the navbar in
> the root layout gives every route a consistent header without remounting it
> on every page.

### 6.2 Route-group layouts

```jsx
// src/app/(shop)/layout.jsx
import SiteShell from "@/components/layout/SiteShell";

export default function ShopLayout({ children }) {
  return <SiteShell variant="shop">{children}</SiteShell>;
}
```

```jsx
// src/app/(auth)/layout.jsx
import SiteShell from "@/components/layout/SiteShell";

export const metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }) {
  return <SiteShell variant="account">{children}</SiteShell>;
}
```

`SiteShell` renders the `<main id="main">` landmark, the page content, and the
footer. The `variant` chooses a different footer column.

The `(auth)` layout also sets `robots.noindex`. Metadata is inherited by all
its pages unless a page overrides it, so `/account`, `/orders`, `/admin`,
`/kitchen` and the auth pages are kept out of search results by default.

> **Why not wrap the navbar in each page?** Layouts are the Next.js mechanism
> for shared UI. Duplicating a navbar per page would remount it, duplicate
> state, and make active-link/session behavior drift.

---

## 7. Server Components and Client Components

### 7.1 Server Components are the default

A file under `app/` is a Server Component unless it contains `"use client"`.
Server Components can:

- Be `async` and `await` data directly.
- Read cookies, headers, the filesystem, databases and secrets.
- Import `server-only` modules.
- Render other Server or Client Components.

They cannot:

- Use `useState`, `useEffect`, `useRef`, event handlers or browser APIs.
- Use `usePathname`, `useSearchParams`, `useRouter` or SWR.
- Pass functions to Client Components (except Server Actions).

### 7.2 Client Components are islands

`"use client"` does not mean "this is the only thing rendered on the client".
It marks a **boundary**. Everything imported by that file becomes part of the
client bundle. That is why the app keeps the boundary as low as possible.

Examples:

```jsx
// Server Component
// src/app/(auth)/admin/page.jsx
export default async function AdminPage() {
  await requirePageRole(["admin"], "/admin");
  const stats = await getAdminStats();
  return <AdminOverview initialStats={stats} />;
}
```

```jsx
// Client Component
// src/components/admin/AdminOverview.jsx
"use client";

export default function AdminOverview({ initialStats }) {
  const { data } = useSWR("/api/admin/stats", fetcher, {
    fallbackData: { data: initialStats },
    // ...
  });
  // ...
}
```

The server does the protected database work and passes a **plain serializable
object** (`initialStats`) into the client island. The client then polls for
updates.

The same pattern repeats:

| Server page | Client island | Why the island exists |
| --- | --- | --- |
| `OrdersPage` | `OrdersLive` | SWR polling, cancel button, CSV export |
| `OrderDetailPage` | `OrderDetailLive` | SSE stream, cancel, map |
| `MenuPage` | `MenuBrowser` | Search, category filter, cart |
| `CheckoutPage` | `CheckoutView` | Form state, local cart, payment UI |
| `KitchenPage` | `KitchenBoard` | Polling, status buttons |
| `AdminPage` | `AdminOverview` | Polling, charts |
| `AdminOrdersPage` | `AdminOrders` | Polling, filters, status changes |

### 7.3 The `server-only` guard

These modules import `"server-only"`:

```text
src/lib/db.js
src/lib/auth.js
src/lib/orders.js
src/lib/menu.js
src/lib/analytics.js
```

If a Client Component imports one of them, the build fails instead of
silently shipping database code or a secret to the browser.

Client-safe shared modules are separate:

```text
src/lib/orderStatus.js
src/lib/pricing.js
src/lib/roles.js
src/lib/orderSearch.js
src/lib/schemas.js
src/lib/format.js
src/lib/csv.js
```

> **Why split the libs this way?** Shared business vocabulary (statuses,
> pricing rules, schemas, formatting) is safe and useful in both environments.
> The moment a module touches `pg`, `fs`, `crypto` or cookies, it gets
> `server-only`.

### 7.4 Passing data across the boundary

Server Components can pass:

- Strings, numbers, booleans, `null`, arrays and plain objects.
- Dates? Prefer ISO strings or plain values; this code uses strings.
- Server Actions (functions marked `"use server"`).

They cannot pass arbitrary functions or class instances. If a client island
needs behavior, it imports a Server Action module itself (as `CheckoutView`
does with `submitOrder`) or uses a Route Handler.

---

## 8. Data fetching

### 8.1 Public catalogue: server-side fetch + fallback

`src/lib/menu.js` is the public data layer:

```js
import "server-only";
import { cache } from "react";

async function load(url, tags) {
  const response = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS, tags },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body?.data)) throw new Error(`${url} returned an unexpected payload`);
  return body.data.map(mapApiDishToCard);
}

export const getMenu = cache(async () => {
  try {
    return { dishes: await load(API_ENDPOINTS.menu, ["menu"]), source: "live" };
  } catch (error) {
    return { dishes: demoMenu, source: "fallback" };
  }
});
```

What is happening:

1. The browser never calls the menu backend directly. The server does.
2. `next: { revalidate: 300, tags: ["menu"] }` opts this fetch into Next's
   data cache for 5 minutes and labels it for on-demand invalidation.
3. `AbortSignal.timeout(10_000)` prevents a slow backend from hanging a page.
4. If the backend fails, the app uses curated demo dishes and returns
   `source: "fallback"`. The UI can show `FallbackNotice`.
5. `cache()` from React deduplicates the call **within one render pass**. If
   three components ask for the menu while rendering the same request, the
   backend is hit once.

> **Why fallback data?** A portfolio/demo app should not show an empty page
> because a third-party API is asleep. The fallback is explicit, visibly
> labelled, and does not hide the failure.

### 8.2 Composition: `getAllDishes`

```js
export const getAllDishes = cache(async () => {
  const [menu, specials] = await Promise.all([getMenu(), getSpecials()]);
  const bySlug = new Map();
  for (const dish of [...specials.dishes, ...menu.dishes]) {
    if (!bySlug.has(dish.id)) bySlug.set(dish.id, dish);
  }
  return {
    dishes: [...bySlug.values()],
    source: menu.source === "live" && specials.source === "live" ? "live" : "fallback",
  };
});
```

- `Promise.all` runs the two independent fetches in parallel.
- The `Map` de-duplicates by dish id, with specials taking precedence.
- The final `source` is only `"live"` if both sources were live.

### 8.3 Static generation of dish pages

```jsx
// src/app/(shop)/dish/[slug]/page.jsx
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { dishes } = await getAllDishes();
  return dishes.map((dish) => ({ slug: dish.id }));
}
```

- `generateStaticParams` asks Next to pre-render one page per dish at build
  time.
- `dynamicParams = true` means a dish added after the build can still render
  on first request, then be cached.
- Unknown slugs fall through to `notFound()`.

> **Why pre-render?** Dish pages are the SEO surface. Static HTML with ISR is
> fast and crawlable, while `dynamicParams` keeps the catalogue editable.

### 8.4 Private data: direct server calls

Private pages do not use `fetch` to their own API. They call server functions
directly:

```jsx
// src/app/(auth)/admin/page.jsx
await requirePageRole(["admin"], "/admin");
const stats = await getAdminStats();
```

```jsx
// src/app/(auth)/orders/[id]/page.jsx
const user = await requireCustomerPage(`/orders/${id}`);
const order = await getOrderForUser(user.id, id);
```

This avoids an unnecessary HTTP hop and keeps ownership checks in one place.
The Route Handlers exist for the **client's later polling**, not for the
initial server render.

### 8.5 Client data: SWR

SWR is used only after the initial server render, for data that changes while
the user is looking at it:

- `/api/auth/session` — navbar session.
- `/api/orders` — customer order list.
- `/api/admin/stats` — admin metrics.
- `/api/admin/orders`, `/api/admin/users` — admin lists.
- `/api/kitchen/orders` — kitchen queue.
- `/api/menu/search` — debounced menu search.

Read more in [Section 14](#14-live-data-swr-and-server-sent-events).

### 8.6 Data-fetching summary

| Data | Fetched where | Cache / freshness |
| --- | --- | --- |
| Menu + specials | Server (`src/lib/menu.js`) | ISR 300s, tagged `menu`, React `cache` |
| Dish page | Server, from menu | SSG + ISR 300s |
| Session | Server (`cookies()` + DB) | Per request, never shared |
| Orders | Server + client SWR | Private, `no-store`, poll while active |
| Admin stats | Server + client SWR | Private, `no-store`, poll 30s |
| Kitchen queue | Server + client SWR | Private, `no-store`, poll 30s |
| Menu search | Client SWR | Public, short cache headers |

---

## 9. Caching, ISR and revalidation

### 9.1 Route segment configuration

Next.js reads exported constants from a page or route file.

```jsx
// src/app/(shop)/menu/page.jsx
export const revalidate = 300;
```

```js
// src/app/api/menu/route.js
export const revalidate = 300;
```

```js
// src/app/api/orders/route.js
export const dynamic = "force-dynamic";
```

| Export | Meaning | Used by |
| --- | --- | --- |
| `revalidate = 300` | Rebuild this segment at most every 5 minutes | Home, menu, dish, menu APIs |
| `dynamic = "force-dynamic"` | Never prerender/cache; render per request | Private APIs, session, SSE |
| `dynamicParams = true` | Allow paths not returned by `generateStaticParams` | Dish pages |
| `runtime = "nodejs"` | Use the Node.js runtime | SSE route (needs Node APIs) |

### 9.2 The `fetch` cache and tags

The menu fetch carries two pieces of metadata:

```js
fetch(url, {
  next: {
    revalidate: 300,   // time-based freshness
    tags: ["menu"],    // on-demand invalidation handle
  },
});
```

`getSpecials` tags its fetch with both `["menu", "specials"]`, so invalidating
`menu` also refreshes specials.

### 9.3 On-demand revalidation

There are three revalidation tools in this codebase:

| API | Where used | Behavior | Why |
| --- | --- | --- | --- |
| `revalidatePath(path)` | `src/actions/order.js` | Invalidates a route path | A new/cancelled order changes `/orders`, `/kitchen`, `/admin` |
| `revalidateTag(tag, "max")` | `src/app/api/revalidate/route.js` | Stale-while-revalidate by tag | A trusted webhook can refresh the menu without blocking |
| `updateTag(tag)` | `src/actions/menu.js` | Immediate expiry, Server Actions only | "Retry menu" should show fresh data right away |

```js
// src/actions/order.js
revalidatePath("/orders");
revalidatePath(`/orders/${order.id}`);
revalidatePath("/kitchen");
revalidatePath("/admin");
revalidatePath("/admin/orders");
```

```js
// src/app/api/revalidate/route.js
revalidateTag("menu", "max");
```

```js
// src/actions/menu.js
"use server";
import { updateTag } from "next/cache";

export async function refreshMenu() {
  updateTag("menu");
  return { ok: true };
}
```

> **Why both `revalidateTag` and `updateTag`?** `updateTag` is for
> read-your-own-writes inside a Server Action: the user clicks Retry and
> should see fresh data immediately. `revalidateTag` is for a background
> refresh where serving slightly stale content while the new version loads is
> acceptable.

### 9.4 Why private pages are dynamic

`requirePageUser` calls `getSession()`, which calls `cookies()`. Reading
cookies is request-specific, so Next.js cannot safely share that page's HTML
between users. The pages also read per-user orders from the database. This is
intentional: **never cache a customer's order page globally**.

Private Route Handlers make this explicit:

```js
export const dynamic = "force-dynamic";

return NextResponse.json(
  { data },
  { headers: { "Cache-Control": "no-store" } },
);
```

### 9.5 What is cached where

```text
Public menu data
  -> Next data cache (fetch + tag "menu", 300s)
  -> full route cache for static/ISR pages
  -> CDN/browser cache for /api/menu (s-maxage=300, stale-while-revalidate=600)

Private session/orders/admin data
  -> no shared cache
  -> server render per request
  -> client SWR cache in memory
  -> explicit no-store on API responses
```

> **Rule of thumb:** if the response depends on a cookie or a user id, it
> must not be publicly cached.

---

## 10. Server Actions

Server Actions are functions marked `"use server"` that a Client Component can
call like a normal async function. Next.js creates the HTTP endpoint for you.

### 10.1 The action modules

| File | Actions | Purpose |
| --- | --- | --- |
| `src/actions/auth.js` | `signInAction`, `registerAction`, `socialSignInAction`, `signOutAction` | Create/destroy sessions |
| `src/actions/order.js` | `submitOrder`, `cancelOrder` | Place/cancel an order |
| `src/actions/menu.js` | `refreshMenu` | Expire the menu tag immediately |

Example:

```js
// src/actions/order.js
"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { getAllDishes } from "@/lib/menu";
import { checkoutSchema } from "@/lib/schemas";
import { getCartTotals } from "@/lib/pricing";
import { createOrder } from "@/lib/orders";

export async function submitOrder(payload) {
  const user = await getSession();
  if (!user) {
    return { ok: false, code: "UNAUTHORIZED", message: "Please sign in before placing an order." };
  }

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, code: "INVALID", message: parsed.error.issues[0]?.message };
  }

  // Never trust the price sent by the browser. Look up the real dish.
  const { dishes } = await getAllDishes();
  const menuById = new Map(dishes.map((dish) => [String(dish.id), dish]));
  const items = [];

  for (const line of parsed.data.items) {
    const dish = menuById.get(String(line.id));
    if (!dish) return { ok: false, code: "DISH_UNAVAILABLE", message: "..." };

    items.push({
      id: String(dish.id),
      name: dish.name,
      price: priceNumber(dish.price),
      quantity: line.quantity,
    });
  }

  const totals = getCartTotals(items, parsed.data.couponCode);

  const order = await createOrder({
    user,
    items,
    totals,
    couponCode: parsed.data.couponCode,
    note: parsed.data.note,
    fulfillment: parsed.data.fulfillment,
    contact: parsed.data.contact,
    delivery: parsed.data.delivery,
    method: parsed.data.method,
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);
  revalidatePath("/kitchen");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");

  return { ok: true, message: `Order ${order.id} is confirmed...`, order };
}
```

### 10.2 The checkout flow in detail

1. `CheckoutView` builds a payload from the Zustand cart and form state.
2. It runs `checkoutSchema.safeParse(payload)` locally for instant errors.
3. It calls `submitOrder(payload)`.
4. The server action:
   - checks the session,
   - validates again with the same schema,
   - re-fetches the real menu,
   - rebuilds the line items from server data,
   - recomputes totals with `getCartTotals`,
   - writes the order,
   - invalidates the affected paths.
5. The client clears the cart, shows a toast, pushes `/orders/[id]`, and calls
   `router.refresh()` so Server Components re-render with the new order.

> **Why call the action directly instead of using `<form action={...}>`?**
> The checkout is a controlled multi-card form with React Hook Form, a
> persistent cart and client-side pricing. Calling the action from an event
> handler keeps the local state flow clear. The action is still a normal
> server boundary; Next handles the network call.

### 10.3 Actions are public endpoints

A Server Action is not "private because it is in the app". Anyone who can
reach the page can invoke it. Therefore every action must:

- Check the session itself.
- Check the role itself.
- Validate the payload itself.
- Ignore client-supplied prices/ownership.
- Return a serializable result instead of leaking stack traces.

This code follows that rule. `submitOrder` checks `getSession()`; `cancelOrder`
checks ownership inside `cancelOrderForUser`; sign-in/register validate with
Zod before touching the database.

### 10.4 Session actions

```js
// src/actions/auth.js
"use server";

export async function signInAction(values) {
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "..." };

  const { method, email, mobile, password, keepSignedIn } = parsed.data;
  const identifier = method === "email" ? email : mobile;
  const user = await findUserByIdentifier(identifier);
  if (!user || !verifyPassword(password, user.passwordHash)) return invalid;

  await createSession(user.id, { remember: Boolean(keepSignedIn) });
  return { ok: true, message: `Welcome back...`, user: toSafeUser(user) };
}
```

`createSession` writes an `httpOnly` cookie. The client then calls
`mutate(SESSION_KEY)` so the navbar's SWR cache updates immediately.

### 10.5 Server Action revalidation and errors

- The actions return `{ ok, message, ... }` instead of throwing for expected
  failures. The UI can toast the message.
- `redirect()` and `notFound()` are allowed in actions, but this app usually
  navigates on the client so it can show a toast first.
- `revalidatePath` is how the action tells Next "the cached server output for
  these pages is now stale".

---

## 11. Route Handlers and the HTTP API

A `route.js` file exports HTTP method functions. It is the App Router's
equivalent of an API route.

### 11.1 A simple GET handler

```js
// src/app/api/admin/stats/route.js
import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { getAdminStats } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const data = await getAdminStats();
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
```

What to notice:

- `dynamic = "force-dynamic"` prevents static optimization.
- Authentication and authorization are checked inside the handler.
- `NextResponse.json` sets the content type and JSON body.
- `Cache-Control: no-store` prevents the browser/CDN from caching private data.

### 11.2 Reading input

```js
// src/app/api/menu/search/route.js
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const category = searchParams.get("category") ?? "all";
  // ...
}
```

```js
// src/app/api/admin/users/[id]/route.js
export async function PATCH(request, { params }) {
  const body = await request.json().catch(() => ({}));
  const { id } = await params;
  // ...
}
```

`request.json()` is deliberately wrapped in `.catch(() => ({}))` so a
malformed JSON body becomes a validation error instead of an unhandled crash.

### 11.3 The API surface

| Route | Methods | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/menu` | GET | public | Full normalized menu, ISR 300s |
| `/api/menu/specials` | GET | public | Specials, ISR 300s |
| `/api/menu/search` | GET | public | Debounced search/filter, short cache |
| `/api/auth/session` | GET | any | Session for navbar SWR, no-store |
| `/api/orders` | GET | customer | Own orders, no-store |
| `/api/orders/[id]` | GET | customer | One owned order |
| `/api/orders/[id]/cancel` | POST | customer + same-origin | Cancel before preparation |
| `/api/orders/[id]/stream` | GET (SSE) | customer | Live order status |
| `/api/kitchen/orders` | GET | staff | Active queue + charts |
| `/api/kitchen/orders/[id]` | PATCH | staff + same-origin | Advance a ticket |
| `/api/admin/stats` | GET | admin | Dashboard metrics/charts |
| `/api/admin/orders` | GET | admin | Every order |
| `/api/admin/orders/[id]` | PATCH | admin + same-origin | Advance/cancel any order |
| `/api/admin/users` | GET | admin | Safe user list |
| `/api/admin/users/[id]` | PATCH | admin + same-origin | Change role |
| `/api/revalidate` | POST | secret header | Invalidate the `menu` tag |
| `/api/health` | GET | public | Liveness + backend name |

### 11.4 Server Actions vs Route Handlers

| Use case | Choice in this app | Why |
| --- | --- | --- |
| Form/button mutation from a Client Component | Server Action | Less boilerplate; direct typed-ish call; easy revalidation |
| Data polling from SWR | Route Handler | SWR needs a URL |
| SSE stream | Route Handler | Needs a streaming `Response` |
| External webhook/secret | Route Handler | Needs a custom header and raw request |
| Public JSON API | Route Handler | Stable HTTP contract |

### 11.5 Same-origin checks for mutations

Mutating Route Handlers use `isSameOrigin`:

```js
// src/lib/http.js
export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // server-to-server / curl

  const allowed = new Set();
  // APP_ORIGIN, NEXT_PUBLIC_SITE_URL, and the request's own origin
  return allowed.has(new URL(origin).origin);
}
```

The handler returns 403 if the browser's `Origin` is not allowed. This is a
CSRF defense layered on top of `SameSite=Lax` cookies. Server-to-server calls
without an `Origin` header are still allowed, which is useful for health
checks and scripts.

---

## 12. Proxy, authentication and authorization

### 12.1 `proxy.js` replaces middleware in Next 16

In Next.js 16, Middleware is called **Proxy**. This project uses
`src/proxy.js`, not `src/middleware.js`.

```js
// src/proxy.js
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("mh_session")?.value;
  const user = token ? await getSessionUserByToken(token) : null;

  if ((isAuthenticatedPage(pathname) || isStaffPage(pathname)) && !user) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // role-based routing...
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/menu/:path*", "/orders/:path*", "/admin/:path*", "/api/orders/:path*"],
};
```

What it does:

1. Reads the session cookie.
2. Looks up the session/user (the cookie is only an opaque token).
3. Sends guests from private pages to `/sign-in?next=...`.
4. Keeps staff out of public/customer surfaces.
5. Keeps employees out of `/admin`.
6. Blocks staff from customer order/menu APIs with a 403.
7. Lets the request continue with `NextResponse.next()`.

The `matcher` limits which requests run through it. Proxy should be fast; this
one does a database lookup, which is acceptable for the demo but would be a
good candidate for a lighter token/session cache in a larger system.

### 12.2 Proxy is routing policy, not the only authorization

The comment in `src/proxy.js` says it clearly: this is the routing-policy
layer. Real authorization happens again in:

- Page guards (`requirePageUser`, `requirePageRole`, `requireCustomerPage`).
- Server Actions (`getSession`, ownership checks).
- Route Handlers (`getSession`, `isAdmin`, `isStaff`).
- Database queries (`getOrderForUser(user.id, id)`).

> **Why repeat the check?** Proxy can be bypassed by a direct API call, a
> server-side request, or a future route that is not in the matcher. The page
> and the data layer must still protect themselves.

### 12.3 Sessions

`src/lib/auth.js` is the single server-side source of truth:

```js
export const SESSION_COOKIE = "mh_session";

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  ...(maxAge ? { maxAge } : {}),
});

export async function getSession() {
  const token = await getSessionToken();
  return getSessionUserByToken(token);
}

export async function createSession(userId, { remember = false } = {}) {
  const session = await createSessionRecord(userId, { remember });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, session.token, cookieOptions(
    remember ? session.days * 24 * 60 * 60 : undefined,
  ));
  return session;
}
```

Important details:

- The cookie contains a random opaque token, not the user id.
- The database stores a **hash** of the token (`sha256`), so a leaked database
  snapshot does not directly give working sessions.
- `httpOnly` means JavaScript cannot read the cookie.
- `sameSite: "lax"` reduces cross-site request risk.
- `secure` is enabled in production.
- 7-day sessions; 30 days if "keep me signed in" is checked.

### 12.4 Page guards

```js
export async function requirePageUser(nextPath) {
  const user = await getSession();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requirePageRole(roles, nextPath) {
  const user = await requirePageUser(nextPath);
  if (!roles.includes(user.role)) redirect(roleHome(user.role));
  return user;
}

export async function requireCustomerPage(nextPath) {
  const user = await requirePageUser(nextPath);
  if (user.role !== "customer") redirect(roleHome(user.role));
  return user;
}
```

They are called from Server Components:

```jsx
// src/app/(auth)/admin/page.jsx
await requirePageRole(["admin"], "/admin");
```

```jsx
// src/app/(auth)/orders/page.jsx
const user = await requireCustomerPage("/orders");
```

### 12.5 The sign-in `next` parameter

When proxy redirects a guest, it sets `?next=/the/private/path`. The sign-in
page sanitizes it:

```jsx
// src/app/(auth)/sign-in/page.jsx
function safeNext(value) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return "/";
  if (value.startsWith("/sign-in") || value.startsWith("/signin") || value.startsWith("/register"))
    return "/";
  return value;
}
```

This blocks open redirects to `https://evil.example`, protocol-relative
`//evil.example`, backslash tricks and sign-in loops.

After login:

```js
router.push(postLoginPath(result.user, next));
router.refresh();
```

`router.refresh()` re-fetches the Server Component tree while preserving
client state, which is how the navbar and protected pages immediately reflect
the new session.

### 12.6 Social sign-in is a demo

`socialSignInAction` is **not** OAuth. It creates or reuses a demo customer
account (`telebirr.guest@mesob.house`, `google.guest@mesob.house`) and creates
a real session. This is useful for demonstrating the flow without external
credentials, but it should not be mistaken for production identity
verification.

---

## 13. Params, searchParams and metadata

### 13.1 `params` and `searchParams` are Promises

```jsx
// src/app/(auth)/sign-in/page.jsx
export default async function SignInPage({ searchParams }) {
  const { next } = await searchParams;
  // ...
}
```

```jsx
// src/app/(auth)/orders/[id]/page.jsx
export default async function OrderDetailPage({ params }) {
  const { id } = await params;
  // ...
}
```

If you forget the `await`, `next` is a Promise and `safeNext` receives the
wrong type; the page silently falls back to `/`.

### 13.2 Static metadata

```jsx
// src/app/(shop)/menu/page.jsx
export const metadata = {
  title: "Menu",
  description: "Browse every Mesob House dish...",
  alternates: { canonical: "/menu" },
};
```

The root layout defines a title template:

```js
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mesob House — Authentic Habesha Dining in Addis Ababa",
    template: "%s | Mesob House",
  },
  description: "...",
  openGraph: { type: "website", siteName: "Mesob House", locale: "en_ET" },
  twitter: { card: "summary_large_image" },
};
```

So `title: "Menu"` becomes `Menu | Mesob House`. The home page overrides the
template with `title: { absolute: ... }`.

### 13.3 Dynamic metadata

```jsx
// src/app/(shop)/dish/[slug]/page.jsx
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const dish = await getDish(slug);
  if (!dish) return { title: "Dish not found" };

  return {
    title: dish.name,
    description: `${dish.description} ETB ${dish.price}.`,
    alternates: { canonical: `/dish/${slug}` },
    openGraph: {
      title: `${dish.name} | Mesob House`,
      description: dish.description,
      images: [{ url: dish.image }],
    },
  };
}
```

`generateMetadata` runs on the server, can fetch data, and is merged with
parent metadata. It should not throw for a missing dish; returning a fallback
title is safer.

### 13.4 JSON-LD

Dish pages add schema.org structured data:

```jsx
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MenuItem",
  name: dish.name,
  description: dish.description,
  image: dish.image,
  url: `${SITE_URL}/dish/${slug}`,
  offers: {
    "@type": "Offer",
    price: dish.price,
    priceCurrency: "ETB",
    availability: "https://schema.org/InStock",
  },
};

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
  }}
/>
```

The `.replace(/</g, "\\u003c")` prevents a dish name/description containing
`</script>` from breaking out of the script tag.

### 13.5 Metadata route files

Next.js recognizes special files in `app/`:

| File | Output | Why |
| --- | --- | --- |
| `src/app/sitemap.js` | `/sitemap.xml` | Lists public pages and every dish |
| `src/app/robots.js` | `/robots.txt` | Allows public pages, disallows private/API |
| `src/app/manifest.js` | `/manifest.webmanifest` | PWA name, colors, icon |
| `src/app/opengraph-image.jsx` | Generated PNG | Social sharing card via `next/og` |

`robots.js`:

```js
disallow: ["/account", "/orders", "/checkout", "/cart", "/kitchen", "/admin", "/api/"],
```

`opengraph-image.jsx` uses `ImageResponse` from `next/og`:

```jsx
import { ImageResponse } from "next/og";

export const alt = "Mesob House — Authentic Habesha Dining in Addis Ababa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return <ImageResponse>{/* JSX card */}</ImageResponse>;
}
```

> **Why generated OG images?** They stay on-brand and update with the code
> without a design tool export step.

---

## 14. Live data: SWR and Server-Sent Events

The app uses two different live-data tools for two different jobs.

### 14.1 SWR: polling and client cache

`src/lib/fetcher.js` is the shared fetcher:

```js
export async function fetcher(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    credentials: "same-origin",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message ?? `Request failed (${response.status})`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}
```

`credentials: "same-origin"` ensures the session cookie is sent. The thrown
error carries the HTTP status so callers can distinguish 401/403/500.

#### Seed with server data, then revalidate

```jsx
// src/components/admin/AdminOverview.jsx
const { data, error, mutate, isValidating } = useSWR(
  "/api/admin/stats",
  fetcher,
  {
    fallbackData: { data: initialStats },
    refreshInterval:
      parseInt(process.env.ADMIN_PAGE_REFRESH_INTERVAL) || 30000,
    revalidateOnFocus: true,
  },
);
const stats = data?.data ?? initialStats;
```

- `fallbackData` means the first client render already has server data; no
  loading spinner flash.
- `refreshInterval` polls every 30 seconds by default.
- `revalidateOnFocus` refreshes when the user returns to the tab.
- `mutate()` manually revalidates after an action.
- `isValidating` drives the "Refreshing metrics…" indicator.

#### Conditional polling that stops when work is done

```jsx
// src/components/orders/OrdersLive.jsx
const { data, error, mutate } = useSWR("/api/orders", fetcher, {
  fallbackData: { data: initialOrders },
  refreshInterval: (latest) =>
    (latest?.data ?? []).some((order) => !isTerminal(order.status))
      ? 10000
      : 0,
  revalidateOnFocus: true,
});
```

This is one of the best patterns in the app: **poll only while at least one
order is still moving**. Once every order is terminal, polling stops.

#### Conditional keys

```jsx
// src/components/menu/MenuBrowser.jsx
const searchKey = debouncedSearch
  ? `/api/menu/search?q=${encodeURIComponent(debouncedSearch)}&category=${encodeURIComponent(category)}`
  : null;

const { data: searchResults, isValidating } = useSWR(searchKey, fetcher, {
  keepPreviousData: true,
  revalidateOnFocus: false,
});
```

A `null` key tells SWR not to fetch. `keepPreviousData` avoids an empty grid
while the next search response loads. The 300 ms debounce comes from
`useDebouncedValue`.

#### Session cache

```jsx
// src/hooks/useSession.js
export const SESSION_KEY = "/api/auth/session";

export default function useSession() {
  const { data } = useSWR(SESSION_KEY, fetcher, {
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });
  return { user: data?.user ?? null, /* ... */ };
}
```

After sign-in, `SignInForm` calls `mutate(SESSION_KEY)` so the navbar updates
without a full page reload. `router.refresh()` then refreshes the server tree.

> **Why SWR instead of Server Components for this?** Server Components are
> great for the initial render, but they do not poll. SWR gives a client cache,
> request deduplication, focus revalidation and manual `mutate` with very
> little code.

### 14.2 SSE: one-way live order status

The customer order detail page uses `EventSource` to receive status changes.

Client:

```jsx
// src/components/orders/OrderDetailLive.jsx
useEffect(() => {
  if (isTerminal(initialOrder.status)) {
    setConnection("closed");
    return undefined;
  }

  const source = new EventSource(`/api/orders/${initialOrder.id}/stream`);
  source.onopen = () => setConnection("live");
  source.onmessage = (message) => {
    const next = JSON.parse(message.data);
    setOrder(next);
    if (isTerminal(next.status)) {
      source.close();
      setConnection("closed");
    }
  };
  source.onerror = () => setConnection("reconnecting");

  return () => source.close();
}, [initialOrder.id, initialOrder.status]);
```

Server:

```js
// src/app/api/orders/[id]/stream/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const stream = new ReadableStream({
  start(controller) {
    const send = (order) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(order)}\n\n`));

    send(initial);

    timer = setInterval(async () => {
      const latest = await getOrderForUser(user.id, id);
      if (latest.updatedAt !== lastUpdatedAt) {
        lastUpdatedAt = latest.updatedAt;
        send(latest);
      }
      if (isTerminal(latest.status)) close();
    }, 2000);

    request.signal.addEventListener("abort", close, { once: true });
  },
  cancel() { /* clear timer */ },
});

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  },
});
```

Why this design:

- **SSE is one-way**: the server pushes status; the browser does not need to
  send messages back.
- **Cookies are sent automatically** by `EventSource` for same-origin
  requests, so the route can authenticate normally.
- **No WebSocket server** is needed; a normal HTTP response with a stream is
  enough.
- **The stream closes at a terminal status** (`completed` or `cancelled`), so
  the server does not poll forever.
- **Abort handling** cleans up the interval if the browser navigates away.
- **`X-Accel-Buffering: no`** prevents proxies such as nginx from buffering
  the stream.

Limitations to be aware of:

- The server polls the database every 2 seconds; it is not using Postgres
  `LISTEN/NOTIFY`. That is portable and simple, but not the most efficient at
  large scale.
- Serverless platforms may impose response-duration limits; a long-lived SSE
  connection can be cut off. The client's `onerror` state shows "reconnecting"
  and `EventSource` retries automatically.
- The route is `runtime = "nodejs"` because it uses interval timers and the
  Node-capable DB layer.

### 14.3 The order lifecycle

`src/lib/orderStatus.js` is shared by client and server:

```js
export const ORDER_STATUSES = [
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
];

export const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);
export const CANCELLABLE_STATUSES = new Set(["received"]);

export function nextStatuses(status, fulfillment) {
  switch (status) {
    case "received": return ["preparing"];
    case "preparing": return ["ready"];
    case "ready": return fulfillment === "pickup" ? ["completed"] : ["out_for_delivery"];
    case "out_for_delivery": return ["completed"];
    default: return [];
  }
}
```

The same rules drive:

- Which buttons the kitchen/admin UI shows.
- Which statuses the server accepts.
- When the customer sees "Cancel order".
- When the SSE stream closes.

> **Why centralize status rules?** If the UI and server disagree, users see
> buttons that fail or miss valid transitions. A shared module avoids that.

### 14.4 Admin charts

`src/lib/analytics.js` computes chart data on the server:

- `ordersPerDay` — last 14 days.
- `revenueByArea` — completed revenue by sub-city, with pickup kept explicit.
- `bestSellingItems` — top 8 by units sold (older summary chart).
- `menuItemShare` — **all** sold menu items with rank, units, revenue and
  share of total units.
- `topCustomers` — top 10 by completed lifetime spend.

The dashboard uses `MenuItemSalesChart`, which renders a donut from
`menuItemShare`:

```jsx
// src/components/admin/AdminOverview.jsx
<div className="chart-grid">
  <MenuItemSalesChart data={stats.charts?.menuItemShare} />
  <TopCustomersChart data={stats.charts?.topCustomers} />
  <OrdersPerDayChart data={stats.charts?.ordersPerDay} />
  <RevenueByAreaChart data={stats.charts?.revenueByArea} />
</div>
```

`MenuItemSalesChart` passes the full list to `PieChartCard`, which:

- Computes the total and each slice's share.
- Renders a Recharts donut.
- Renders an accessible table with the same numbers.
- Shows an empty state when there are no completed orders.

`BestSellingItemsChart` still exists as a reusable top-8 bar chart, but it is
not currently rendered on the dashboard. This is intentional: the dashboard
answers "what is the full sales mix?", not just "what are the top sellers?".

> **Why a table under every chart?** Colour alone is not accessible, and a
> tooltip is not available to keyboard/screen-reader users. The table is the
> legend and the exact data source.

---

## 15. Forms and validation

### 15.1 React Hook Form + Zod

The forms use `useForm` with `zodResolver`:

```jsx
const {
  register,
  handleSubmit,
  control,
  watch,
  formState: { errors, isSubmitting },
} = useForm({
  resolver: zodResolver(signInSchema),
  defaultValues: DEFAULTS,
  mode: "onTouched",
});
```

- `register` wires simple inputs.
- `Controller` wires custom components (`Segmented`, `Checkbox`, `ChipGroup`).
- `watch` drives conditional fields (mobile vs email).
- `mode: "onTouched"` shows errors after the user leaves a field, not while
  typing the first character.
- `isSubmitting` disables the submit button.

### 15.2 One schema, two environments

`src/lib/schemas.js` is imported by both client forms and Server Actions.

```js
export const signInSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("mobile"),
    mobile: ethiopianMobile,
    password: z.string().min(1, "Enter your password."),
    keepSignedIn: z.boolean().optional(),
    rememberAddress: z.boolean().optional(),
  }),
  z.object({
    method: z.literal("email"),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(1, "Enter your password."),
    keepSignedIn: z.boolean().optional(),
    rememberAddress: z.boolean().optional(),
  }),
]);
```

The client uses it for immediate feedback. The server uses the **same** schema
again, because client validation is only a convenience and can be bypassed.

### 15.3 Checkout-specific validation

```js
export const checkoutSchema = z.object({
  fulfillment: z.enum(["delivery", "pickup"]),
  contact: z.object({
    name: z.string().trim().min(2, "Enter the recipient's name."),
    phone: ethiopianMobile,
    email: z.string().trim().email("Enter a valid email for the receipt."),
  }),
  delivery: z.object({
    subCity: z.string().min(1, "Choose a sub-city."),
    street: z.string().trim(),
    landmark: z.string().optional(),
    timing: z.enum(["immediate", "scheduled"]),
  }),
  method: z.string().min(1, "Choose a payment method."),
  couponCode: z.string().optional(),
  note: z.string().max(500).optional(),
  items: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    price: z.union([z.string(), z.number()]),
    quantity: z.number().int().min(1).max(50),
  })).min(1, "Your basket is empty."),
}).superRefine((value, ctx) => {
  if (value.fulfillment === "delivery" && value.delivery.street.length < 3) {
    ctx.addIssue({
      code: "custom",
      path: ["delivery", "street"],
      message: "Enter your street, building and flat number for delivery.",
    });
  }
});
```

`superRefine` handles a cross-field rule: a delivery order needs a real street
address, while a pickup order does not.

### 15.4 Client-side submit

```jsx
const handleConfirm = async () => {
  const payload = { /* cart + form state */ };

  const local = checkoutSchema.safeParse(payload);
  if (!local.success) return toast(local.error.issues[0].message, "error");

  setConfirming(true);
  try {
    const result = await submitOrder(payload); // Server Action
    if (!result.ok && result.code === "UNAUTHORIZED") {
      router.push("/sign-in?next=/checkout");
      return;
    }
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok) {
      clearCart();
      router.push(`/orders/${result.order.id}`);
      router.refresh();
    }
  } finally {
    setConfirming(false);
  }
};
```

> **Why not use `<form action={submitOrder}>`?** The checkout has a persistent
> Zustand cart, a multi-card layout and React Hook Form state. Calling the
> action from an event handler keeps the client flow explicit. The server
> still receives exactly the same kind of serializable payload and validates
> it independently.

---

## 16. Images, fonts, dynamic imports and styling

### 16.1 `next/font/google`

```jsx
// src/app/layout.jsx
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

<html className={`${inter.variable} ${sourceSerif.variable}`}>
```

`next/font` downloads the font at build time, self-hosts it, and generates the
CSS variables. The browser does not make a request to Google, and
`display: "swap"` avoids invisible text during font loading.

### 16.2 `next/image`

```jsx
// src/components/marketing/Hero.jsx
<Image
  src={image}
  alt={imageAlt}
  className="hero__image"
  width={900}
  height={760}
  priority
  sizes="(max-width: 960px) 100vw, 50vw"
/>
```

`next.config.mjs` allow-lists remote hosts:

```js
images: {
  unoptimized: process.env.IMAGES_UNOPTIMIZED === "true",
  remotePatterns: [
    { protocol: "https", hostname: "images.unsplash.com" },
    { protocol: "https", hostname: "addis-eats-backend.onrender.com" },
  ],
},
```

- `remotePatterns` is a security allow-list; arbitrary remote URLs cannot be
  optimized through the app.
- `priority` is used for above-the-fold hero/gallery images.
- `sizes` tells the browser which image width it needs.
- `IMAGES_UNOPTIMIZED=true` is an escape hatch for offline/static hosting.

### 16.3 `next/dynamic`

Leaflet touches `window` as soon as it loads, so it must not render on the
server:

```jsx
// src/components/orders/DeliveryMapPanel.jsx
const DeliveryMap = dynamic(() => import("./DeliveryMap"), {
  ssr: false,
  loading: () => <div className="delivery-map-frame delivery-map-frame--loading">Loading delivery map…</div>,
});
```

Checkout also lazy-loads below-the-fold cards:

```jsx
// src/components/checkout/CheckoutView.jsx
const DeliveryLocationCard = dynamic(() => import("./DeliveryLocationCard"), {
  loading: CardSkeleton,
});
const PaymentMethodCard = dynamic(() => import("./PaymentMethodCard"), {
  loading: CardSkeleton,
});
```

> **Why?** `next/dynamic` splits the module into a separate client chunk.
> Browser-only libraries do not break SSR, and heavy below-the-fold UI does
> not delay first interaction.

### 16.4 `next/link`

`Link` is used for internal navigation:

```jsx
<Button as={Link} href="/menu" variant="outline">
  Explore the menu
</Button>
```

It provides client-side transitions, prefetching and accessible anchor
semantics. Use a plain `<a>` only for external URLs or downloads.

### 16.5 Styling

All global CSS is imported once in the root layout:

```jsx
import "@/styles/theme.css";
import "@/styles/components.css";
import "@/styles/home.css";
// ...
```

`src/styles/theme.css` defines design tokens:

```css
:root {
  --c-brand: #8c2116;
  --c-page: #fdf7f2;
  --c-ink: #2f1e17;
  --font-display: var(--font-source-serif), Georgia, serif;
  --font-body: var(--font-inter), system-ui, sans-serif;
  --r-lg: 16px;
  --shadow-sm: 0 1px 2px rgba(74, 34, 20, 0.06);
}
```

Components use class names such as `.chart-card`, `.portal-page`, `.menu-grid`.
CSS variables keep color, spacing and typography consistent without a runtime
CSS-in-JS library.

---

## 17. Loading, errors and not-found

### 17.1 `loading.jsx`

A segment-level `loading.jsx` is automatically wrapped in a Suspense boundary:

```jsx
// src/app/(auth)/admin/loading.jsx
import PortalLoading from "@/components/portal/PortalLoading";

export default function AdminLoading() {
  return <PortalLoading cards={5} charts={4} label="Loading admin dashboard" />;
}
```

The root `src/app/loading.jsx` renders a centered spinner for any route without
its own loading file.

### 17.2 `Suspense`

`Suspense` is used for streams that should not block the rest of the page:

```jsx
// src/app/(shop)/page.jsx
<Suspense fallback={<SpecialsSkeleton />}>
  <LiveSpecials />
</Suspense>
```

It is also required around `useSearchParams()` in a statically rendered page:

```jsx
// src/app/(shop)/menu/page.jsx
<Suspense fallback={<div className="skeleton-grid">...</div>}>
  <MenuBrowser dishes={dishes} source={source} />
</Suspense>
```

> **Why the Suspense boundary?** `useSearchParams()` is a client hook that
> depends on the URL. On a static page, Next needs a boundary to know what to
> render while the search params are resolved.

### 17.3 `error.jsx`

`src/app/error.jsx` is a Client Component error boundary for the route segment:

```jsx
"use client";

export default function RouteError({ error, reset, retry }) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <main className="site-main">
      <ErrorFallback onRetry={retry ?? reset} />
    </main>
  );
}
```

- It receives `error` and recovery functions.
- Next 16 stabilized `retry()`; the fallback to `reset` keeps compatibility.
- The root layout/navbar stays mounted; only the page content is replaced.

### 17.4 `global-error.jsx`

`src/app/global-error.jsx` handles an error in the root layout itself. It must
render its own `<html>` and `<body>` because the normal root layout failed.

### 17.5 `not-found.jsx` and `notFound()`

`src/app/not-found.jsx` is used for unknown URLs **and** whenever a page calls
`notFound()`:

```jsx
const dish = await getDish(slug);
if (!dish) notFound();
```

The 404 page fetches today's specials and suggests three real dishes. It is an
async Server Component, so it can do that without client JavaScript.

### 17.6 A local error boundary for one island

`src/components/error/ErrorBoundary.jsx` is a class component used around the
lazily loaded map/checkout cards:

```jsx
<ErrorBoundary>
  <DeliveryLocationCard ... />
</ErrorBoundary>
```

If a single lazy chunk fails, the rest of the checkout still works. This is
different from `app/error.jsx`, which replaces the whole route's content.

---

## 18. Performance choices

The project is small, but the performance choices are deliberate:

| Choice | Where | Benefit |
| --- | --- | --- |
| Static/ISR public pages | `/`, `/menu`, `/dish/[slug]` | Fast HTML, less backend load |
| `React.cache` around menu functions | `src/lib/menu.js` | Deduplicates fetches within one render |
| `Promise.all` for menu + specials | `getAllDishes` | Parallel, not sequential, fetching |
| `next/font` | root layout | No Google request, no layout shift |
| `next/image` | cards/hero/gallery | Responsive sizes, lazy loading, format optimization |
| `next/dynamic` for Leaflet | `DeliveryMapPanel` | Keeps browser-only code out of the server bundle and initial chunk |
| `next/dynamic` for below-fold checkout cards | `CheckoutView` | Smaller initial JS |
| `useDebouncedValue` | `MenuBrowser` | One search request per pause, not per keystroke |
| `keepPreviousData` | menu search SWR | No empty flash while typing |
| `useDeferredValue` | `useOrderBrowser` | Keeps typing responsive while filtering a large order list |
| Conditional SWR polling | `OrdersLive` | Stops polling when all orders are terminal |
| SSE closes on terminal status | `OrderDetailLive` | Frees the server interval and browser connection |
| `isAnimationActive={false}` | `PieChartCard` | Deterministic chart rendering; no animation cost |
| `Cache-Control` + ISR headers | menu APIs | CDN can serve public JSON cheaply |
| `no-store` on private APIs | orders/admin/session | Prevents accidental leakage |

### A note about client-side environment variables

Only variables prefixed with `NEXT_PUBLIC_` are inlined into browser code.
`AdminOverview` reads `process.env.ADMIN_PAGE_REFRESH_INTERVAL` in a Client
Component; in practice the browser falls back to the default 30 seconds
unless that value is exposed through a public variable. If you need a
configurable client polling interval, use `NEXT_PUBLIC_ADMIN_REFRESH_MS` or
pass the value down from the server page.

---

## 19. Security model

The app protects more than the happy path. Here is the threat model and the
corresponding code.

| Risk | Mitigation | Where |
| --- | --- | --- |
| Forged session cookie | Opaque random token; server-side session lookup | `src/lib/db.js`, `src/lib/auth.js` |
| Stolen session token | Token hash stored in DB; `httpOnly`; `secure` in prod | `createSessionRecord`, `cookieOptions` |
| Password leak | `scrypt` hash + per-user salt; `timingSafeEqual` | `hashPassword`, `verifyPassword` |
| Password hash sent to browser | `toSafeUser()` strips it | `src/lib/db.js` |
| Price tampering | Server looks up real dish and recomputes totals | `src/actions/order.js`, `src/lib/pricing.js` |
| IDOR (viewing someone else's order) | Queries combine order id with session user id | `getOrderForUser`, `cancelOrderForUser` |
| Staff using customer APIs | Proxy + API role checks | `src/proxy.js`, route handlers |
| CSRF on mutating APIs | `SameSite=Lax` + `isSameOrigin` | `src/lib/http.js` |
| Open redirect after login | `safeNext` rejects absolute/protocol-relative paths | `src/app/(auth)/sign-in/page.jsx` |
| XSS through JSON-LD | `.replace(/</g, "\\u003c")` | `src/app/(shop)/dish/[slug]/page.jsx` |
| Clickjacking | `X-Frame-Options: SAMEORIGIN` | `next.config.mjs` |
| MIME sniffing | `X-Content-Type-Options: nosniff` | `next.config.mjs` |
| Secret leakage into client bundle | `server-only` on DB/auth/orders/menu/analytics | `src/lib/*` |
| Public caching of private data | `dynamic = "force-dynamic"`, `Cache-Control: no-store` | private route handlers |
| Admin self-demotion | API rejects changing own role away from admin | `src/app/api/admin/users/[id]/route.js` |

### 19.1 The layered defense

```text
Route policy:        src/proxy.js
Page guard:          requirePageRole / requireCustomerPage
Action/API guard:    getSession + role check
Data ownership:      getOrderForUser(user.id, id)
Validation:          Zod schema on client and server
Pricing:             getCartTotals on the server
Transport:           httpOnly, SameSite, Secure, same-origin checks
Headers:             next.config.mjs security headers
```

No single layer is trusted. That is the point.

### 19.2 Demo credentials

The README documents seeded accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@mesob.house` | `Admin123!` |
| Employee | `kitchen@mesob.house` | `Kitchen123!` |
| Customer | `guest@mesob.house` | `Guest123!` |

Change these before any real deployment.

---

## 20. Deployment, data backends and environment

### 20.1 Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public origin for metadata, sitemap, Open Graph, canonical URLs |
| `APP_ORIGIN` | Additional allowed origin for same-origin mutation checks |
| `API_BASE_URL` | Menu backend base URL (server-side only) |
| `REVALIDATE_SECRET` | Shared secret for `POST /api/revalidate` |
| `DATABASE_URL` (or `POSTGRES_URL`, `POSTGRES_PRISMA_URL`) | Switch to Postgres |
| `DATA_DIR` | Local JSON store directory |
| `IMAGES_UNOPTIMIZED` | Serve source images directly instead of optimizing |
| `SEED_*` | Seed account credentials for the first database init |
| `ADMIN_PAGE_REFRESH_INTERVAL` | Intended admin polling interval (see caveat above) |

### 20.2 File store vs Postgres

`src/lib/db.js` chooses at startup:

```js
const usePostgres = Boolean(DATABASE_URL);
```

- **No database URL:** users, sessions and orders live in
  `.data/mesob-house.json`.
- **Database URL present:** the same data lives in a Postgres table
  (`mesob_house_db`) as a JSONB row.

On Vercel without Postgres, the app redirects the file store to `/tmp`. That
prevents a read-only filesystem crash, but `/tmp` is ephemeral and per
instance, so sign-in and orders are not reliable. Use Postgres for a real
deployment.

### 20.3 Build and run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # production server
npm run seed:orders             # generate demo orders
npm run seed:orders:clear       # clear them
```

The seed script supports:

```bash
npm run seed:orders -- --count 2500 --days 180 --customers 30
npm run seed:orders -- --file     # force the local JSON store
npm run seed:orders -- --keep-orders
```

### 20.4 `next.config.mjs`

The config does four things:

1. Enables React Strict Mode and removes the `X-Powered-By` header.
2. Allow-lists remote image hosts.
3. Adds legacy redirects.
4. Adds security headers to every response.

```js
async headers() {
  return [{
    source: "/:path*",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ],
  }];
}
```

### 20.5 Health check

`GET /api/health` returns:

```json
{
  "status": "ok",
  "uptime": 123,
  "database": "postgres"
}
```

It intentionally reports only the backend type, never connection details.

### 20.6 Deploying the current chart change

The admin pie chart is part of the working tree only after the chart changes
are committed and deployed. If a deployed `/admin` still shows
"Best-selling food items", the deployment is serving an older commit; the
local source uses `MenuItemSalesChart`.

---

## 21. Debugging guide

### "The menu page shows example dishes"

That is the fallback path. Check:

- `API_BASE_URL` is reachable from the server.
- The backend responds within 10 seconds.
- The response has a `data` array.
- The browser console/network is not the place to debug this; check the
  Next.js server logs for `[menu] using fallback dishes`.

### "The admin pie chart is empty"

The chart only counts **completed** orders. A fresh local `.data` store can
have zero completed orders, so the card correctly renders its empty state.

```bash
npm run seed:orders
```

or complete an order through the UI, then reload `/admin`. The chart should
show one slice per sold item, with shares totaling 100%.

### "Live status never updates"

Check:

1. The order detail page opened an `EventSource` to
   `/api/orders/:id/stream`.
2. The session cookie is present; the SSE route returns 401 without it.
3. The order is not already `completed`/`cancelled` (the stream closes).
4. A proxy/platform is not buffering the response. `X-Accel-Buffering: no` is
   set, but some hosts still need configuration.
5. The kitchen actually changed the status; the stream polls every 2 seconds.

### "I get a hydration mismatch"

Common causes in this codebase:

- Formatting dates/numbers with the server's local timezone instead of the
  explicit `Africa/Addis_Ababa` in `src/lib/format.js`.
- Reading `localStorage` during the first render. `StoreHydrator` exists to
  rehydrate after mount, not during SSR.
- Rendering `window`/`document` in a Server Component. Move that UI into a
  Client Component or a `dynamic(..., { ssr: false })` module.

### "Build fails with 'server-only'"

A Client Component imported a server module. Trace the import chain:

```text
Client Component
  -> src/lib/db.js / auth.js / orders.js / menu.js / analytics.js
```

Move the data fetch into a Server Component or Route Handler, then pass plain
data down.

### "Staff cannot open the menu"

This is intentional. `proxy.js` redirects staff from public/customer surfaces
to `roleHome(role)` (`/kitchen` or `/admin`). Staff can still open
`/account` to sign out.

### "I changed an order but `/admin` is stale"

Server Actions call `revalidatePath` for `/orders`, `/kitchen`, `/admin` and
`/admin/orders`. If you add a new affected route, add it there too. If the
data is cached by a tag, use `revalidateTag`/`updateTag`.

### "The build passes but the page is blank"

Check the browser console and the server console. A client-side exception in
an island does not necessarily fail `next build`; it fails at runtime. The
route `error.jsx` boundary should show a fallback, while `global-error.jsx`
handles root-layout failures.

### "The map is missing"

Leaflet is loaded with `ssr: false`. Confirm:

- The `DeliveryMapPanel` is rendered on the client.
- `leaflet/dist/leaflet.css` is imported by `DeliveryMap`.
- The map container has a height (`.delivery-map__canvas`).
- OpenStreetMap tiles are reachable from the browser.

### "Search changes the results but not the URL"

`MenuBrowser` intentionally uses `window.history.replaceState` for search and
category changes to avoid a server round trip. `useSearchParams` reads the
updated URL. A full navigation would reset the client-side search state.

### "Login succeeds but the navbar still says Sign In"

The navbar reads SWR's `/api/auth/session` cache. After login, the form calls
`mutate(SESSION_KEY)` and `router.refresh()`. If you add a new login path,
replicate that pair.

### "I see `ETIMEDOUT` for Unsplash images"

Those are external image fetches, not chart or page logic. Set
`IMAGES_UNOPTIMIZED=true` for offline work, or ignore them while the local UI
still renders.

---

## 22. Reading order, cheat sheet and exercises

### 22.1 A good reading order

1. `src/app/layout.jsx` — the shell, fonts, metadata.
2. `src/proxy.js` — how requests are routed by role.
3. `src/lib/auth.js` + `src/lib/db.js` — sessions and users.
4. `src/lib/menu.js` — the public data layer and ISR.
5. `src/app/(shop)/page.jsx` + `menu/page.jsx` + `dish/[slug]/page.jsx` —
   static/ISR pages and dynamic routes.
6. `src/actions/auth.js` + `src/actions/order.js` — mutations.
7. `src/app/api/**/route.js` — the client-facing HTTP API.
8. `src/components/orders/OrderDetailLive.jsx` +
   `src/app/api/orders/[id]/stream/route.js` — SSE.
9. `src/components/admin/AdminOverview.jsx` +
   `src/lib/analytics.js` + `src/components/charts/*` — dashboard data.
10. `src/components/checkout/CheckoutView.jsx` +
    `src/lib/schemas.js` + `src/lib/pricing.js` — forms and server-authoritative
    pricing.

### 22.2 Next.js API cheat sheet for this repo

| API / convention | File(s) | What it does here |
| --- | --- | --- |
| `app/layout.jsx` | root layout | Persistent HTML shell, fonts, metadata, providers |
| `app/**/layout.jsx` | `(shop)`, `(auth)` | Route-group shells |
| `app/**/page.jsx` | many | Route UI; Server Component by default |
| `app/**/loading.jsx` | root, menu, dish, admin, kitchen | Suspense fallback |
| `app/**/error.jsx` | root | Route error boundary |
| `app/global-error.jsx` | root | Root-layout error boundary |
| `app/not-found.jsx` | root | Custom 404 + `notFound()` target |
| `app/**/route.js` | `api/**` | HTTP handlers (GET/POST/PATCH) |
| `"use client"` | 52 files | Client island boundary |
| `"use server"` | `src/actions/*` | Server Action module |
| `server-only` | `src/lib/*` | Build-time server guard |
| `next/link` | 25 files | Client navigation/prefetch |
| `next/image` | cards/hero/gallery | Optimized responsive images |
| `next/font/google` | root layout | Self-hosted fonts |
| `next/dynamic` | map, checkout | Lazy client chunks |
| `next/og` | `opengraph-image.jsx` | Generated social image |
| `cookies()` | `src/lib/auth.js` | Async cookie access |
| `redirect()` | `src/lib/auth.js`, sign-in, register | Navigation from server code |
| `notFound()` | dish, order detail | 404 from server code |
| `revalidatePath` | order actions | Invalidate route output |
| `revalidateTag` | `/api/revalidate` | Tag-based background refresh |
| `updateTag` | `actions/menu.js` | Immediate tag expiry in an action |
| `generateStaticParams` | dish page | Build one page per dish |
| `generateMetadata` | dish page | Per-dish SEO |
| `metadata` | layouts/pages | Static SEO |
| `viewport` | root layout | Theme color and scale |
| `manifest.js` | root | PWA manifest |
| `robots.js` | root | robots.txt |
| `sitemap.js` | root | sitemap.xml |
| `ReadableStream` + `Response` | SSE route | Streaming live status |
| `EventSource` | `OrderDetailLive` | Browser SSE client |
| `useSWR` | client islands | Polling/caching |
| `usePathname` | Navbar, Footer, MenuBrowser | Current route |
| `useSearchParams` | MenuBrowser | URL query state |
| `useRouter` | forms, checkout | Push/refresh |
| `useTransition` | `FallbackNotice` | Non-blocking action refresh |
| `useDeferredValue` | `useOrderBrowser` | Deferred filtering |
| `Suspense` | home, menu | Streaming/boundary |

### 22.3 Practice exercises

1. **Add a new public page.** Create `src/app/(shop)/about/page.jsx`, give it
   static metadata and add it to `sitemap.js`. Notice that it inherits the shop
   layout without any extra wiring.
2. **Add a new dish field.** Extend `mapApiDishToCard` and the dish card, then
   check whether `generateStaticParams` still builds. Ask: does the change need
   a new cache tag?
3. **Add a Server Action.** Create `src/actions/reviews.js` with
   `"use server"`, validate with Zod, check `getSession()`, and call
   `revalidatePath`. Then call it from a Client Component.
4. **Add a Route Handler.** Create `GET /api/menu/categories` that returns
   category counts. Decide whether it should be `revalidate = 300` or
   `force-dynamic`.
5. **Add a chart.** Build a new `ChartFrame`-based card, add its data to
   `buildAdminCharts`, and include an accessible table. Do not rely on colour
   alone.
6. **Break authorization on purpose.** Remove `requirePageRole` from
   `/admin` locally, then try to open it as a customer. Notice that proxy may
   redirect, but a direct API call still needs its own guard. Restore the
   guard.
7. **Test the SSE fallback.** Disable the stream route in dev tools, open an
   order, and observe the "reconnecting" state. Then re-enable it and confirm
   the status catches up.

### 22.4 Glossary

- **Server Component** — a React component that renders only on the server.
- **Client Component** — a component marked `"use client"`; its code ships to
  the browser.
- **Server Action** — a server function marked `"use server"` that a client
  can call over Next's generated endpoint.
- **Route Handler** — an HTTP endpoint defined in `app/**/route.js`.
- **ISR** — incremental static regeneration: static HTML that is refreshed in
  the background after a revalidation window.
- **Route group** — a folder in parentheses that organizes layouts without
  adding a URL segment.
- **Proxy** — Next.js 16's renamed middleware; runs before a request is
  completed.
- **SSE** — Server-Sent Events; a one-way stream from server to browser.
- **SWR** — stale-while-revalidate; a client data-fetching/caching strategy.
- **Hydration** — the browser attaching React behavior to server-rendered
  HTML.

---

## Final mental model

If you remember only one thing, remember this:

> **Mesob House uses Next.js to put each concern on the side that can do it
> safely and cheaply.** Public menu data is fetched and cached on the server;
> private orders are guarded on the server and polled from the client; forms
> validate on both sides; live status uses SSE; the dashboard uses SWR; and
> every server boundary re-checks who is allowed to do what.

That is the architecture. The rest of the files are details.
