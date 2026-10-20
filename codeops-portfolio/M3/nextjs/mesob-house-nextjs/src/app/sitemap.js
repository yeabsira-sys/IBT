import { getAllDishes } from "@/lib/menu";
import { SITE_URL } from "@/lib/api";

export default async function sitemap() {
  const { dishes } = await getAllDishes();
  const now = new Date();
  const pages = [
    { path: "", priority: 1 },
    { path: "/menu", priority: 0.9 },
    { path: "/terms", priority: 0.2 },
    { path: "/privacy", priority: 0.2 },
  ].map(({ path, priority }) => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: "daily", priority }));

  const dishPages = dishes.map((dish) => ({
    url: `${SITE_URL}/dish/${dish.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...pages, ...dishPages];
}
