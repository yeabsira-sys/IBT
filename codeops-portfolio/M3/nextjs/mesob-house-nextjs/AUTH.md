# Authentication and Authorization

This document describes how Mesob House authenticates users, how the three protection layers fit together, and how to reproduce the attacks used to verify the design.

## 1. Threat model

The private surface contains customer order history, delivery addresses, a live kitchen queue and an admin console. The relevant attackers are:

- a signed-out visitor who knows a private URL;
- a signed-in customer who edits a cookie, a request body or `localStorage`;
- a customer who guesses or obtains another customer's order id;
- a customer who calls a kitchen/admin API directly;
- an admin who tries to remove their own admin role;
- a phishing link that uses the sign-in `next` parameter to leave the site.

The design assumes the browser is hostile. No client-supplied user id, role, price or order owner is trusted.

## 2. Session design

### Opaque token, hashed at rest

`src/lib/db.js` creates a 32-byte random token with `randomBytes(32).toString("base64url")`. Only its SHA-256 hash is stored in the `sessions` table:

```js
const token = randomBytes(32).toString("base64url");
const tokenHash = hashToken(token); // sha256
db.sessions.push({ tokenHash, userId, expiresAt, ... });
```

The raw token is sent to the browser once, in the cookie. A leaked database file therefore does not contain usable session cookies.

### Cookie flags

`src/lib/auth.js` sets the cookie with:

```js
httpOnly: true,
sameSite: "lax",
secure: process.env.NODE_ENV === "production",
path: "/",
```

`httpOnly` keeps the token away from JavaScript, so an XSS bug cannot read it with `document.cookie`. `SameSite=Lax` blocks most cross-site form posts while keeping normal top-level navigation working. `Secure` is enabled in production.

Sessions last **7 days** by default and **30 days** when “keep signed in” is selected. Expired rows are pruned when a new session is created; `getSessionUserByToken` also checks the expiry before returning a user.

### Passwords

Passwords are hashed with Node's `scryptSync` and a random 16-byte salt:

```text
salt:hash
```

`verifyPassword` uses `timingSafeEqual` after length checks. Plaintext passwords are never written to the JSON store and never put in `localStorage`.

### Session lookup

`getSession()` reads the cookie and calls `getSessionUserByToken(token)`. The function hashes the presented token, finds the session row, checks expiry, then loads the user. A forged cookie value simply does not match a hash, so it produces `null`.

`toSafeUser` strips `passwordHash` and the session table before a user object reaches a page, API response or SWR cache.

## 3. The three protection layers

The assignment asks for middleware **and** page **and** action checks. In Next.js 16 the middleware equivalent is `src/proxy.js`.

| Layer | File | What it proves | What it deliberately does not do |
| --- | --- | --- | --- |
| 1. Proxy routing gate | `src/proxy.js` | The session token maps to a live user, so guests can be routed to sign-in and staff can be kept in their portal | It is not the final authorization decision; page and API guards still enforce ownership and role |
| 2. Page guard | `src/lib/auth.js` → `requirePageUser` / `requirePageRole` / `requireCustomerPage` | The token maps to a live session and the role is allowed | It does not protect route handlers or actions |
| 3. Action/API guard | `src/actions/order.js`, `src/actions/auth.js`, `src/app/api/**` | The caller is signed in, has the right role, and owns the resource | It is the last line, so it must also enforce ownership and status rules |

### Layer 1 — `src/proxy.js`

```js
const token = request.cookies.get(SESSION_COOKIE)?.value;
const user = token ? await getSessionUserByToken(token) : null;

if ((isAuthenticatedPage(pathname) || isStaffPage(pathname)) && !user) {
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

if (user && isStaffPage(pathname)) {
  const adminPage = matches(pathname, "/admin");
  const wrongRole = adminPage ? user.role !== "admin" : user.role === "customer";
  if (wrongRole) {
    return NextResponse.redirect(new URL(roleHome(user.role), request.url));
  }
}

const staff = user?.role === "employee" || user?.role === "admin";

if (staff && (isPublicPage(pathname) || isCustomerOnlyPage(pathname))) {
  return NextResponse.redirect(new URL(roleHome(user.role), request.url));
}

if (staff && isStaffBlockedApi(pathname)) {
  return NextResponse.json(
    { message: "Staff accounts use the portal. Public ordering is for customers." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
```

