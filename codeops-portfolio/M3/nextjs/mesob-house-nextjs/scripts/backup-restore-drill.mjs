#!/usr/bin/env node

/**
 * Backup / restore drill.
 *
 *   DATABASE_URL=postgresql://localhost/mesob_house \
 *     node scripts/backup-restore-drill.mjs
 *
 * The source is only read by pg_dump. A fresh scratch database is created,
 * the custom-format dump is restored into it, and every row/revenue counter is
 * compared with the source. The scratch database is left in place for
 * inspection unless --drop-restored is passed.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  assertLocalWriteTarget,
  createPool,
  databaseUrlFromEnv,
  has,
  isLocalDatabaseUrl,
  loadEnv,
  parseArgs,
  printDatabaseTarget,
  value,
} from "./lib/db-cli.mjs";

loadEnv();
const args = parseArgs();
const sourceUrl = value(args, "source", databaseUrlFromEnv());
const restoreDb = value(args, "restore-db", "mesob_house_restore");
const dumpFile = path.resolve(
  value(args, "dump", "/tmp/opencode/mesob-house-backup.dump"),
);
const dropRestored = has(args, "drop-restored");

if (has(args, "help")) {
  console.log(`Usage: node scripts/backup-restore-drill.mjs [options]

  --source URL          Source database (default: DATABASE_URL)
  --restore-db NAME     Scratch database name (default: mesob_house_restore)
  --dump PATH           Dump file (default: /tmp/opencode/mesob-house-backup.dump)
  --drop-restored       Drop the scratch database after verification
  --allow-remote        Permit creating the scratch DB on a remote host
`);
  process.exit(0);
}

if (!sourceUrl) throw new Error("DATABASE_URL is required.");
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(restoreDb)) {
  throw new Error("--restore-db must be a plain SQL identifier.");
}
printDatabaseTarget("Source", sourceUrl);

const source = new URL(sourceUrl);
const target = new URL(sourceUrl);
target.pathname = `/${restoreDb}`;
const targetUrl = target.toString();

if (!isLocalDatabaseUrl(targetUrl)) {
  assertLocalWriteTarget(targetUrl, args, "restore database");
}
printDatabaseTarget("Restore target", targetUrl);

const adminUrl = new URL(sourceUrl);
adminUrl.pathname = "/postgres";

function run(command, commandArgs, label) {
  const result = spawnSync(command, commandArgs, {
    stdio: "pipe",
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `${label} failed (${result.status}): ${String(result.stderr || result.stdout).trim()}`,
    );
  }
  return result;
}

async function stats(databaseUrl) {
  const pool = createPool(databaseUrl, { max: 1 });
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT count(*) FROM users)::int AS users,
        (SELECT count(*) FROM sessions)::int AS sessions,
        (SELECT count(*) FROM menu_items)::int AS menu_items,
        (SELECT count(*) FROM orders)::int AS orders,
        (SELECT count(*) FROM order_items)::int AS order_items,
        (SELECT count(*) FROM order_status_history)::int AS history,
        (SELECT count(*) FROM audit_log)::int AS audit_log,
        (SELECT count(*) FROM schema_migrations)::int AS migrations,
        (SELECT COALESCE(sum(total_cents), 0) FROM orders)::bigint AS revenue_cents,
        (SELECT COALESCE(sum(total_cents), 0) FROM orders WHERE status = 'completed')::bigint
          AS completed_revenue_cents
    `);
    return rows[0];
  } finally {
    await pool.end();
  }
}

async function recreateDatabase() {
  const pool = createPool(adminUrl.toString(), { max: 1 });
  try {
    await pool.query(`DROP DATABASE IF EXISTS "${restoreDb}" WITH (FORCE)`);
    await pool.query(`CREATE DATABASE "${restoreDb}" TEMPLATE template0`);
  } finally {
    await pool.end();
  }
}

async function dropDatabase() {
  const pool = createPool(adminUrl.toString(), { max: 1 });
  try {
    await pool.query(`DROP DATABASE IF EXISTS "${restoreDb}" WITH (FORCE)`);
  } finally {
    await pool.end();
  }
}

fs.mkdirSync(path.dirname(dumpFile), { recursive: true });

console.log("");
console.log("1. pg_dump (custom format)");
run(
  "pg_dump",
  ["--format=custom", "--no-owner", "--no-privileges", "--file", dumpFile, sourceUrl],
  "pg_dump",
);
const dumpBytes = fs.statSync(dumpFile).size;
console.log(`   ${dumpFile} (${(dumpBytes / 1024 / 1024).toFixed(2)} MiB)`);

console.log("2. recreate scratch database");
await recreateDatabase();
console.log(`   ${restoreDb} created`);

console.log("3. pg_restore");
run(
  "pg_restore",
  [
    "--dbname",
    targetUrl,
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
    dumpFile,
  ],
  "pg_restore",
);
console.log("   restore complete");

console.log("4. compare source and restored counters");
const [sourceStats, restoredStats] = await Promise.all([
  stats(sourceUrl),
  stats(targetUrl),
]);

const keys = Object.keys(sourceStats);
const failures = keys.filter(
  (key) => String(sourceStats[key]) !== String(restoredStats[key]),
);

console.log("");
console.log("   counter                         source            restored");
for (const key of keys) {
  const ok = String(sourceStats[key]) === String(restoredStats[key]);
  const format = (value) =>
    key.includes("revenue")
      ? `${(Number(value) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} ETB`
      : String(value);
  console.log(
    `   ${ok ? "PASS" : "FAIL"}  ${key.padEnd(26)} ${format(sourceStats[key]).padStart(16)}  ${format(restoredStats[key]).padStart(16)}`,
  );
}

if (dropRestored) {
  await dropDatabase();
  console.log(`\nScratch database ${restoreDb} dropped.`);
}

console.log("");
console.log(
  failures.length
    ? `RESULT: FAIL — mismatched counters: ${failures.join(", ")}`
    : "RESULT: PASS — restored copy matches the source on every counter.",
);

process.exit(failures.length ? 1 : 0);
