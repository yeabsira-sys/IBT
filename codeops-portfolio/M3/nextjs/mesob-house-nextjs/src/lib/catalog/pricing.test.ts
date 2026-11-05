import { describe, expect, it } from "vitest";
import {
  PriceError,
  resolvePriceFromRows,
  type PriceCandidate,
} from "@/lib/catalog/pricing";

const at = new Date("2026-11-05T09:00:00.000Z");

function row(overrides: Partial<PriceCandidate>): PriceCandidate {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    branchId: null,
    priceMinor: 10000,
    currency: "ETB",
    compareAtPriceMinor: null,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validUntil: null,
    ...overrides,
  };
}

const base = {
  branchId: "branch-1",
  at,
  currency: "ETB",
  basePriceMinor: 9000,
  baseCurrency: "ETB",
};

describe("resolvePriceFromRows", () => {
  it("prefers a valid branch price over a catalog price", () => {
    const result = resolvePriceFromRows({
      ...base,
      rows: [
        row({ branchId: null, priceMinor: 10000 }),
        row({ branchId: "branch-1", priceMinor: 12000 }),
      ],
    });
    expect(result.source).toBe("BRANCH");
    expect(result.priceMinor).toBe(12000);
  });

  it("falls back to the catalog price when no branch price exists", () => {
    const result = resolvePriceFromRows({
      ...base,
      rows: [row({ branchId: null, priceMinor: 11000 })],
    });
    expect(result.source).toBe("CATALOG");
    expect(result.priceMinor).toBe(11000);
  });

  it("falls back to the bootstrapping base price when no rows apply", () => {
    const result = resolvePriceFromRows({ ...base, rows: [] });
    expect(result.source).toBe("BASE");
    expect(result.priceMinor).toBe(9000);
  });

  it("ignores expired and future prices", () => {
    const result = resolvePriceFromRows({
      ...base,
      rows: [
        row({
          branchId: "branch-1",
          priceMinor: 5000,
          validUntil: new Date("2026-06-01T00:00:00.000Z"),
        }),
        row({
          branchId: "branch-1",
          priceMinor: 7000,
          validFrom: new Date("2027-01-01T00:00:00.000Z"),
        }),
        row({ branchId: null, priceMinor: 10000 }),
      ],
    });
    expect(result.source).toBe("CATALOG");
    expect(result.priceMinor).toBe(10000);
  });

  it("uses the newest valid branch price when windows overlap", () => {
    const result = resolvePriceFromRows({
      ...base,
      rows: [
        row({ branchId: "branch-1", priceMinor: 11000 }),
        row({
          branchId: "branch-1",
          priceMinor: 12500,
          validFrom: new Date("2026-10-01T00:00:00.000Z"),
        }),
      ],
    });
    expect(result.priceMinor).toBe(12500);
  });

  it("rejects a currency mismatch instead of converting implicitly", () => {
    expect(() =>
      resolvePriceFromRows({
        ...base,
        currency: "USD",
        rows: [row({ branchId: null, priceMinor: 1000, currency: "ETB" })],
      }),
    ).toThrow(PriceError);
  });
});