The matcher covers public shop pages (`/`, `/menu`, `/dish`, `/cart`, `/terms`, `/privacy`), authenticated pages (`/account`, `/orders`, `/checkout`), staff pages (`/kitchen`, `/admin`), and the public/customer APIs (`/api/menu`, `/api/orders`). Staff are blocked from public shop pages and customer-only pages (`/orders`, `/checkout`), but `/account` remains available so they can sign out. `/api/auth/session`, `/api/health`, `/api/revalidate`, `/sign-in` and `/register` are not blocked by the proxy; the auth pages redirect signed-in users themselves.

The proxy now verifies the session because it has to know the role to route staff correctly. It is still a routing layer, not the authorization decision: a forged cookie does not create a session, and the page/API layers repeat the checks. Keeping this check in `proxy.js` instead of `(shop)/layout.jsx` preserves the static/ISR rendering of the public shop.

### Layer 2 — server page guards

Every private page calls one of:

```js
// src/lib/auth.js
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

| Page | Guard |
| --- | --- |
| `/account` | `requirePageUser("/account")` — every signed-in role, including staff sign-out |
| `/checkout` | `requireCustomerPage("/checkout")` |
| `/orders` | `requireCustomerPage("/orders")` |
| `/orders/[id]` | `requireCustomerPage(...)` then `getOrderForUser(user.id, id)` |
| `/kitchen` | `requirePageRole(["employee", "admin"], "/kitchen")` |
| `/admin`, `/admin/orders`, `/admin/users` | `requirePageRole(["admin"], ...)` |

A customer who manually opens `/kitchen` or `/admin` is redirected to `/`, not shown an empty shell. An employee who opens `/admin` is redirected to `/kitchen`. A signed-in staff member who opens a public shop page or a customer-only page (`/orders`, `/checkout`) is redirected to `/admin` or `/kitchen`; `/account` remains available so they can sign out. A signed-out visitor is sent to `/sign-in?next=...`.

### Layer 3 — actions and route handlers

Server Actions are public HTTP endpoints. Each one re-checks the session:

```js
// src/actions/order.js
const user = await getSession();
if (!user) return { ok: false, code: "UNAUTHORIZED", ... };
```

`src/actions/auth.js` validates sign-in and registration with Zod before touching the database. `socialSignInAction` only accepts `Telebirr` and `Google`; unknown providers are rejected.

Route handlers repeat the check because they can be called without React:

```js
// src/app/api/kitchen/orders/route.js
const user = await getSession();
if (!user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
if (!isStaff(user)) return NextResponse.json({ message: "Staff access required." }, { status: 403 });
```

`updateOrderStatus` in `src/lib/orders.js` also checks the role itself, so a future caller cannot bypass the route guard by importing the helper directly.

## 4. Authorization rules

### Roles

| Role | Public shop | Account | Customer orders/checkout | Kitchen | Admin |
| --- | --- | --- | --- | --- | --- |
| `customer` | yes | yes | yes — own data only | no | no |
| `employee` | no — redirected to `/kitchen` | yes — profile and sign-out | no — redirected to `/kitchen` | yes | no |
| `admin` | no — redirected to `/admin` | yes — profile and sign-out | no — redirected to `/admin` | yes | yes |

Staff accounts are deliberately not customer accounts. `/`, `/menu`, `/dish/*`, `/cart`, `/checkout`, `/terms`, `/privacy` and `/orders` redirect admin/employee sessions to their portal, and `/api/menu*` plus `/api/orders*` return `403` for those sessions. `/account` is the deliberate exception: staff can open it to review their profile and sign out.

### Customer ownership

Customer reads are scoped in the query, not checked after the fact:

```js
// src/lib/orders.js
export async function getOrderForUser(userId, orderId) {
  const db = await readDb();
  return db.orders.find((order) => order.id === orderId && order.userId === userId) ?? null;
}
```

`getOrdersForUser(userId)` filters the list by `userId`. `cancelOrderForUser(orderId, userId)` looks up the row and returns the same `NOT_FOUND` result for “does not exist” and “belongs to someone else”:

```js
if (!order || order.userId !== userId) {
  return { ok: false, code: "NOT_FOUND", message: "Order not found." };
}
```

That prevents an attacker from using the API as an order-id oracle.

### Order status rules

`src/lib/orderStatus.js` is the single transition table:

```text
received  → preparing
preparing → ready
ready     → out_for_delivery (delivery) | completed (pickup)
out_for_delivery → completed
completed/cancelled → terminal
```

Customers may cancel only in `received`. Staff may advance one step. Admins may also cancel any non-terminal order. Every transition is validated inside `updateOrderStatus`, not only in the button that renders it.

### Admin role changes

`PATCH /api/admin/users/[id]` requires an admin session and validates the target role against `ROLES`. The route refuses self-demotion:

```js
if (id === user.id && body.role !== "admin") {
  return NextResponse.json({ message: "You cannot remove your own admin role." }, { status: 409 });
}
```

This prevents an admin from accidentally locking the only admin out of the console.

## 5. Server-authoritative pricing

The checkout client sends items, but the server does not trust names or prices:

```js
const { dishes } = await getAllDishes();
const menuById = new Map(dishes.map((dish) => [String(dish.id), dish]));

for (const line of parsed.data.items) {
  const dish = menuById.get(String(line.id));
  if (!dish) return { ok: false, code: "DISH_UNAVAILABLE", ... };
  items.push({
    id: String(dish.id),
    name: dish.name,
    price: priceNumber(dish.price), // server price
    quantity: line.quantity,
  });
}

const totals = getCartTotals(items, parsed.data.couponCode);
```

A tampered `localStorage` price changes the client-side basket total, but the stored order and the confirmation page use the server total. The test below records the result.

## 6. CSRF and open redirects

### CSRF

- Session cookies are `SameSite=Lax`.
- Server Actions use Next.js's built-in action-origin checks.
- Mutating route handlers check the `Origin` header when it is present (`src/lib/http.js` and the cancel route). Requests without an `Origin` header are allowed for server-to-server/curl use; browsers send `Origin` for cross-site `fetch`/form posts.
- All mutations are `POST`/`PATCH`; no state changes on `GET`.

### Open redirects

`/signin` is redirected to `/sign-in` by `next.config.mjs`, preserving the query string. The sign-in page sanitizes the `next` value before using it:

```js
function safeNext(value) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  if (value.startsWith("/sign-in") || value.startsWith("/signin") || value.startsWith("/register")) return "/";
  return value;
}
```

Only same-site relative paths are accepted. Absolute URLs (`https://example.com`), protocol-relative URLs (`//evil.test`) and backslash tricks are reduced to `/`. The sanitized value is passed to the client form and used after a successful sign-in. If that value is the bare home page (`/`), `src/lib/roleHome.js` sends admins to `/admin` and employees to `/kitchen`; customers keep `/`. An explicit private destination such as `/admin/orders` is still honoured. If a staff account asks for a customer-only page, the proxy or page guard sends it on to the staff portal instead.

## 7. Attack tests and observed results

These were run against the local dev server (`localhost:3000`) and repeated against the production build (`localhost:3002`) where noted. `curl` commands are shown without a cookie unless stated.

| # | Attack | Command / action | Observed result |
| --- | --- | --- | --- |
| 1 | Forged cookie | `curl -H 'Cookie: mh_session=forged' /api/auth/session` | `200 {"user":null}`; `/api/orders` → `401` |
| 2 | Signed-out private page | `curl /orders`, `/kitchen`, `/admin` | `307` to `/sign-in?next=...` |
| 3 | Customer opens kitchen page | sign in as guest, open `/kitchen` | redirect to `/` |
| 4 | Customer opens admin page | sign in as guest, open `/admin` | redirect to `/` |
| 5 | Customer calls kitchen API | `fetch('/api/kitchen/orders')` as guest | `403 {"message":"Staff access required."}` |
| 6 | Customer calls admin API | `fetch('/api/admin/stats')` as guest | `403 {"message":"Admin access required."}` |
| 7 | Cross-user order read | new customer fetches `/api/orders/MH-DF36A7FE` | `404 {"message":"Order not found."}` |
| 8 | Cross-user order cancel | new customer POSTs `/api/orders/MH-DF36A7FE/cancel` | `404 {"message":"Order not found."}` |
| 9 | Cancel after kitchen starts | guest cancels a `preparing` order | `409 NOT_CANCELLABLE` |
| 10 | No-auth cancel | `curl -X POST /api/orders/MH-DF36A7FE/cancel` | `401 {"message":"Sign in required."}` |
| 11 | Admin self-demotion | admin PATCHes own role to `customer` | `409 {"message":"You cannot remove your own admin role."}` |
| 12 | Open redirect | `/signin?next=https://example.com`, then sign in | lands on `/`, never `example.com` |
| 13 | Forged item price | set `localStorage` cart price to `1`, submit checkout | stored subtotal `650`, total `548` (server prices) |
| 14 | Rapid search typing | type `k`, `ki`, `kit`, `kitfo` quickly | one `/api/menu/search?q=kitfo` request |
| 15 | Staff opens public shop page | admin opens `/menu`; employee opens `/` | `307` to `/admin` / `/kitchen` |
| 16 | Staff opens customer-only page | admin opens `/orders`; employee opens `/checkout` | `307` to `/admin` / `/kitchen` |
| 16b | Staff opens account page | admin or employee opens `/account` | `200`; customer-only orders/favourites hidden; Sign Out available |
| 17 | Staff calls public menu API | admin `GET /api/menu` | `403 {"message":"Staff accounts use the portal. Public ordering is for customers."}` with `Cache-Control: no-store` |
| 18 | Employee opens admin page | employee opens `/admin` | `307` to `/kitchen` |

### Reproducing the main checks

```bash
# Signed-out API and page guards
curl -i http://localhost:3000/api/orders
curl -i http://localhost:3000/orders
curl -i http://localhost:3000/admin

# Signed-in customer hitting staff APIs (use a browser session or a cookie)
# Expected: 403 for both
fetch('/api/kitchen/orders', { credentials: 'same-origin' })
fetch('/api/admin/stats', { credentials: 'same-origin' })

# Staff/public separation (replace TOKEN with a real staff session cookie)
curl -i -H 'Cookie: mh_session=TOKEN' http://localhost:3000/menu
curl -i -H 'Cookie: mh_session=TOKEN' http://localhost:3000/api/menu
# Expected: 307 to the staff portal, then 403 for the API
```

For the ownership tests, sign in as `guest@mesob.house`, note an order id, then register a second customer and request that id. The API returns `404` rather than revealing that the order exists.

## 8. Known limitations

- **The proxy verifies the session to route by role.** It reads the local JSON store for matched requests that carry a session cookie. That is fine for this assessment, but a production deployment should use an indexed session lookup, a signed role claim or a fast session store. The page and action layers still make the authorization decision.
- **The role check stays out of the public layout.** It lives in `proxy.js` instead of `(shop)/layout.jsx`, so `/`, `/menu`, `/dish/*`, `/cart`, `/terms` and `/privacy` keep their static/ISR rendering.
- **The demo social buttons create real customer sessions.** They are labelled as demo flows and do not call an external OAuth provider.
- **No rate limiting or account lockout.** A production deployment should add rate limiting on `/sign-in`, `/register` and order creation.
- **File database.** It is single-instance and has no cross-process write lock. See [`DATA.md`](./DATA.md) before deploying to a serverless host.
- **No password reset flow.** The sign-in page links to support; reset tokens are outside the assignment scope.
