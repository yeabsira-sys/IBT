import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const hasDatabaseUrl = Boolean(
  process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL,
);

/**
 * GET /api/health — liveness probe for uptime checks and deploy platforms.
 * `database` makes it possible to confirm which storage backend a deployment
 * is actually using without exposing any connection details.
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    database: hasDatabaseUrl
      ? "postgres"
      : process.env.VERCEL
        ? "file-tmp"
        : "file",
  });
}
