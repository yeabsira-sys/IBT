#!/usr/bin/env node

/**
 * Test-data generator for the file or Postgres-backed database.
 *
 * It replaces the orders table with a large, date-dispersed set and can add
 * demo customer accounts. It never touches the seeded admin/employee/guest
 * accounts or their password hashes.
 *
 * When DATABASE_URL (or POSTGRES_URL / POSTGRES_PRISMA_URL) is set, it writes
 * to the shared Postgres row that the app uses. Use --file to force the local
 * JSON store instead.
 *
 * Examples:
 *   npm run seed:orders
 *   npm run seed:orders -- --count 2500 --days 180 --customers 30
 *   npm run seed:orders -- --keep-orders
 *   npm run seed:orders -- --file
 *   npm run seed:orders:clear
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { Pool } from "pg";

// Match the app's env loading so DATABASE_URL in .env works without extra
// shell plumbing. Existing environment variables still take precedence.
for (const envFile of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const TIME_ZONE = "Africa/Addis_Ababa";
const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_EMAIL_SUFFIX = "@mesob.test";
const DEMO_PASSWORD = "Guest123!";

const argv = process.argv.slice(2);
const flags = new Map();

for (let index = 0; index < argv.length; index += 1) {
  const arg = argv[index];
  if (!arg.startsWith("--")) continue;
  const [key, inline] = arg.slice(2).split("=");
  if (inline !== undefined) {
    flags.set(key, inline);
  } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
    flags.set(key, argv[index + 1]);
    index += 1;
  } else {
    flags.set(key, true);
  }
}

const numberFlag = (name, fallback, minimum = 0) => {
  const raw = flags.get(name);
  const value = raw === undefined || raw === true ? fallback : Number(raw);
  return Number.isFinite(value) ? Math.max(minimum, Math.floor(value)) : fallback;
};

const count = numberFlag("count", 1500, 1);
const days = numberFlag("days", 120, 2);
const customerCount = numberFlag("customers", 24, 0);
const seed = numberFlag("seed", 20261021, 1);
const keepOrders = flags.has("keep-orders");
const clear = flags.has("clear");
const dryRun = flags.has("dry-run");
const forceFile = flags.has("file");

const databaseUrl = forceFile
  ? ""
  : process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    "";
const usePostgres = Boolean(databaseUrl);

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const dbFile = path.join(dataDir, "mesob-house.json");

let pool;

function getPool() {
  if (!pool) {
    const local = /(^|@)(localhost|127\.0\.0\.1|::1)(:|\/|$)/.test(databaseUrl);
    const sslDisabled =
      process.env.PGSSLMODE === "disable" ||
      /[?&]sslmode=disable(?:&|$)/.test(databaseUrl);

    pool = new Pool({
      connectionString: databaseUrl,
      max: 1,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      ssl: local || sslDisabled ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

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
const randomInt = (minimum, maximum) => minimum + Math.floor(random() * (maximum - minimum + 1));
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

/** Addis Ababa is UTC+3 all year, so a local wall-clock time is easy to build. */
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
  { id: "doro-wat", name: "Doro Wat", price: 650 },
  { id: "siga-derek-tibs", name: "Siga Derek Tibs", price: 620 },
  { id: "prime-beef-kitfo", name: "Prime Beef Kitfo", price: 720 },
  { id: "full-vegan-beyaynetu", name: "Full Vegan Beyaynetu", price: 480 },
  { id: "house-tej-carafe", name: "House Tej (Carafe)", price: 350 },
  { id: "clay-pot-shiro-bozena", name: "Clay-pot Shiro Bozena", price: 450 },
  { id: "awaze-lamb-tibs", name: "Awaze Lamb Tibs", price: 680 },
  { id: "gored-gored", name: "Gored Gored", price: 750 },
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
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  return {
    fullName: `${firstName} ${lastName}`,
    email: `diner${String(index + 1).padStart(2, "0")}${DEMO_EMAIL_SUFFIX}`,
    phone: `91${String(2_000_000 + index).slice(-7)}`,
  };
}

function ensureDemoCustomers(db) {
  const created = [];
  for (let index = 0; index < customerCount; index += 1) {
    const details = demoCustomer(index);
    let user = db.users.find((entry) => entry.email === details.email);
    if (!user) {
      user = {
        id: randomUUID(),
        fullName: details.fullName,
        email: details.email,
        phone: details.phone,
        passwordHash: hashPassword(DEMO_PASSWORD),
        role: "customer",
        preference: "all-heritage",
        provider: "password",
        createdAt: new Date(now.getTime() - randomInt(1, 365) * DAY_MS).toISOString(),
      };
      db.users.push(user);
      created.push(user);
    }
  }
  return created;
}

