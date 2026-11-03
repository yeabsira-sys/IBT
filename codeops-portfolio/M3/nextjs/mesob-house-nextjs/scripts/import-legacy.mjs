#!/usr/bin/env node

/**
 * Import the legacy single-document database into normalized tables.
 *
 * Source can be the JSON file (default) or the legacy `mesob_house_db` row:
 *
 *   DATABASE_URL=postgresql://localhost/mesob_house \
 *     node scripts/import-legacy.mjs --file .data/mesob-house.json
 *
 *   DATABASE_URL=postgresql://localhost/mesob_house \
 *     node scripts/import-legacy.mjs --source postgres
 *
 * The import is transactional and idempotent: existing orders are upserted,
 * their line items/history are replaced, and the final counts/revenue are
 * checked before COMMIT. Writes to non-local hosts are refused unless
 * --allow-remote is passed.
 */

import {
  assertLocalWriteTarget,
  cents,
  createPool,
  databaseUrlFromEnv,
  has,
  loadEnv,
  numberValue,
  parseArgs,
  printDatabaseTarget,
  readJsonFile,
  value,
  withTransaction,
} from "./lib/db-cli.mjs";

loadEnv();
const args = parseArgs();
const databaseUrl = value(args, "database-url", databaseUrlFromEnv());
const source = value(args, "source", "json");
const file = value(args, "file", ".data/mesob-house.json");
const dryRun = has(args, "dry-run");
const reset = has(args, "reset");
const batchSize = numberValue(args, "batch", 250, 1);

if (has(args, "help")) {
  console.log(`Usage: node scripts/import-legacy.mjs [options]

  --source json|postgres  Where the legacy document comes from (default: json)
  --file PATH             JSON document (default: .data/mesob-house.json)
  --reset                 Truncate normalized tables before importing
  --dry-run               Parse and validate without writing
  --allow-remote          Permit writes to a non-local database
  --database-url URL      Override DATABASE_URL
`);
  process.exit(0);
}

assertLocalWriteTarget(databaseUrl, args);
printDatabaseTarget("Target", databaseUrl);
console.log(`Source: ${source === "postgres" ? "legacy mesob_house_db row" : file}`);

const pool = createPool(databaseUrl, { max: 1 });

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 9 ? digits.slice(-9) : digits;
}

function asCents(value) {
  return Math.round((Number(String(value ?? 0).replace(/,/g, "")) || 0) * 100);
}

function assertShape(document) {
  for (const key of ["users", "sessions", "orders"]) {
    if (!Array.isArray(document[key])) {
      throw new Error(`Legacy document is missing the ${key} array.`);
    }
  }
}

async function readSource() {
  if (source === "postgres") {
    const { rows } = await pool.query(
      "SELECT data FROM mesob_house_db WHERE id = 1",
    );
    if (!rows[0]?.data) {
      throw new Error(
        "Legacy mesob_house_db row not found. Use --source json with the production document instead.",
      );
    }
    return rows[0].data;
  }
  return readJsonFile(file);
}

