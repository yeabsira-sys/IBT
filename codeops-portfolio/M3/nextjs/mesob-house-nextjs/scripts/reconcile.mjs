#!/usr/bin/env node

/**
 * Reconcile the legacy document (before) with normalized tables (after).
 *
 *   DATABASE_URL=postgresql://localhost/mesob_house \
 *     node scripts/reconcile.mjs --file .data/mesob-house.json
 *
 *   DATABASE_URL=postgresql://localhost/mesob_house \
 *     node scripts/reconcile.mjs --source postgres
 *
 * The script is read-only. Exit code 0 means every compared value matched.
 */

import { createHash } from "node:crypto";
import {
  cents,
  createPool,
  databaseUrlFromEnv,
  has,
  loadEnv,
  parseArgs,
  printDatabaseTarget,
  readJsonFile,
  value,
} from "./lib/db-cli.mjs";

loadEnv();
const args = parseArgs();
const databaseUrl = value(args, "database-url", databaseUrlFromEnv());
const source = value(args, "source", "json");
const file = value(args, "file", ".data/mesob-house.json");
const jsonOutput = has(args, "json");

if (has(args, "help")) {
  console.log(`Usage: node scripts/reconcile.mjs [options]

  --source json|postgres  Legacy source (default: json)
  --file PATH             JSON document (default: .data/mesob-house.json)
  --json                  Print a machine-readable report
  --database-url URL      Override DATABASE_URL (read-only)
`);
  process.exit(0);
}

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
printDatabaseTarget("Normalized target", databaseUrl);

const pool = createPool(databaseUrl, { max: 1 });

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 9 ? digits.slice(-9) : digits;
}

async function readSource() {
  if (source === "postgres") {
    const { rows } = await pool.query("SELECT data FROM mesob_house_db WHERE id = 1");
    if (!rows[0]?.data) throw new Error("Legacy mesob_house_db row not found.");
    return rows[0].data;
  }
  return readJsonFile(file);
}

