#!/usr/bin/env node
/**
 * Mesob House — executable security / caching matrix.
 *
 * This intentionally talks to a running HTTP server. It does not import app
 * modules, so it exercises the same proxy, page guards, API guards, Server
 * Actions and cache headers that a browser sees.
 *
 * Typical local staging run:
 *
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:55432/mesob_house npm run build
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:55432/mesob_house PORT=3100 npm start
 *   node scripts/security-matrix.mjs --base http://localhost:3100
 *
 * The pricing check writes one order. It is opt-in:
 *
 *   node scripts/security-matrix.mjs --base http://localhost:3100 --allow-write
 *
 * Credentials are read from the process environment or .env. They are never
 * printed. The Server Action IDs are read from a local production build's
 * .next/server/server-reference-manifest.json (override with --manifest).
 *
 * Exit code: 0 = no failed checks, 1 = at least one failed check, 2 = harness
 * could not start (missing build/credentials/login).
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { encodeReply } = require("next/dist/compiled/react-server-dom-webpack/client.node");

const argv = process.argv.slice(2);
const cli = {
  base: undefined,
  allowWrite: false,
  json: false,
  manifest: undefined,
  timeout: 15000,
  help: false,
};

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (arg === "--base") cli.base = argv[++i];
  else if (arg === "--manifest") cli.manifest = argv[++i];
  else if (arg === "--timeout") cli.timeout = Number(argv[++i] || cli.timeout);
  else if (arg === "--allow-write") cli.allowWrite = true;
  else if (arg === "--json") cli.json = true;
  else if (arg === "--help" || arg === "-h") cli.help = true;
  else {
    console.error(`Unknown argument: ${arg}`);
    process.exit(2);
  }
}

if (cli.help) {
  console.log(`Usage: node scripts/security-matrix.mjs [options]

  --base URL        Running app origin (default: http://localhost:3100)
  --manifest FILE   server-reference-manifest.json (default: .next/server/...)
  --allow-write     Run the server-authoritative-pricing write test
  --json            Print machine-readable results after the human summary
  --timeout MS      Per-request timeout (default: 15000)

Environment overrides:
  SECURITY_BASE_URL
  SECURITY_CUSTOMER_A_EMAIL / SECURITY_CUSTOMER_A_PASSWORD
  SECURITY_CUSTOMER_B_EMAIL / SECURITY_CUSTOMER_B_PASSWORD
  SECURITY_EMPLOYEE_EMAIL / SECURITY_EMPLOYEE_PASSWORD
  SECURITY_ADMIN_EMAIL / SECURITY_ADMIN_PASSWORD

If those are absent, SEED_GUEST_*, SEED_KITCHEN_* and SEED_ADMIN_* are used.
Customer B defaults to diner01@mesob.test / Guest123! (the seed-orders account).
`);
  process.exit(0);
}

const baseUrl = new URL(cli.base || process.env.SECURITY_BASE_URL || "http://localhost:3100");
const base = baseUrl.origin;
const timeoutMs = Number.isFinite(cli.timeout) && cli.timeout > 0 ? cli.timeout : 15000;

const counts = { PASS: 0, FAIL: 0, WARN: 0, SKIP: 0 };
const results = [];
const details = [];

function oneLine(value, max = 260) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function record(level, area, name, detail = "") {
  counts[level] += 1;
  const row = { level, area, name, detail: oneLine(detail) };
  results.push(row);
  const tag = level.padEnd(4);
  console.log(`[${tag}] ${area.padEnd(15)} ${name}${detail ? ` — ${oneLine(detail)}` : ""}`);
}

const pass = (area, name, detail) => record("PASS", area, name, detail);
const fail = (area, name, detail) => record("FAIL", area, name, detail);
const warn = (area, name, detail) => record("WARN", area, name, detail);
const skip = (area, name, detail) => record("SKIP", area, name, detail);

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = rawLine.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

parseEnvFile(".env.local");
parseEnvFile(".env");

function manifestPath() {
  if (cli.manifest) return path.resolve(cli.manifest);
  return path.join(process.cwd(), ".next", "server", "server-reference-manifest.json");
}

function loadActions() {
  const file = manifestPath();
  if (!fs.existsSync(file)) {
    throw new Error(
      `Server Action manifest not found at ${file}. Run a production build first or pass --manifest.`,
    );
  }
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const actions = {};
  for (const [id, entry] of Object.entries(manifest.node || {})) {
    if (entry && typeof entry.exportedName === "string") {
      actions[entry.exportedName] = id;
    }
  }
  for (const required of ["signInAction"]) {
    if (!actions[required]) throw new Error(`Action ${required} missing from ${file}`);
  }
  return actions;
}

const actions = loadActions();

const credentials = {
  customerA: {
    label: "customer A",
    email:
      process.env.SECURITY_CUSTOMER_A_EMAIL ||
      process.env.SEED_GUEST_EMAIL ||
      "guest@mesob.house",
    password:
      process.env.SECURITY_CUSTOMER_A_PASSWORD ||
      process.env.SEED_GUEST_PASSWORD ||
      "",
  },
  customerB: {
    label: "customer B",
    email: process.env.SECURITY_CUSTOMER_B_EMAIL || "diner01@mesob.test",
    password: process.env.SECURITY_CUSTOMER_B_PASSWORD || "Guest123!",
  },
  employee: {
    label: "employee",
    email:
      process.env.SECURITY_EMPLOYEE_EMAIL ||
      process.env.SEED_KITCHEN_EMAIL ||
      "kitchen@mesob.house",
    password:
      process.env.SECURITY_EMPLOYEE_PASSWORD ||
      process.env.SEED_KITCHEN_PASSWORD ||
      "",
  },
  admin: {
    label: "admin",
    email:
      process.env.SECURITY_ADMIN_EMAIL ||
      process.env.SEED_ADMIN_EMAIL ||
      "admin@mesob.house",
    password:
      process.env.SECURITY_ADMIN_PASSWORD ||
      process.env.SEED_ADMIN_PASSWORD ||
      "",
  },
};

for (const [key, cred] of Object.entries(credentials)) {
  if (!cred.password) throw new Error(`No password configured for ${key} (${cred.label})`);
}

async function http(method, requestPath, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { ...(options.headers || {}) };
  if (options.cookie) headers.cookie = options.cookie;
  if (options.origin) headers.origin = options.origin;
  try {
    return await fetch(new URL(requestPath, base), {
      method,
      headers,
      body: options.body,
      redirect: options.redirect ?? "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function setCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get("set-cookie");
  return raw ? [raw] : [];
}

function sessionCookie(response) {
  return setCookies(response).find((value) => value.startsWith("mh_session=")) || null;
}

function tokenFromSetCookie(setCookie) {
  return setCookie.split(";")[0].slice("mh_session=".length);
}

async function login(cred, remember = false) {
  const body = await encodeReply([
    {
      method: "email",
      email: cred.email,
      password: cred.password,
      keepSignedIn: remember,
      rememberAddress: false,
    },
  ]);
  const headers = {
    "Next-Action": actions.signInAction,
    Accept: "text/x-component",
  };
  if (typeof body === "string") headers["Content-Type"] = "text/plain;charset=UTF-8";

  const response = await http("POST", "/sign-in", { headers, body });
  await response.arrayBuffer();
  const setCookie = sessionCookie(response);
  if (!setCookie) {
    throw new Error(
      `${cred.label} login did not set mh_session (HTTP ${response.status}); check the credentials and the build's action ID.`,
    );
  }
  return {
    label: cred.label,
    cookie: `mh_session=${tokenFromSetCookie(setCookie)}`,
    setCookie,
    token: tokenFromSetCookie(setCookie),
    status: response.status,
  };
}

async function readJson(response) {
  const text = await response.text();
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

function locationPath(response) {
  const location = response.headers.get("location") || "";
  if (!location) return null;
  try {
    return new URL(location, base);
  } catch {
    return null;
  }
}

function redirectMatches(response, expected) {
  const url = locationPath(response);
  if (!url) return { ok: false, reason: "missing Location" };
  if (expected.pathname && url.pathname !== expected.pathname) {
    return { ok: false, reason: `Location path ${url.pathname}, expected ${expected.pathname}` };
  }
  if (expected.signInNext !== undefined) {
    const next = url.searchParams.get("next");
    if (url.pathname !== "/sign-in" || next !== expected.signInNext) {
      return {
        ok: false,
        reason: `Location ${url.pathname}?next=${next}, expected /sign-in?next=${expected.signInNext}`,
      };
    }
  }
  return { ok: true, reason: url.pathname + url.search };
}

function statusMatches(response, expected) {
  const accepted = Array.isArray(expected.status) ? expected.status : [expected.status];
  return accepted.includes(response.status);
}

function expectedDescription(expected) {
  const status = Array.isArray(expected.status) ? expected.status.join("/") : expected.status;
  if (expected.signInNext !== undefined) return `${status} /sign-in?next=${expected.signInNext}`;
  if (expected.pathname) return `${status} ${expected.pathname}`;
  return String(status);
}

async function pageCheck(role, roleCookie, pathName, expected, extra = {}) {
  const response = await http("GET", pathName, { cookie: roleCookie });
  const statusOk = statusMatches(response, expected);
  const redirectOk = expected.pathname || expected.signInNext
    ? redirectMatches(response, expected)
    : { ok: true, reason: "" };
  const actual = `${response.status}${response.headers.get("location") ? ` -> ${response.headers.get("location")}` : ""}`;

  let body = "";
  if (extra.inspectBody || !statusOk) body = await response.text();
  else await response.body?.cancel();

  const missing = [];
  for (const needle of extra.contains || []) {
    if (!body.includes(needle)) missing.push(needle);
  }
  const leaked = [];
  for (const needle of extra.notContains || []) {
    if (needle && body.includes(needle)) leaked.push(needle);
  }

  const problems = [];
  if (!statusOk) problems.push(`expected ${expectedDescription(expected)}, got ${actual}`);
  if (statusOk && !redirectOk.ok) problems.push(redirectOk.reason);
  if (missing.length) problems.push(`missing expected content: ${missing.join(", ")}`);
  if (leaked.length) problems.push(`LEAKED protected content: ${leaked.join(", ")}`);

  if (problems.length) {
    const soft404 =
      expected.status === 404 &&
      response.status === 200 &&
      /not.?found|404/i.test(body) &&
      !leaked.length;
    fail(
      "Page matrix",
      `${pathName} as ${role}`,
      `${problems.join("; ")}${soft404 ? " (soft 404 UI, no protected data found)" : ""}`,
    );
  } else {
    pass("Page matrix", `${pathName} as ${role}`, actual);
  }
  return { response, body };
}

async function apiCheck(role, roleCookie, pathName, expectedSpec, extra = {}) {
  const expected = typeof expectedSpec === "number" ? { status: expectedSpec } : expectedSpec;
  const response = await http("GET", pathName, { cookie: roleCookie });
  const statusOk = statusMatches(response, expected);
  let text = "";
  if (extra.readBody || !statusOk) text = await response.text();
  else await response.body?.cancel();

  const problems = [];
  if (!statusOk) {
    problems.push(`expected ${expectedDescription(expected)}, got ${response.status}`);
  }
  for (const needle of extra.contains || []) {
    if (!text.includes(needle)) problems.push(`missing ${needle}`);
  }
  for (const needle of extra.notContains || []) {
    if (needle && text.includes(needle)) problems.push(`LEAKED ${needle}`);
  }
  if (problems.length) {
    fail("API matrix", `${pathName} as ${role}`, problems.join("; "));
  } else {
    pass("API matrix", `${pathName} as ${role}`, String(response.status));
  }
  return { response, text };
}

async function streamCheck(role, roleCookie, pathName, expectedSpec) {
  const expected = typeof expectedSpec === "number" ? { status: expectedSpec } : expectedSpec;
  const response = await http("GET", pathName, { cookie: roleCookie });
  const statusOk = statusMatches(response, expected);
  if (!statusOk) {
    const text = await response.text();
    fail("API matrix", `${pathName} as ${role}`, `expected ${expectedDescription(expected)}, got ${response.status}: ${oneLine(text, 100)}`);
  } else {
    pass("API matrix", `${pathName} as ${role}`, String(response.status));
    try {
      await response.body?.cancel();
    } catch {
      // The SSE response can already be closed for terminal orders.
    }
  }
  return response;
}

async function main() {
  console.log(`Mesob House security matrix`);
  console.log(`Base: ${base}`);
  console.log(`Manifest: ${manifestPath()}`);
  console.log(`Pricing write test: ${cli.allowWrite ? "ENABLED" : "skipped (pass --allow-write)"}`);
  console.log("");

  const sessions = {
    guest: { label: "guest", cookie: null },
    customerA: await login(credentials.customerA),
    customerB: await login(credentials.customerB),
    employee: await login(credentials.employee),
    admin: await login(credentials.admin),
  };

  // ---------------------------------------------------------------- identity
  const identities = {};
  for (const [roleKey, session] of Object.entries(sessions)) {
    const response = await http("GET", "/api/auth/session", { cookie: session.cookie });
    const { json, text } = await readJson(response);
    if (response.status !== 200 || !json) {
      fail("Identity", `/api/auth/session as ${session.label}`, `HTTP ${response.status}: ${oneLine(text, 100)}`);
      continue;
    }
    identities[roleKey] = json.user;
    if (roleKey === "guest") {
      if (json.user === null) pass("Identity", "guest session is null");
      else fail("Identity", "guest session is null", `got ${oneLine(JSON.stringify(json.user), 100)}`);
    } else {
      const expectedRole = roleKey === "customerA" || roleKey === "customerB" ? "customer" : roleKey;
      if (json.user?.role === expectedRole) {
        pass("Identity", `${session.label} session role`, expectedRole);
      } else {
        fail("Identity", `${session.label} session role`, `expected ${expectedRole}, got ${json.user?.role}`);
      }
    }
    if (text.includes("passwordHash") || text.includes("password_hash")) {
      fail("Identity", `${session.label} session payload hides password hash`);
    }
  }

  // --------------------------------------------------------------- cookie flags
  const normalCookie = sessions.customerA.setCookie;
  const normalFlags = {
    HttpOnly: /;\s*HttpOnly(?:;|$)/i.test(normalCookie),
    Secure: /;\s*Secure(?:;|$)/i.test(normalCookie),
    SameSiteLax: /;\s*SameSite=Lax(?:;|$)/i.test(normalCookie),
    PathRoot: /;\s*Path=\/(?:;|$)/i.test(normalCookie),
  };
  for (const [flag, ok] of Object.entries(normalFlags)) {
    if (ok) pass("Cookie flags", `session cookie has ${flag}`);
    else fail("Cookie flags", `session cookie has ${flag}`, normalCookie);
  }
  if (sessions.customerA.token.length >= 32) {
    pass("Cookie flags", "session token is opaque enough", `${sessions.customerA.token.length} chars`);
  } else {
    fail("Cookie flags", "session token is opaque enough", `${sessions.customerA.token.length} chars`);
  }
  if (
    sessions.customerA.token.includes(identities.customerA?.id || "__never__") ||
    sessions.customerA.token.toLowerCase().includes(credentials.customerA.email.toLowerCase())
  ) {
    fail("Cookie flags", "session token contains no user identifier");
  } else {
    pass("Cookie flags", "session token contains no user identifier");
  }

  const remembered = await login(credentials.customerA, true);
  const rememberCookie = remembered.setCookie;
  if (/;\s*Max-Age=\d+/i.test(rememberCookie)) {
    pass("Cookie flags", "remembered session has Max-Age", rememberCookie.match(/Max-Age=(\d+)/i)?.[1]);
  } else {
    fail("Cookie flags", "remembered session has Max-Age", rememberCookie);
  }
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) {
    if (new RegExp(`;\\s*${flag.replace("/", "\\/")}(?:;|$)`, "i").test(rememberCookie)) {
      pass("Cookie flags", `remembered cookie has ${flag}`);
    } else {
      fail("Cookie flags", `remembered cookie has ${flag}`, rememberCookie);
    }
  }

  const forged = await http("GET", "/api/auth/session", {
    cookie: "mh_session=this-is-not-a-real-session-token",
  });
  const forgedJson = await readJson(forged);
  if (forged.status === 200 && forgedJson.json?.user === null) {
    pass("Cookie flags", "forged session token does not authenticate");
  } else {
    fail("Cookie flags", "forged session token does not authenticate", `HTTP ${forged.status}: ${oneLine(forgedJson.text, 100)}`);
  }

  // --------------------------------------------------------------- order lists
  const orderResponses = {};
  for (const key of ["customerA", "customerB"]) {
    const response = await http("GET", "/api/orders", { cookie: sessions[key].cookie });
    const parsed = await readJson(response);
    if (response.status !== 200 || !Array.isArray(parsed.json?.data)) {
      throw new Error(`Could not read ${sessions[key].label} orders: HTTP ${response.status} ${oneLine(parsed.text, 120)}`);
    }
    orderResponses[key] = parsed.json.data;
  }
  const aOrders = orderResponses.customerA;
  const bOrders = orderResponses.customerB;
  if (!aOrders.length) throw new Error("Customer A has no orders; seed the staging database.");
  if (!bOrders.length) throw new Error("Customer B has no orders; seed the staging database.");

  const aIds = new Set(aOrders.map((order) => order.id));
  const bIds = new Set(bOrders.map((order) => order.id));
  const overlap = [...aIds].filter((id) => bIds.has(id));
  if (overlap.length === 0) {
    pass("Ownership", "customer A and B order sets are disjoint", `${aOrders.length} / ${bOrders.length}`);
  } else {
    fail("Ownership", "customer A and B order sets are disjoint", `${overlap.length} shared ids`);
  }

  const aOrder = aOrders.find((order) => order.status !== "received") || aOrders[0];
  const bOrder = bOrders.find((order) => order.status === "ready") || bOrders[0];
  const bNonCancellable = bOrders.find((order) => order.status !== "received") || bOrder;
  const aNonCancellable = aOrders.find((order) => order.status !== "received") || aOrder;

  const aProtected = [
    identities.customerA?.fullName,
    identities.customerA?.email,
    identities.customerA?.phone,
  ].filter(Boolean);
  const bProtected = [
    identities.customerB?.fullName,
    identities.customerB?.email,
    identities.customerB?.phone,
  ].filter(Boolean);

  // --------------------------------------------------------------- page matrix
  const publicExpect = {
    guest: { status: 200 },
    customerA: { status: 200 },
    customerB: { status: 200 },
    employee: { status: [307, 308], pathname: "/kitchen" },
    admin: { status: [307, 308], pathname: "/admin" },
  };
  const accountExpect = {
    guest: { status: [307, 308], signInNext: "/account" },
    customerA: { status: 200 },
    customerB: { status: 200 },
    employee: { status: 200 },
    admin: { status: 200 },
  };
  const customerOnlyExpect = (nextPath) => ({
    guest: { status: [307, 308], signInNext: nextPath },
    customerA: { status: 200 },
    customerB: { status: 200 },
    employee: { status: [307, 308], pathname: "/kitchen" },
    admin: { status: [307, 308], pathname: "/admin" },
  });
  const kitchenExpect = {
    guest: { status: [307, 308], signInNext: "/kitchen" },
    customerA: { status: [307, 308], pathname: "/" },
    customerB: { status: [307, 308], pathname: "/" },
    employee: { status: 200 },
    admin: { status: 200 },
  };
  const adminExpect = {
    guest: { status: [307, 308], signInNext: "/admin" },
    customerA: { status: [307, 308], pathname: "/" },
    customerB: { status: [307, 308], pathname: "/" },
    employee: { status: [307, 308], pathname: "/kitchen" },
    admin: { status: 200 },
  };

  const pageCases = [
    { path: "/", expect: publicExpect },
    { path: "/menu", expect: publicExpect },
    { path: "/cart", expect: publicExpect },
    { path: "/terms", expect: publicExpect },
    { path: "/privacy", expect: publicExpect },
    { path: "/dish/doro-wat", expect: publicExpect },
    { path: "/account", expect: accountExpect },
    {
      path: "/orders",
      expect: customerOnlyExpect("/orders"),
      customerAExtra: { inspectBody: true, contains: [aOrders[0].id], notContains: [bOrders[0].id] },
      customerBExtra: { inspectBody: true, contains: [bOrders[0].id], notContains: [aOrders[0].id] },
    },
    { path: "/checkout", expect: customerOnlyExpect("/checkout") },
    {
      path: `/orders/${bOrder.id}`,
      expect: {
        guest: { status: [307, 308], signInNext: `/orders/${bOrder.id}` },
        customerA: { status: 404 },
        customerB: { status: 200 },
        employee: { status: [307, 308], pathname: "/kitchen" },
        admin: { status: [307, 308], pathname: "/admin" },
      },
      customerAExtra: { inspectBody: true, notContains: bProtected },
      customerBExtra: { inspectBody: true, contains: [bOrder.id, identities.customerB?.fullName].filter(Boolean) },
    },
    {
      path: `/orders/${aOrder.id}`,
      expect: {
        guest: { status: [307, 308], signInNext: `/orders/${aOrder.id}` },
        customerA: { status: 200 },
        customerB: { status: 404 },
        employee: { status: [307, 308], pathname: "/kitchen" },
        admin: { status: [307, 308], pathname: "/admin" },
      },
      customerAExtra: { inspectBody: true, contains: [aOrder.id, identities.customerA?.fullName].filter(Boolean) },
      customerBExtra: { inspectBody: true, notContains: aProtected },
    },
    { path: "/kitchen", expect: kitchenExpect },
    { path: "/admin", expect: adminExpect },
  ];

  for (const pageCase of pageCases) {
    for (const roleKey of Object.keys(sessions)) {
      const extra =
        roleKey === "customerA"
          ? pageCase.customerAExtra || {}
          : roleKey === "customerB"
            ? pageCase.customerBExtra || {}
            : {};
      await pageCheck(roleKey, sessions[roleKey].cookie, pageCase.path, pageCase.expect[roleKey], extra);
    }
  }

  // ---------------------------------------------------------------- API matrix
  const apiCases = [
    { path: "/api/health", expect: { guest: 200, customerA: 200, customerB: 200, employee: 200, admin: 200 } },
    { path: "/api/menu", expect: { guest: 200, customerA: 200, customerB: 200, employee: 403, admin: 403 } },
    { path: "/api/menu/search?q=doro", expect: { guest: 200, customerA: 200, customerB: 200, employee: 403, admin: 403 } },
    { path: "/api/menu/specials", expect: { guest: 200, customerA: 200, customerB: 200, employee: 403, admin: 403 } },
    { path: "/api/orders", expect: { guest: 401, customerA: 200, customerB: 200, employee: 403, admin: 403 } },
    {
      path: `/api/orders/${aOrder.id}`,
      expect: { guest: 401, customerA: 200, customerB: 404, employee: 403, admin: 403 },
      customerAExtra: { readBody: true, contains: [aOrder.id], notContains: bProtected },
      customerBExtra: { readBody: true, notContains: aProtected },
    },
    {
      path: `/api/orders/${bOrder.id}`,
      expect: { guest: 401, customerA: 404, customerB: 200, employee: 403, admin: 403 },
      customerAExtra: { readBody: true, notContains: bProtected },
      customerBExtra: { readBody: true, contains: [bOrder.id], notContains: aProtected },
    },
    { path: "/api/kitchen/orders", expect: { guest: 401, customerA: 403, customerB: 403, employee: 200, admin: 200 } },
    { path: "/api/admin/orders", expect: { guest: 401, customerA: 403, customerB: 403, employee: 403, admin: 200 } },
    { path: "/api/admin/stats", expect: { guest: 401, customerA: 403, customerB: 403, employee: 403, admin: 200 } },
    { path: "/api/admin/users", expect: { guest: 401, customerA: 403, customerB: 403, employee: 403, admin: 200 } },
    { path: "/api/admin/menu", expect: { guest: 401, customerA: 403, customerB: 403, employee: 403, admin: 200 } },
    { path: "/api/admin/reviews", expect: { guest: 401, customerA: 403, customerB: 403, employee: 403, admin: 200 } },
  ];

  for (const apiCase of apiCases) {
    for (const roleKey of Object.keys(sessions)) {
      const extra =
        roleKey === "customerA"
          ? apiCase.customerAExtra || {}
          : roleKey === "customerB"
            ? apiCase.customerBExtra || {}
            : {};
      await apiCheck(roleKey, sessions[roleKey].cookie, apiCase.path, apiCase.expect[roleKey], extra);
    }
  }

  // SSE is separate because a successful response is a long-lived stream.
  for (const [roleKey, session] of Object.entries(sessions)) {
    let expected = 403;
    if (roleKey === "guest") expected = 401;
    if (roleKey === "customerA") expected = 200;
    if (roleKey === "customerB") expected = 404;
    await streamCheck(roleKey, session.cookie, `/api/orders/${aOrder.id}/stream`, expected);
  }

  const adminUsersResponse = await http("GET", "/api/admin/users", {
    cookie: sessions.admin.cookie,
  });
  const adminUsersText = await adminUsersResponse.text();
  if (
    adminUsersResponse.status === 200 &&
    !adminUsersText.includes("passwordHash") &&
    !adminUsersText.includes("password_hash")
  ) {
    pass("API matrix", "/api/admin/users does not expose password hashes");
  } else {
    fail(
      "API matrix",
      "/api/admin/users does not expose password hashes",
      `HTTP ${adminUsersResponse.status}; hash field present=${/passwordHash|password_hash/.test(adminUsersText)}`,
    );
  }

  // ------------------------------------------------------------ action guards
  if (!actions.submitOrder) {
    skip("Action guards", "submitOrder is refused before the action", "action missing from manifest");
  } else {
    const guardPayload = {
      fulfillment: "pickup",
      contact: { name: "Guard Test", phone: "911000099", email: "guard@example.com" },
      delivery: { subCity: "Bole", street: "", landmark: "", timing: "immediate" },
      method: "cash",
      couponCode: "",
      note: `security-matrix guard ${Date.now()}`,
      items: [{ id: "doro-wat", name: "Doro Wat", price: 1, quantity: 1 }],
    };
    const guardBody = await encodeReply([guardPayload]);
    const guardExpectations = {
      guest: { status: [307, 308], signInNext: "/checkout" },
      employee: { status: [307, 308], pathname: "/kitchen" },
      admin: { status: [307, 308], pathname: "/admin" },
    };
    for (const [roleKey, expected] of Object.entries(guardExpectations)) {
      const response = await http("POST", "/checkout", {
        cookie: sessions[roleKey].cookie,
        headers: {
          "Next-Action": actions.submitOrder,
          Accept: "text/x-component",
          "Content-Type": "text/plain;charset=UTF-8",
          origin: base,
        },
        body: guardBody,
      });
      await response.arrayBuffer();
      const redirectOk = redirectMatches(response, expected);
      if (statusMatches(response, expected) && redirectOk.ok) {
        pass("Action guards", `submitOrder cannot be reached as ${sessions[roleKey].label}`, `${response.status} -> ${response.headers.get("location") || ""}`);
      } else {
        fail(
          "Action guards",
          `submitOrder cannot be reached as ${sessions[roleKey].label}`,
          `expected ${expectedDescription(expected)}, got ${response.status} -> ${response.headers.get("location") || ""}`,
        );
      }
    }
  }

  // ------------------------------------------------------------- ownership API
  const bReadByA = await http("GET", `/api/orders/${bOrder.id}`, { cookie: sessions.customerA.cookie });
  const bReadByAText = await bReadByA.text();
  if (bReadByA.status === 404 && !bProtected.some((needle) => bReadByAText.includes(needle))) {
    pass("IDOR", "customer A cannot read B order via API", "404, no B data");
  } else {
    fail("IDOR", "customer A cannot read B order via API", `HTTP ${bReadByA.status}; data leak=${bProtected.some((needle) => bReadByAText.includes(needle))}`);
  }

  const aReadByB = await http("GET", `/api/orders/${aOrder.id}`, { cookie: sessions.customerB.cookie });
  const aReadByBText = await aReadByB.text();
  if (aReadByB.status === 404 && !aProtected.some((needle) => aReadByBText.includes(needle))) {
    pass("IDOR", "customer B cannot read A order via API", "404, no A data");
  } else {
    fail("IDOR", "customer B cannot read A order via API", `HTTP ${aReadByB.status}; data leak=${aProtected.some((needle) => aReadByBText.includes(needle))}`);
  }

  const bCancelByA = await http("POST", `/api/orders/${bNonCancellable.id}/cancel`, {
    cookie: sessions.customerA.cookie,
    origin: base,
  });
  const bCancelByAText = await bCancelByA.text();
  if (bCancelByA.status === 404) {
    pass("IDOR", "customer A cannot cancel B order", "404");
  } else {
    fail("IDOR", "customer A cannot cancel B order", `HTTP ${bCancelByA.status}: ${oneLine(bCancelByAText, 100)}`);
  }

  const aCancelByB = await http("POST", `/api/orders/${aNonCancellable.id}/cancel`, {
    cookie: sessions.customerB.cookie,
    origin: base,
  });
  const aCancelByBText = await aCancelByB.text();
  if (aCancelByB.status === 404) {
    pass("IDOR", "customer B cannot cancel A order", "404");
  } else {
    fail("IDOR", "customer B cannot cancel A order", `HTTP ${aCancelByB.status}: ${oneLine(aCancelByBText, 100)}`);
  }

  // ---------------------------------------------------------------- CSRF checks
  const evil = "https://evil.example";
  const dummyOrder = "MH-NOT-A-REAL-ORDER";
  const dummyUser = "00000000-0000-0000-0000-000000000000";

  async function csrfCheck(name, method, requestPath, session, body, headers = {}, origin = evil) {
    const response = await http(method, requestPath, {
      cookie: session.cookie,
      origin,
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    if (response.status === 403) {
      pass("CSRF", name, "403");
    } else {
      fail("CSRF", name, `expected 403, got ${response.status}: ${oneLine(text, 100)}`);
    }
  }

  await csrfCheck("cross-origin customer cancel is refused", "POST", `/api/orders/${dummyOrder}/cancel`, sessions.customerA);
  await csrfCheck("cross-origin owner cancel is refused", "POST", `/api/orders/${dummyOrder}/cancel`, sessions.customerB);
  await csrfCheck("cross-origin kitchen PATCH is refused", "PATCH", `/api/kitchen/orders/${dummyOrder}`, sessions.employee, { status: "preparing" });
  await csrfCheck("cross-origin admin order PATCH is refused", "PATCH", `/api/admin/orders/${dummyOrder}`, sessions.admin, { status: "preparing" });
  await csrfCheck("cross-origin admin user PATCH is refused", "PATCH", `/api/admin/users/${dummyUser}`, sessions.admin, { role: "customer" });
  await csrfCheck("cross-origin admin menu POST is refused", "POST", "/api/admin/menu", sessions.admin, { id: "csrf-test", name: "CSRF" });
  await csrfCheck("cross-origin review moderation is refused", "PATCH", `/api/admin/reviews/${dummyUser}`, sessions.admin, { status: "approved" });
  await csrfCheck("Origin: null is refused", "POST", `/api/orders/${dummyOrder}/cancel`, sessions.customerA, undefined, {}, "null");
  await csrfCheck("origin lookalike is refused", "POST", `/api/orders/${dummyOrder}/cancel`, sessions.customerA, undefined, {}, `${base}.evil.example`);

  const sameOriginCancel = await http("POST", `/api/orders/${dummyOrder}/cancel`, {
    cookie: sessions.customerA.cookie,
    origin: base,
  });
  const sameOriginCancelText = await sameOriginCancel.text();
  if (sameOriginCancel.status === 404) {
    pass("CSRF", "same-origin request passes the origin check", "404 for dummy order");
  } else {
    fail("CSRF", "same-origin request passes the origin check", `HTTP ${sameOriginCancel.status}: ${oneLine(sameOriginCancelText, 100)}`);
  }

  const noOriginCancel = await http("POST", `/api/orders/${dummyOrder}/cancel`, {
    cookie: sessions.customerA.cookie,
  });
  const noOriginText = await noOriginCancel.text();
  if (noOriginCancel.status === 404) {
    warn("CSRF", "request without Origin is accepted", "intentional for curl/server-to-server; not a browser CSRF path");
  } else {
    warn("CSRF", "request without Origin is accepted", `HTTP ${noOriginCancel.status}: ${oneLine(noOriginText, 100)}`);
  }

  const spoofedHost = await http("POST", `/api/orders/${dummyOrder}/cancel`, {
    cookie: sessions.customerA.cookie,
    origin: evil,
    headers: { "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" },
  });
  const spoofedHostText = await spoofedHost.text();
  if (spoofedHost.status === 403) {
    pass("CSRF", "forged forwarded-host headers do not bypass origin check", "403");
  } else {
    warn(
      "CSRF",
      "forged forwarded-host headers can satisfy the origin check",
      `${spoofedHost.status}; this is not directly settable by a simple browser form, but a proxy that forwards client x-forwarded-host would make it reachable`,
    );
  }

  if (process.env.APP_ORIGIN && new URL(process.env.APP_ORIGIN).origin !== base) {
    const appOrigin = new URL(process.env.APP_ORIGIN).origin;
    const appOriginCancel = await http("POST", `/api/orders/${dummyOrder}/cancel`, {
      cookie: sessions.customerA.cookie,
      origin: appOrigin,
    });
    const appOriginText = await appOriginCancel.text();
    if (appOriginCancel.status === 403) {
      warn("CSRF", "APP_ORIGIN is not accepted", `${appOrigin} was refused`);
    } else {
      warn(
        "CSRF",
        "APP_ORIGIN allowlists a different origin",
        `${appOrigin} is accepted by ${base}; keep APP_ORIGIN aligned with the served origin (${oneLine(appOriginText, 80)})`,
      );
    }
  }

  // ------------------------------------------------------------ redirect fuzzing
  const redirectPayloads = [
    { raw: "/orders", expected: "/orders", label: "valid internal path" },
    { raw: "https://example.com/steal", expected: "/", label: "absolute URL" },
    { raw: "//example.com/steal", expected: "/", label: "protocol-relative URL" },
    { raw: "///example.com/steal", expected: "/", label: "triple-slash URL" },
    { raw: "/%5Cexample.com/steal", expected: "/", label: "encoded backslash" },
    { raw: "/sign-in?next=/orders", expected: "/", label: "sign-in recursion" },
    { raw: "/signin?next=/orders", expected: "/", label: "signin recursion" },
    { raw: "/register", expected: "/", label: "register page" },
    { raw: "javascript:alert(1)", expected: "/", label: "javascript scheme" },
    { raw: "http://localhost:3100.evil.example/steal", expected: "/", label: "host suffix" },
    { raw: "/..//example.com/steal", expected: "same-origin", label: "dot-segment path" },
    { raw: "/%09/example.com/steal", expected: "/", label: "tab control character" },
    { raw: "/%0A/example.com/steal", expected: "/", label: "newline control character" },
    { raw: "/%0D/example.com/steal", expected: "/", label: "carriage-return control character" },
    { raw: "/%09//example.com/steal", expected: "/", label: "tab plus protocol-relative" },
  ];

  for (const payload of redirectPayloads) {
    const response = await http("GET", `/sign-in?next=${payload.raw}`, {
      cookie: sessions.customerA.cookie,
    });
    const body = await response.text();
    const meta = body.match(/__next-page-redirect" http-equiv="refresh" content="1;url=([^"]*)"/)?.[1];
    const digest = body.match(/NEXT_REDIRECT;replace;([^;]*);307/)?.[1];
    let target = meta || response.headers.get("location") || "";
    if (!target && digest) {
      target = digest.replace(/\\\\/g, "\\");
    }
    if (!target) {
      fail("Redirects", payload.label, `no redirect target (HTTP ${response.status})`);
      continue;
    }
    // Browsers ignore/remove ASCII tab, LF and CR while parsing URLs.
    const browserTarget = target.replace(/[\t\n\r]/g, "");
    let resolved;
    try {
      resolved = new URL(browserTarget, base);
    } catch {
      fail("Redirects", payload.label, `unparseable redirect target ${JSON.stringify(target)}`);
      continue;
    }
    const external = resolved.origin !== new URL(base).origin;
    if (external) {
      fail(
        "Redirects",
        payload.label,
        `OPEN REDIRECT: ${JSON.stringify(target)} resolves to ${resolved.href}`,
      );
    } else if (payload.expected === "same-origin") {
      if (resolved.pathname === "/") {
        fail("Redirects", payload.label, `unexpectedly sanitized to / (${JSON.stringify(target)})`);
      } else {
        pass("Redirects", payload.label, `${JSON.stringify(target)} stays on ${resolved.origin}`);
      }
    } else if (resolved.pathname !== payload.expected) {
      fail(
        "Redirects",
        payload.label,
        `expected ${payload.expected}, got ${resolved.pathname} (${JSON.stringify(target)})`,
      );
    } else {
      pass("Redirects", payload.label, `${JSON.stringify(target)}`);
    }
  }

  // ----------------------------------------------------------------- caching
  const cacheChecks = [
    { path: "/", cookie: null, kind: "public-page", maxAge: 300 },
    { path: "/menu", cookie: null, kind: "public-page", maxAge: 300 },
    // The dish page carries personalised review state, so it is deliberately
    // dynamic even for guests and must never be served from a shared cache.
    { path: "/dish/doro-wat", cookie: null, kind: "private-page" },
    { path: "/api/menu", cookie: null, kind: "public-api", maxAge: 300 },
    { path: "/api/menu/specials", cookie: null, kind: "public-api", maxAge: 300 },
    { path: "/api/menu/search?q=doro", cookie: null, kind: "public-api", maxAge: 60 },
    { path: "/orders", cookie: sessions.customerA.cookie, kind: "private-page" },
    { path: `/orders/${aOrder.id}`, cookie: sessions.customerA.cookie, kind: "private-page" },
    { path: "/checkout", cookie: sessions.customerA.cookie, kind: "private-page" },
    { path: "/account", cookie: sessions.customerA.cookie, kind: "private-page" },
    { path: "/kitchen", cookie: sessions.employee.cookie, kind: "private-page" },
    { path: "/admin", cookie: sessions.admin.cookie, kind: "private-page" },
    { path: "/api/orders", cookie: sessions.customerA.cookie, kind: "private-api" },
    { path: `/api/orders/${aOrder.id}`, cookie: sessions.customerA.cookie, kind: "private-api" },
    { path: "/api/kitchen/orders", cookie: sessions.employee.cookie, kind: "private-api" },
    { path: "/api/admin/stats", cookie: sessions.admin.cookie, kind: "private-api" },
    { path: "/api/admin/orders", cookie: sessions.admin.cookie, kind: "private-api" },
    { path: "/api/admin/users", cookie: sessions.admin.cookie, kind: "private-api" },
    { path: "/api/auth/session", cookie: sessions.customerA.cookie, kind: "private-api" },
  ];

  for (const check of cacheChecks) {
    const response = await http("GET", check.path, { cookie: check.cookie });
    await response.body?.cancel();
    const cacheControl = (response.headers.get("cache-control") || "").toLowerCase();
    const xNextCache = response.headers.get("x-nextjs-cache");
    const xVercelCache = response.headers.get("x-vercel-cache");
    if (check.kind === "public-page") {
      if (cacheControl.includes(`s-maxage=${check.maxAge}`)) {
        pass("Caching", `${check.path} public revalidate`, cacheControl);
      } else {
        fail("Caching", `${check.path} public revalidate`, `expected s-maxage=${check.maxAge}; got ${cacheControl || "(none)"}${xNextCache ? `; x-nextjs-cache=${xNextCache}` : ""}${xVercelCache ? `; x-vercel-cache=${xVercelCache}` : ""}`);
      }
      if (xNextCache || xVercelCache) {
        pass("Caching", `${check.path} has a cache status header`, xNextCache || xVercelCache);
      } else {
        warn("Caching", `${check.path} has no cache status header`, "header may differ by host/CDN");
      }
    } else if (check.kind === "public-api") {
      if (cacheControl.includes("public") && cacheControl.includes(`s-maxage=${check.maxAge}`)) {
        pass("Caching", `${check.path} public API revalidate`, cacheControl);
      } else {
        fail("Caching", `${check.path} public API revalidate`, `expected public + s-maxage=${check.maxAge}; got ${cacheControl || "(none)"}`);
      }
    } else if (check.kind === "private-page") {
      if (cacheControl.includes("private") && cacheControl.includes("no-store")) {
        pass("Caching", `${check.path} private page is not cached`, cacheControl);
      } else {
        fail("Caching", `${check.path} private page is not cached`, `expected private + no-store; got ${cacheControl || "(none)"}`);
      }
      if (xNextCache || xVercelCache) {
        fail("Caching", `${check.path} private page has no CDN cache status`, xNextCache || xVercelCache);
      }
    } else if (check.kind === "private-api") {
      if (cacheControl.includes("no-store")) {
        pass("Caching", `${check.path} private API is no-store`, cacheControl);
      } else {
        fail("Caching", `${check.path} private API is no-store`, `expected no-store; got ${cacheControl || "(none)"}`);
      }
    }
  }

  const sseResponse = await http("GET", `/api/orders/${aOrder.id}/stream`, {
    cookie: sessions.customerA.cookie,
  });
  const sseCache = (sseResponse.headers.get("cache-control") || "").toLowerCase();
  try {
    await sseResponse.body?.cancel();
  } catch {
    // ignore
  }
  if (sseCache.includes("no-cache") && sseCache.includes("no-transform")) {
    pass("Caching", "order SSE is not cached", sseCache);
  } else {
    fail("Caching", "order SSE is not cached", `expected no-cache + no-transform; got ${sseCache || "(none)"}`);
  }

  // cache separation between customers
  const aOrdersPage = await http("GET", "/orders", { cookie: sessions.customerA.cookie });
  const aOrdersBody = await aOrdersPage.text();
  const bOrdersPage = await http("GET", "/orders", { cookie: sessions.customerB.cookie });
  const bOrdersBody = await bOrdersPage.text();
  if (aOrdersBody.includes(bOrders[0].id) || bOrdersBody.includes(aOrders[0].id)) {
    fail("Caching", "customer order pages are not shared between sessions", "one page contained the other customer's order id");
  } else {
    pass("Caching", "customer order pages are not shared between sessions", "no cross-customer order id");
  }

  // --------------------------------------------------------------- revalidate
  const revalidateSecret = process.env.REVALIDATE_SECRET || "";
  if (!revalidateSecret) {
    skip("Revalidate", "revalidate secret is configured", "REVALIDATE_SECRET is not set; cannot test the correct-secret path");
  } else {
    for (const [name, headers, expected] of [
      ["wrong secret is refused", { "x-revalidate-secret": "definitely-wrong" }, 401],
      ["missing secret is refused", {}, 401],
      ["correct secret revalidates menu", { "x-revalidate-secret": revalidateSecret }, 200],
    ]) {
      const response = await http("POST", "/api/revalidate", { headers });
      const text = await response.text();
      if (response.status === expected) {
        pass("Revalidate", name, String(response.status));
      } else {
        fail("Revalidate", name, `expected ${expected}, got ${response.status}: ${oneLine(text, 100)}`);
      }
    }
  }

  // ------------------------------------------------------- pricing (opt-in write)
  if (!cli.allowWrite) {
    skip("Pricing", "server-authoritative pricing", "write test skipped; rerun with --allow-write");
  } else if (!actions.submitOrder) {
    fail("Pricing", "server-authoritative pricing", "submitOrder action missing from manifest");
  } else {
    const menuResponse = await http("GET", "/api/menu");
    const menuJson = await readJson(menuResponse);
    const dishes = menuJson.json?.data || [];
    const dish = dishes.find((item) => String(item.id) === "doro-wat") || dishes[0];
    if (!dish) {
      fail("Pricing", "server-authoritative pricing", "menu returned no dishes");
    } else {
      const note = `security-matrix ${Date.now()}`;
      const payload = {
        fulfillment: "pickup",
        contact: {
          name: "Security Matrix",
          phone: "911000099",
          email: "security-matrix@example.com",
        },
        delivery: { subCity: "Bole", street: "", landmark: "", timing: "immediate" },
        method: "cash",
        couponCode: "",
        note,
        items: [{ id: String(dish.id), name: dish.name, price: 1, quantity: 1 }],
      };
      const body = await encodeReply([payload]);
      const headers = {
        "Next-Action": actions.submitOrder,
        Accept: "text/x-component",
        "Content-Type": "text/plain;charset=UTF-8",
        cookie: sessions.customerA.cookie,
        origin: base,
      };
      const actionResponse = await http("POST", "/checkout", { headers, body });
      await actionResponse.arrayBuffer();

      const listResponse = await http("GET", "/api/orders", { cookie: sessions.customerA.cookie });
      const listJson = await readJson(listResponse);
      const created = (listJson.json?.data || []).find((order) => order.note === note);
      if (!created) {
        fail("Pricing", "server-authoritative pricing", `no order with note ${JSON.stringify(note)} appeared (action HTTP ${actionResponse.status})`);
      } else {
        const item = created.items?.[0];
        const serverPrice = Number(item?.price);
        const menuPrice = Number(dish.price);
        if (Number.isFinite(serverPrice) && serverPrice === menuPrice && serverPrice !== 1) {
          pass("Pricing", "forged price is replaced by menu price", `order ${created.id}: forged 1 -> server ${serverPrice}`);
        } else {
          fail("Pricing", "forged price is replaced by menu price", `order ${created.id}: forged 1 -> ${serverPrice}; menu ${menuPrice}`);
        }
        if (created.userId === identities.customerA?.id) {
          pass("Pricing", "order is bound to the signed-in customer", created.userId);
        } else {
          fail("Pricing", "order is bound to the signed-in customer", `got ${created.userId}`);
        }
        const totals = created.totals || {};
        const subtotal = Number(totals.subtotal);
        const total = Number(totals.total);
        if (subtotal === menuPrice * 1 && total >= subtotal) {
          pass("Pricing", "server totals are consistent", `subtotal ${subtotal}, total ${total}`);
        } else {
          fail("Pricing", "server totals are consistent", `subtotal ${subtotal}, total ${total}, menu ${menuPrice}`);
        }
      }
    }
  }

  // ------------------------------------------------------------------ summary
  console.log("");
  console.log(
    `Summary: ${counts.PASS} pass, ${counts.FAIL} fail, ${counts.WARN} warn, ${counts.SKIP} skip`,
  );
  const failures = results.filter((row) => row.level === "FAIL");
  if (failures.length) {
    console.log("Failures:");
    for (const row of failures) console.log(`  - ${row.area}: ${row.name} — ${row.detail}`);
  }
  if (cli.json) {
    console.log(JSON.stringify({ base, counts, results }, null, 2));
  }
  if (counts.FAIL > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("");
  console.error(`Harness error: ${error.message}`);
  process.exitCode = 2;
});
