#!/usr/bin/env node

/**
 * Independent checkout concurrency check.
 *
 * Fires N simultaneous Server Action checkouts as one customer, then verifies
 * against Postgres (and the customer's API list) that every note produced
 * exactly one order and no rows were lost.
 *
 *   DATABASE_URL=postgresql://localhost/mesob_house \
 *     node scripts/load-test-checkouts.mjs --base http://localhost:3100 --count 50
 *
 * The app must be a production build so the Server Action manifest exists.
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import {
  createPool,
  databaseUrlFromEnv,
  has,
  loadEnv,
  numberValue,
  parseArgs,
  printDatabaseTarget,
  value,
} from "./lib/db-cli.mjs";

const require = createRequire(import.meta.url);
const {
  encodeReply,
} = require("next/dist/compiled/react-server-dom-webpack/client.node");

loadEnv();
const args = parseArgs();
const base = new URL(
  value(args, "base", process.env.LOAD_TEST_BASE_URL || "http://localhost:3100"),
).origin;
const count = numberValue(args, "count", 50, 1);
const timeoutMs = numberValue(args, "timeout", 30_000, 1_000);
const databaseUrl = value(args, "database-url", databaseUrlFromEnv());
const cleanup = has(args, "cleanup");
const notePrefix = value(
  args,
  "note-prefix",
  `load-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
);
const customer = {
  email:
    value(args, "customer", process.env.LOAD_TEST_EMAIL || "guest@mesob.house"),
  password:
    value(args, "password", process.env.SEED_GUEST_PASSWORD || "Guest123!"),
};

if (has(args, "help")) {
  console.log(`Usage: node scripts/load-test-checkouts.mjs [options]

  --base URL          Running app origin (default: http://localhost:3100)
  --count N           Simultaneous checkouts (default: 50)
  --customer EMAIL    Customer account (default: guest@mesob.house)
  --password VALUE    Password (default: Guest123! or SEED_GUEST_PASSWORD)
  --manifest FILE     Override .next/server/server-reference-manifest.json
  --cleanup           Delete the verification orders afterwards
  --database-url URL  Override DATABASE_URL for the independent DB check
  --timeout MS        Per-request timeout (default: 30000)
`);
  process.exit(0);
}

const manifestFile = path.resolve(
  value(
    args,
    "manifest",
    path.join(process.cwd(), ".next", "server", "server-reference-manifest.json"),
  ),
);

if (!fs.existsSync(manifestFile)) {
  throw new Error(
    `Server Action manifest not found at ${manifestFile}. Run npm run build first.`,
  );
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const actions = {};
for (const [id, entry] of Object.entries(manifest.node || {})) {
  if (entry && typeof entry.exportedName === "string") {
    actions[entry.exportedName] = id;
  }
}
for (const required of ["signInAction", "submitOrder"]) {
  if (!actions[required]) {
    throw new Error(`Action ${required} is missing from ${manifestFile}.`);
  }
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the independent database check.");
}
printDatabaseTarget("Verification database", databaseUrl);
const pool = createPool(databaseUrl, { max: 2 });

function setCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get("set-cookie");
  return raw ? [raw] : [];
}

function sessionCookie(response) {
  return (
    setCookies(response).find((cookie) => cookie.startsWith("mh_session=")) || null
  );
}

async function http(method, requestPath, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new URL(requestPath, base), {
      method,
      headers: options.headers ?? {},
      body: options.body,
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response) {
  const text = await response.text();
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

async function login() {
  const body = await encodeReply([
    {
      method: "email",
      email: customer.email,
      password: customer.password,
      keepSignedIn: false,
      rememberAddress: false,
    },
  ]);
  const headers = {
    "Next-Action": actions.signInAction,
    Accept: "text/x-component",
    origin: base,
  };
  if (typeof body === "string") {
    headers["Content-Type"] = "text/plain;charset=UTF-8";
  }

  const response = await http("POST", "/sign-in", { headers, body });
  await response.arrayBuffer();
  const cookie = sessionCookie(response);
  if (!cookie) {
    throw new Error(
      `Login did not set mh_session (HTTP ${response.status}). Check ${customer.email}.`,
    );
  }
  return `mh_session=${cookie.split(";")[0].slice("mh_session=".length)}`;
}

async function main() {
  const cookie = await login();
  const sessionResponse = await http("GET", "/api/auth/session", {
    headers: { cookie },
  });
  const session = await readJson(sessionResponse);
  if (!session.json?.user) throw new Error("Login session was not readable.");
  const userId = session.json.user.id;

  const menuResponse = await http("GET", "/api/menu");
  const menu = await readJson(menuResponse);
  const dish = menu.json?.data?.find((item) => String(item.id) === "doro-wat")
    ?? menu.json?.data?.[0];
  if (!dish) throw new Error("Could not read a dish from /api/menu.");

  const basePayload = {
    fulfillment: "pickup",
    contact: {
      name: "Concurrency Check",
      phone: "911000099",
      email: "concurrency-check@example.com",
    },
    delivery: { subCity: "Bole", street: "", landmark: "", timing: "immediate" },
    method: "cash",
    couponCode: "",
    items: [{ id: String(dish.id), name: dish.name, price: 1, quantity: 1 }],
  };

  console.log(`Concurrent checkouts: ${count}`);
  console.log(`Customer: ${customer.email} (${userId})`);
  console.log(`Dish: ${dish.name} (${dish.id}), server price ${dish.price} ETB`);
  console.log(`Note prefix: ${notePrefix}`);
  console.log("");

  const started = performance.now();
  const results = await Promise.allSettled(
    Array.from({ length: count }, async (_, index) => {
      const note = `${notePrefix}-${index}`;
      const body = await encodeReply([{ ...basePayload, note }]);
      const headers = {
        "Next-Action": actions.submitOrder,
        Accept: "text/x-component",
        cookie,
        origin: base,
      };
      if (typeof body === "string") {
        headers["Content-Type"] = "text/plain;charset=UTF-8";
      }
      const response = await http("POST", "/checkout", { headers, body });
      await response.arrayBuffer();
      return { index, status: response.status, note };
    }),
  );
  const durationMs = performance.now() - started;

  const ok = results.filter((result) => result.status === "fulfilled");
  const failed = results.filter((result) => result.status === "rejected");
  const statusCounts = {};
  for (const result of ok) {
    statusCounts[result.value.status] =
      (statusCounts[result.value.status] ?? 0) + 1;
  }

  const db = (
    await pool.query(
      `SELECT
         count(*)::int AS orders,
         count(DISTINCT id)::int AS distinct_ids,
         count(DISTINCT note)::int AS distinct_notes,
         COALESCE(sum(total_cents), 0)::bigint AS revenue_cents,
         COALESCE(sum((SELECT count(*) FROM order_items oi WHERE oi.order_id = o.id)), 0)::int
           AS item_rows
       FROM orders o
       WHERE user_id = $1 AND note LIKE $2`,
      [userId, `${notePrefix}-%`],
    )
  ).rows[0];

  const apiResponse = await http("GET", "/api/orders", { headers: { cookie } });
  const api = await readJson(apiResponse);
  const apiMatches = (api.json?.data ?? []).filter((order) =>
    String(order.note ?? "").startsWith(`${notePrefix}-`),
  );

  console.log(`HTTP requests: ${ok.length} fulfilled, ${failed.length} rejected`);
  console.log(
    `HTTP statuses: ${Object.entries(statusCounts)
      .map(([status, amount]) => `${status}×${amount}`)
      .join(", ") || "none"}`,
  );
  console.log(
    `Database rows: ${db.orders} orders, ${db.distinct_ids} unique ids, ` +
      `${db.distinct_notes} unique notes, ${db.item_rows} item rows, ` +
      `${(Number(db.revenue_cents) / 100).toLocaleString("en-US")} ETB`,
  );
  console.log(`API list rows with prefix: ${apiMatches.length}`);
  console.log(
    `Duration: ${durationMs.toFixed(0)} ms (${(count / (durationMs / 1000)).toFixed(1)} checkouts/s)`,
  );

  if (failed.length) {
    for (const failure of failed.slice(0, 5)) {
      console.error(`Rejected: ${failure.reason?.message ?? failure.reason}`);
    }
  }

  const pass =
    db.orders === count &&
    db.distinct_ids === count &&
    db.distinct_notes === count &&
    db.item_rows === count &&
    apiMatches.length === count &&
    failed.length === 0;
  console.log("");
  console.log(
    pass
      ? `RESULT: PASS — ${count}/${count} simultaneous checkouts persisted with zero lost orders.`
      : "RESULT: FAIL — order count or uniqueness did not match the concurrent requests.",
  );

  if (cleanup) {
    const deleted = await pool.query(
      "DELETE FROM orders WHERE user_id = $1 AND note LIKE $2",
      [userId, `${notePrefix}-%`],
    );
    console.log(`Cleanup: deleted ${deleted.rowCount} verification orders.`);
  }

  await pool.end();
  process.exit(pass ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