const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function sourceSnapshot(document) {
  const statusCounts = {};
  const orders = [];
  const itemIds = new Set();
  let itemCount = 0;
  let historyCount = 0;
  let revenueCents = 0;
  let completedRevenueCents = 0;

  for (const order of document.orders) {
    statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
    const orderCents = cents(order.totals?.total);
    revenueCents += orderCents;
    if (order.status === "completed") completedRevenueCents += orderCents;

    const items = (order.items ?? []).map((item, index) => {
      itemIds.add(String(item.id));
      itemCount += 1;
      return {
        lineNo: index + 1,
        id: String(item.id),
        name: String(item.name ?? ""),
        unitPriceCents: cents(item.price),
        quantity: Math.trunc(Number(item.quantity) || 0),
      };
    });

    historyCount += order.statusHistory?.length ?? 0;
    orders.push({
      id: order.id,
      userId: order.userId,
      status: order.status,
      fulfillment: order.fulfillment,
      totalCents: orderCents,
      items,
    });
  }

  orders.sort((a, b) => a.id.localeCompare(b.id));

  return {
    users: document.users.length,
    sessions: document.sessions.length,
    orders: document.orders.length,
    items: itemCount,
    history: historyCount,
    menuItems: itemIds.size,
    revenueCents,
    completedRevenueCents,
    statusCounts,
    orderDigest: digest(orders),
    userDigest: digest(
      document.users
        .map((user) => ({
          id: user.id,
          email: normalizeEmail(user.email),
          phone: normalizePhone(user.phone),
          role: user.role,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    ),
    sessionDigest: digest(
      document.sessions
        .map((session) => ({
          tokenHash: session.tokenHash,
          userId: session.userId,
        }))
        .sort((a, b) => a.tokenHash.localeCompare(b.tokenHash)),
    ),
  };
}

async function targetSnapshot() {
  const counts = (
    await pool.query(`
      SELECT
        (SELECT count(*) FROM users)::int AS users,
        (SELECT count(*) FROM sessions)::int AS sessions,
        (SELECT count(*) FROM orders)::int AS orders,
        (SELECT count(*) FROM order_items)::int AS items,
        (SELECT count(*) FROM order_status_history)::int AS history,
        (SELECT count(*) FROM menu_items)::int AS menu_items,
        (SELECT COALESCE(sum(total_cents), 0) FROM orders)::bigint AS revenue_cents,
        (SELECT COALESCE(sum(total_cents), 0) FROM orders WHERE status = 'completed')::bigint
          AS completed_revenue_cents
    `)
  ).rows[0];

  const statusCounts = Object.fromEntries(
    (
      await pool.query(
        "SELECT status::text AS status, count(*)::int AS count FROM orders GROUP BY status",
      )
    ).rows.map((row) => [row.status, row.count]),
  );

  const orderRows = (
    await pool.query(`
      SELECT
        o.id, o.user_id, o.status::text AS status, o.fulfillment::text AS fulfillment,
        o.total_cents,
        COALESCE((
          SELECT json_agg(json_build_object(
            'lineNo', oi.line_no,
            'id', oi.menu_item_id,
            'name', oi.item_name,
            'unitPriceCents', oi.unit_price_cents,
            'quantity', oi.quantity
          ) ORDER BY oi.line_no)
          FROM order_items oi WHERE oi.order_id = o.id
        ), '[]'::json) AS items
      FROM orders o
      ORDER BY o.id
    `)
  ).rows;

  const orders = orderRows.map((order) => ({
    id: order.id,
    userId: order.user_id,
    status: order.status,
    fulfillment: order.fulfillment,
    totalCents: Number(order.total_cents),
    items: order.items,
  }));

  const userRows = (
    await pool.query("SELECT id, email, phone, role::text AS role FROM users ORDER BY id")
  ).rows;
  const sessionRows = (
    await pool.query("SELECT token_hash, user_id FROM sessions ORDER BY token_hash")
  ).rows;

  return {
    users: counts.users,
    sessions: counts.sessions,
    orders: counts.orders,
    items: counts.items,
    history: counts.history,
    menuItems: counts.menu_items,
    revenueCents: Number(counts.revenue_cents),
    completedRevenueCents: Number(counts.completed_revenue_cents),
    statusCounts,
    orderDigest: digest(orders),
    userDigest: digest(
      userRows.map((user) => ({
        id: user.id,
        email: normalizeEmail(user.email),
        phone: normalizePhone(user.phone),
        role: user.role,
      })),
    ),
    sessionDigest: digest(
      sessionRows.map((session) => ({
        tokenHash: session.token_hash,
        userId: session.user_id,
      })),
    ),
  };
}

const document = await readSource();
const before = sourceSnapshot(document);
const after = await targetSnapshot();

const checks = [
  ["users", before.users, after.users],
  ["sessions", before.sessions, after.sessions],
  ["orders", before.orders, after.orders],
  ["order items", before.items, after.items],
  ["status history", before.history, after.history],
  ["menu items (distinct source ids)", before.menuItems, after.menuItems],
  ["revenue (cents)", before.revenueCents, after.revenueCents],
  ["completed revenue (cents)", before.completedRevenueCents, after.completedRevenueCents],
  ["order digest", before.orderDigest, after.orderDigest],
  ["user digest", before.userDigest, after.userDigest],
  ["session digest", before.sessionDigest, after.sessionDigest],
];

const statuses = new Set([
  ...Object.keys(before.statusCounts),
  ...Object.keys(after.statusCounts),
]);
for (const status of [...statuses].sort()) {
  checks.push([
    `status ${status}`,
    before.statusCounts[status] ?? 0,
    after.statusCounts[status] ?? 0,
  ]);
}

const failures = checks.filter(([, left, right]) => left !== right);
const report = {
  source: source === "postgres" ? "legacy mesob_house_db row" : file,
  database: (() => {
    const url = new URL(databaseUrl);
    return `${url.hostname}/${url.pathname.slice(1)}`;
  })(),
  before,
  after,
  checks: checks.map(([name, left, right]) => ({
    name,
    before: left,
    after: right,
    ok: left === right,
  })),
  ok: failures.length === 0,
};

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("");
  console.log("Reconciliation");
  console.log(`  source: ${report.source}`);
  console.log(`  target: ${report.database}`);
  console.log("");
  for (const [name, left, right] of checks) {
    const ok = left === right;
    const display = (value) =>
      typeof value === "number" && name.includes("revenue")
        ? `${(value / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} ETB (${value} cents)`
        : String(value);
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name.padEnd(34)} ${display(left)}  =  ${display(right)}`);
  }
  console.log("");
  console.log(`RESULT: ${report.ok ? "PASS" : "FAIL"}`);
}

await pool.end();
process.exit(report.ok ? 0 : 1);
