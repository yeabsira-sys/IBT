/**
 * Pure authorization policy for the restaurant back office.
 *
 * Keep this module free of database and Next.js imports so it can be unit
 * tested and reused by route handlers, server actions and UI guards.
 */

export const ACCOUNT_TYPES = ["CUSTOMER", "STAFF"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const STAFF_ROLES = [
  "RESTAURANT_OWNER",
  "SUPER_ADMIN",
  "RESTAURANT_MANAGER",
  "BRANCH_MANAGER",
  "CASHIER",
  "KITCHEN_STAFF",
  "INVENTORY_MANAGER",
  "DELIVERY_STAFF",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const PERMISSIONS = [
  "menu.read",
  "menu.manage",
  "menu.publish",
  "price.manage",
  "availability.manage",
  "allergen.confirm",
  "dietary.verify",
  "option.manage",
  "promotion.manage",
  "tax.manage",
  "branch.settings.manage",
  "inventory.manage",
  "order.read.branch",
  "order.read.delivery",
  "order.update.kitchen",
  "order.update.delivery",
  "order.cancel",
  "order.assign_delivery",
  "review.moderate",
  "user.manage",
  "audit.read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS = new Set<Permission>(PERMISSIONS);

const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<Permission>> = {
  RESTAURANT_OWNER: ALL_PERMISSIONS,
  SUPER_ADMIN: ALL_PERMISSIONS,
  RESTAURANT_MANAGER: new Set<Permission>([
    "menu.read",
    "menu.manage",
    "menu.publish",
    "price.manage",
    "availability.manage",
    "allergen.confirm",
    "dietary.verify",
    "option.manage",
    "promotion.manage",
    "tax.manage",
    "branch.settings.manage",
    "inventory.manage",
    "order.read.branch",
    "order.update.kitchen",
    "order.cancel",
    "order.assign_delivery",
    "review.moderate",
    "audit.read",
  ]),
  BRANCH_MANAGER: new Set<Permission>([
    "menu.read",
    "price.manage",
    "availability.manage",
    "allergen.confirm",
    "dietary.verify",
    "option.manage",
    "promotion.manage",
    "branch.settings.manage",
    "inventory.manage",
    "order.read.branch",
    "order.update.kitchen",
    "order.cancel",
    "order.assign_delivery",
    "review.moderate",
    "audit.read",
  ]),
  CASHIER: new Set<Permission>([
    "menu.read",
    "order.read.branch",
    "order.update.kitchen",
    "order.cancel",
    "order.assign_delivery",
    "review.moderate",
  ]),
  KITCHEN_STAFF: new Set<Permission>([
    "menu.read",
    "availability.manage",
    "inventory.manage",
    "order.read.branch",
    "order.update.kitchen",
  ]),
  INVENTORY_MANAGER: new Set<Permission>([
    "menu.read",
    "inventory.manage",
    "order.read.branch",
    "audit.read",
  ]),
  DELIVERY_STAFF: new Set<Permission>([
    "menu.read",
    "order.read.delivery",
    "order.update.delivery",
  ]),
};

export type RoleGrant = {
  role: StaffRole;
  restaurantId: string;
  branchId: string | null;
};

export type Actor = {
  userId: string;
  accountType: AccountType;
  grants: RoleGrant[];
};

export type AuthorizationScope = {
  restaurantId: string;
  /** Omit for restaurant-wide actions; set it for branch-scoped actions. */
  branchId?: string | null;
};

export class PolicyError extends Error {
  readonly status = 403;
  readonly code = "FORBIDDEN";

  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "PolicyError";
  }
}

function grantMatchesScope(grant: RoleGrant, scope: AuthorizationScope): boolean {
  if (grant.restaurantId !== scope.restaurantId) return false;
  if (scope.branchId === undefined) return grant.branchId === null;
  if (scope.branchId === null) return grant.branchId === null;
  return grant.branchId === null || grant.branchId === scope.branchId;
}

export function permissionsForRole(role: StaffRole): ReadonlySet<Permission> {
  return ROLE_PERMISSIONS[role] ?? new Set<Permission>();
}

export function can(
  actor: Actor | null | undefined,
  permission: Permission,
  scope: AuthorizationScope,
): boolean {
  if (!actor || actor.accountType !== "STAFF") return false;
  return actor.grants.some(
    (grant) =>
      grantMatchesScope(grant, scope) &&
      permissionsForRole(grant.role).has(permission),
  );
}

export function assertCan(
  actor: Actor | null | undefined,
  permission: Permission,
  scope: AuthorizationScope,
): asserts actor is Actor {
  if (!can(actor, permission, scope)) {
    throw new PolicyError();
  }
}

export function hasRole(
  actor: Actor | null | undefined,
  role: StaffRole,
  scope: AuthorizationScope,
): boolean {
  if (!actor || actor.accountType !== "STAFF") return false;
  return actor.grants.some(
    (grant) => grant.role === role && grantMatchesScope(grant, scope),
  );
}

export function isOwnerOrAdmin(actor: Actor | null | undefined): boolean {
  if (!actor || actor.accountType !== "STAFF") return false;
  return actor.grants.some(
    (grant) => grant.role === "RESTAURANT_OWNER" || grant.role === "SUPER_ADMIN",
  );
}

/**
 * The old UI exposes three roles. This adapter keeps that vocabulary while
 * the database uses the richer StaffRole model.
 */
export function legacyRoleFor(actor: Actor | null | undefined): "customer" | "employee" | "admin" {
  if (!actor || actor.accountType !== "STAFF") return "customer";
  if (
    actor.grants.some((grant) =>
      [
        "RESTAURANT_OWNER",
        "SUPER_ADMIN",
        "RESTAURANT_MANAGER",
        "BRANCH_MANAGER",
      ].includes(grant.role),
    )
  ) {
    return "admin";
  }
  return "employee";
}
