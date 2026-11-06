import "server-only";

import { z } from "zod";
import { getPrisma } from "./prisma";
import { withTransaction } from "./db";

const MAX_PRICE_CENTS = 10_000_000;

export class AdminMenuError extends Error {
  constructor(message, status = 400, code = "INVALID") {
    super(message);
    this.name = "AdminMenuError";
    this.status = status;
    this.code = code;
  }
}

const slugify = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

const stringList = z
  .array(z.string().trim().min(1).max(160))
  .max(50)
  .default([])
  .transform((values) => [...new Set(values.map((value) => value.trim()).filter(Boolean))]);

const optionSchema = z.object({
  value: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).default(""),
  note: z.string().trim().max(100).default(""),
  priceDeltaCents: z.coerce.number().int().min(0).max(MAX_PRICE_CENTS).default(0),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

const groupSchema = z
  .object({
    key: z.string().trim().min(1).max(40),
    title: z.string().trim().min(1).max(160),
    icon: z.string().trim().max(24).default(""),
    badge: z.string().trim().max(80).default(""),
    columns: z.coerce.number().int().min(1).max(3).default(1),
    isMulti: z.boolean().default(false),
    maxSelections: z.coerce.number().int().min(1).max(10).default(1),
    sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
    isActive: z.boolean().default(true),
    options: z.array(optionSchema).min(1, "Every option group needs at least one choice.").max(30),
  })
  .superRefine((group, ctx) => {
    const seen = new Set();
    for (const [index, option] of group.options.entries()) {
      const value = slugify(option.value);
      if (!value) {
        ctx.addIssue({
          code: "custom",
          path: ["options", index, "value"],
          message: "Use letters, numbers and hyphens for the option value.",
        });
      } else if (seen.has(value)) {
        ctx.addIssue({
          code: "custom",
          path: ["options", index, "value"],
          message: "Option values must be unique inside a group.",
        });
      }
      seen.add(value);
    }
    const defaults = group.options.filter((option) => option.isDefault).length;
    if (!group.isMulti && defaults > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "A single-choice group can only have one default.",
      });
    }
    if (group.isMulti && defaults > group.maxSelections) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Defaults cannot exceed the maximum selections.",
      });
    }
  });

const menuItemBase = z
  .object({
    id: z
      .string()
      .trim()
      .max(80)
      .regex(/^[a-z0-9][a-z0-9-]*$/, "Use a lowercase slug, e.g. doro-wat.")
      .optional()
      .or(z.literal("")),
    name: z.string().trim().min(2, "Enter the dish name.").max(160),
    nativeName: z.string().trim().max(160).default(""),
    tagline: z.string().trim().max(200).default(""),
    description: z.string().trim().max(1200).default(""),
    longDescription: z.string().trim().max(5000).default(""),
    category: z.string().trim().min(1, "Choose a category.").max(80),
    priceCents: z.coerce.number().int().min(0).max(MAX_PRICE_CENTS),
    imageUrl: z
      .string()
      .trim()
      .max(2000)
      .default("")
      .refine((value) => !value || /^https:\/\//i.test(value), "Use an HTTPS image URL."),
    spiceLevel: z.string().trim().max(120).default(""),
    servings: z.string().trim().max(120).default(""),
    ingredients: stringList,
    allergens: stringList,
    tags: stringList,
    badgeText: z.string().trim().max(120).default(""),
    badgeTone: z.enum(["brand", "gold", "green", "dark"]).default("brand"),
    isSpecial: z.boolean().default(false),
    isActive: z.boolean().default(true),
    isFasting: z.boolean().default(false),
    isComplimentary: z.boolean().default(false),
    isSide: z.boolean().default(false),
    sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
    optionGroups: z.array(groupSchema).max(20).default([]),
    pairingIds: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  })
  .superRefine((item, ctx) => {
    const seen = new Set();
    for (const [index, group] of item.optionGroups.entries()) {
      const key = slugify(group.key);
      if (!key) {
        ctx.addIssue({
          code: "custom",
          path: ["optionGroups", index, "key"],
          message: "Option group keys need letters or numbers.",
        });
      } else if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["optionGroups", index, "key"],
          message: "Option group keys must be unique inside a dish.",
        });
      }
      seen.add(key);
    }
  });

const createSchema = menuItemBase;

function parseOrThrow(schema, input) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AdminMenuError(
      parsed.error.issues[0]?.message ?? "Check the dish details.",
      422,
    );
  }
  return parsed.data;
}

