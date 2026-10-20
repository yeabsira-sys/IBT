import "server-only";
import { cache } from "react";
import { API_ENDPOINTS } from "./api";
import { mapApiDishToCard } from "./dishAdapters";
import { categories as demoCategories, dishes as demoDishes } from "@/data/menu";
import { specials as demoSpecials } from "@/data/home";

const REVALIDATE_SECONDS = 300;

const categoryLabel = Object.fromEntries(demoCategories.map((c) => [c.value, c.label]));
const demoMenu = demoDishes.map((dish) => ({ ...dish, category: categoryLabel[dish.category] ?? dish.category }));

/** Fetches one list from the backend, cached + tagged so it can be revalidated on demand. */
async function load(url, tags) {
  const response = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS, tags },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body?.data)) throw new Error(`${url} returned an unexpected payload`);
  return body.data.map(mapApiDishToCard);
}

/**
 * getMenu / getSpecials — server-side data fetching. Wrapped in React `cache`
 * so one render pass never fetches the same list twice, and each falls back to
 * the curated demo dishes if the backend is down or slow, so no page ever
 * renders empty. `source` tells the UI which one it got.
 */
export const getMenu = cache(async () => {
  try {
    return { dishes: await load(API_ENDPOINTS.menu, ["menu"]), source: "live" };
  } catch (error) {
    console.warn("[menu] using fallback dishes:", error.message);
    return { dishes: demoMenu, source: "fallback" };
  }
});

export const getSpecials = cache(async () => {
  try {
    return { dishes: await load(API_ENDPOINTS.specials, ["menu", "specials"]), source: "live" };
  } catch (error) {
    console.warn("[specials] using fallback dishes:", error.message);
    return { dishes: demoSpecials.dishes, source: "fallback" };
  }
});

/** Every known dish (specials first), de-duplicated by slug. */
export const getAllDishes = cache(async () => {
  const [menu, specials] = await Promise.all([getMenu(), getSpecials()]);
  const bySlug = new Map();
  for (const dish of [...specials.dishes, ...menu.dishes]) if (!bySlug.has(dish.id)) bySlug.set(dish.id, dish);
  return { dishes: [...bySlug.values()], source: menu.source === "live" && specials.source === "live" ? "live" : "fallback" };
});

export const getDish = cache(async (slug) => {
  const { dishes } = await getAllDishes();
  return dishes.find((dish) => dish.id === slug) ?? null;
});
