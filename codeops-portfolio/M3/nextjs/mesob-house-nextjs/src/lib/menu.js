import "server-only";

import { cache } from "react";
import { getPrisma } from "./prisma";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=70";

const iso = (value) => (value ? new Date(value).toISOString() : null);

const optionGroupInclude = {
  where: { isActive: true },
  orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  include: {
    options: {
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    },
  },
};

const dishInclude = {
  optionGroups: optionGroupInclude,
  pairings: {
    orderBy: [{ sortOrder: "asc" }, { pairedMenuItemId: "asc" }],
    include: {
      pairedItem: { include: { optionGroups: optionGroupInclude } },
    },
  },
};

function mapOptionGroup(group) {
  return {
    key: group.key,
    step: group.sortOrder,
    title: group.title,
    icon: group.icon,
    badge: group.badge,
    columns: group.columns,
    multi: group.isMulti,
    max: group.maxSelections,
    isActive: group.isActive,
    options: (group.options ?? []).map((option) => ({
      value: option.value,
      title: option.title,
      description: option.description,
      note: option.note,
      priceDeltaCents: option.priceDeltaCents,
      priceDelta: option.priceDeltaCents / 100,
      isDefault: option.isDefault,
      isActive: option.isActive,
      sortOrder: option.sortOrder,
    })),
  };
}

function defaultsFor(groups) {
  const defaults = {};
  for (const group of groups) {
    const selected = group.options.filter((option) => option.isDefault);
    const values = selected.length
      ? selected.map((option) => option.value)
      : group.options.slice(0, 1).map((option) => option.value);
    defaults[group.key] = group.multi ? values.slice(0, group.max) : values[0] ?? "";
  }
  return defaults;
}

function ratingFor(ratings, id) {
  const row = ratings?.get(id);
  const average = Number(row?.average ?? 0);
  return {
    average: Math.round(average * 10) / 10,
    count: Number(row?.count ?? 0),
  };
}

function mapDishCard(row, categoryMap, ratings) {
  const category = categoryMap.get(row.category);
  return {
    id: row.id,
    name: row.name,
    nativeName: row.nativeName,
    price: String(row.priceCents / 100),
    priceCents: row.priceCents,
    description: row.description,
    image: row.imageUrl || FALLBACK_IMAGE,
    imageUrl: row.imageUrl ?? "",
    imageAlt: row.name,
    badgeText: row.badgeText ?? "",
    badgeTone: row.badgeTone ?? "brand",
    label: {
      text: row.badgeText || category?.label || "House menu",
      tone: row.badgeTone || "brand",
    },
    heat: row.spiceLevel,
    category: row.category,
    categoryLabel: category?.label ?? row.category,
    tags: row.tags ?? [],
    isSpecial: row.isSpecial,
    isFasting: row.isFasting,
    isComplimentary: row.isComplimentary,
    isSide: row.isSide,
    rating: ratingFor(ratings, row.id),
  };
}

function mapDish(row, categoryMap, ratings) {
  const groups = (row.optionGroups ?? []).map(mapOptionGroup);
  return {
    ...mapDishCard(row, categoryMap, ratings),
    tagline: row.tagline,
    longDescription: row.longDescription || row.description,
    spiceLevel: row.spiceLevel,
    servings: row.servings,
    ingredients: row.ingredients ?? [],
    allergens: row.allergens ?? [],
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    optionGroups: groups,
    optionDefaults: defaultsFor(groups),
    pairings: (row.pairings ?? [])
      .map((pairing) => pairing.pairedItem)
      .filter((paired) => paired?.isActive)
      .map((paired) => mapDish(paired, categoryMap, ratings)),
  };
}

function mapReview(row) {
  return {
    id: row.id,
    rating: row.rating,
    message: row.message,
    status: row.status,
    createdAt: iso(row.createdAt),
    author: row.user?.fullName || "Mesob guest",
    verified: Boolean(row.orderId),
  };
}

function categoryList(rows, dishes) {
  const counts = new Map();
  for (const dish of dishes) {
    counts.set(dish.category, (counts.get(dish.category) ?? 0) + 1);
  }
  return rows
    .filter((row) => row.isActive)
    .map((row) => ({
      value: row.slug,
      label: row.label,
      description: row.description,
      count: counts.get(row.slug) ?? 0,
      sortOrder: row.sortOrder,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

async function ratingMap(prisma) {
  const rows = await prisma.review.groupBy({
    by: ["menuItemId"],
    where: { status: "approved" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    rows.map((row) => [
      row.menuItemId,
      { average: row._avg.rating ?? 0, count: row._count._all ?? 0 },
    ]),
  );
}

/**
 * The public menu is read from Postgres. There is no external API and no
 * fallback catalogue in the client: if the database is unavailable the page
 * fails loudly rather than quietly serving stale demo dishes.
 */
export const getMenu = cache(async () => {
  const prisma = getPrisma();
  const [categoryRows, rows, ratings] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    }),
    prisma.menuItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: dishInclude,
    }),
    ratingMap(prisma),
  ]);

  const categoryMap = new Map(categoryRows.map((row) => [row.slug, row]));
  const dishes = rows.map((row) => mapDish(row, categoryMap, ratings));
  return {
    dishes,
    categories: categoryList(categoryRows, dishes),
    source: "database",
  };
});

export const getSpecials = cache(async () => {
  const { dishes, categories } = await getMenu();
  return {
    dishes: dishes.filter((dish) => dish.isSpecial),
    categories,
    source: "database",
  };
});

/** Every active dish, specials included. This is the canonical checkout list. */
export const getAllDishes = cache(async () => {
  const menu = await getMenu();
  return { dishes: menu.dishes, categories: menu.categories, source: "database" };
});

export const getDish = cache(async (slug) => {
  const { dishes } = await getMenu();
  const dish = dishes.find((item) => item.id === slug) ?? null;
  if (!dish) return null;

  const reviews = await getPrisma().review.findMany({
    where: { menuItemId: slug, status: "approved" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 6,
    include: { user: { select: { fullName: true } } },
  });

  return {
    ...dish,
    reviews: reviews.map(mapReview),
    reviewSummary: dish.rating,
  };
});

/** Admin reads include inactive dishes, option groups and pairing ids. */
export const getMenuForAdmin = cache(async () => {
  const prisma = getPrisma();
  const [categoryRows, rows, ratings] = await Promise.all([
    prisma.menuCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    }),
    prisma.menuItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        optionGroups: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          include: {
            options: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
          },
        },
        pairings: { orderBy: [{ sortOrder: "asc" }, { pairedMenuItemId: "asc" }] },
        _count: { select: { reviews: true, orderItems: true } },
      },
    }),
    ratingMap(prisma),
  ]);

  const categoryMap = new Map(categoryRows.map((row) => [row.slug, row]));
  const items = rows.map((row) => ({
    ...mapDish(row, categoryMap, ratings),
    pairingIds: (row.pairings ?? []).map((pairing) => pairing.pairedMenuItemId),
    reviewCount: row._count?.reviews ?? 0,
    orderCount: row._count?.orderItems ?? 0,
  }));

  return {
    items,
    categories: categoryRows.map((row) => ({
      value: row.slug,
      label: row.label,
      description: row.description,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    })),
  };
});

export { FALLBACK_IMAGE, mapReview };
