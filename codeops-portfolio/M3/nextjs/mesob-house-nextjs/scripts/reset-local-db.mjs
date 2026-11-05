#!/usr/bin/env node

/**
 * Rebuild the local development database only.
 *
 *   node scripts/reset-local-db.mjs
 *
 * The script refuses non-local DATABASE_URL values. It runs Prisma Migrate
 * reset (which applies the baseline) and then the idempotent catalogue seed.
 */

import { spawnSync } from "node:child_process";
import {
  assertLocalWriteTarget,
  databaseUrlFromEnv,
  loadEnv,
  parseArgs,
  printDatabaseTarget,
} from "./lib/db-cli.mjs";

loadEnv();
const args = parseArgs();
const databaseUrl = databaseUrlFromEnv();
assertLocalWriteTarget(databaseUrl, args);
printDatabaseTarget("Reset target", databaseUrl);

const env = { ...process.env, DATABASE_URL: databaseUrl };

const migrate = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "migrate", "reset", "--force", "--skip-seed"],
  { env, stdio: "inherit" },
);
if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

const seed = spawnSync(process.execPath, ["scripts/seed.mjs"], {
  env,
  stdio: "inherit",
});
if (seed.status !== 0) {
  process.exit(seed.status ?? 1);
}
