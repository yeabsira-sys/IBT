import { NextResponse } from "next/server";
import { getMenu } from "@/lib/menu";

export const dynamic = "force-dynamic";

/** GET /api/menu/search?q=doro&category=... — the debounced client search. */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const category = searchParams.get("category") ?? "all";
  const { dishes, source } = await getMenu();

  const data = dishes.filter((dish) => {
    const inCategory = category === "all" || dish.category === category;
    if (!inCategory) return false;
    if (!query) return true;
    return [dish.name, dish.nativeName, dish.description, dish.category]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  return NextResponse.json(
    { source, count: data.length, data },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