async function readDatabase() {
  if (usePostgres) {
    const { rows } = await getPool().query(
      "SELECT data FROM mesob_house_db WHERE id = 1",
    );
    if (!rows[0]) {
      throw new Error(
        "No Postgres database row found. Start the app once with DATABASE_URL set so it creates and seeds mesob_house_db, then rerun the seed.",
      );
    }
    return rows[0].data;
  }

  return fs
    .readFile(dbFile, "utf8")
    .then((raw) => JSON.parse(raw))
    .catch((error) => {
      if (error.code === "ENOENT") {
        throw new Error(`No local database at ${dbFile}. Run the app once to seed it first.`);
      }
      throw error;
    });
}

async function writeDatabase(db) {
  if (!usePostgres) {
    await fs.mkdir(dataDir, { recursive: true });
    const tempFile = `${dbFile}.${process.pid}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tempFile, dbFile);
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      "SELECT id FROM mesob_house_db WHERE id = 1 FOR UPDATE",
    );
    if (!locked.rowCount) {
      throw new Error(
        "No Postgres database row found. Start the app once with DATABASE_URL set, then rerun the seed.",
      );
    }
    await client.query(
      "UPDATE mesob_house_db SET data = $1::jsonb, updated_at = now() WHERE id = 1",
      [JSON.stringify(db)],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
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
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
      at = new Date(Math.min(now.getTime(), at.getTime() + randomInt(5, 28) * 60 * 1000));
    }
    const byCustomer = step === "received" || step === "cancelled";
    history.push({
      status: step,
      at: at.toISOString(),
      by: byCustomer ? customer.id : staff.id,
      byName: byCustomer ? customer.fullName : staff.fullName,
    });
  }

  return {
    id: `MH-${randomUUID().slice(0, 8).toUpperCase()}`,
    userId: customer.id,
    customer: {
      name: customer.fullName,
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
      name: customer.fullName,
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

async function main() {
  console.log(`Target: ${usePostgres ? "Postgres (DATABASE_URL)" : dbFile}`);
  const db = await readDatabase();

  if (!Array.isArray(db.users) || !Array.isArray(db.sessions) || !Array.isArray(db.orders)) {
    throw new Error("The local database is missing one of its tables.");
  }

  if (clear) {
    const removedOrders = db.orders.length;
    const beforeUsers = db.users.length;
    db.orders = [];
    db.users = db.users.filter((user) => !String(user.email).endsWith(DEMO_EMAIL_SUFFIX));
    const removedUsers = beforeUsers - db.users.length;
    if (!dryRun) await writeDatabase(db);
    console.log(
      `${dryRun ? "Would clear" : "Cleared"} ${removedOrders} orders and ${removedUsers} demo customers.`,
    );
    return;
  }

  const createdCustomers = ensureDemoCustomers(db);
  const demoCustomers = db.users.filter((user) => String(user.email).endsWith(DEMO_EMAIL_SUFFIX));
  const otherCustomers = db.users.filter(
    (user) => user.role === "customer" && !String(user.email).endsWith(DEMO_EMAIL_SUFFIX),
  );
  const customerPool = [...demoCustomers, ...otherCustomers];

  if (customerPool.length === 0) {
    throw new Error("No customer account found. Seed the app first or pass --customers 1.");
  }

  const admin = db.users.find((user) => user.role === "admin") ?? db.users[0];
  const employee = db.users.find((user) => user.role === "employee") ?? admin;
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
  const todayElapsed = Math.max(0, now.getTime() - todayStart.getTime() - 60 * 1000);

  for (let index = 0; index < todayCount; index += 1) {
    const createdAt = new Date(todayStart.getTime() + Math.floor(random() * Math.max(1, todayElapsed)));
    const roll = random();
    const status = roll < 0.62 ? pick(ACTIVE_STATUSES) : roll < 0.88 ? "completed" : "cancelled";
    orders.push(makeOrder({ createdAt, status, customer: pick(customerPool), staff }));
  }

  for (const dayOffset of dayOffsets) {
    const createdAt = addisDate(-dayOffset, randomInt(10, 22), randomInt(0, 59));
    const status = random() < 0.91 ? "completed" : "cancelled";
    orders.push(makeOrder({ createdAt, status, customer: pick(customerPool), staff }));
  }

  if (keepOrders) {
    db.orders.push(...orders);
  } else {
    db.orders = orders;
  }

  const active = orders.filter(
    (order) => !["completed", "cancelled"].includes(order.status),
  ).length;

  if (!dryRun) await writeDatabase(db);

  console.log(`${dryRun ? "Would seed" : "Seeded"} ${orders.length} orders across ${days} days.`);
  console.log(`Orders in database: ${db.orders.length}`);
  console.log(`Today: ${todayCount} orders, ${active} active in the kitchen queue.`);
  console.log(
    `Customers: ${db.users.filter((user) => user.role === "customer").length} total` +
      (createdCustomers.length ? `, ${createdCustomers.length} demo accounts created.` : "."),
  );
  if (demoCustomers.length) {
    console.log(
      `Demo login: ${demoCustomers[0].email} / ${DEMO_PASSWORD} (diner01–diner${String(demoCustomers.length).padStart(2, "0")}).`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!pool) return;
    try {
      await pool.end();
    } catch {
      // The process is already exiting; nothing useful to do here.
    }
  });
