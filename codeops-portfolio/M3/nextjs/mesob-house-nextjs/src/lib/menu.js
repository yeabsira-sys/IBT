import "server-only";

import { cache } from "react";
import { getPrisma } from "./prisma";
import { resolveAvailability } from "./catalog/availability";
import {
  allergenDisclosure,
  dietaryDisclosure,
} from "./catalog/disclosure";
import { resolvePriceFromRows } from "./catalog/pricing";
import { mapReview } from "./reviews";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=70";

const SPICE_LABELS = {
  NONE: "No heat",
  MILD: "Mild",
  MEDIUM: "Medium",
  HOT: "Hot",
  EXTRA_HOT: "Extra hot",
};

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function ratingFor(ratings, menuItemId) {
  const row = ratings?.get(menuItemId);
  const average = Number(row?.average ?? 0);
  return {
    average: Math.round(average * 10) / 10,
    count: Number(row?.count ?? 0),
  };
}

function formatServing(row) {
  if (row.servingNotes) return row.servingNotes;
  if (!row.servingSize) return "";
  const size = Number(row.servingSize);
  if (!Number.isFinite(size)) return "";
  if (row.servingUnit === "ML") return `${size}ml`;
  if (row.servingUnit === "PIECE") return `${size} piece${size === 1 ? "" : "s"}`;
  if (row.servingUnit === "PORTION") return `Serves ${size}`;
  return String(size);
}

function priceRowsWhere(context) {
  return {
    currency: context.currency,
    validFrom: { lte: context.now },
    AND: [
      { OR: [{ validUntil: null }, { validUntil: { gt: context.now } }] },
      {
        OR: [
          { branchId: context.branch.id },
          { branchId: null },
        ],
      },
    ],
  };
}

function itemInclude(context) {
  return {
    categories: { include: { category: true } },
    media: {
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      take: 1,
    },
    prices: {
      where: priceRowsWhere(context),
      orderBy: [{ validFrom: "desc" }],
    },
    branchItems: {
      where: { branchId: context.branch.id },
      take: 1,
    },
    availability: {
      where: { branchId: context.branch.id },
    },
    optionGroups: {
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        group: {
          include: {
            options: {
              orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
              include: {
                branchAvailability: {
                  where: { branchId: context.branch.id },
                },
              },
            },
          },
        },
      },
    },
    ingredients: {
      orderBy: { sortOrder: "asc" },
      include: { ingredient: true },
    },
    allergens: {
      include: { allergen: true },
    },
    dietaryAttributes: {
      include: { dietaryAttribute: true },
    },
    pairings: {
      orderBy: [{ sortOrder: "asc" }, { pairedMenuItemId: "asc" }],
      include: {
        pairedItem: {
          include: {
            categories: { include: { category: true } },
            media: {
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
              take: 1,
            },
            prices: {
              where: priceRowsWhere(context),
              orderBy: [{ validFrom: "desc" }],
            },
            branchItems: {
              where: { branchId: context.branch.id },
              take: 1,
            },
            availability: {
              where: { branchId: context.branch.id },
            },
            dietaryAttributes: {
              include: { dietaryAttribute: true },
            },
            allergens: {
              include: { allergen: true },
            },
          },
        },
      },
    },
  };
}

async function publicContext(prisma) {
  const restaurantSlug =
    process.env.MESOB_RESTAURANT_SLUG || "mesob-house";
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: restaurantSlug, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      defaultCurrency: true,
    },
  });
  if (!restaurant) {
    throw new Error(
      `No active restaurant found for slug "${restaurantSlug}". Run npm run db:seed.`,
    );
  }

  const branch =
    (await prisma.branch.findFirst({
      where: {
        restaurantId: restaurant.id,
        isDefault: true,
        status: "ACTIVE",
      },
      select: { id: true, name: true, timezone: true },
    })) ??
    (await prisma.branch.findFirst({
      where: { restaurantId: restaurant.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, timezone: true },
    }));
  if (!branch) {
    throw new Error(
      `No active branch found for "${restaurant.name}". Run npm run db:seed.`,
    );
  }

  return {
    restaurant,
    branch,
    currency: restaurant.defaultCurrency,
    now: new Date(),
  };
}

function optionIsAvailable(option, context) {
  return (
    option.branchAvailability.length === 0 ||
    option.branchAvailability[0].isAvailable
  );
}

