import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  resolveAvailability,
  type AvailabilityWindow,
  type BranchItemState,
} from "@/lib/catalog/availability";
import {
  allergenDisclosure,
  dietaryDisclosure,
  type AllergenCandidate,
  type DietaryClaim,
} from "@/lib/catalog/disclosure";
import {
  resolvePriceFromRows,
  type PriceCandidate,
} from "@/lib/catalog/pricing";
import { resolvePromotion } from "@/lib/catalog/promotions";
import {
  calculateOrderTotals,
  type OrderLineForTotals,
  type OrderOptionSnapshot,
  type OrderTotals,
} from "@/lib/orders/totals";
import { ADDIS_TIME_ZONE } from "@/lib/time";

export type OrderOptionSelection = {
  groupKey: string;
  optionValue: string;
  quantity?: number;
};

export type CreateOrderItemInput = {
  menuItemSlug: string;
  quantity: number;
  options?: OrderOptionSelection[];
};

export type CreateOrderSnapshotInput = {
  actor: {
    userId: string;
    fullName: string;
    email: string;
    phone?: string | null;
    accountType: "CUSTOMER" | "STAFF";
  };
  restaurantSlug?: string;
  branchSlug?: string;
  fulfillment: "DELIVERY" | "PICKUP";
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  delivery?: {
    zoneId: string;
    addressLine: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
    scheduledFor?: Date | null;
  };
  paymentMethod: string;
  couponCode?: string | null;
  note?: string | null;
  items: CreateOrderItemInput[];
  currency?: string;
  at?: Date;
};

export type OrderSnapshotLine = {
  lineNo: number;
  menuItemId: string;
  menuItemSlug: string;
  itemName: string;
  itemDescription: string;
  sku: string | null;
  quantity: number;
  unitPriceMinor: number;
  lineGrossMinor: number;
  lineDiscountMinor: number;
  lineTaxMinor: number;
  lineTotalMinor: number;
  options: OrderOptionSnapshot[];
  allergens: string[];
  dietary: string[];
};

export type OrderSnapshot = {
  id: string;
  publicId: string;
  status: string;
  fulfillment: "DELIVERY" | "PICKUP";
  currency: string;
  totals: OrderTotals;
  lines: OrderSnapshotLine[];
  promotion: { id: string; code: string | null; name: string } | null;
  deliveryZoneName: string;
  createdAt: string;
};

export type OrderSnapshotErrorCode =
  | "EMPTY_ORDER"
  | "INVALID_ITEM"
  | "ITEM_NOT_FOUND"
  | "ITEM_UNAVAILABLE"
  | "INVALID_OPTION"
  | "INVALID_DELIVERY"
  | "DELIVERY_ZONE_REQUIRED"
  | "DELIVERY_ZONE_NOT_FOUND"
  | "MINIMUM_ORDER_NOT_MET"
  | "CURRENCY_MISMATCH"
  | "INVALID_CONTACT"
  | "TOTAL_MISMATCH";

export class OrderSnapshotError extends Error {
  readonly status: number;
  readonly code: OrderSnapshotErrorCode;

  constructor(code: OrderSnapshotErrorCode, message: string, status = 422) {
    super(message);
    this.name = "OrderSnapshotError";
    this.code = code;
    this.status = status;
  }
}

function requiredString(value: string | null | undefined, label: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new OrderSnapshotError("INVALID_CONTACT", `${label} is required.`);
  }
  return normalized;
}

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const value = key(row);
    const list = map.get(value) ?? [];
    list.push(row);
    map.set(value, list);
  }
  return map;
}

function optionAvailable(option: {
  branchAvailability: Array<{ isAvailable: boolean }>;
}): boolean {
  return (
    option.branchAvailability.length === 0 ||
    option.branchAvailability[0].isAvailable
  );
}

