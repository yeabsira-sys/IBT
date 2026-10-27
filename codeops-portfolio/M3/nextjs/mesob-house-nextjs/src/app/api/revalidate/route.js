import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

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
  revalidateTag("menu", "max");
  return NextResponse.json({
    ok: true,
    revalidated: "menu",
    at: new Date().toISOString(),
  });
}
