import fs from "node:fs";
import { Pool } from "pg";

/** Load .env.local/.env without overwriting variables already in the shell. */
export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [key, inline] = arg.slice(2).split("=");
    if (inline !== undefined) {
      args.set(key, inline);
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      args.set(key, argv[index + 1]);
      index += 1;
    } else {
      args.set(key, true);
    }
  }
  return args;
}

export function has(args, name) {
  return args.has(name);
}

export function value(args, name, fallback) {
  const raw = args.get(name);
  return raw === undefined || raw === true ? fallback : raw;
}

export function numberValue(args, name, fallback, minimum = 0) {
  const raw = args.get(name);
  const number = raw === undefined || raw === true ? fallback : Number(raw);
  return Number.isFinite(number) ? Math.max(minimum, Math.floor(number)) : fallback;
}

export function databaseUrlFromEnv() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ""
  );
}

export function isLocalDatabaseUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function describeDatabaseUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: url.port || "5432",
      database: url.pathname.slice(1) || "(default)",
      local: isLocalDatabaseUrl(databaseUrl),
    };
  } catch {
    return { host: "invalid", port: "", database: "invalid", local: false };
  }
}

export function printDatabaseTarget(label, databaseUrl) {
  const target = describeDatabaseUrl(databaseUrl);
  console.log(
    `${label}: ${target.host}:${target.port}/${target.database}` +
      (target.local ? " (local)" : " (remote)"),
  );
}

export function assertLocalWriteTarget(databaseUrl, args, label = "database") {
  if (!databaseUrl) {
    throw new Error(`No ${label} URL configured. Set DATABASE_URL.`);
  }
  if (!isLocalDatabaseUrl(databaseUrl) && !has(args, "allow-remote")) {
    throw new Error(
      `Refusing to write to ${label} ${describeDatabaseUrl(databaseUrl).host} ` +
        "without --allow-remote. This guard exists so the migration cannot " +
        "accidentally touch production.",
    );
  }
}

export function createPool(databaseUrl, { max = 4 } = {}) {
  const local = isLocalDatabaseUrl(databaseUrl);
  const sslDisabled =
    process.env.PGSSLMODE === "disable" ||
    /[?&]sslmode=disable(?:&|$)/.test(databaseUrl);

  return new Pool({
    connectionString: databaseUrl,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    ssl: local || sslDisabled ? false : { rejectUnauthorized: false },
  });
}

export async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export const cents = (birr) => Math.round((Number(birr) || 0) * 100);
export const birr = (value) => Number(value) / 100;

export function centsLabel(value) {
  return `${birr(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ETB`;
}

export function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