function spiceFromText(value) {
  const text = String(value ?? "").toLowerCase();
  if (!text.trim()) return { spiceLevel: null, spiceNotes: "" };
  if (text.includes("extra")) return { spiceLevel: "EXTRA_HOT", spiceNotes: value };
  if (text.includes("hot") || text.includes("spicy")) {
    return { spiceLevel: "HOT", spiceNotes: value };
  }
  if (text.includes("medium")) return { spiceLevel: "MEDIUM", spiceNotes: value };
  if (text.includes("mild")) return { spiceLevel: "MILD", spiceNotes: value };
  if (text.includes("none") || text.includes("no heat")) {
    return { spiceLevel: "NONE", spiceNotes: value };
  }
  return { spiceLevel: null, spiceNotes: value };
}

const DIETARY_ATTRIBUTES = {
  FASTING: ["Fasting", "Suitable for Ethiopian Orthodox fasting meals."],
  VEGAN: ["Vegan", "No animal-derived ingredients."],
  VEGETARIAN: ["Vegetarian", "No meat, poultry or fish."],
  GLUTEN_FREE: ["Gluten free", "No gluten-containing ingredients."],
  DAIRY_FREE: ["Dairy free", "No milk or dairy ingredients."],
  NUT_FREE: ["Nut free", "No tree nuts or peanuts."],
};

const ALLERGEN_CODES = {
  gluten: "gluten",
  "cereals containing gluten": "gluten",
  wheat: "gluten",
  milk: "milk",
  dairy: "milk",
  egg: "eggs",
  eggs: "eggs",
  sesame: "sesame",
  peanut: "peanuts",
  peanuts: "peanuts",
  "tree nuts": "nuts",
  nut: "nuts",
  nuts: "nuts",
  fish: "fish",
  shellfish: "shellfish",
  soy: "soybeans",
  soya: "soybeans",
  soybeans: "soybeans",
};

function allergenCode(name) {
  return ALLERGEN_CODES[String(name ?? "").trim().toLowerCase()] ?? slugify(name);
}

async function defaultContext(client) {
  const slug = process.env.MESOB_RESTAURANT_SLUG || "mesob-house";
  const restaurant = await client.restaurant.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { id: true, defaultCurrency: true },
  });
  if (!restaurant) {
    throw new AdminMenuError("No active restaurant found. Run the seed.", 500);
  }
  const branch =
    (await client.branch.findFirst({
      where: {
        restaurantId: restaurant.id,
        isDefault: true,
        status: "ACTIVE",
      },
      select: { id: true },
    })) ??
    (await client.branch.findFirst({
      where: { restaurantId: restaurant.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }));
  if (!branch) {
    throw new AdminMenuError("No active branch found. Run the seed.", 500);
  }
  const taxCategory = await client.taxCategory.findFirst({
    where: { restaurantId: restaurant.id, code: "VAT" },
    select: { id: true },
  });
  return {
    restaurantId: restaurant.id,
    branchId: branch.id,
    currency: restaurant.defaultCurrency,
    taxCategoryId: taxCategory?.id ?? null,
  };
}

async function resolveCategory(client, restaurantId, slug) {
  const category = await client.menuCategory.findFirst({
    where: {
      slug,
      isActive: true,
      menu: { restaurantId, isActive: true },
    },
    select: { id: true, slug: true },
  });
  if (!category) {
    throw new AdminMenuError("That menu category does not exist.", 422);
  }
  return category;
}

async function resolvePairings(client, restaurantId, slugs, currentSlug) {
  const values = [...new Set(slugs.filter((slug) => slug && slug !== currentSlug))];
  if (!values.length) return [];
  const rows = await client.menuItem.findMany({
    where: {
      restaurantId,
      slug: { in: values },
      deletedAt: null,
    },
    select: { id: true, slug: true },
  });
  if (rows.length !== values.length) {
    throw new AdminMenuError("One of the selected pairings no longer exists.", 422);
  }
  return rows;
}

async function syncCategories(client, restaurantId, menuItemId, categoryId, isSide) {
  await client.menuItemCategory.deleteMany({ where: { menuItemId } });
  await client.menuItemCategory.create({
    data: { menuItemId, categoryId, sortOrder: 0 },
  });
  if (isSide) {
    const sides = await client.menuCategory.findFirst({
      where: {
        slug: "sides",
        isActive: true,
        menu: { restaurantId, isActive: true },
      },
      select: { id: true },
    });
    if (sides && sides.id !== categoryId) {
      await client.menuItemCategory.create({
        data: { menuItemId, categoryId: sides.id, sortOrder: 1 },
      });
    }
  }
}

