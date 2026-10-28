# Performance Notes

This document records the performance work, the production build shape and the local measurements taken after the Day 45 changes. It also states clearly what was **not** measured, so the numbers are not mistaken for a Lighthouse audit.

## 1. Measurement setup

| Item       | Value                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| Build      | `next build` (Next.js 16.4.2, Turbopack)                                                                       |
| Server     | `next start` on `localhost:3000`                                                                               |
| Browser    | Firefox                                                                                                        |
| Viewport   | Desktop, no network/CPU throttling                                                                             |
| Cache      | Local server warm; first page load uncached, later loads reuse chunks                                          |
| Date       | 2026-10-21                                                                                                     |
| Lighthouse | Not available in this environment (no Chrome/Lighthouse binary). The deployed Lighthouse run is still pending. |

The timing numbers come from the browser's Navigation Timing and `PerformanceObserver` APIs, not from Lighthouse. They are useful for spotting regressions in this environment; they are **not** field data or a substitute for a throttled Lighthouse run.

### Reproduce the JS/LCP sample

Open a production page and run this in the console:

```js
new Promise((resolve) => {
  let lcp = null;
  let cls = 0;
  new PerformanceObserver((list) => {
    const entry = list.getEntries().at(-1);
    if (entry) lcp = entry.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      if (!entry.hadRecentInput) cls += entry.value;
  }).observe({ type: "layout-shift", buffered: true });

  setTimeout(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const js = performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.includes(".js"));
    resolve({
      lcpMs: lcp && Math.round(lcp),
      cls: Number(cls.toFixed(4)),
      ttfbMs: Math.round(nav.responseStart),
      compressedJsBytes: js.reduce(
        (sum, entry) => sum + (entry.encodedBodySize || 0),
        0,
      ),
    });
  }, 1500);
});
```

## 2. Production build

```text
✓ Compiled successfully
✓ Generating static pages (44/44)
```

Route shape:

- 44 routes total.
- `/`, `/menu`, `/cart`, `/terms`, `/privacy`, `/robots.txt`, `/sitemap.xml` and `/manifest.webmanifest` are static/ISR.
- 20 dish pages are pre-rendered with `generateStaticParams` and revalidate every 5 minutes.
- `/account`, `/checkout`, `/orders`, `/orders/[id]`, `/kitchen` and `/admin/**` are dynamic because they read the session.
- `/api/menu` and `/api/menu/specials` are ISR-cached; the private APIs are `force-dynamic`.

The public catalogue stays on the server-rendered/ISR path. Adding auth did not turn `/`, `/menu` or dish pages into client-fetched pages.

## 3. After measurements

Each row is one page load in the production server. LCP/CLS are from a focused tab after a 1.5 s observation window. Compressed JS is the sum of `encodedBodySize` for script resources (includes shared chunks, so it is not a per-route delta).

| Page             |    LCP | CLS |  TTFB | Compressed JS | DOMContentLoaded |
| ---------------- | -----: | --: | ----: | ------------: | ---------------: |
| `/`              | 496 ms |   0 | 56 ms |      173.7 KB |           156 ms |
| `/menu`          | 584 ms |   0 | 37 ms |      174.7 KB |            95 ms |
| `/dish/doro-wat` | 464 ms |   0 | 21 ms |      174.7 KB |            62 ms |
| `/checkout`      | 416 ms |   0 | 68 ms |      193.8 KB |           114 ms |
| `/orders`        | 312 ms |   0 | 86 ms |      167.8 KB |           131 ms |

Observations:

- LCP is under 600 ms on every sampled page, comfortably inside the 2.5 s “good” threshold on this warm local setup.
- CLS is 0 because images have dimensions, fonts are self-hosted with `display: swap`, and skeletons reserve space.
- Checkout is the heaviest sample (~194 KB compressed JS) because it includes the payment/delivery cards and form validation. Those cards are already lazy-loaded below the fold, so the first interaction is not blocked by them.
- `/orders` is the lightest private sample (~168 KB) because it renders a small list and the SWR payload is JSON, not another component tree.