function mapOptionGroup(link, context, admin = false) {
  const group = link.group;
  if (!group) return null;
  if (!admin && (!group.isActive || group.deletedAt)) return null;

  const options = (group.options ?? [])
    .filter(
      (option) =>
        admin ||
        (option.isActive && optionIsAvailable(option, context)),
    )
    .map((option) => ({
      value: option.value,
      title: option.title,
      description: option.description,
      note: option.note,
      priceDeltaCents: option.priceDeltaMinor,
      priceDelta: option.priceDeltaMinor / 100,
      isDefault: option.isDefault,
      isActive: admin
        ? option.isActive
        : option.isActive && optionIsAvailable(option, context),
      sortOrder: option.sortOrder,
    }));

  if (!admin && options.length === 0) return null;

  const required = link.isRequiredOverride ?? group.isRequired;
  const max = link.maxSelectionsOverride ?? group.maxSelections;

  return {
    key: group.key,
    step: link.sortOrder ?? group.sortOrder,
    title: group.title,
    icon: "",
    badge: required ? "Required" : "Optional",
    columns: group.displayType === "CHECKBOX" ? 2 : 1,
    multi: group.selectionType === "MULTIPLE",
    max,
    isActive: group.isActive && !group.deletedAt,
    options,
  };
}

function defaultsFor(groups) {
  const defaults = {};
  for (const group of groups) {
    const selected = group.options.filter((option) => option.isDefault);
    const values = selected.length
      ? selected.map((option) => option.value)
      : group.options.slice(0, 1).map((option) => option.value);
    defaults[group.key] = group.multi
      ? values.slice(0, group.max)
      : (values[0] ?? "");
  }
  return defaults;
}

function resolveItemPrice(row, context) {
  return resolvePriceFromRows({
    rows: (row.prices ?? []).map((price) => ({
      id: price.id,
      branchId: price.branchId,
      priceMinor: price.priceMinor,
      currency: price.currency,
      compareAtPriceMinor: price.compareAtPriceMinor,
      validFrom: price.validFrom,
      validUntil: price.validUntil,
    })),
    branchId: context.branch.id,
    at: context.now,
    currency: context.currency,
    basePriceMinor: row.basePriceMinor,
    baseCompareAtPriceMinor: row.compareAtPriceMinor,
    baseCurrency: row.currency,
  });
}

function resolveItemAvailability(row, context) {
  return resolveAvailability({
    branchItem: row.branchItems?.[0] ?? null,
    windows: (row.availability ?? []).map((window) => ({
      dayOfWeek: window.dayOfWeek,
      availableFrom: window.availableFrom,
      availableUntil: window.availableUntil,
      isAvailable: window.isAvailable,
      validFrom: window.validFrom,
      validUntil: window.validUntil,
    })),
    at: context.now,
    timeZone: context.branch.timezone || "Africa/Addis_Ababa",
  });
}

function allergenRows(row) {
  return (row.allergens ?? []).map((entry) => ({
    code: entry.allergen.code,
    name: entry.allergen.name,
    source: entry.source,
    isConfirmed: entry.isConfirmed,
    notes: entry.notes,
  }));
}

function dietaryRows(row) {
  return (row.dietaryAttributes ?? []).map((entry) => ({
    code: entry.dietaryAttribute.code,
    name: entry.dietaryAttribute.name,
    verificationStatus: entry.verificationStatus,
  }));
}

function mapDishCard(row, context, ratings, admin = false) {
  const price = resolveItemPrice(row, context);
  const availability = resolveItemAvailability(row, context);
  const category = row.categories?.[0]?.category ?? null;
  const media = row.media?.[0] ?? null;
  const allergenFacts = allergenDisclosure(allergenRows(row));
  const dietaryFacts = dietaryDisclosure(dietaryRows(row));
  const fasting = dietaryFacts.verified.some((claim) => claim.code === "FASTING");
  const isSide = category?.slug === "sides";
  const isComplimentary = price.priceMinor === 0;
  const tags = [
    ...dietaryFacts.verified.map((claim) => claim.code.toLowerCase()),
    ...(fasting ? ["fasting"] : []),
    ...(row.isSpecial ? ["popular", "special"] : []),
    ...(isSide ? ["side"] : []),
    ...(isComplimentary ? ["complimentary"] : []),
  ].filter((value, index, list) => list.indexOf(value) === index);

  const card = {
    id: row.slug,
    menuItemId: row.id,
    name: row.name,
    nativeName: row.nativeName,
    price: String(price.priceMinor / 100),
    priceCents: price.priceMinor,
    compareAtPriceCents: price.compareAtPriceMinor,
    currency: price.currency,
    description: row.shortDescription || row.description,
    image: media?.url || FALLBACK_IMAGE,
    imageUrl: media?.url ?? "",
    imageAlt: media?.altText || row.name,
    badgeText: row.badgeText ?? "",
    badgeTone: row.badgeTone ?? "brand",
    label: {
      text: row.badgeText || category?.name || "House menu",
      tone: row.badgeTone || "brand",
    },
    heat: row.spiceNotes || SPICE_LABELS[row.spiceLevel] || "",
    category: category?.slug ?? "",
    categoryLabel: category?.name ?? "House menu",
    tags,
    isSpecial: row.isSpecial,
    isFasting: fasting,
    isComplimentary,
    isSide,
    isActive: admin ? !row.deletedAt : availability.available,
    available: availability.available,
    availabilityReason: availability.reason,
    rating: ratingFor(ratings, row.id),
    allergenStatus: allergenFacts.status,
    allergenMessage: allergenFacts.message,
    mayContain: allergenFacts.mayContain,
    dietary: dietaryFacts.verified.map((claim) => claim.code),
  };

  if (!admin && !availability.available) return null;
  return card;
}

