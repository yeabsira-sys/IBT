import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (
    !process.env.REVALIDATE_SECRET ||
    secret !== process.env.REVALIDATE_SECRET
  ) {
    return NextResponse.json(
      { ok: false, message: "Invalid or missing secret." },
      { status: 401 },
    );
  }

  // The catalogue lives in Postgres, so there is no fetch tag to invalidate.
  // Clear the ISR pages and public API routes that cache the menu instead.
  for (const path of ["/", "/menu", "/api/menu", "/api/menu/specials"]) {
    revalidatePath(path);
  }

  return NextResponse.json({
    ok: true,
    revalidated: "menu",
    at: new Date().toISOString(),
  });
}
