# Database Rebuild Report

**Status:** local rebuild implemented and verified
**Baseline:** `prisma/migrations/20261105140000_baseline/migration.sql`
**Target:** local PostgreSQL 18, database `mesob_house`

This report replaces the earlier custom-migration, import and reconciliation
reports. Those described a numbered SQL migration runner and a 3,000-order
legacy import that are no longer part of the application.

## 1. What changed

- The old `migrations/` runner and `scripts/db-migrate.mjs` were retired.
- `prisma/schema.prisma` is the single model source; Prisma Migrate owns schema
  history.
- One baseline migration creates the complete restaurant/menu/order schema,
  generated columns, checks, indexes and triggers.
- `scripts/seed.mjs` rebuilds the catalogue and demo accounts idempotently.
- The legacy JSON import, reconciliation, load-test, EXPLAIN, security-matrix
  and invariant scripts tied to the old schema were removed.
- Runtime repositories were rewritten against the new schema while the existing
  JSX UI kept its public field names and routes.

There is no backward-compatibility import layer for the old database.

## 2. Baseline contents

The baseline creates:

| Category | Detail |
| --- | --- |
| Models | 43 Prisma models |
| Enums | 26 |
| Public tables | 44, including `_prisma_migrations` |
| Triggers | 34 |
| Check constraints | 18 |

Important database invariants:

- generated `orders.total_minor` and `order_items.line_total_minor`;
- role-assignment scope validation;
- menu price and tax-rate effective-window overlap prevention;
- branch/menu item/availability/inventory scope validation;
- verified-review enforcement;
- updated-at and menu-publication version triggers;
- non-negative money checks and order/line validity checks.

The application still validates roles, transitions and totals before writing.
The database is the final guard for the invariants it can express.

## 3. Seed result

`node scripts/seed.mjs` is idempotent and has been run repeatedly without
creating duplicates. The current seed creates:

| Data | Count |
| --- | --- |
| Restaurants | 1 |
| Branches | 1 (`Bole Medhanialem`) |
| Menu publications | 1 |
| Menu categories | 6 |
| Menu items | 26 |
| Menu item prices | 26 |
| Primary media rows | 26 |
| Translations | 26 |
| Item-ingredient links | 111 |
| Item-allergen rows | 15 |
| Dietary claims | 13 |
| Branch menu items | 26 |
| Eligible option groups | 4 |
| Options | 13 |
| Pairings | 57 |
| Allergen codes | 14 |
| Delivery zones | 5 |
| Promotions | 1 (`GURSHA2025`) |
| Users | 4 |

Money is stored as integer minor units. VAT is seeded at 15% and is inclusive by
default. The branch starts with no service charge. Delivery zones are
radius-based with illustrative Addis Ababa fees.

## 4. Verification

### Static checks

```text
npm run typecheck   passed
npm run test        passed: 6 files, 43 tests
npm run build       passed: production build, static generation and API routes
```

### Order flow smoke test

`scripts/order-smoke.mjs` creates a real order through the server snapshot,
checks the public `MH-...` id, ownership, totals and history, cancels it, then
creates a pickup order and advances it through kitchen statuses.

Observed totals for the delivery order:

| Component | Minor units | ETB |
| --- | ---: | ---: |
| Subtotal | 136000 | 1360.00 |
| Discount (`GURSHA2025`) | 20000 | 200.00 |
| VAT (15%, inclusive) | 15130 | 151.30 |
| Delivery fee | 5000 | 50.00 |
| Total payable | 121000 | 1210.00 |

The cancellation and all status transitions were accepted; the smoke script
removed both test orders and their audit rows afterwards.

### Admin catalogue smoke test

`scripts/admin-menu-smoke.mjs` creates a dish, reads it back through the admin
catalogue, updates its name/price/allergens/options, checks the new price row,
then deactivates it.

All checks passed:

```text
created, listed, price, special, fasting, allergens, optionGroup, pairing,
ingredient, updated, updatedName, updatedPrice, updatedAllergens,
updatedOptions, retired, removed
```

The test also confirmed the price-history fix: the previous open-ended
`MenuItemPrice` row is closed at the replacement timestamp before the new row is
inserted, so the effective-window trigger no longer rejects the update.

### Database cleanup

The smoke tests leave no `smoke-test-dish`, `smoke-option` or
`smoke-test-ingredient` rows behind. Current seeded counts remain 26 menu items,
26 prices, 4 option groups and 71 ingredients.

## 5. Local commands

```bash
npm run db:deploy
npm run db:status
npm run db:seed
npm run db:reset
npm run smoke:orders
npm run smoke:admin-menu
```

`db:reset` is local-only. `db:seed` refuses a non-local target unless
`--allow-remote` is passed.

## 6. Operational notes

- `DATABASE_URL` is required; there is no file fallback.
- `postinstall` runs `prisma generate`.
- The old `.data/mesob-house.json` export remains an ignored local artifact and
  is not read by the app.
- Demo accounts should be rotated before any production deployment.
- A remote push is still blocked because this workspace has no GitHub
  credentials; the work can be committed locally without them.
