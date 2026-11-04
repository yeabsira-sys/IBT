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

function normalizeGroups(groups = []) {
  return groups.map((group, groupIndex) => {
    const key = slugify(group.key);
    if (!key) throw new AdminMenuError("Option group keys need letters or numbers.", 422);
    const options = group.options.map((option, optionIndex) => {
      const value = slugify(option.value);
      if (!value) throw new AdminMenuError("Option values need letters or numbers.", 422);
      return {
        value,
        title: option.title,
        description: option.description,
        note: option.note,
        priceDeltaCents: option.priceDeltaCents,
        isDefault: Boolean(option.isDefault),
        isActive: option.isActive !== false,
        sortOrder: option.sortOrder ?? optionIndex,
      };
    });
    const defaultOptions = options.filter((option) => option.isDefault);
    if (!defaultOptions.length) options[0].isDefault = true;
    if (!group.isMulti && options.filter((option) => option.isDefault).length > 1) {
      let used = false;
      for (const option of options) {
        if (!option.isDefault) continue;
        if (!used) used = true;
        else option.isDefault = false;
      }
    }
    if (group.isMulti && options.filter((option) => option.isDefault).length > group.maxSelections) {
      let remaining = group.maxSelections;
      for (const option of options) {
        if (!option.isDefault) continue;
        if (remaining > 0) remaining -= 1;
        else option.isDefault = false;
      }
    }
    return {
      id: `${key}`,
      key,
      title: group.title,
      icon: group.icon,
      badge: group.badge,
      columns: group.columns,
      isMulti: Boolean(group.isMulti),
      maxSelections: group.maxSelections,
      sortOrder: group.sortOrder ?? groupIndex,
      isActive: group.isActive !== false,
      options,
    };
  });
}

async function assertCategory(client, category) {
  const row = await client.menuCategory.findUnique({ where: { slug: category } });
  if (!row) throw new AdminMenuError("That menu category does not exist.", 422);
}

async function assertPairings(client, itemId, pairingIds) {
  const ids = [...new Set(pairingIds.filter((id) => id && id !== itemId))];
  if (!ids.length) return [];
  const rows = await client.menuItem.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  if (rows.length !== ids.length) {
    throw new AdminMenuError("One of the selected pairings no longer exists.", 422);
  }
  return ids;
}

function audit(client, actor, action, entityId, beforeData, afterData) {
  return client.auditLog.create({
    data: {
      entityType: "menu_item",
      entityId,
      action,
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? null,
      beforeData: beforeData ?? undefined,
      afterData: afterData ?? undefined,
    },
  });
}

function itemWritableData(data) {
  return {
    name: data.name,
    nativeName: data.nativeName,
    tagline: data.tagline,
    description: data.description,
    longDescription: data.longDescription,
    category: data.category,
    priceCents: data.priceCents,
    imageUrl: data.imageUrl,
    spiceLevel: data.spiceLevel,
    servings: data.servings,
    ingredients: data.ingredients,
    allergens: data.allergens,
    tags: data.tags,
    badgeText: data.badgeText,
    badgeTone: data.badgeTone,
    isSpecial: data.isSpecial,
    isActive: data.isActive,
    isFasting: data.isFasting,
    isComplimentary: data.isComplimentary,
    isSide: data.isSide,
    sortOrder: data.sortOrder,
  };
}

export async function createMenuItem(input, actor) {
  const data = parseOrThrow(createSchema, input);
  const id = data.id || slugify(data.name);
  if (!id) throw new AdminMenuError("Add a slug for this dish.", 422);

  return withTransaction(async (tx) => {
    await assertCategory(tx, data.category);
    const exists = await tx.menuItem.findUnique({ where: { id }, select: { id: true } });
    if (exists) throw new AdminMenuError("A dish with that slug already exists.", 409, "CONFLICT");

    const pairingIds = await assertPairings(tx, id, data.pairingIds);
    const groups = normalizeGroups(data.optionGroups);
    const row = await tx.menuItem.create({
      data: {
        id,
        ...itemWritableData(data),
        optionGroups: {
          create: groups.map((group) => ({
            id: `${id}:${group.key}`,
            key: group.key,
            title: group.title,
            icon: group.icon,
            badge: group.badge,
            columns: group.columns,
            isMulti: group.isMulti,
            maxSelections: group.maxSelections,
            sortOrder: group.sortOrder,
            isActive: group.isActive,
            options: {
              create: group.options.map((option) => ({
                id: `${id}:${group.key}:${option.value}`,
                ...option,
              })),
            },
          })),
        },
        ...(pairingIds.length
          ? {
              pairings: {
                create: pairingIds.map((pairedMenuItemId, index) => ({
                  pairedMenuItemId,
                  sortOrder: index,
                })),
              },
            }
          : {}),
      },
      include: { optionGroups: { include: { options: true } }, pairings: true },
    });
    await audit(tx, actor, "created", id, null, {
      name: data.name,
      category: data.category,
      priceCents: data.priceCents,
    });
    return row;
  });
}

export async function updateMenuItem(id, input, actor) {
  const data = parseOrThrow(createSchema, input);
  if (data.id && data.id !== id) {
    throw new AdminMenuError("The dish slug cannot be changed.", 422);
  }

  return withTransaction(async (tx) => {
    const before = await tx.menuItem.findUnique({
      where: { id },
      include: { optionGroups: { include: { options: true } }, pairings: true },
    });
    if (!before) throw new AdminMenuError("Dish not found.", 404, "NOT_FOUND");
    await assertCategory(tx, data.category);
    const pairings = await assertPairings(tx, id, data.pairingIds);

    await tx.menuItem.update({
      where: { id },
      data: itemWritableData(data),
    });

    const groups = normalizeGroups(data.optionGroups);
    await tx.menuOptionGroup.deleteMany({ where: { menuItemId: id } });
    for (const group of groups) {
      await tx.menuOptionGroup.create({
        data: {
          id: `${id}:${group.key}`,
          menuItemId: id,
          key: group.key,
          title: group.title,
          icon: group.icon,
          badge: group.badge,
          columns: group.columns,
          isMulti: group.isMulti,
          maxSelections: group.maxSelections,
          sortOrder: group.sortOrder,
          isActive: group.isActive,
          options: {
            create: group.options.map((option) => ({
              id: `${id}:${group.key}:${option.value}`,
              ...option,
            })),
          },
        },
      });
    }

    await tx.menuPairing.deleteMany({ where: { menuItemId: id } });
    if (pairings.length) {
      await tx.menuPairing.createMany({
        data: pairings.map((pairedMenuItemId, index) => ({
          menuItemId: id,
          pairedMenuItemId,
          sortOrder: index,
        })),
      });
    }

    const after = await tx.menuItem.findUnique({
      where: { id },
      include: { optionGroups: { include: { options: true } }, pairings: true },
    });
    await audit(tx, actor, "updated", id, {
      name: before.name,
      category: before.category,
      priceCents: before.priceCents,
      isActive: before.isActive,
    }, {
      name: after?.name,
      category: after?.category,
      priceCents: after?.priceCents,
      isActive: after?.isActive,
    });
    return after;
  });
}

export async function deactivateMenuItem(id, actor) {
  return withTransaction(async (tx) => {
    const before = await tx.menuItem.findUnique({ where: { id }, select: { id: true, name: true, isActive: true } });
    if (!before) throw new AdminMenuError("Dish not found.", 404, "NOT_FOUND");
    if (!before.isActive) return before;
    const after = await tx.menuItem.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true },
    });
    await audit(tx, actor, "deactivated", id, before, after);
    return after;
  });
}