async function syncMedia(client, menuItemId, imageUrl, name) {
  await client.menuItemMedia.deleteMany({
    where: { menuItemId, isPrimary: true },
  });
  if (!imageUrl) return;
  await client.menuItemMedia.create({
    data: {
      menuItemId,
      url: imageUrl,
      altText: name,
      mediaType: "IMAGE",
      isPrimary: true,
      sortOrder: 0,
    },
  });
}

async function syncPrice(client, context, menuItemId, priceMinor, actorId, force = false, previousPrice = null) {
  const current = await client.menuItemPrice.findFirst({
    where: { menuItemId, branchId: null, validUntil: null },
    orderBy: { validFrom: "desc" },
    select: { priceMinor: true },
  });

  if (!force && (previousPrice ?? current?.priceMinor) === priceMinor) return;

  const now = new Date();
  await client.menuItemPrice.updateMany({
    where: { menuItemId, branchId: null, validUntil: null },
    data: { validUntil: now },
  });
  await client.menuItemPrice.create({
    data: {
      menuItemId,
      branchId: null,
      priceMinor,
      currency: context.currency,
      validFrom: now,
      createdBy: actorId ?? null,
    },
  });
}

async function syncIngredients(client, context, menuItemId, names) {
  await client.menuItemIngredient.deleteMany({ where: { menuItemId } });
  let sortOrder = 0;
  for (const name of names) {
    const slug = slugify(name);
    if (!slug) continue;
    const ingredient = await client.ingredient.upsert({
      where: {
        restaurantId_slug: { restaurantId: context.restaurantId, slug },
      },
      update: { name },
      create: {
        restaurantId: context.restaurantId,
        name,
        slug,
        defaultUnit: "PIECE",
        description: "",
      },
      select: { id: true },
    });
    await client.menuItemIngredient.create({
      data: {
        menuItemId,
        ingredientId: ingredient.id,
        unit: "PIECE",
        sortOrder,
      },
    });
    sortOrder += 1;
  }
}

async function syncAllergens(client, menuItemId, names) {
  await client.menuItemAllergen.deleteMany({ where: { menuItemId } });
  for (const name of names) {
    const code = allergenCode(name);
    if (!code) continue;
    const allergen = await client.allergen.upsert({
      where: { code },
      update: { name },
      create: { code, name, description: "" },
      select: { id: true },
    });
    await client.menuItemAllergen.create({
      data: {
        menuItemId,
        allergenId: allergen.id,
        source: "INGREDIENT",
        isConfirmed: true,
      },
    });
  }
}

async function syncDietary(client, menuItemId, { isFasting, tags }, actorId) {
  await client.menuItemDietaryAttribute.deleteMany({ where: { menuItemId } });
  const codes = new Set();
  if (isFasting) codes.add("FASTING");
  for (const tag of tags) {
    const normalized = String(tag).trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (normalized === "FASTING" || normalized === "VEGAN" || normalized === "VEGETARIAN" || normalized === "GLUTEN_FREE" || normalized === "DAIRY_FREE" || normalized === "NUT_FREE") {
      codes.add(normalized);
    }
  }
  for (const code of codes) {
    const [name, description] = DIETARY_ATTRIBUTES[code];
    const attribute = await client.dietaryAttribute.upsert({
      where: { code },
      update: { name, description },
      create: { code, name, description },
      select: { id: true },
    });
    await client.menuItemDietaryAttribute.create({
      data: {
        menuItemId,
        dietaryAttributeId: attribute.id,
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        verifiedBy: actorId ?? null,
      },
    });
  }
}

