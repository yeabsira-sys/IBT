import { describe, expect, it } from "vitest";
import {
  resolveAvailability,
  type AvailabilityWindow,
  type BranchItemState,
} from "@/lib/catalog/availability";

const branchItem: BranchItemState = {
  isEnabled: true,
  availabilityStatus: "AVAILABLE",
  temporaryUnavailableUntil: null,
};

function window(overrides: Partial<AvailabilityWindow> = {}): AvailabilityWindow {
  return {
    dayOfWeek: 4,
    availableFrom: "11:30",
    availableUntil: "15:00",
    isAvailable: true,
    validFrom: null,
    validUntil: null,
    ...overrides,
  };
}

// 09:00 UTC is 12:00 in Addis Ababa (UTC+3). 5 Nov 2026 is a Thursday.
const lunch = new Date("2026-11-05T09:00:00.000Z");

describe("resolveAvailability", () => {
  it("treats a missing branch item as not listed", () => {
    expect(
      resolveAvailability({ branchItem: null, windows: [], at: lunch }),
    ).toEqual({ available: false, reason: "NOT_LISTED" });
  });

  it("honours disabled and stock states", () => {
    expect(
      resolveAvailability({
        branchItem: { ...branchItem, isEnabled: false },
        windows: [],
        at: lunch,
      }).reason,
    ).toBe("DISABLED");
    expect(
      resolveAvailability({
        branchItem: { ...branchItem, availabilityStatus: "OUT_OF_STOCK" },
        windows: [],
        at: lunch,
      }).reason,
    ).toBe("OUT_OF_STOCK");
  });

  it("restores a temporary unavailability after its timestamp", () => {
    expect(
      resolveAvailability({
        branchItem: {
          ...branchItem,
          availabilityStatus: "TEMPORARILY_UNAVAILABLE",
          temporaryUnavailableUntil: new Date("2026-11-05T08:00:00.000Z"),
        },
        windows: [],
        at: lunch,
      }).available,
    ).toBe(true);

    expect(
      resolveAvailability({
        branchItem: {
          ...branchItem,
          availabilityStatus: "TEMPORARILY_UNAVAILABLE",
          temporaryUnavailableUntil: new Date("2026-11-05T10:00:00.000Z"),
        },
        windows: [],
        at: lunch,
      }).reason,
    ).toBe("TEMPORARILY_UNAVAILABLE");
  });

  it("is available when no schedule rows exist", () => {
    expect(
      resolveAvailability({ branchItem, windows: [], at: lunch }),
    ).toEqual({ available: true, reason: "AVAILABLE" });
  });

  it("requires a matching day and time window", () => {
    expect(
      resolveAvailability({ branchItem, windows: [window()], at: lunch })
        .available,
    ).toBe(true);
    expect(
      resolveAvailability({
        branchItem,
        windows: [window({ dayOfWeek: 5 })],
        at: lunch,
      }).reason,
    ).toBe("OUTSIDE_WINDOW");
    expect(
      resolveAvailability({
        branchItem,
        windows: [window({ availableFrom: "18:00", availableUntil: "22:00" })],
        at: lunch,
      }).reason,
    ).toBe("OUTSIDE_WINDOW");
  });

  it("supports overnight windows", () => {
    const late = new Date("2026-11-05T20:30:00.000Z"); // 23:30 Addis
    expect(
      resolveAvailability({
        branchItem,
        windows: [window({ availableFrom: "22:00", availableUntil: "02:00" })],
        at: late,
      }).available,
    ).toBe(true);
  });

  it("supports explicit blackout windows", () => {
    expect(
      resolveAvailability({
        branchItem,
        windows: [window({ isAvailable: false })],
        at: lunch,
      }).reason,
    ).toBe("OUTSIDE_WINDOW");
  });

  it("ignores schedule rows outside their effective date window", () => {
    expect(
      resolveAvailability({
        branchItem,
        windows: [
          window({
            dayOfWeek: 5,
            validUntil: new Date("2026-01-01T00:00:00.000Z"),
          }),
        ],
        at: lunch,
      }).available,
    ).toBe(true);
  });
});