function buildImport(document) {
  const users = document.users.map((user) => ({
    id: user.id,
    full_name: String(user.fullName ?? "").trim(),
    email: normalizeEmail(user.email),
    phone: normalizePhone(user.phone),
    password_hash: user.passwordHash ?? null,
    role: user.role,
    preference: user.preference ?? null,
    provider: user.provider ?? null,
    created_at: user.createdAt,
    updated_at: user.createdAt,
  }));

  const userIds = new Set(users.map((user) => user.id));
  const sessionRows = document.sessions.map((session) => ({
    id: session.id,
    token_hash: session.tokenHash,
    user_id: session.userId,
    created_at: session.createdAt,
    expires_at: session.expiresAt,
  }));

  const menu = new Map();
  const orders = [];
  const items = [];
  const history = [];

  const categoryById = {
    "doro-wat": "stews",
    "special-doro-wat": "stews",
    "siga-derek-tibs": "grills",
    "siga-tibs": "grills",
    "prime-beef-kitfo": "kitfo",
    "full-vegan-beyaynetu": "fasting",
    "house-tej-carafe": "drinks",
    "clay-pot-shiro-bozena": "stews",
    "awaze-lamb-tibs": "grills",
    "gored-gored": "kitfo",
  };

  for (const order of document.orders) {
    if (!userIds.has(order.userId)) {
      throw new Error(`Order ${order.id} references missing user ${order.userId}`);
    }
    if (!/^MH-[A-Z0-9]{8}$/.test(String(order.id ?? ""))) {
      throw new Error(`Order ${order.id} does not match the MH-XXXXXXXX format.`);
    }

    const totals = order.totals ?? {};
    const orderItems = Array.isArray(order.items) ? order.items : [];
    if (!orderItems.length) throw new Error(`Order ${order.id} has no items.`);

    orderItems.forEach((item, index) => {
      const itemId = String(item.id);
      if (!menu.has(itemId)) {
        menu.set(itemId, {
          id: itemId,
          name: String(item.name ?? itemId),
          description: "",
          category: categoryById[itemId] ?? "legacy",
          price_cents: asCents(item.price),
          image_url: "",
          is_special: false,
          is_active: true,
        });
      }
      items.push({
        order_id: order.id,
        line_no: index + 1,
        menu_item_id: itemId,
        item_name: String(item.name ?? itemId),
        unit_price_cents: asCents(item.price),
        quantity: Math.trunc(Number(item.quantity) || 0),
      });
    });

    orders.push({
      id: order.id,
      user_id: order.userId,
      status: order.status,
      fulfillment: order.fulfillment,
      customer_name: order.customer?.name ?? "",
      customer_email: normalizeEmail(order.customer?.email),
      customer_phone: normalizePhone(order.customer?.phone),
      contact_name: order.contact?.name ?? order.customer?.name ?? "",
      contact_phone: normalizePhone(order.contact?.phone ?? order.customer?.phone),
      contact_email: normalizeEmail(order.contact?.email ?? order.customer?.email),
      delivery_sub_city: order.delivery?.subCity ?? "",
      delivery_street: order.delivery?.street ?? "",
      delivery_landmark: order.delivery?.landmark ?? "",
      delivery_timing: order.delivery?.timing ?? "immediate",
      payment_method: order.method ?? "cash",
      coupon_code: order.couponCode ?? null,
      note: String(order.note ?? "").slice(0, 500),
      subtotal_cents: asCents(totals.subtotal),
      injera_cents: asCents(totals.injera),
      packaging_cents: asCents(totals.packaging),
      vat_cents: asCents(totals.vat),
      discount_cents: asCents(totals.discount),
      created_at: order.createdAt,
      updated_at: order.updatedAt ?? order.createdAt,
    });

    for (const entry of order.statusHistory ?? []) {
      if (!entry?.status || !entry?.at) continue;
      if (entry.by && !userIds.has(entry.by)) {
        throw new Error(
          `Order ${order.id} history references missing user ${entry.by}`,
        );
      }
      history.push({
        order_id: order.id,
        status: entry.status,
        changed_at: entry.at,
        changed_by: entry.by ?? null,
        changed_by_name: String(entry.byName ?? ""),
        note: "legacy import",
      });
    }
  }

  return {
    users,
    sessions: sessionRows,
    menu: [...menu.values()],
    orders,
    items,
    history,
  };
}

function sourceTotals(document) {
  return {
    users: document.users.length,
    sessions: document.sessions.length,
    orders: document.orders.length,
    items: document.orders.reduce(
      (sum, order) => sum + (order.items?.length ?? 0),
      0,
    ),
    history: document.orders.reduce(
      (sum, order) => sum + (order.statusHistory?.length ?? 0),
      0,
    ),
    revenueCents: document.orders.reduce(
      (sum, order) => sum + cents(order.totals?.total),
      0,
    ),
    completedRevenueCents: document.orders
      .filter((order) => order.status === "completed")
      .reduce((sum, order) => sum + cents(order.totals?.total), 0),
  };
}

async function insertUsers(client, users) {
  if (!users.length) return;
  await client.query(
    `
      INSERT INTO users (
        id, full_name, email, phone, password_hash, role, preference,
        provider, created_at, updated_at
      )
      SELECT
        x.id::uuid, x.full_name, x.email, x.phone, x.password_hash,
        x.role::user_role, x.preference, x.provider,
        x.created_at::timestamptz, x.updated_at::timestamptz
      FROM json_to_recordset($1::json) AS x(
        id text, full_name text, email text, phone text, password_hash text,
        role text, preference text, provider text, created_at text,
        updated_at text
      )
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        preference = EXCLUDED.preference,
        provider = EXCLUDED.provider,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
    `,
    [JSON.stringify(users)],
  );
}

