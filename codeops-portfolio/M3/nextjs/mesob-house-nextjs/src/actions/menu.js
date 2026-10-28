"use server";

import { updateTag } from "next/cache";

// catch updater
export async function refreshMenu() {
  updateTag("menu");
  return { ok: true };
}
