import { describe, expect, it } from "vitest";
import {
  allergenDisclosure,
  dietaryDisclosure,
  type AllergenCandidate,
} from "@/lib/catalog/disclosure";

function allergen(overrides: Partial<AllergenCandidate>): AllergenCandidate {
  return {
    code: "milk",
    name: "Milk",
    source: "INGREDIENT",
    isConfirmed: false,
    ...overrides,
  };
}

describe("allergenDisclosure", () => {
  it("never treats an empty list as allergen-free", () => {
    const result = allergenDisclosure([]);
    expect(result.status).toBe("NOT_CONFIRMED");
    expect(result.message).toBe("Allergen information has not been confirmed.");
    expect(result.contains).toEqual([]);
  });

  it("does not publish unconfirmed candidates as confirmed allergens", () => {
    const result = allergenDisclosure([
      allergen({ code: "gluten", name: "Cereals containing gluten" }),
    ]);
    expect(result.status).toBe("NOT_CONFIRMED");
    expect(result.contains).toEqual([]);
    expect(result.mayContain).toEqual(["Cereals containing gluten"]);
  });

  it("publishes confirmed allergens", () => {
    const result = allergenDisclosure([
      allergen({ isConfirmed: true }),
      allergen({
        code: "gluten",
        name: "Cereals containing gluten",
        isConfirmed: true,
      }),
    ]);
    expect(result.status).toBe("CONFIRMED");
    expect(result.contains).toEqual(["Milk", "Cereals containing gluten"]);
  });

  it("marks a partially confirmed list as under review", () => {
    const result = allergenDisclosure([
      allergen({ isConfirmed: true }),
      allergen({ code: "eggs", name: "Eggs" }),
    ]);
    expect(result.status).toBe("CONFIRMED");
    expect(result.message).toContain("Additional allergen information is under review");
    expect(result.mayContain).toEqual(["Eggs"]);
  });
});

describe("dietaryDisclosure", () => {
  it("only exposes verified claims", () => {
    const result = dietaryDisclosure([
      { code: "FASTING", name: "Fasting", verificationStatus: "VERIFIED" },
      { code: "VEGAN", name: "Vegan", verificationStatus: "UNVERIFIED" },
    ]);
    expect(result.verified.map((row) => row.code)).toEqual(["FASTING"]);
    expect(result.pending.map((row) => row.code)).toEqual(["VEGAN"]);
  });
});