async function insertSessions(client, sessions) {
  if (!sessions.length) return;
  await client.query(
    `
      INSERT INTO sessions (id, token_hash, user_id, created_at, expires_at)
      SELECT
        x.id::uuid, x.token_hash, x.user_id::uuid,
        x.created_at::timestamptz, x.expires_at::timestamptz
      FROM json_to_recordset($1::json) AS x(
        id text, token_hash text, user_id text, created_at text, expires_at text
      )
      ON CONFLICT (token_hash) DO NOTHING
    `,
    [JSON.stringify(sessions)],
  );
}

async function insertMenu(client, menu) {
  if (!menu.length) return;
  await client.query(
    `
      INSERT INTO menu_items (
        id, name, description, category, price_cents, image_url,
        is_special, is_active
      )
      SELECT
        x.id, x.name, x.description, x.category, x.price_cents,
        x.image_url, x.is_special, x.is_active
      FROM json_to_recordset($1::json) AS x(
        id text, name text, description text, category text,
        price_cents integer, image_url text, is_special boolean,
        is_active boolean
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        price_cents = EXCLUDED.price_cents,
        is_active = EXCLUDED.is_active
    `,
    [JSON.stringify(menu)],
  );
}

async function insertOrders(client, orders) {
  if (!orders.length) return;
  await client.query(
    `
      INSERT INTO orders (
        id, user_id, status, fulfillment, customer_name, customer_email,
        customer_phone, contact_name, contact_phone, contact_email,
        delivery_sub_city, delivery_street, delivery_landmark,
        delivery_timing, payment_method, coupon_code, note,
        subtotal_cents, injera_cents, packaging_cents, vat_cents,
        discount_cents, created_at, updated_at
      )
      SELECT
        x.id, x.user_id::uuid, x.status::order_status,
        x.fulfillment::order_fulfillment, x.customer_name, x.customer_email,
        x.customer_phone, x.contact_name, x.contact_phone, x.contact_email,
        x.delivery_sub_city, x.delivery_street, x.delivery_landmark,
        x.delivery_timing, x.payment_method, x.coupon_code, x.note,
        x.subtotal_cents, x.injera_cents, x.packaging_cents, x.vat_cents,
        x.discount_cents, x.created_at::timestamptz, x.updated_at::timestamptz
      FROM json_to_recordset($1::json) AS x(
        id text, user_id text, status text, fulfillment text,
        customer_name text, customer_email text, customer_phone text,
        contact_name text, contact_phone text, contact_email text,
        delivery_sub_city text, delivery_street text, delivery_landmark text,
        delivery_timing text, payment_method text, coupon_code text, note text,
        subtotal_cents integer, injera_cents integer, packaging_cents integer,
        vat_cents integer, discount_cents integer, created_at text,
        updated_at text
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        status = EXCLUDED.status,
        fulfillment = EXCLUDED.fulfillment,
        customer_name = EXCLUDED.customer_name,
        customer_email = EXCLUDED.customer_email,
        customer_phone = EXCLUDED.customer_phone,
        contact_name = EXCLUDED.contact_name,
        contact_phone = EXCLUDED.contact_phone,
        contact_email = EXCLUDED.contact_email,
        delivery_sub_city = EXCLUDED.delivery_sub_city,
        delivery_street = EXCLUDED.delivery_street,
        delivery_landmark = EXCLUDED.delivery_landmark,
        delivery_timing = EXCLUDED.delivery_timing,
        payment_method = EXCLUDED.payment_method,
        coupon_code = EXCLUDED.coupon_code,
        note = EXCLUDED.note,
        subtotal_cents = EXCLUDED.subtotal_cents,
        injera_cents = EXCLUDED.injera_cents,
        packaging_cents = EXCLUDED.packaging_cents,
        vat_cents = EXCLUDED.vat_cents,
        discount_cents = EXCLUDED.discount_cents,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
    `,
    [JSON.stringify(orders)],
  );
}

