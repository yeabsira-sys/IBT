import type { PrismaClient } from "@prisma/client";
import {
  ADDIS_TIME_ZONE,
  isWithinDateWindow,
  isWithinTimeWindow,
  localTimeParts,
} from "@/lib/time";

export type AvailabilityStatus =
  | "AVAILABLE"
  | "OUT_OF_STOCK"
  | "TEMPORARILY_UNAVAILABLE"
  | "DISCONTINUED";

export type BranchItemState = {
  isEnabled: boolean;
  availabilityStatus: AvailabilityStatus;
  temporaryUnavailableUntil: Date | null;
};

export type AvailabilityWindow = {
  dayOfWeek: number | null;
  availableFrom: string;
  availableUntil: string;
  isAvailable: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
};

export type AvailabilityReason =
  | "AVAILABLE"
  | "NOT_LISTED"
  | "DISABLED"
  | "OUT_OF_STOCK"
  | "TEMPORARILY_UNAVAILABLE"
  | "DISCONTINUED"
  | "OUTSIDE_WINDOW";

export type AvailabilityResult = {
  available: boolean;
  reason: AvailabilityReason;
};

export type AvailabilityDb = Pick<
  PrismaClient,
  "branch" | "branchMenuItem" | "menuItemAvailability"
>;

const AVAILABLE: AvailabilityResult = {
  available: true,
  reason: "AVAILABLE",
};

export function resolveAvailability({
  branchItem,
  windows,
  at,
  timeZone = ADDIS_TIME_ZONE,
}: {
  branchItem: BranchItemState | null;
  windows: AvailabilityWindow[];
  at: Date;
  timeZone?: string;
}): AvailabilityResult {
  if (!branchItem) {
    return { available: false, reason: "NOT_LISTED" };
  }
  if (!branchItem.isEnabled) {
    return { available: false, reason: "DISABLED" };
  }

  switch (branchItem.availabilityStatus) {
    case "DISCONTINUED":
      return { available: false, reason: "DISCONTINUED" };
    case "OUT_OF_STOCK":
      return { available: false, reason: "OUT_OF_STOCK" };
    case "TEMPORARILY_UNAVAILABLE":
      if (
        branchItem.temporaryUnavailableUntil &&
        at.getTime() >= branchItem.temporaryUnavailableUntil.getTime()
      ) {
        break;
      }
      return { available: false, reason: "TEMPORARILY_UNAVAILABLE" };
    case "AVAILABLE":
      break;
  }

  const validWindows = windows.filter((window) =>
    isWithinDateWindow(at, window.validFrom, window.validUntil),
  );
  if (validWindows.length === 0) return AVAILABLE;

  const local = localTimeParts(at, timeZone);
  const matching = validWindows.filter((window) => {
    if (window.dayOfWeek !== null && window.dayOfWeek !== local.dayOfWeek) {
      return false;
    }
    return isWithinTimeWindow(
      window.availableFrom,
      window.availableUntil,
      local.minutes,
    );
  });

  if (matching.some((window) => !window.isAvailable)) {
    return { available: false, reason: "OUTSIDE_WINDOW" };
  }
  if (matching.some((window) => window.isAvailable)) return AVAILABLE;
  return { available: false, reason: "OUTSIDE_WINDOW" };
}

export async function resolveMenuItemAvailability(
  db: AvailabilityDb,
  {
    branchId,
    menuItemId,
    at = new Date(),
    timeZone,
  }: {
    branchId: string;
    menuItemId: string;
    at?: Date;
    timeZone?: string;
  },
): Promise<AvailabilityResult> {
  const [branch, branchItem, windows] = await Promise.all([
    db.branch.findUnique({
      where: { id: branchId },
      select: { timezone: true, status: true },
    }),
    db.branchMenuItem.findUnique({
      where: { branchId_menuItemId: { branchId, menuItemId } },
      select: {
        isEnabled: true,
        availabilityStatus: true,
        temporaryUnavailableUntil: true,
      },
    }),
    db.menuItemAvailability.findMany({
      where: { branchId, menuItemId },
      select: {
        dayOfWeek: true,
        availableFrom: true,
        availableUntil: true,
        isAvailable: true,
        validFrom: true,
        validUntil: true,
      },
    }),
  ]);

  if (!branch || branch.status !== "ACTIVE") {
    return { available: false, reason: "NOT_LISTED" };
  }

  return resolveAvailability({
    branchItem,
    windows,
    at,
    timeZone: timeZone ?? branch.timezone ?? ADDIS_TIME_ZONE,
  });
}
