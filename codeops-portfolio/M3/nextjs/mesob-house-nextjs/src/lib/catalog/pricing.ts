import type { PrismaClient } from "@prisma/client";

export type PriceSource = "BRANCH" | "CATALOG" | "BASE";

export type PriceCandidate = {
  id?: string;
  branchId: string | null;
  priceMinor: number;
  currency: string;
  compareAtPriceMinor: number | null;
  validFrom: Date;
  validUntil: Date | null;
};

export type EffectivePrice = {
  priceId: string | null;
  priceMinor: number;
  compareAtPriceMinor: number | null;
  currency: string;
  source: PriceSource;
  validFrom: Date | null;
  validUntil: Date | null;
};

export type PriceDb = Pick<PrismaClient, "menuItem" | "menuItemPrice">;

export class PriceError extends Error {
  readonly code: "ITEM_NOT_FOUND" | "CURRENCY_MISMATCH" | "NO_PRICE";

  constructor(
    code: PriceError["code"],
    message: string,
  ) {
    super(message);
    this.name = "PriceError";
    this.code = code;
  }
}

function withinWindow(candidate: PriceCandidate, at: Date): boolean {
  if (candidate.validFrom.getTime() > at.getTime()) return false;
  if (candidate.validUntil && candidate.validUntil.getTime() <= at.getTime()) {
    return false;
  }
  return true;
}

function latest(candidates: PriceCandidate[]): PriceCandidate | null {
  return (
    candidates
      .slice()
      .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0] ??
    null
  );
}

/**
 * Branch-specific price wins over a catalog-wide price. Price history is
 * effective-dated; an expired row is never silently used. The base price on
 * MenuItem is only a bootstrapping fallback when no price row exists.
 */
export function resolvePriceFromRows({
  rows,
  branchId,
  at,
  currency,
  basePriceMinor,
  baseCompareAtPriceMinor = null,
  baseCurrency,
}: {
  rows: PriceCandidate[];
  branchId: string;
  at: Date;
  currency: string;
  basePriceMinor: number;
  baseCompareAtPriceMinor?: number | null;
  baseCurrency: string;
}): EffectivePrice {
  const normalizedCurrency = currency.trim().toUpperCase();
  const base = baseCurrency.trim().toUpperCase();
  if (base !== normalizedCurrency) {
    throw new PriceError(
      "CURRENCY_MISMATCH",
      `The dish is priced in ${base}, but the order is in ${normalizedCurrency}.`,
    );
  }

  const active = rows.filter(
    (row) =>
      row.currency.trim().toUpperCase() === normalizedCurrency &&
      withinWindow(row, at),
  );

  const branchPrice = latest(active.filter((row) => row.branchId === branchId));
  if (branchPrice) {
    return {
      priceId: branchPrice.id ?? null,
      priceMinor: branchPrice.priceMinor,
      compareAtPriceMinor: branchPrice.compareAtPriceMinor,
      currency: normalizedCurrency,
      source: "BRANCH",
      validFrom: branchPrice.validFrom,
      validUntil: branchPrice.validUntil,
    };
  }

  const catalogPrice = latest(active.filter((row) => row.branchId === null));
  if (catalogPrice) {
    return {
      priceId: catalogPrice.id ?? null,
      priceMinor: catalogPrice.priceMinor,
      compareAtPriceMinor: catalogPrice.compareAtPriceMinor,
      currency: normalizedCurrency,
      source: "CATALOG",
      validFrom: catalogPrice.validFrom,
      validUntil: catalogPrice.validUntil,
    };
  }

  return {
    priceId: null,
    priceMinor: basePriceMinor,
    compareAtPriceMinor: baseCompareAtPriceMinor,
    currency: normalizedCurrency,
    source: "BASE",
    validFrom: null,
    validUntil: null,
  };
}

export async function resolveMenuItemPrice(
  db: PriceDb,
  {
    menuItemId,
    branchId,
    at = new Date(),
    currency = "ETB",
  }: {
    menuItemId: string;
    branchId: string;
    at?: Date;
    currency?: string;
  },
): Promise<EffectivePrice> {
  const item = await db.menuItem.findUnique({
    where: { id: menuItemId },
    select: {
      basePriceMinor: true,
      compareAtPriceMinor: true,
      currency: true,
      deletedAt: true,
    },
  });

  if (!item || item.deletedAt) {
    throw new PriceError("ITEM_NOT_FOUND", "That dish is no longer available.");
  }

  const normalizedCurrency = currency.trim().toUpperCase();
  if (item.currency.trim().toUpperCase() !== normalizedCurrency) {
    throw new PriceError(
      "CURRENCY_MISMATCH",
      `The dish is priced in ${item.currency}, but the order is in ${normalizedCurrency}.`,
    );
  }

  const rows = await db.menuItemPrice.findMany({
    where: {
      menuItemId,
      currency: normalizedCurrency,
      validFrom: { lte: at },
      AND: [
        { OR: [{ validUntil: null }, { validUntil: { gt: at } }] },
        { OR: [{ branchId }, { branchId: null }] },
      ],
    },
    orderBy: [{ validFrom: "desc" }],
    select: {
      id: true,
      branchId: true,
      priceMinor: true,
      currency: true,
      compareAtPriceMinor: true,
      validFrom: true,
      validUntil: true,
    },
  });

  return resolvePriceFromRows({
    rows,
    branchId,
    at,
    currency: normalizedCurrency,
    basePriceMinor: item.basePriceMinor,
    baseCompareAtPriceMinor: item.compareAtPriceMinor,
    baseCurrency: item.currency,
  });
}