### Day 46 dashboard charts

Recharts 3.10.1 was added for the admin and kitchen dashboards. The chart
components are client leaves under `src/components/charts/`; the pages and the
aggregation in `src/lib/analytics.js` stay on the server. Recharts is only
loaded by the private `/admin` and `/kitchen` route trees, so the public
catalogue's JS is unchanged.

| Page                       |    LCP | CLS |   TTFB | Compressed JS | Notes                                   |
| -------------------------- | -----: | --: | -----: | ------------: | --------------------------------------- |
| `/admin`                   | 360 ms |   0 |  45 ms |      302.6 KB | 5 stat cards + 2 charts + recent orders |
| `/kitchen`                 | 384 ms |   0 | 105 ms |      293.9 KB | 2 charts + live board                   |
| `/orders` (for comparison) | 312 ms |   0 |  86 ms |      167.8 KB | No chart library                        |

Recharts accounts for roughly 126 KB of the private dashboard JS. That is a
real cost, but it is isolated to routes that already require a staff session.
The public `/`, `/menu` and dish pages remain at their previous static/ISR
budget. The chart cards reserve a fixed 280 px height and render tables
underneath, so CLS stays at 0.

Chart payloads are deliberately small:

- Admin: 14 daily rows + up to 6 area rows.
- Kitchen: 4 status rows + 12 two-hour rows.

No order rows are sent to the browser just to build a chart. If a future
dashboard needs more categories or a longer range, keep the aggregation on the
server and cap the rows before they cross the boundary.

## 4. Before/after framing

A strict before/after on the same route set is not possible: before this phase the app had no `/orders`, `/kitchen`, `/admin`, `/checkout` auth guard or SWR layer. The repository also does not contain a pre-phase production build, so there is no honest “before” LCP number to quote.

What can be compared is the **public catalogue path**, which was already static/ISR and remains so:

| Area                     | Before Day 45                               | After Day 45                                                              |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------------------- |
| `/`, `/menu`, dish pages | Static/ISR; no client fetch for first paint | Same; no regression in rendering strategy                                 |
| Menu search              | Client filter over the server-seeded list   | 300 ms debounced SWR request, previous data kept while loading            |
| Navbar session           | Client-only store/localStorage              | SWR-cached `/api/auth/session`; no extra page dynamic render              |
| Private pages            | Did not exist                               | Dynamic server guard + seeded SWR; measured above                         |
| Checkout JS              | Form bundle                                 | Same form + lazy payment/delivery cards; ~194 KB compressed in the sample |

The important architectural result is that the new private features did **not** force the public catalogue into dynamic rendering. The 5-minute ISR window and static dish pages are intact.

For a deployment, capture a true before/after with the same commit pair and throttling:

```bash
# Before: check out the pre-Day-45 commit in a separate worktree, then
npm ci
npm run build
npx lighthouse http://localhost:3000 --only-categories=performance --preset=desktop --output=json --output-path=before.json
npx lighthouse http://localhost:3000 --only-categories=performance --preset=desktop --output=json --output-path=before-mobile.json

# After: this working tree
npm ci
npm run build
npx lighthouse http://localhost:3000 --only-categories=performance --preset=desktop --output=json --output-path=after.json
npx lighthouse http://localhost:3000 --only-categories=performance --preset=desktop --output=json --output-path=after-mobile.json
```

Compare `audits.largest-contentful-paint.numericValue`, `audits.cumulative-layout-shift.numericValue`, `audits.total-blocking-time.numericValue` and `audits.interactive.numericValue`.

## 5. What was done to keep it fast

### Rendering

- **ISR for the catalogue.** `/`, `/menu` and each dish page use `revalidate = 300`. The menu API is fetched with `next: { revalidate: 300, tags: ["menu"] }`.
- **Static dish params.** `generateStaticParams()` pre-renders all known dishes; unknown slugs still render on demand and then cache.
- **No client fetch for first paint.** Menu and dish HTML arrive from the server. Search is the only client fetch, and only after the user types.
- **Server Components by default.** Client components are limited to interactive pieces (navbar, cart, forms, SWR views).
- **`next/font` self-hosting.** Inter and Source Serif 4 are downloaded at build time, not from Google at runtime, which removes a third-party connection and reduces font layout shift.

