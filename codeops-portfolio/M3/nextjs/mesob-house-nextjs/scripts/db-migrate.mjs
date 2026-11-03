#!/usr/bin/env node

/**
 * Versioned migration runner.
 *
 *   DATABASE_URL=postgresql://localhost/mesob_house node scripts/db-migrate.mjs
 *   node scripts/db-migrate.mjs --to 001
 *   node scripts/db-migrate.mjs --status
 *
 * Writes are refused to non-local hosts unless --allow-remote is passed.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  assertLocalWriteTarget,
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
const migrationsDir = path.resolve(value(args, "dir", "migrations"));

if (has(args, "help")) {
  console.log(`Usage: node scripts/db-migrate.mjs [options]

  --to VERSION       Apply through this version prefix (for example 001)
  --status           Print applied/applicable migrations and exit
  --dir DIR          Migration directory (default: migrations)
  --allow-remote     Permit writes to a non-local database
  --database-url URL Override DATABASE_URL
`);
  process.exit(0);
}

assertLocalWriteTarget(databaseUrl, args);
printDatabaseTarget("Target", databaseUrl);

const files = fs
  .readdirSync(migrationsDir)
  .filter((file) => /^\d+.*\.sql$/.test(file))
  .sort((a, b) => a.localeCompare(b, "en"));

if (!files.length) throw new Error(`No migrations found in ${migrationsDir}`);

const to = value(args, "to", null);
const selected = to
  ? files.filter((file) => file.localeCompare(to, "en") <= 0 || file.startsWith(`${to}_`))
  : files;

const checksum = (sql) => createHash("sha256").update(sql).digest("hex");

const pool = createPool(databaseUrl, { max: 1 });
const client = await pool.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = new Map(
    (await client.query("SELECT version, checksum FROM schema_migrations")).rows.map(
      (row) => [row.version, row.checksum],
    ),
  );

  if (has(args, "status")) {
    for (const file of files) {
      const state = applied.has(file) ? "applied" : "pending";
      console.log(`${state.padEnd(8)} ${file}`);
    }
    process.exit(0);
  }

  for (const file of selected) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const digest = checksum(sql);
    const previous = applied.get(file);

    if (previous) {
      if (previous !== digest) {
        throw new Error(
          `Migration ${file} changed after it was applied (checksum mismatch).`,
        );
      }
      console.log(`skip     ${file}`);
      continue;
    }

    console.log(`apply    ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)",
        [file, digest],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    }
  }

  console.log("Migrations complete.");
} finally {
  client.release();
  await pool.end();
}