async function replaceOrderChildren(client, orderIds, items, history) {
  if (!orderIds.length) return;
  await client.query(
    "DELETE FROM order_items WHERE order_id = ANY($1::text[])",
    [orderIds],
  );
  await client.query(
    "DELETE FROM order_status_history WHERE order_id = ANY($1::text[])",
    [orderIds],
  );

  for (let offset = 0; offset < items.length; offset += batchSize) {
    const batch = items.slice(offset, offset + batchSize);
    await client.query(
      `
        INSERT INTO order_items (
          order_id, line_no, menu_item_id, item_name, unit_price_cents, quantity
        )
        SELECT
          x.order_id, x.line_no, x.menu_item_id, x.item_name,
          x.unit_price_cents, x.quantity
        FROM json_to_recordset($1::json) AS x(
          order_id text, line_no integer, menu_item_id text, item_name text,
          unit_price_cents integer, quantity integer
        )
      `,
      [JSON.stringify(batch)],
    );
  }

  for (let offset = 0; offset < history.length; offset += batchSize) {
    const batch = history.slice(offset, offset + batchSize);
    await client.query(
      `
        INSERT INTO order_status_history (
          order_id, status, changed_at, changed_by, changed_by_name, note
        )
        SELECT
          x.order_id, x.status::order_status, x.changed_at::timestamptz,
          NULLIF(x.changed_by, '')::uuid, x.changed_by_name, x.note
        FROM json_to_recordset($1::json) AS x(
          order_id text, status text, changed_at text, changed_by text,
          changed_by_name text, note text
        )
        ON CONFLICT (order_id, status, changed_at) DO NOTHING
      `,
      [JSON.stringify(batch)],
    );
  }
}

async function readTargetTotals(client) {
  const { rows } = await client.query(`
    SELECT
      (SELECT count(*) FROM users)::int AS users,
      (SELECT count(*) FROM sessions)::int AS sessions,
      (SELECT count(*) FROM orders)::int AS orders,
      (SELECT count(*) FROM order_items)::int AS items,
      (SELECT count(*) FROM order_status_history)::int AS history,
      (SELECT COALESCE(sum(total_cents), 0) FROM orders)::bigint AS revenue_cents,
      (SELECT COALESCE(sum(total_cents), 0) FROM orders WHERE status = 'completed')::bigint
        AS completed_revenue_cents
  `);
  const row = rows[0];
  return {
    users: row.users,
    sessions: row.sessions,
    orders: row.orders,
    items: row.items,
    history: row.history,
    revenueCents: Number(row.revenue_cents),
    completedRevenueCents: Number(row.completed_revenue_cents),
  };
}

const document = await readSource();
assertShape(document);
const built = buildImport(document);
const expected = sourceTotals(document);

console.log(
  `Validated ${expected.users} users, ${expected.sessions} sessions, ` +
    `${expected.orders} orders, ${expected.items} items, ${expected.history} history rows.`,
);
console.log(
  `Revenue: ${(expected.revenueCents / 100).toLocaleString("en-US")} ETB total, ` +
    `${(expected.completedRevenueCents / 100).toLocaleString("en-US")} ETB completed.`,
);

if (dryRun) {
  console.log("Dry run: no rows written.");
  await pool.end();
  process.exit(0);
}

let actual;
await withTransaction(pool, async (client) => {
  await client.query("SELECT set_config('app.importing', 'on', true)");
  await client.query("SET LOCAL statement_timeout = '120s'");

  if (reset) {
    await client.query(`
      TRUNCATE audit_log, order_status_history, order_items, orders,
        sessions, users, menu_items RESTART IDENTITY CASCADE
    `);
  }

  await insertUsers(client, built.users);
  await insertSessions(client, built.sessions);
  await insertMenu(client, built.menu);
  await insertOrders(client, built.orders);
  await replaceOrderChildren(
    client,
    built.orders.map((order) => order.id),
    built.items,
    built.history,
  );

  await client.query(
    `
      INSERT INTO audit_log (
        entity_type, entity_id, action, actor_role, after_data
      ) VALUES (
        'migration', 'legacy-document', 'imported', 'system',
        $1::jsonb
      )
    `,
    [JSON.stringify({ source, expected })],
  );

  actual = await readTargetTotals(client);
  for (const key of Object.keys(expected)) {
    if (Number(actual[key]) !== Number(expected[key])) {
      throw new Error(
        `Post-import check failed for ${key}: expected ${expected[key]}, got ${actual[key]}`,
      );
    }
  }
});

console.log("Import committed.");
console.log(
  `Target: ${actual.users} users, ${actual.sessions} sessions, ${actual.orders} orders, ` +
    `${actual.items} items, ${actual.history} history rows.`,
);
console.log(
  `Target revenue: ${(actual.revenueCents / 100).toLocaleString("en-US")} ETB total, ` +
    `${(actual.completedRevenueCents / 100).toLocaleString("en-US")} ETB completed.`,
);

await pool.end();