### JavaScript

- **Lazy checkout cards.** `DeliveryLocationCard` and `PaymentMethodCard` use `next/dynamic` with a skeleton, so the address/payment code is split out of the initial checkout bundle.
- **Route-level code splitting.** The private portals (`/orders`, `/kitchen`, `/admin`) are separate route trees; a public visitor never downloads their components.
- **SWR only where it earns its keep.** No global store hydration for server data; the cart/favourites store is small and local.

### Live data without a request storm

- **Poll only while active.** Customer order polling stops when every order is terminal; order detail stops on `completed`/`cancelled`.
- **Different intervals per surface.** Kitchen 8 s, customer/admin orders 10 s, admin stats 15 s, users 30 s. The kitchen is the fastest because it is the operational queue.
- **Debounced search.** 300 ms debounce and a `null` SWR key for an empty query. A burst of `k/ki/kit/kitfo` produced exactly one request in the browser test.
- **Focus revalidation.** SWR revalidates on focus for private views, so returning to a tab catches up without a shorter timer.
- **`fallbackData`.** Server-rendered data seeds SWR, avoiding an empty first render and a duplicate loading spinner.

### Images and layout

- `next/image` with explicit dimensions and `sizes`.
- Remote hosts allow-listed in `next.config.mjs` (`images.unsplash.com`, the menu backend).
- `IMAGES_UNOPTIMIZED=true` is available for static/offline hosting.
- Skeleton blocks reserve the same height as the content they replace.

### Metadata and discovery

- Root metadata defines `metadataBase`, title template, description, Open Graph and Twitter card.
- Dish pages add per-dish title/description/OG image and JSON-LD `MenuItem` with price and availability.
- `sitemap.js` includes the public pages and every dish; `robots.js` disallows private routes and the API.
- Private pages set `robots: { index: false, follow: false }`, including `/account`, `/checkout`, `/orders`, `/kitchen` and `/admin/**`.
- `opengraph-image.jsx` and `manifest.js` provide a social card and PWA metadata.

## 6. Budgets and regression guard

These are the budgets for the next change, not claims about Lighthouse field data:

| Metric                     |                     Budget | Current local sample |
| -------------------------- | -------------------------: | -------------------: |
| LCP (desktop, warm local)  |                    < 1.0 s |           312–584 ms |
| CLS                        |                      < 0.1 |                    0 |
| Compressed JS, public page |                   < 200 KB |              ~174 KB |
| Compressed JS, checkout    |                   < 230 KB |              ~194 KB |
| Search requests per burst  |                          1 |                    1 |
| Private API payload        | < 50 KB for a normal queue |           small JSON |

Before merging a performance-sensitive change:

1. `npm run build` must keep the public catalogue static/ISR (check the route table).
2. Open the production build, run the console snippet above on `/`, `/menu` and `/checkout`.
3. Confirm the menu search burst still sends one request (DevTools Network filter `/api/menu/search`).
4. Confirm `/orders` polling stops after the order reaches `completed` or `cancelled`.
5. Re-run the deployed Lighthouse commands in section 4 and attach the JSON files.

## 7. Known gaps

- **No Lighthouse score yet.** The environment has no Chrome/Lighthouse binary. The local API timings above are real, but the assessment still needs a deployed Lighthouse run with mobile and desktop presets.
- **No throttled mobile measurement.** A 4G/CPU-throttled run will be slower than these warm local numbers.
- **Warm server.** The first request after a cold start may pay the menu API fetch; ISR hides it after the first render.
- **File database.** Reads are cheap for the assessment file, but every API request reads and parses JSON. A Postgres adapter removes that cost and the single-instance limitation.
- **No RUM.** There is no real-user monitoring; field LCP/CLS/INP would require a deployment with analytics.
