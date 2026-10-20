import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/health — liveness probe for uptime checks and deploy platforms. */
export function GET() {
  return NextResponse.json({ status: "ok", uptime: Math.round(process.uptime()) });
}
