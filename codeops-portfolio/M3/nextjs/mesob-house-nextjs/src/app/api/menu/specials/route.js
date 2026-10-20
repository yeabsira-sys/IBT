import { NextResponse } from "next/server";
import { getSpecials } from "@/lib/menu";

export const revalidate = 300;

/** GET /api/menu/specials — today's curated specials. */
export async function GET() {
  const { dishes, source } = await getSpecials();
  return NextResponse.json(
    { source, count: dishes.length, data: dishes },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
