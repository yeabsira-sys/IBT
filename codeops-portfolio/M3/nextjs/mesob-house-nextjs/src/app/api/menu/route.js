import { NextResponse } from "next/server";
import { getMenu } from "@/lib/menu";

export const revalidate = 300;

/** GET /api/menu — the normalised dish list (same data the pages render). */
export async function GET() {
  const { dishes, source } = await getMenu();
  return NextResponse.json(
    { source, count: dishes.length, data: dishes },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
