#!/usr/bin/env node

/**
 * EXPLAIN ANALYZE for the kitchen, admin and analytics query shapes.
 *
 *   DATABASE_URL=postgresql://localhost/mesob_house \
 *     node scripts/explain-queries.mjs --label before
 *
 * Compare the `before` and `after` output after applying 002_indexes.sql.
 * Read-only: every statement is an EXPLAIN, never a write.
 */

import {
  createPool,
  databaseUrlFromEnv,
  has,
  loadEnv,
  parseArgs,
  printDatabaseTarget,
  value,
} from "./lib/db-cli.mjs";

loadEnv();
const args = parseArgs();
const databaseUrl = value(args, "database-url", databaseUrlFromEnv());
const label = value(args, "label", "run");

if (has(args, "help")) {
  console.log(`Usage: node scripts/explain-queries.mjs [options]

  --label LABEL       Label for the report (default: run)
  --database-url URL  Override DATABASE_URL
`);
  process.exit(0);
}

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
printDatabaseTarget("Database", databaseUrl);

const pool = createPool(databaseUrl, { max: 1 });

const sample = (
  await pool.query(`
    SELECT o.user_id::text AS user_id, s.token_hash
    FROM orders o
    CROSS JOIN (SELECT token_hash FROM sessions LIMIT 1) s
    ORDER BY o.created_at DESC
    LIMIT 1
  `)
).rows[0];

const cases = [
  {
    name: "kitchen live queue",
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT id, status::text, created_at
      FROM orders
      WHERE status IN ('received', 'preparing', 'ready', 'out_for_delivery')
      ORDER BY created_at ASC
      LIMIT 100
    `,
  },
  {
    name: "kitchen queue counts",
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT status::text, count(*)::int
      FROM orders
      WHERE status IN ('received', 'preparing', 'ready', 'out_for_delivery')
      GROUP BY status
    `,
  },
  {
    name: "admin recent orders",
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT id, status::text, total_cents, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 50
    `,
  },
  {
    name: "admin completed filter",
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT id, status::text, total_cents, created_at
      FROM orders
      WHERE status = 'completed'
      ORDER BY created_at DESC
      LIMIT 50
    `,
  },
  {
    name: "analytics revenue by area",
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT
        CASE WHEN fulfillment = 'pickup' THEN 'Pickup (Bole)' ELSE delivery_sub_city END AS area,
        count(*)::int AS orders,
        sum(total_cents)::bigint AS revenue_cents
      FROM orders
      WHERE status = 'completed'
      GROUP BY 1
      ORDER BY revenue_cents DESC
    `,
  },
  {
    name: "analytics best-selling items",
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT
        oi.menu_item_id,
        oi.item_name,
        sum(oi.quantity)::int AS quantity,
        sum(oi.unit_price_cents * oi.quantity)::bigint AS revenue_cents
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status = 'completed'
      GROUP BY oi.menu_item_id, oi.item_name
      ORDER BY quantity DESC, revenue_cents DESC
      LIMIT 8
    `,
  },
  {
    name: "analytics top customers",
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT user_id, count(*)::int AS orders, sum(total_cents)::bigint AS revenue_cents
      FROM orders
      WHERE status = 'completed'
      GROUP BY user_id
      ORDER BY revenue_cents DESC
      LIMIT 10
    `,
  },
  {
    name: "customer order history",
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT id, status::text, total_cents, created_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `,
    params: [sample.user_id],
  },
  {
    name: "session lookup",
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT u.id
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
    `,
    params: [sample.token_hash],
  },
  {
    name: "order detail items and history",
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT o.id, oi.item_name, oi.quantity, h.status::text
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN order_status_history h ON h.order_id = o.id
      WHERE o.id = (SELECT id FROM orders ORDER BY created_at DESC LIMIT 1)
    `,
  },
];

console.log(`EXPLAIN ANALYZE — ${label}`);
console.log(`Database: ${new URL(databaseUrl).hostname}/${new URL(databaseUrl).pathname.slice(1)}`);
console.log("");

for (const testCase of cases) {
  console.log(`### ${testCase.name}`);
  const { rows } = await pool.query(testCase.sql, testCase.params ?? []);
  console.log(rows.map((row) => row["QUERY PLAN"]).join("\n"));
  console.log("");
}

await pool.end();
