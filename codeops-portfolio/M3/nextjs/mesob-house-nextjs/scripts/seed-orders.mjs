#!/usr/bin/env node

/**
 * Test-data generator for the normalized Postgres schema.
 *
 * It replaces the orders table with a large, date-dispersed set and can add
 * demo customer accounts. It never touches the seeded admin/employee/guest
 * accounts or their password hashes.
 *
 * The JSON-file store has been retired. This script writes to Postgres only.
 *
 * Examples:
 *   npm run seed:orders
 *   npm run seed:orders -- --count 2500 --days 180 --customers 30
 *   npm run seed:orders -- --keep-orders
 *   npm run seed:orders:clear
 */

import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import {
  assertLocalWriteTarget,
  createPool,
  databaseUrlFromEnv,
  has,
  loadEnv,
  numberValue,
  parseArgs,
  printDatabaseTarget,
  value,
  withTransaction,
} from "./lib/db-cli.mjs";

loadEnv();
const args = parseArgs(process.argv.slice(2));

if (has(args, "help")) {
  console.log(`Usage: node scripts/seed-orders.mjs [options]

  --count N          Number of orders to generate (default: 1500)
  --days N           Spread completed history across N days (default: 120)
  --customers N      Demo customers to ensure (default: 24)
  --seed N           Deterministic RNG seed (default: 20261021)
  --keep-orders      Append instead of replacing all orders
  --clear            Remove all orders and @mesob.test demo customers
  --dry-run          Generate but do not write
  --allow-remote     Permit writes to a non-local database
`);
  process.exit(0);
}

const count = numberValue(args, "count", 1500, 1);
const days = numberValue(args, "days", 120, 2);
const customerCount = numberValue(args, "customers", 24, 0);
const seed = numberValue(args, "seed", 20261021, 1);
const keepOrders = has(args, "keep-orders");
const clear = has(args, "clear");
const dryRun = has(args, "dry-run");

const databaseUrl = value(args, "database-url", databaseUrlFromEnv());
assertLocalWriteTarget(databaseUrl, args);
printDatabaseTarget("Target", databaseUrl);

// One connection is held for the validation queries while withTransaction()
// checks out a second one for the seed writes.
const pool = createPool(databaseUrl, { max: 2 });

const TIME_ZONE = "Africa/Addis_Ababa";
const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_EMAIL_SUFFIX = "@mesob.test";
const DEMO_PASSWORD = "Guest123!";

