import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/auth/session — the navbar's cached view of the server session. */
export async function GET() {
  const user = await getSession();
  return NextResponse.json(
    { user },
    { headers: { "Cache-Control": "no-store" } },
  );
}