function makePublicId(): string {
  return `MH-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Creates an immutable order snapshot. The client sends dish slugs, quantities
 * and option values only; every price, tax, service charge, promotion and
 * disclosure is resolved from the database inside one transaction.
 */
export async function createOrderSnapshot(
  input: CreateOrderSnapshotInput,
): Promise<OrderSnapshot> {
  if (!input.items?.length) {
    throw new OrderSnapshotError("EMPTY_ORDER", "An order must contain at least one item.");
  }
  if (input.items.length > 50) {
    throw new OrderSnapshotError("INVALID_ITEM", "An order cannot contain more than 50 lines.");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const publicId = makePublicId();
    try {
      return await getPrisma().$transaction(
        (tx) => createInTransaction(tx, input, publicId),
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 2) continue;
      throw error;
    }
  }

  throw new OrderSnapshotError(
    "INVALID_ITEM",
    "Could not allocate a unique order number. Please try again.",
    500,
  );
}

async function createInTransaction(
  tx: Prisma.TransactionClient,
  input: CreateOrderSnapshotInput,
  publicId: string,
): Promise<OrderSnapshot> {
  const at = input.at ?? new Date();
  const restaurantSlug =
    input.restaurantSlug ?? process.env.MESOB_RESTAURANT_SLUG ?? "mesob-house";

  const restaurant = await tx.restaurant.findFirst({
    where: { slug: restaurantSlug, status: "ACTIVE" },
    select: {
      id: true,
      defaultCurrency: true,
      defaultTaxInclusive: true,
      name: true,
    },
  });
  if (!restaurant) {
    throw new OrderSnapshotError("ITEM_NOT_FOUND", "The restaurant is not available.", 404);
  }

  const branch = input.branchSlug
    ? await tx.branch.findFirst({
        where: {
          restaurantId: restaurant.id,
          slug: input.branchSlug,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          timezone: true,
          serviceChargeType: true,
          serviceChargeValue: true,
          serviceChargeTaxable: true,
        },
      })
    : ((await tx.branch.findFirst({
        where: {
          restaurantId: restaurant.id,
          isDefault: true,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          timezone: true,
          serviceChargeType: true,
          serviceChargeValue: true,
          serviceChargeTaxable: true,
        },
      })) ??
      (await tx.branch.findFirst({
        where: { restaurantId: restaurant.id, status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          timezone: true,
          serviceChargeType: true,
          serviceChargeValue: true,
          serviceChargeTaxable: true,
        },
      })));

  if (!branch) {
    throw new OrderSnapshotError("ITEM_NOT_FOUND", "The branch is not available.", 404);
  }

  const currency = (input.currency ?? restaurant.defaultCurrency)
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new OrderSnapshotError("CURRENCY_MISMATCH", "Use a three-letter currency code.");
  }

  const contact = {
    name: requiredString(input.contact?.name, "Contact name"),
    phone: requiredString(input.contact?.phone, "Contact phone"),
    email: requiredString(input.contact?.email, "Contact email"),
  };
  const note = String(input.note ?? "").trim().slice(0, 500);
  const paymentMethod = requiredString(input.paymentMethod, "Payment method").slice(0, 40);

  const requestedSlugs = [...new Set(input.items.map((item) => item.menuItemSlug.trim()))];
  if (requestedSlugs.some((slug) => !slug)) {
    throw new OrderSnapshotError("INVALID_ITEM", "Every line needs a dish.");
  }

  const menuItems = await tx.menuItem.findMany({
    where: {
      restaurantId: restaurant.id,
      slug: { in: requestedSlugs },
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      sku: true,
      basePriceMinor: true,
      compareAtPriceMinor: true,
      currency: true,
      isTaxInclusive: true,
      taxCategoryId: true,
    },
  });
  const itemBySlug = new Map(menuItems.map((item) => [item.slug, item]));

  for (const slug of requestedSlugs) {
    if (!itemBySlug.has(slug)) {
      throw new OrderSnapshotError(
        "ITEM_NOT_FOUND",
        `The dish "${slug}" is no longer on the menu.`,
        404,
      );
    }
  }

  const itemIds = menuItems.map((item) => item.id);
  const taxCategoryIds = [
    ...new Set(
      menuItems
        .map((item) => item.taxCategoryId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const [branchItems, prices, windows, optionLinks, allergens, dietary, taxCategories] =
    await Promise.all([
      tx.branchMenuItem.findMany({
        where: { branchId: branch.id, menuItemId: { in: itemIds } },
        select: {
          menuItemId: true,
          isEnabled: true,
          availabilityStatus: true,
          temporaryUnavailableUntil: true,
        },
      }),
      tx.menuItemPrice.findMany({
        where: {
          menuItemId: { in: itemIds },
          currency,
          validFrom: { lte: at },
          AND: [
            { OR: [{ validUntil: null }, { validUntil: { gt: at } }] },
            { OR: [{ branchId: branch.id }, { branchId: null }] },
          ],
        },
        orderBy: [{ validFrom: "desc" }],
        select: {
          id: true,
          menuItemId: true,
          branchId: true,
          priceMinor: true,
          currency: true,
          compareAtPriceMinor: true,
          validFrom: true,
          validUntil: true,
        },
      }),
      tx.menuItemAvailability.findMany({
        where: { branchId: branch.id, menuItemId: { in: itemIds } },
        select: {
          menuItemId: true,
          dayOfWeek: true,
          availableFrom: true,
          availableUntil: true,
          isAvailable: true,
          validFrom: true,
          validUntil: true,
        },
      }),
      tx.menuItemOptionGroup.findMany({
        where: { menuItemId: { in: itemIds } },
        orderBy: { sortOrder: "asc" },
        include: {
          group: {
            include: {
              options: {
                orderBy: { sortOrder: "asc" },
                include: {
                  branchAvailability: { where: { branchId: branch.id } },
                },
              },
            },
          },
        },
      }),
      tx.menuItemAllergen.findMany({
        where: { menuItemId: { in: itemIds } },
        include: { allergen: true },
      }),
      tx.menuItemDietaryAttribute.findMany({
        where: { menuItemId: { in: itemIds } },
        include: { dietaryAttribute: true },
      }),
      taxCategoryIds.length
        ? tx.taxCategory.findMany({
            where: { id: { in: taxCategoryIds } },
            include: {
              rates: {
                where: {
                  validFrom: { lte: at },
                  OR: [{ validUntil: null }, { validUntil: { gt: at } }],
                },
                orderBy: { validFrom: "desc" },
                take: 1,
              },
            },
          })
        : Promise.resolve([]),
    ]);

  const branchByItem = new Map(branchItems.map((row) => [row.menuItemId, row]));
  const pricesByItem = groupBy(prices, (row) => row.menuItemId);
  const windowsByItem = groupBy(windows, (row) => row.menuItemId);
  const linksByItem = groupBy(optionLinks, (row) => row.menuItemId);
  const allergensByItem = groupBy(allergens, (row) => row.menuItemId);
  const dietaryByItem = groupBy(dietary, (row) => row.menuItemId);
  const taxRateByCategory = new Map(
    taxCategories.map((category) => [
      category.id,
      category.rates[0]?.rateBasisPoints ?? 0,
    ]),
  );

  const lines: OrderLineForTotals[] = [];

  for (const requested of input.items) {
    const menuItem = itemBySlug.get(requested.menuItemSlug.trim());
    if (!menuItem) continue;

    const quantity = requested.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      throw new OrderSnapshotError(
        "INVALID_ITEM",
        `Choose a quantity between 1 and 50 for ${menuItem.name}.`,
      );
    }

    const availabilityState =
      branchByItem.get(menuItem.id) ?? null;
    const availability = resolveAvailability({
      branchItem: availabilityState as BranchItemState | null,
      windows: (windowsByItem.get(menuItem.id) ?? []).map(
        (row): AvailabilityWindow => ({
          dayOfWeek: row.dayOfWeek,
          availableFrom: row.availableFrom,
          availableUntil: row.availableUntil,
          isAvailable: row.isAvailable,
          validFrom: row.validFrom,
          validUntil: row.validUntil,
        }),
      ),
      at,
      timeZone: branch.timezone ?? ADDIS_TIME_ZONE,
    });
    if (!availability.available) {
      throw new OrderSnapshotError(
        "ITEM_UNAVAILABLE",
        `${menuItem.name} is not available at ${branch.name} right now.`,
        409,
      );
    }

    const effectivePrice = resolvePriceFromRows({
      rows: (pricesByItem.get(menuItem.id) ?? []).map(
        (row): PriceCandidate => ({
          id: row.id,
          branchId: row.branchId,
          priceMinor: row.priceMinor,
          currency: row.currency,
          compareAtPriceMinor: row.compareAtPriceMinor,
          validFrom: row.validFrom,
          validUntil: row.validUntil,
        }),
      ),
      branchId: branch.id,
      at,
      currency,
      basePriceMinor: menuItem.basePriceMinor,
      baseCompareAtPriceMinor: menuItem.compareAtPriceMinor,
      baseCurrency: menuItem.currency,
    });

    const requestedOptions = new Map<string, Map<string, number>>();
    for (const selection of requested.options ?? []) {
      const groupKey = String(selection.groupKey ?? "").trim();
      const optionValue = String(selection.optionValue ?? "").trim();
      if (!groupKey || !optionValue) {
        throw new OrderSnapshotError("INVALID_OPTION", "Choose a valid option.");
      }
      const optionQuantity = selection.quantity ?? 1;
      if (!Number.isInteger(optionQuantity) || optionQuantity < 1) {
        throw new OrderSnapshotError("INVALID_OPTION", "Option quantities must be positive.");
      }
      const group = requestedOptions.get(groupKey) ?? new Map<string, number>();
      if (group.has(optionValue)) {
        throw new OrderSnapshotError("INVALID_OPTION", "The same option cannot be selected twice.");
      }
      group.set(optionValue, optionQuantity);
      requestedOptions.set(groupKey, group);
    }

    const selectedOptions: OrderOptionSnapshot[] = [];
    const seenGroups = new Set<string>();

    for (const link of linksByItem.get(menuItem.id) ?? []) {
      const group = link.group;
      if (!group.isActive || group.deletedAt) {
        if (requestedOptions.has(group.key)) {
          throw new OrderSnapshotError("INVALID_OPTION", `${group.title} is no longer available.`);
        }
        continue;
      }

      seenGroups.add(group.key);
      const isRequired = link.isRequiredOverride ?? group.isRequired;
      const minSelections = link.minSelectionsOverride ?? group.minSelections;
      const maxSelections = link.maxSelectionsOverride ?? group.maxSelections;
      const requestedGroup = requestedOptions.get(group.key);
      const availableOptions = group.options.filter(
        (option) => option.isActive && optionAvailable(option),
      );

      const chosen = new Map<string, number>();
      if (requestedGroup?.size) {
        for (const [optionValue, optionQuantity] of requestedGroup) {
          const option = availableOptions.find((row) => row.value === optionValue);
          if (!option) {
            throw new OrderSnapshotError(
              "INVALID_OPTION",
              `${optionValue} is not available for ${group.title}.`,
            );
          }
          if (optionQuantity > option.maxQuantity) {
            throw new OrderSnapshotError(
              "INVALID_OPTION",
              `You can choose at most ${option.maxQuantity} of ${option.title}.`,
            );
          }
          chosen.set(option.value, optionQuantity);
        }
      } else {
        for (const option of availableOptions.filter((row) => row.isDefault)) {
          chosen.set(option.value, 1);
        }
      }

      const chosenCount = [...chosen.values()].reduce((sum, value) => sum + value, 0);
      if (group.selectionType === "SINGLE" && chosenCount > 1) {
        throw new OrderSnapshotError("INVALID_OPTION", `Choose one option for ${group.title}.`);
      }
      if (chosenCount > maxSelections) {
        throw new OrderSnapshotError(
          "INVALID_OPTION",
          `Choose at most ${maxSelections} option${maxSelections === 1 ? "" : "s"} for ${group.title}.`,
        );
      }
      if (chosenCount < minSelections || (isRequired && chosenCount === 0)) {
        throw new OrderSnapshotError(
          "INVALID_OPTION",
          `Choose at least ${Math.max(1, minSelections)} option${Math.max(1, minSelections) === 1 ? "" : "s"} for ${group.title}.`,
        );
      }

      for (const [optionValue, optionQuantity] of chosen) {
        const option = group.options.find((row) => row.value === optionValue);
        if (!option) continue;
        selectedOptions.push({
          groupKey: group.key,
          groupTitle: group.title,
          optionValue: option.value,
          optionTitle: option.title,
          priceDeltaMinor: option.priceDeltaMinor,
          quantity: optionQuantity,
        });
      }
    }

    for (const groupKey of requestedOptions.keys()) {
      if (!seenGroups.has(groupKey)) {
        throw new OrderSnapshotError("INVALID_OPTION", `Unknown option group: ${groupKey}.`);
      }
    }

    const optionDelta = selectedOptions.reduce(
      (sum, option) => sum + option.priceDeltaMinor * option.quantity,
      0,
    );
    const unitPriceMinor = effectivePrice.priceMinor + optionDelta;
    if (unitPriceMinor < 0) {
      throw new OrderSnapshotError("INVALID_OPTION", "The selected options produce an invalid price.");
    }

    const itemAllergens: AllergenCandidate[] = (allergensByItem.get(menuItem.id) ?? []).map(
      (row) => ({
        code: row.allergen.code,
        name: row.allergen.name,
        source: row.source,
        isConfirmed: row.isConfirmed,
        notes: row.notes,
      }),
    );
    const itemDietary: DietaryClaim[] = (dietaryByItem.get(menuItem.id) ?? []).map((row) => ({
      code: row.dietaryAttribute.code,
      name: row.dietaryAttribute.name,
      verificationStatus: row.verificationStatus,
    }));

    const allergenFacts = allergenDisclosure(itemAllergens);
    const dietaryFacts = dietaryDisclosure(itemDietary);
    const taxRateBasisPoints = menuItem.taxCategoryId
      ? taxRateByCategory.get(menuItem.taxCategoryId) ?? 0
      : 0;

    lines.push({
      menuItemId: menuItem.id,
      menuItemSlug: menuItem.slug,
      itemName: menuItem.name,
      itemDescription: menuItem.description,
      sku: menuItem.sku,
      quantity,
      unitPriceMinor,
      taxRateBasisPoints,
      taxInclusive: menuItem.isTaxInclusive,
      options: selectedOptions,
      allergens: allergenFacts.contains,
      dietary: dietaryFacts.verified.map((row) => row.name),
      allergenSnapshot: allergenFacts,
      dietarySnapshot: dietaryFacts,
    });
  }

  if (lines.length === 0) {
    throw new OrderSnapshotError("EMPTY_ORDER", "An order must contain at least one item.");
  }

  const rawSubtotalMinor = lines.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0,
  );

  let deliveryZone: {
    id: string;
    name: string;
    baseFeeMinor: number;
    minOrderMinor: number;
  } | null = null;
  let deliveryAddressLine = "";
  let deliveryLandmark = "";
  let deliveryLatitude: number | null = null;
  let deliveryLongitude: number | null = null;
  let scheduledFor: Date | null = null;

  if (input.fulfillment === "DELIVERY") {
    if (!input.delivery?.zoneId) {
      throw new OrderSnapshotError(
        "DELIVERY_ZONE_REQUIRED",
        "Choose a delivery zone before placing the order.",
      );
    }
    if (!String(input.delivery.addressLine ?? "").trim()) {
      throw new OrderSnapshotError("INVALID_DELIVERY", "Enter the delivery address.");
    }

    deliveryZone = await tx.deliveryZone.findFirst({
      where: {
        id: input.delivery.zoneId,
        branchId: branch.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        baseFeeMinor: true,
        minOrderMinor: true,
      },
    });
    if (!deliveryZone) {
      throw new OrderSnapshotError(
        "DELIVERY_ZONE_NOT_FOUND",
        "That delivery zone is not available for this branch.",
        404,
      );
    }
    if (rawSubtotalMinor < deliveryZone.minOrderMinor) {
      throw new OrderSnapshotError(
        "MINIMUM_ORDER_NOT_MET",
        `The minimum order for ${deliveryZone.name} is ${(deliveryZone.minOrderMinor / 100).toFixed(2)} ${currency}.`,
      );
    }
    deliveryAddressLine = String(input.delivery.addressLine).trim();
    deliveryLandmark = String(input.delivery.landmark ?? "").trim().slice(0, 300);
    deliveryLatitude = input.delivery.latitude ?? null;
    deliveryLongitude = input.delivery.longitude ?? null;
    scheduledFor = input.delivery.scheduledFor ?? null;
  }

  const promotion = await resolvePromotion(tx, {
    restaurantId: restaurant.id,
    branchId: branch.id,
    subtotalMinor: rawSubtotalMinor,
    code: input.couponCode,
    at,
  });

  const totals = calculateOrderTotals({
    lines,
    currency,
    serviceChargeType: branch.serviceChargeType,
    serviceChargeValue: branch.serviceChargeValue,
    serviceChargeTaxable: branch.serviceChargeTaxable,
    fulfillment: input.fulfillment,
    deliveryFeeMinor: deliveryZone?.baseFeeMinor ?? 0,
    discountMinor: promotion.discountMinor,
  });

  const order = await tx.order.create({
    data: {
      publicId,
      restaurant: { connect: { id: restaurant.id } },
      branch: { connect: { id: branch.id } },
      user: { connect: { id: input.actor.userId } },
      status: "RECEIVED",
      fulfillment: input.fulfillment,
      paymentMethod,
      paymentStatus: "PENDING",
      ...(promotion.promotion
        ? { promotion: { connect: { id: promotion.promotion.id } } }
        : {}),
      ...(deliveryZone
        ? { deliveryZone: { connect: { id: deliveryZone.id } } }
        : {}),
      customerName: input.actor.fullName,
      customerEmail: input.actor.email,
      customerPhone: input.actor.phone ?? "",
      contactName: contact.name,
      contactPhone: contact.phone,
      contactEmail: contact.email,
      deliveryAddressLine,
      deliveryLandmark,
      deliveryZoneName: deliveryZone?.name ?? "",
      deliveryLatitude,
      deliveryLongitude,
      note,
      scheduledFor,
      subtotalMinor: totals.subtotalMinor,
      discountMinor: totals.discountMinor,
      serviceChargeMinor: totals.serviceChargeMinor,
      taxMinor: totals.taxMinor,
      deliveryFeeMinor: totals.deliveryFeeMinor,
      currency: totals.currency,
      taxInclusive: totals.taxInclusive,
      taxRateBasisPoints: totals.taxRateBasisPoints,
      serviceChargeTaxable: totals.serviceChargeTaxable,
      items: {
        create: totals.lines.map((line, index) => ({
          lineNo: index + 1,
          menuItem: { connect: { id: line.menuItemId } },
          menuItemSlug: line.menuItemSlug,
          itemName: line.itemName,
          itemDescription: line.itemDescription,
          sku: line.sku,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
          options: line.options as unknown as Prisma.InputJsonValue,
          substitutions: [] as Prisma.InputJsonValue,
          allergens: (line.allergenSnapshot ?? []) as Prisma.InputJsonValue,
          dietary: (line.dietarySnapshot ?? []) as Prisma.InputJsonValue,
          taxMinor: line.lineTaxMinor,
          discountMinor: line.lineDiscountMinor,
        })),
      },
      statusHistory: {
        create: {
          status: "RECEIVED",
          changedByUser: { connect: { id: input.actor.userId } },
          changedByName: input.actor.fullName,
          note: "Order placed",
        },
      },
    },
    select: {
      id: true,
      publicId: true,
      status: true,
      totalMinor: true,
      createdAt: true,
    },
  });

  if (order.totalMinor !== null && order.totalMinor !== totals.totalMinor) {
    throw new OrderSnapshotError(
      "TOTAL_MISMATCH",
      "The order total could not be verified. Please try again.",
      500,
    );
  }

  await tx.auditLog.create({
    data: {
      restaurant: { connect: { id: restaurant.id } },
      branch: { connect: { id: branch.id } },
      actor: { connect: { id: input.actor.userId } },
      entityType: "order",
      entityId: order.id,
      action: "created",
      actorRole: input.actor.accountType,
      afterData: {
        publicId,
        totalMinor: totals.totalMinor,
        currency: totals.currency,
        itemCount: totals.lines.length,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    id: order.id,
    publicId: order.publicId,
    status: order.status,
    fulfillment: input.fulfillment,
    currency: totals.currency,
    totals,
    lines: totals.lines.map((line, index) => ({
      lineNo: index + 1,
      menuItemId: line.menuItemId,
      menuItemSlug: line.menuItemSlug,
      itemName: line.itemName,
      itemDescription: line.itemDescription,
      sku: line.sku,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      lineGrossMinor: line.lineGrossMinor,
      lineDiscountMinor: line.lineDiscountMinor,
      lineTaxMinor: line.lineTaxMinor,
      lineTotalMinor: line.lineTotalMinor,
      options: line.options,
      allergens: line.allergens,
      dietary: line.dietary,
    })),
    promotion: promotion.promotion
      ? {
          id: promotion.promotion.id,
          code: promotion.promotion.code,
          name: promotion.promotion.name,
        }
      : null,
    deliveryZoneName: deliveryZone?.name ?? "",
    createdAt: order.createdAt.toISOString(),
  };
}