function mulberry32(value) {
  let state = value >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(seed);
const randomInt = (minimum, maximum) =>
  minimum + Math.floor(random() * (maximum - minimum + 1));
const pick = (items) => items[Math.floor(random() * items.length)];

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function addisParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

const now = new Date();
const today = addisParts(now);

function addisDate(dayOffset, hour = 0, minute = 0) {
  return new Date(
    Date.UTC(today.year, today.month - 1, today.day + dayOffset, hour - 3, minute, 0, 0),
  );
}

const FIRST_NAMES = [
  "Selam", "Dawit", "Hanna", "Abel", "Marta", "Yonas", "Liya", "Bereket",
  "Sara", "Nahom", "Mimi", "Kebede", "Tigist", "Samuel", "Bethel", "Robel",
  "Eden", "Henok", "Meron", "Yared", "Fikir", "Girum", "Rahel", "Dagmawi",
  "Sofia", "Elias", "Mahlet", "Natnael", "Ruth", "Biniam", "Genet", "Eyob",
];

const LAST_NAMES = [
  "Tesfaye", "Bekele", "Girma", "Haile", "Mekonnen", "Alemayehu", "Kebede",
  "Assefa", "Negash", "Wolde", "Tadesse", "Gebre", "Molla", "Desta", "Kassa",
  "Ayele", "Mengistu", "Shiferaw", "Getachew", "Tsegaye",
];

const SUB_CITIES = [
  "Bole Medhanialem (Near Mesob House)",
  "Kazanchis",
  "Sarbet",
  "Old Airport",
  "CMC",
];

const STREETS = [
  "Bole Road, Ruby Building, 4th floor",
  "Kazanchis, Zewditu Street, Apartment 6B",
  "Sarbet, Beshale Road, Villa 12",
  "Old Airport, Hayahulet Street, Flat 3",
  "CMC, Mickey Leland Street, House 41",
  "Bole Atlas, Saarland Street, Suite 8",
  "Megenagna, Gurd Shola Road, 2nd floor",
];

const LANDMARKS = [
  "Opposite Edna Mall",
  "Behind Total Station",
  "Next to the old cinema",
  "Near the blue minibus stop",
  "Beside Zewditu Hospital",
  "",
  "",
];

const NOTES = [
  "",
  "",
  "",
  "Extra injera, please.",
  "Mild spice for one guest.",
  "No onions on the tibs.",
  "Please call when the rider arrives.",
  "Pack the wat separately.",
  "Birthday order — add a candle if possible.",
];

const METHODS = ["telebirr", "cbe", "cash", "card"];

const DISHES = [
  { id: "doro-wat", name: "Doro Wat", price: 650, category: "stews" },
  { id: "siga-derek-tibs", name: "Siga Derek Tibs", price: 620, category: "grills" },
  { id: "prime-beef-kitfo", name: "Prime Beef Kitfo", price: 720, category: "kitfo" },
  { id: "full-vegan-beyaynetu", name: "Full Vegan Beyaynetu", price: 480, category: "fasting" },
  { id: "house-tej-carafe", name: "House Tej (Carafe)", price: 350, category: "drinks" },
  { id: "shiro-bozena", name: "Shiro Bozena (Beef Enriched Shiro)", price: 490, category: "stews" },
  { id: "awaze-lamb-tibs", name: "Awaze Lamb Tibs", price: 680, category: "grills" },
  { id: "gored-gored", name: "Gored Gored", price: 750, category: "kitfo" },
];

const ACTIVE_STATUSES = [
  "received",
  "received",
  "preparing",
  "preparing",
  "ready",
  "out_for_delivery",
];

function statusPath(status, fulfillment) {
  switch (status) {
    case "received":
      return ["received"];
    case "preparing":
      return ["received", "preparing"];
    case "ready":
      return ["received", "preparing", "ready"];
    case "out_for_delivery":
      return ["received", "preparing", "ready", "out_for_delivery"];
    case "completed":
      return fulfillment === "pickup"
        ? ["received", "preparing", "ready", "completed"]
        : ["received", "preparing", "ready", "out_for_delivery", "completed"];
    case "cancelled":
      return ["received", "cancelled"];
    default:
      return ["received"];
  }
}

function demoCustomer(index) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName =
    LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  return {
    fullName: `${firstName} ${lastName}`,
    email: `diner${String(index + 1).padStart(2, "0")}${DEMO_EMAIL_SUFFIX}`,
    phone: `91${String(2_000_000 + index).slice(-7)}`,
  };
}

async function loadUsers(client) {
  return (await client.query("SELECT * FROM users")).rows;
}