async function syncOptionGroups(client, context, menuItemId, groups) {
  await client.menuItemOptionGroup.deleteMany({ where: { menuItemId } });

  const links = [];
  for (const [index, group] of groups.entries()) {
    const key = slugify(group.key);
    if (!key) throw new AdminMenuError("Option group keys need letters or numbers.", 422);
    const isRequired = String(group.badge ?? "").toLowerCase().includes("required");
    const groupRow = await client.menuOptionGroup.upsert({
      where: {
        restaurantId_key: { restaurantId: context.restaurantId, key },
      },
      update: {
        title: group.title,
        description: "",
        isRequired,
        selectionType: group.isMulti ? "MULTIPLE" : "SINGLE",
        minSelections: isRequired ? 1 : 0,
        maxSelections: group.maxSelections,
        displayType: group.isMulti ? "CHECKBOX" : "RADIO",
        sortOrder: group.sortOrder ?? index,
        isActive: group.isActive !== false,
        deletedAt: null,
      },
      create: {
        restaurantId: context.restaurantId,
        key,
        title: group.title,
        description: "",
        isRequired,
        selectionType: group.isMulti ? "MULTIPLE" : "SINGLE",
        minSelections: isRequired ? 1 : 0,
        maxSelections: group.maxSelections,
        displayType: group.isMulti ? "CHECKBOX" : "RADIO",
        sortOrder: group.sortOrder ?? index,
        isActive: group.isActive !== false,
      },
      select: { id: true },
    });

    const values = [];
    for (const [optionIndex, option] of group.options.entries()) {
      const value = slugify(option.value);
      if (!value) continue;
      values.push(value);
      await client.menuOption.upsert({
        where: { groupId_value: { groupId: groupRow.id, value } },
        update: {
          title: option.title,
          description: option.description,
          note: option.note,
          priceDeltaMinor: option.priceDeltaCents,
          isDefault: Boolean(option.isDefault),
          isActive: option.isActive !== false,
          maxQuantity: 1,
          sortOrder: option.sortOrder ?? optionIndex,
        },
        create: {
          groupId: groupRow.id,
          value,
          title: option.title,
          description: option.description,
          note: option.note,
          priceDeltaMinor: option.priceDeltaCents,
          isDefault: Boolean(option.isDefault),
          isActive: option.isActive !== false,
          maxQuantity: 1,
          sortOrder: option.sortOrder ?? optionIndex,
        },
      });
    }
    if (values.length) {
      await client.menuOption.updateMany({
        where: { groupId: groupRow.id, value: { notIn: values } },
        data: { isActive: false },
      });
    }
    links.push({
      menuItemId,
      groupId: groupRow.id,
      sortOrder: group.sortOrder ?? index,
    });
  }

  if (links.length) {
    await client.menuItemOptionGroup.createMany({
      data: links,
      skipDuplicates: true,
    });
  }
}

async function syncPairings(client, restaurantId, menuItemId, menuItemSlug, pairingIds) {
  await client.menuPairing.deleteMany({ where: { menuItemId } });
  const pairings = await resolvePairings(client, restaurantId, pairingIds, menuItemSlug);
  if (pairings.length) {
    await client.menuPairing.createMany({
      data: pairings.map((pairing, index) => ({
        menuItemId,
        pairedMenuItemId: pairing.id,
        type: "RECOMMENDED",
        sortOrder: index,
      })),
      skipDuplicates: true,
    });
  }
}

async function syncBranchItem(client, context, menuItemId, isEnabled) {
  await client.branchMenuItem.upsert({
    where: {
      branchId_menuItemId: {
        branchId: context.branchId,
        menuItemId,
      },
    },
    update: { isEnabled },
    create: {
      branchId: context.branchId,
      menuItemId,
      isEnabled,
      availabilityStatus: "AVAILABLE",
    },
  });
}

function audit(client, context, actor, action, menuItem, beforeData, afterData) {
  return client.auditLog.create({
    data: {
      restaurantId: context.restaurantId,
      entityType: "menu_item",
      entityId: menuItem.id,
      action,
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? null,
      beforeData: beforeData ?? undefined,
      afterData: afterData ?? undefined,
    },
  });
}

function publicAdminItem(row) {
  return {
    id: row.slug,
    name: row.name,
    slug: row.slug,
    isActive: !row.deletedAt,
  };
}

export async function createMenuItem(input, actor) {
  const data = parseOrThrow(createSchema, input);
  const slug = data.id || slugify(data.name);
  if (!slug) throw new AdminMenuError("Add a slug for this dish.", 422);

  return withTransaction(async (tx) => {
    const context = await defaultContext(tx);
    const category = await resolveCategory(tx, context.restaurantId, data.category);
    const exists = await tx.menuItem.findFirst({
      where: { restaurantId: context.restaurantId, slug },
      select: { id: true },
    });
    if (exists) {
      throw new AdminMenuError("A dish with that slug already exists.", 409, "CONFLICT");
    }

    const spice = spiceFromText(data.spiceLevel);
    const priceMinor = data.isComplimentary ? 0 : data.priceCents;
    const row = await tx.menuItem.create({
      data: {
        restaurantId: context.restaurantId,
        slug,
        name: data.name,
        nativeName: data.nativeName,
        shortDescription: data.tagline || data.description,
        description: data.longDescription || data.description,
        spiceLevel: spice.spiceLevel,
        spiceNotes: spice.spiceNotes,
        servingNotes: data.servings,
        basePriceMinor: priceMinor,
        currency: context.currency,
        taxCategoryId: context.taxCategoryId,
        isSpecial: data.isSpecial,
        badgeText: data.badgeText,
        badgeTone: data.badgeTone,
        sortOrder: data.sortOrder,
        deletedAt: data.isActive ? null : new Date(),
      },
      select: { id: true, slug: true, name: true, deletedAt: true },
    });

    await syncCategories(tx, context.restaurantId, row.id, category.id, data.isSide);
    await syncMedia(tx, row.id, data.imageUrl, data.name);
    await syncPrice(tx, context, row.id, priceMinor, actor?.id, true);
    await syncIngredients(tx, context, row.id, data.ingredients);
    await syncAllergens(tx, row.id, data.allergens);
    await syncDietary(tx, row.id, data, actor?.id);
    await syncOptionGroups(tx, context, row.id, data.optionGroups);
    await syncPairings(tx, context.restaurantId, row.id, slug, data.pairingIds);
    await syncBranchItem(tx, context, row.id, data.isActive);
    await audit(tx, context, actor, "created", row, null, {
      name: data.name,
      category: data.category,
      priceMinor,
    });

    return publicAdminItem(row);
  });
}

