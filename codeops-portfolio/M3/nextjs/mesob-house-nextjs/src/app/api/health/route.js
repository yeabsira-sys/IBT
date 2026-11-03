import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const hasDatabaseUrl = Boolean(
  process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL,
);

/**
 * GET /api/health — liveness probe for uptime checks and deploy platforms.
 * The app has no file fallback: without DATABASE_URL it is misconfigured, not
 * silently backed by a per-instance JSON file.
 */
export function GET() {
  return NextResponse.json(
    {
      status: hasDatabaseUrl ? "ok" : "misconfigured",
      uptime: Math.round(process.uptime()),
      database: hasDatabaseUrl ? "postgres" : "unconfigured",
    },
    { status: hasDatabaseUrl ? 200 : 503 },
  );
}