async function ensureDemoCustomers(client, existingUsers) {
  const created = [];
  for (let index = 0; index < customerCount; index += 1) {
    const details = demoCustomer(index);
    if (existingUsers.some((user) => user.email === details.email)) continue;

    const inserted = await client.query(
      `INSERT INTO users (
         id, full_name, email, phone, password_hash, role, preference, provider,
         created_at
       ) VALUES ($1, $2, $3, $4, $5, 'customer', 'all-heritage', 'password', $6)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        randomUUID(),
        details.fullName,
        details.email,
        details.phone,
        hashPassword(DEMO_PASSWORD),
        new Date(now.getTime() - randomInt(1, 365) * DAY_MS).toISOString(),
      ],
    );
    if (inserted.rows[0]) created.push(inserted.rows[0]);
  }
  return created;
}

function makeItems() {
  const itemCount = randomInt(1, 4);
  const chosen = [];
  const used = new Set();
  while (chosen.length < itemCount) {
    const dish = pick(DISHES);
    if (used.has(dish.id)) continue;
    used.add(dish.id);
    chosen.push({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      quantity: randomInt(1, 3),
    });
  }
  return chosen;
}

function makeOrder({ createdAt, status, customer, staff }) {
  const fulfillment = random() < 0.28 ? "pickup" : "delivery";
  const items = makeItems();
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const couponCode = random() < 0.09 ? "GURSHA2025" : null;
  const discount = couponCode && subtotal > 500 ? 200 : 0;
  const vat = Math.round(subtotal * 0.15);
  const total = Math.max(0, subtotal + vat - discount);
  const subCity = fulfillment === "pickup" ? "" : pick(SUB_CITIES);
  const note = pick(NOTES);

  const history = [];
  let at = new Date(createdAt);
  for (const [index, step] of statusPath(status, fulfillment).entries()) {
    if (index > 0) {
      at = new Date(
        Math.min(
          now.getTime(),
          at.getTime() + randomInt(5, 28) * 60 * 1000,
        ),
      );
    }
    const byCustomer = step === "received" || step === "cancelled";
    history.push({
      status: step,
      at: at.toISOString(),
      by: byCustomer ? customer.id : staff.id,
      byName: byCustomer ? customer.full_name : staff.full_name,
    });
  }

  return {
    id: `MH-${randomUUID().slice(0, 8).toUpperCase()}`,
    userId: customer.id,
    customer: {
      name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
    },
    status,
    items,
    totals: {
      subtotal,
      injera: 0,
      packaging: 0,
      vat,
      discount,
      total,
    },
    couponCode,
    note,
    fulfillment,
    contact: {
      name: customer.full_name,
      phone: customer.phone,
      email: customer.email,
    },
    delivery: {
      subCity,
      street: fulfillment === "pickup" ? "" : pick(STREETS),
      landmark: fulfillment === "pickup" ? "" : pick(LANDMARKS),
      timing: random() < 0.22 ? "scheduled" : "immediate",
    },
    method: pick(METHODS),
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: history.at(-1).at,
    statusHistory: history,
  };
}

const orderRows = (orders) =>
  orders.map((order) => ({
    id: order.id,
    user_id: order.userId,
    status: order.status,
    fulfillment: order.fulfillment,
    customer_name: order.customer.name,
    customer_email: order.customer.email,
    customer_phone: order.customer.phone,
    contact_name: order.contact.name,
    contact_phone: order.contact.phone,
    contact_email: order.contact.email,
    delivery_sub_city: order.delivery.subCity,
    delivery_street: order.delivery.street,
    delivery_landmark: order.delivery.landmark,
    delivery_timing: order.delivery.timing,
    payment_method: order.method,
    coupon_code: order.couponCode,
    note: order.note,
    subtotal_cents: order.totals.subtotal * 100,
    injera_cents: order.totals.injera * 100,
    packaging_cents: order.totals.packaging * 100,
    vat_cents: order.totals.vat * 100,
    discount_cents: order.totals.discount * 100,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  }));

const itemRows = (orders) =>
  orders.flatMap((order) =>
    order.items.map((item, index) => ({
      order_id: order.id,
      line_no: index + 1,
      menu_item_id: item.id,
      item_name: item.name,
      unit_price_cents: item.price * 100,
      quantity: item.quantity,
    })),
  );

const historyRows = (orders) =>
  orders.flatMap((order) =>
    order.statusHistory.map((entry) => ({
      order_id: order.id,
      status: entry.status,
      changed_at: entry.at,
      changed_by: entry.by,
      changed_by_name: entry.byName,
      note: "seed",
    })),
  );

async function insertSeed(client, orders, { replace }) {
  await client.query("SELECT set_config('app.importing', 'on', true)");

  if (replace) {
    await client.query("DELETE FROM orders");
  }

  for (const dish of DISHES) {
    await client.query(
      `INSERT INTO menu_items (id, name, price_cents, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [dish.id, dish.name, dish.price * 100, dish.category],
    );
  }

  const batchSize = 250;
  const rows = orderRows(orders);
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    await client.query(
      `INSERT INTO orders (
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
       )`,
      [JSON.stringify(rows.slice(offset, offset + batchSize))],
    );
  }

  const items = itemRows(orders);
  for (let offset = 0; offset < items.length; offset += batchSize) {
    await client.query(
      `INSERT INTO order_items (
         order_id, line_no, menu_item_id, item_name, unit_price_cents, quantity
       )
       SELECT
         x.order_id, x.line_no, x.menu_item_id, x.item_name,
         x.unit_price_cents, x.quantity
       FROM json_to_recordset($1::json) AS x(
         order_id text, line_no integer, menu_item_id text, item_name text,
         unit_price_cents integer, quantity integer
       )`,
      [JSON.stringify(items.slice(offset, offset + batchSize))],
    );
  }

  const history = historyRows(orders);
  for (let offset = 0; offset < history.length; offset += batchSize) {
    await client.query(
      `INSERT INTO order_status_history (
         order_id, status, changed_at, changed_by, changed_by_name, note
       )
       SELECT
         x.order_id, x.status::order_status, x.changed_at::timestamptz,
         x.changed_by::uuid, x.changed_by_name, x.note
       FROM json_to_recordset($1::json) AS x(
         order_id text, status text, changed_at text, changed_by text,
         changed_by_name text, note text
       )
       ON CONFLICT (order_id, status, changed_at) DO NOTHING`,
      [JSON.stringify(history.slice(offset, offset + batchSize))],
    );
  }
}

