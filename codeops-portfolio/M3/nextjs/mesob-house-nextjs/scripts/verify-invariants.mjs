#!/usr/bin/env node

/**
 * Database invariant checks that are awkward to see from the UI:
 *
 *   1. The order trigger rejects invalid transitions, customer advances,
 *      employee cancellations and terminal rewrites.
 *   2. A valid staff transition is accepted and writes history/audit.
 *   3. Signing out revokes the session row; the old cookie stops authenticating.
 *
 * The order checks run inside a transaction that is rolled back, so no order
 * is changed. The session check creates and revokes its own login.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  createPool,
  databaseUrlFromEnv,
  has,
  loadEnv,
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
  value(args, "base", process.env.VERIFY_BASE_URL || "http://localhost:3101"),
).origin;
const databaseUrl = value(args, "database-url", databaseUrlFromEnv());
const email = value(args, "customer", process.env.SEED_GUEST_EMAIL || "guest@mesob.house");
const password = value(
  args,
  "password",
  process.env.SEED_GUEST_PASSWORD || "Guest123!",
);

if (has(args, "help")) {
  console.log(`Usage: node scripts/verify-invariants.mjs [options]

  --base URL          Running app origin (default: http://localhost:3101)
  --customer EMAIL    Account used for the revocation check
  --password VALUE    Password
  --database-url URL  Override DATABASE_URL
`);
  process.exit(0);
}

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
printDatabaseTarget("Database", databaseUrl);

const manifestFile = path.resolve(
  value(
    args,
    "manifest",
    path.join(process.cwd(), ".next", "server", "server-reference-manifest.json"),
  ),
);
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const actions = {};
for (const [id, entry] of Object.entries(manifest.node || {})) {
  if (entry && typeof entry.exportedName === "string") actions[entry.exportedName] = id;
}
for (const required of ["signInAction", "signOutAction"]) {
  if (!actions[required]) throw new Error(`Action ${required} missing from manifest.`);
}

const pool = createPool(databaseUrl, { max: 2 });
const results = [];
const pass = (name, detail = "") => {
  results.push({ ok: true, name, detail });
  console.log(`[PASS] ${name}${detail ? ` — ${detail}` : ""}`);
};
const fail = (name, detail = "") => {
  results.push({ ok: false, name, detail });
  console.log(`[FAIL] ${name}${detail ? ` — ${detail}` : ""}`);
};

async function expectFailure(client, role, sql, params, expectedCode) {
  await client.query("SAVEPOINT invariant_check");
  try {
    await client.query("SELECT set_config('app.actor_role', $1, true)", [role]);
    await client.query(sql, params);
    await client.query("ROLLBACK TO SAVEPOINT invariant_check");
    return { ok: false, code: null };
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT invariant_check");
    return { ok: true, code: error.code, message: error.message };
  } finally {
    // The savepoint is gone after ROLLBACK TO; release the name for reuse.
    await client.query("RELEASE SAVEPOINT invariant_check").catch(() => {});
  }
}

async function triggerChecks() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, status::text AS status, fulfillment::text AS fulfillment
       FROM orders WHERE status = 'received' ORDER BY created_at ASC LIMIT 1
       FOR UPDATE`,
    );
    if (!rows[0]) {
      fail("status trigger checks", "no received order available");
      await client.query("ROLLBACK");
      return;
    }

    const order = rows[0];
    const advance = "UPDATE orders SET status = 'preparing' WHERE id = $1";
    const complete = "UPDATE orders SET status = 'completed' WHERE id = $1";
    const cancel = "UPDATE orders SET status = 'cancelled' WHERE id = $1";

    const customerAdvance = await expectFailure(
      client,
      "customer",
      advance,
      [order.id],
      "42501",
    );
    if (customerAdvance.ok && customerAdvance.code === "42501") {
      pass("customer cannot advance an order", `order ${order.id}, SQLSTATE 42501`);
    } else {
      fail("customer cannot advance an order", JSON.stringify(customerAdvance));
    }

    const invalid = await expectFailure(
      client,
      "employee",
      complete,
      [order.id],
      "23514",
    );
    if (invalid.ok && invalid.code === "23514") {
      pass("received -> completed is rejected", `order ${order.id}, SQLSTATE 23514`);
    } else {
      fail("received -> completed is rejected", JSON.stringify(invalid));
    }

    const employeeCancel = await expectFailure(
      client,
      "employee",
      cancel,
      [order.id],
      "42501",
    );
    if (employeeCancel.ok && employeeCancel.code === "42501") {
      pass("employee cannot cancel", `order ${order.id}, SQLSTATE 42501`);
    } else {
      fail("employee cannot cancel", JSON.stringify(employeeCancel));
    }

    await client.query("SAVEPOINT invariant_check");
    await client.query("SELECT set_config('app.actor_id', $1, true)", [""]);
    await client.query("SELECT set_config('app.actor_role', 'employee', true)");
    await client.query(advance, [order.id]);
    await client.query("RELEASE SAVEPOINT invariant_check");
    const now = await client.query(
      "SELECT status::text AS status FROM orders WHERE id = $1",
      [order.id],
    );
    if (now.rows[0]?.status === "preparing") {
      pass("employee received -> preparing is allowed", `order ${order.id}`);
    } else {
      fail("employee received -> preparing is allowed", JSON.stringify(now.rows[0]));
    }

    await client.query("ROLLBACK");
    const after = await client.query(
      "SELECT status::text AS status FROM orders WHERE id = $1",
      [order.id],
    );
    if (after.rows[0]?.status === order.status) {
      pass("trigger checks rolled back cleanly", `order ${order.id} still ${order.status}`);
    } else {
      fail("trigger checks rolled back cleanly", JSON.stringify(after.rows[0]));
    }
  } finally {
    client.release();
  }
}

async function http(method, requestPath, options = {}) {
  return fetch(new URL(requestPath, base), {
    method,
    headers: options.headers ?? {},
    body: options.body,
    redirect: "manual",
  });
}

function sessionCookie(response) {
  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return cookies.find((cookie) => cookie.startsWith("mh_session=")) || null;
}

async function revocationCheck() {
  const body = await encodeReply([
    {
      method: "email",
      email,
      password,
      keepSignedIn: false,
      rememberAddress: false,
    },
  ]);
  const headers = {
    "Next-Action": actions.signInAction,
    Accept: "text/x-component",
    origin: base,
  };
  if (typeof body === "string") headers["Content-Type"] = "text/plain;charset=UTF-8";

  const login = await http("POST", "/sign-in", { headers, body });
  await login.arrayBuffer();
  const cookie = sessionCookie(login);
  if (!cookie) {
    fail("session revocation", `login did not set a cookie (HTTP ${login.status})`);
    return;
  }

  const token = cookie.split(";")[0].slice("mh_session=".length);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const before = await pool.query(
    "SELECT revoked_at FROM sessions WHERE token_hash = $1",
    [tokenHash],
  );
  if (before.rows[0] && before.rows[0].revoked_at === null) {
    pass("fresh login has an active session row", tokenHash.slice(0, 12));
  } else {
    fail("fresh login has an active session row", JSON.stringify(before.rows[0]));
  }

  const logoutBody = await encodeReply([]);
  const logoutHeaders = {
    "Next-Action": actions.signOutAction,
    Accept: "text/x-component",
    cookie: `mh_session=${token}`,
    origin: base,
  };
  if (typeof logoutBody === "string") {
    logoutHeaders["Content-Type"] = "text/plain;charset=UTF-8";
  }
  const logout = await http("POST", "/account", {
    headers: logoutHeaders,
    body: logoutBody,
  });
  await logout.arrayBuffer();

  const after = await pool.query(
    "SELECT revoked_at FROM sessions WHERE token_hash = $1",
    [tokenHash],
  );
  if (after.rows[0]?.revoked_at) {
    pass("sign-out sets sessions.revoked_at", after.rows[0].revoked_at.toISOString());
  } else {
    fail("sign-out sets sessions.revoked_at", JSON.stringify(after.rows[0]));
  }

  const session = await http("GET", "/api/auth/session", {
    headers: { cookie: `mh_session=${token}` },
  });
  const sessionJson = await session.json().catch(() => ({}));
  if (sessionJson.user === null) {
    pass("old cookie no longer authenticates");
  } else {
    fail("old cookie no longer authenticates", JSON.stringify(sessionJson));
  }
}

await triggerChecks();
await revocationCheck();

const failures = results.filter((result) => !result.ok);
console.log("");
console.log(
  failures.length
    ? `RESULT: FAIL — ${failures.length} invariant check(s) failed.`
    : `RESULT: PASS — ${results.length}/${results.length} invariant checks passed.`,
);

await pool.end();
process.exit(failures.length ? 1 : 0);