function mapDish(row, context, ratings, admin = false) {
  const card = mapDishCard(row, context, ratings, admin);
  if (!card) return null;

  const groups = (row.optionGroups ?? [])
    .map((link) => mapOptionGroup(link, context, admin))
    .filter(Boolean);
  const allergenFacts = allergenDisclosure(allergenRows(row));

  return {
    ...card,
    tagline: row.shortDescription,
    longDescription: row.description || row.shortDescription,
    spiceLevel: row.spiceNotes || SPICE_LABELS[row.spiceLevel] || "",
    servings: formatServing(row),
    ingredients: (row.ingredients ?? []).map((entry) => entry.ingredient.name),
    allergens: admin
      ? allergenRows(row).map((entry) => entry.name)
      : allergenFacts.contains,
    allergenCandidates: admin ? allergenRows(row) : undefined,
    sortOrder: row.sortOrder,
    optionGroups: groups,
    optionDefaults: defaultsFor(groups),
    pairings: (row.pairings ?? [])
      .map((pairing) => pairing.pairedItem)
      .filter(Boolean)
      .map((paired) => mapDishCard(paired, context, ratings, admin))
      .filter(Boolean),
    pairingIds: admin
      ? (row.pairings ?? []).map((pairing) => pairing.pairedItem?.slug).filter(Boolean)
      : undefined,
    reviewCount: row._count?.reviews ?? undefined,
    orderCount: row._count?.orderItems ?? undefined,
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
      label: row.name,
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
    where: { status: "APPROVED" },
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
 * The public menu is read from Postgres and resolved for the default branch.
 * There is no external API and no fallback catalogue in the client.
 */
export const getMenu = cache(async () => {
  const prisma = getPrisma();
  const context = await publicContext(prisma);
  const [categoryRows, rows, ratings] = await Promise.all([
    prisma.menuCategory.findMany({
      where: {
        isActive: true,
        menu: { restaurantId: context.restaurant.id, isActive: true },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.menuItem.findMany({
      where: {
        restaurantId: context.restaurant.id,
        deletedAt: null,
        branchItems: {
          some: { branchId: context.branch.id, isEnabled: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: itemInclude(context),
    }),
    ratingMap(prisma),
  ]);

  const dishes = rows
    .map((row) => mapDish(row, context, ratings, false))
    .filter(Boolean);
  return {
    dishes,
    categories: categoryList(categoryRows, dishes),
    branch: { id: context.branch.id, name: context.branch.name },
    restaurant: { id: context.restaurant.id, name: context.restaurant.name },
    currency: context.currency,
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

/** Every available dish, specials included. This is the canonical checkout list. */
export const getAllDishes = cache(async () => {
  const menu = await getMenu();
  return {
    dishes: menu.dishes,
    categories: menu.categories,
    currency: menu.currency,
    source: "database",
  };
});

export const getDish = cache(async (slug) => {
  const { dishes } = await getMenu();
  const dish = dishes.find((item) => item.id === slug) ?? null;
  if (!dish) return null;

  const reviews = await getPrisma().review.findMany({
    where: { menuItemId: dish.menuItemId, status: "APPROVED" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 6,
    include: {
      user: { select: { fullName: true } },
      menuItem: { select: { slug: true, name: true } },
    },
  });

  return {
    ...dish,
    reviews: reviews.map(mapReview),
    reviewSummary: dish.rating,
  };
});

/** Admin reads include inactive branch listings, option groups and pairing ids. */
export const getMenuForAdmin = cache(async () => {
  const prisma = getPrisma();
  const context = await publicContext(prisma);
  const [categoryRows, rows, ratings] = await Promise.all([
    prisma.menuCategory.findMany({
      where: {
        menu: { restaurantId: context.restaurant.id, isActive: true },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.menuItem.findMany({
      where: {
        restaurantId: context.restaurant.id,
        deletedAt: null,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        ...itemInclude(context),
        _count: { select: { reviews: true, orderItems: true } },
      },
    }),
    ratingMap(prisma),
  ]);

  const items = rows
    .map((row) => mapDish(row, context, ratings, true))
    .filter(Boolean);

  return {
    items,
    categories: categoryRows.map((row) => ({
      value: row.slug,
      label: row.name,
      description: row.description,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    })),
  };
});

export { FALLBACK_IMAGE, iso, mapReview };