async function main() {
  const client = await pool.connect();
  try {
    if (clear) {
      if (dryRun) {
        const counts = await client.query(
          `SELECT
             (SELECT count(*)::int FROM orders
              WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)) AS orders,
             (SELECT count(*)::int FROM users WHERE email LIKE $1) AS users`,
          [`%${DEMO_EMAIL_SUFFIX}`],
        );
        console.log(
          `Would clear ${counts.rows[0].orders} demo orders and ${counts.rows[0].users} demo customers.`,
        );
        return;
      }

      const result = await withTransaction(pool, async (tx) => {
        const orders = await tx.query(
          "DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)",
          [`%${DEMO_EMAIL_SUFFIX}`],
        );
        const users = await tx.query("DELETE FROM users WHERE email LIKE $1", [
          `%${DEMO_EMAIL_SUFFIX}`,
        ]);
        return { orders: orders.rowCount, users: users.rowCount };
      });
      console.log(
        `Cleared ${result.orders} demo orders and ${result.users} demo customers.`,
      );
      return;
    }

    let users = await loadUsers(client);
    if (dryRun) {
      console.log("Dry run: generating the order set without writing.");
    }

    let createdCustomers = [];
    if (!dryRun) {
      createdCustomers = await withTransaction(pool, (tx) =>
        ensureDemoCustomers(tx, users),
      );
      users = await loadUsers(client);
    } else {
      const existingEmails = new Set(users.map((user) => user.email));
      createdCustomers = Array.from({ length: customerCount }, (_, index) =>
        demoCustomer(index),
      ).filter((candidate) => !existingEmails.has(candidate.email));
    }

    const demoCustomers = users.filter((user) =>
      String(user.email).endsWith(DEMO_EMAIL_SUFFIX),
    );
    const otherCustomers = users.filter(
      (user) =>
        user.role === "customer" &&
        !String(user.email).endsWith(DEMO_EMAIL_SUFFIX),
    );
    const customerPool = [...demoCustomers, ...otherCustomers];

    if (!customerPool.length) {
      throw new Error("No customer account found. Seed the app first or pass --customers 1.");
    }

    const admin = users.find((user) => user.role === "admin") ?? users[0];
    const employee = users.find((user) => user.role === "employee") ?? admin;
    if (!admin) throw new Error("No admin user found; run migrations/import first.");
    const staff = random() < 0.7 ? admin : employee;

    const todayCount = Math.min(count, Math.max(24, Math.round(count * 0.05)));
    const pastCount = count - todayCount;
    const pastDays = Math.max(1, days - 1);
    const coveredDays = Math.min(pastDays, pastCount);

    const dayOffsets = [];
    for (let offset = 1; offset <= coveredDays; offset += 1) dayOffsets.push(offset);
    for (let index = coveredDays; index < pastCount; index += 1) {
      dayOffsets.push(1 + Math.floor(Math.pow(random(), 1.65) * pastDays));
    }

    const orders = [];
    const todayStart = addisDate(0, 0, 0);
    const todayElapsed = Math.max(
      0,
      now.getTime() - todayStart.getTime() - 60 * 1000,
    );

    for (let index = 0; index < todayCount; index += 1) {
      const createdAt = new Date(
        todayStart.getTime() + Math.floor(random() * Math.max(1, todayElapsed)),
      );
      const roll = random();
      const status =
        roll < 0.62
          ? pick(ACTIVE_STATUSES)
          : roll < 0.88
            ? "completed"
            : "cancelled";
      orders.push(
        makeOrder({ createdAt, status, customer: pick(customerPool), staff }),
      );
    }

    for (const dayOffset of dayOffsets) {
      const createdAt = addisDate(-dayOffset, randomInt(10, 22), randomInt(0, 59));
      const status = random() < 0.91 ? "completed" : "cancelled";
      orders.push(
        makeOrder({ createdAt, status, customer: pick(customerPool), staff }),
      );
    }

    if (!dryRun) {
      await withTransaction(pool, (tx) =>
        insertSeed(tx, orders, { replace: !keepOrders }),
      );
    }

    const active = orders.filter(
      (order) => !["completed", "cancelled"].includes(order.status),
    ).length;

    console.log(
      `${dryRun ? "Would seed" : "Seeded"} ${orders.length} orders across ${days} days.`,
    );
    console.log(`Today: ${todayCount} orders, ${active} active in the kitchen queue.`);
    console.log(
      `Demo accounts: ${demoCustomers.length} total` +
        (createdCustomers.length
          ? `, ${createdCustomers.length} created.`
          : "."),
    );
    if (demoCustomers.length) {
      console.log(
        `Demo login: ${demoCustomers[0].email} / ${DEMO_PASSWORD} ` +
          `(diner01–diner${String(demoCustomers.length).padStart(2, "0")}).`,
      );
    }
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
