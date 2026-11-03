import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  "";

const globalForPrisma = globalThis;

function createPrismaClient() {
  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required. The JSON-file fallback has been removed; " +
        "run the versioned migrations and point DATABASE_URL at Postgres.",
    );
  }

  const local = /(^|@)(localhost|127\.0\.0\.1|::1)(:|\/|$)/.test(DATABASE_URL);
  const sslDisabled =
    process.env.PGSSLMODE === "disable" ||
    /[?&]sslmode=disable(?:&|$)/.test(DATABASE_URL);

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX) || 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      ssl: local || sslDisabled ? false : { rejectUnauthorized: false },
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Prisma 7 uses a driver adapter instead of the Rust query engine. The client
 * is cached on globalThis so Next's dev server and route handlers reuse the
 * same pg pool across hot reloads.
 */
export function getPrisma() {
  if (!globalForPrisma.__mesobPrisma) {
    globalForPrisma.__mesobPrisma = createPrismaClient();
  }
  return globalForPrisma.__mesobPrisma;
}

export const prisma = new Proxy(
  {},
  {
    get(_target, property) {
      const client = getPrisma();
      const value = client[property];
      return typeof value === "function" ? value.bind(client) : value;
    },
  },
);
