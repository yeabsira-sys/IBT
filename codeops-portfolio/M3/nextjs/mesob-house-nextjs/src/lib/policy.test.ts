import { describe, expect, it } from "vitest";
import {
  assertCan,
  can,
  legacyRoleFor,
  PolicyError,
  type Actor,
  type RoleGrant,
} from "@/lib/policy";

const restaurantId = "restaurant-1";
const branchId = "branch-1";

function actor(...grants: RoleGrant[]): Actor {
  return {
    userId: "user-1",
    accountType: "STAFF",
    grants,
  };
}

const owner = actor({ role: "RESTAURANT_OWNER", restaurantId, branchId: null });
const kitchen = actor({ role: "KITCHEN_STAFF", restaurantId, branchId });
const branchManager = actor({
  role: "BRANCH_MANAGER",
  restaurantId,
  branchId,
});
const delivery = actor({ role: "DELIVERY_STAFF", restaurantId, branchId });

describe("can", () => {
  it("gives owners restaurant-wide permissions", () => {
    expect(can(owner, "tax.manage", { restaurantId })).toBe(true);
    expect(can(owner, "price.manage", { restaurantId, branchId })).toBe(true);
  });

  it("lets kitchen staff change availability but not prices", () => {
    expect(
      can(kitchen, "availability.manage", { restaurantId, branchId }),
    ).toBe(true);
    expect(can(kitchen, "price.manage", { restaurantId, branchId })).toBe(false);
  });

  it("keeps a branch manager inside their branch", () => {
    expect(
      can(branchManager, "price.manage", { restaurantId, branchId }),
    ).toBe(true);
    expect(
      can(branchManager, "price.manage", {
        restaurantId,
        branchId: "branch-2",
      }),
    ).toBe(false);
  });

  it("does not let a branch grant satisfy a restaurant-wide action", () => {
    expect(can(branchManager, "menu.manage", { restaurantId })).toBe(false);
  });

  it("limits delivery staff to their delivery permissions", () => {
    expect(
      can(delivery, "order.update.delivery", { restaurantId, branchId }),
    ).toBe(true);
    expect(can(delivery, "order.update.kitchen", { restaurantId, branchId })).toBe(
      false,
    );
  });

  it("denies customers and staff without grants", () => {
    expect(
      can(
        { userId: "customer", accountType: "CUSTOMER", grants: [] },
        "menu.read",
        { restaurantId, branchId },
      ),
    ).toBe(false);
    expect(can(null, "menu.read", { restaurantId })).toBe(false);
  });
});

describe("assertCan", () => {
  it("throws PolicyError when permission is missing", () => {
    expect(() =>
      assertCan(kitchen, "price.manage", { restaurantId, branchId }),
    ).toThrow(PolicyError);
  });
});

describe("legacyRoleFor", () => {
  it("maps the richer role model to the old UI roles", () => {
    expect(legacyRoleFor(owner)).toBe("admin");
    expect(legacyRoleFor(kitchen)).toBe("employee");
    expect(
      legacyRoleFor({ userId: "guest", accountType: "CUSTOMER", grants: [] }),
    ).toBe("customer");
  });
});