export async function updateMenuItem(slug, input, actor) {
  const data = parseOrThrow(createSchema, input);
  if (data.id && data.id !== slug) {
    throw new AdminMenuError("The dish slug cannot be changed.", 422);
  }

  return withTransaction(async (tx) => {
    const context = await defaultContext(tx);
    const before = await tx.menuItem.findFirst({
      where: { restaurantId: context.restaurantId, slug, deletedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        basePriceMinor: true,
        deletedAt: true,
      },
    });
    if (!before) throw new AdminMenuError("Dish not found.", 404, "NOT_FOUND");
    const category = await resolveCategory(tx, context.restaurantId, data.category);

    const spice = spiceFromText(data.spiceLevel);
    const priceMinor = data.isComplimentary ? 0 : data.priceCents;
    const row = await tx.menuItem.update({
      where: { id: before.id },
      data: {
        name: data.name,
        nativeName: data.nativeName,
        shortDescription: data.tagline || data.description,
        description: data.longDescription || data.description,
        spiceLevel: spice.spiceLevel,
        spiceNotes: spice.spiceNotes,
        servingNotes: data.servings,
        basePriceMinor: priceMinor,
        currency: context.currency,
        taxCategoryId: context.taxCategoryId,
        isSpecial: data.isSpecial,
        badgeText: data.badgeText,
        badgeTone: data.badgeTone,
        sortOrder: data.sortOrder,
        deletedAt: data.isActive ? null : new Date(),
      },
      select: { id: true, slug: true, name: true, deletedAt: true },
    });

    await syncCategories(tx, context.restaurantId, row.id, category.id, data.isSide);
    await syncMedia(tx, row.id, data.imageUrl, data.name);
    await syncPrice(
      tx,
      context,
      row.id,
      priceMinor,
      actor?.id,
      false,
      before.basePriceMinor,
    );
    await syncIngredients(tx, context, row.id, data.ingredients);
    await syncAllergens(tx, row.id, data.allergens);
    await syncDietary(tx, row.id, data, actor?.id);
    await syncOptionGroups(tx, context, row.id, data.optionGroups);
    await syncPairings(tx, context.restaurantId, row.id, slug, data.pairingIds);
    await syncBranchItem(tx, context, row.id, data.isActive);
    await audit(tx, context, actor, "updated", row, {
      name: before.name,
      priceMinor: before.basePriceMinor,
      isActive: !before.deletedAt,
    }, {
      name: data.name,
      priceMinor,
      isActive: data.isActive,
    });

    return publicAdminItem(row);
  });
}

export async function deactivateMenuItem(slug, actor) {
  return withTransaction(async (tx) => {
    const context = await defaultContext(tx);
    const before = await tx.menuItem.findFirst({
      where: { restaurantId: context.restaurantId, slug },
      select: { id: true, slug: true, name: true, deletedAt: true },
    });
    if (!before) throw new AdminMenuError("Dish not found.", 404, "NOT_FOUND");
    if (before.deletedAt) return publicAdminItem(before);

    const row = await tx.menuItem.update({
      where: { id: before.id },
      data: { deletedAt: new Date() },
      select: { id: true, slug: true, name: true, deletedAt: true },
    });
    await syncBranchItem(tx, context, row.id, false);
    await audit(tx, context, actor, "deactivated", row, {
      name: before.name,
      isActive: true,
    }, {
      name: row.name,
      isActive: false,
    });
    return publicAdminItem(row);
  });
}
