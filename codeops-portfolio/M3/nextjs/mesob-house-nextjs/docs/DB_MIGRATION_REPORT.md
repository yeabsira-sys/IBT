# Database Migration Report

## Outcome

The single `mesob_house_db` JSONB document has been replaced by seven normalized application tables. The application now reads and writes those tables through Prisma ORM (`@prisma/client` with `@prisma/adapter-pg`); the JSON-file/JSONB fallback is gone.

Validation was performed against an isolated local PostgreSQL 18 cluster on `127.0.0.1:55432`. The Neon URL in `.env` was not used for migrations, imports, load tests, or restores. No production data was mutated. The changes are uncommitted pending review.

## Schema

| Table | Purpose | Key constraints |
| --- | --- | --- |
| `users` | Accounts and roles | case-insensitive unique email, unique non-empty phone, `user_role` enum |
| `sessions` | Revocable opaque sessions | unique SHA-256 token hash, FK to users, `revoked_at`, expiry check |
| `menu_items` | Menu catalogue | text id, integer-cent price, active flag |
| `orders` | Order header and snapshots | FK to users, status/fulfillment enums, generated `total_cents` |
| `order_items` | Line items | FK to orders/menu, unique `(order_id, line_no)`, generated line total |
| `order_status_history` | Per-order timeline | FK to orders/users, unique `(order_id, status, changed_at)` |
| `audit_log` | Security/operations audit | actor, role, before/after JSON, entity and time indexes |

Professional choices:

- **Integer cents everywhere.** `subtotal_cents`, `vat_cents`, `total_cents`, and line totals are integers. Birr conversion happens only at the repository boundary.
- **Generated totals.** `orders.total_cents` and `order_items.line_total_cents` are `GENERATED ALWAYS ... STORED`, so stored totals cannot disagree with their components.
- **Foreign keys with explicit delete behavior.** Orders keep their user (`ON DELETE RESTRICT`); sessions, items, and history cascade where appropriate; actor references null out so the audit trail survives account deletion.
- **Database-enforced transitions.** A trigger rejects terminal rewrites, customer advances, employee cancellations, and invalid structural transitions. Customers may cancel only `received`; admins may cancel any non-terminal order.
- **Audit/history from triggers.** Order creation and every status change write `order_status_history` and `audit_log` in the same transaction. Role changes are audited too.
- **Revocation, not deletion.** Sign-out sets `sessions.revoked_at`; the row remains for investigation and the old cookie stops authenticating immediately.

## Migration chain

| Migration | Contents |
| --- | --- |
| `001_core.sql` | Enums, seven tables, foreign keys, checks, generated totals, triggers |
| `002_indexes.sql` | Kitchen, admin, customer, analytics, and session indexes |
| `003_covering_indexes.sql` | Covering replacements for area revenue and top-customer aggregates |

`scripts/db-migrate.mjs` records each applied version and checksum in `schema_migrations`, supports `--status` and `--to VERSION`, and refuses remote writes unless `--allow-remote` is passed. Re-running is a no-op; changing an already-applied migration is reported as a checksum mismatch.

```bash
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/mesob_house \
  npm run db:migrate
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/mesob_house \
  npm run db:status
```

## Legacy import and reconciliation

`scripts/import-legacy.mjs` validated and imported `.data/mesob-house.json` in one transaction. It sets `app.importing = 'on'` so historical timestamps, statuses, and history rows survive the transition without being rewritten by the live triggers.

Final reconciliation, available in [`reconciliation.txt`](./reconciliation.txt):

```text
PASS  users                              55  =  55
PASS  sessions                           6  =  6
PASS  orders                          3000  =  3000
PASS  order items                     7387  =  7387
PASS  status history                 13188  =  13188
PASS  menu items (distinct source ids)   8  =  8
PASS  revenue (cents)       9,977,342.00 ETB  =  9,977,342.00 ETB
PASS  completed revenue     8,753,529.00 ETB  =  8,753,529.00 ETB
PASS  order digest, user digest, session digest
PASS  all six status counts
RESULT: PASS
```

The digests compare normalized field values, not just counts, so an order with the same id and a different total or status would fail.

## Concurrent checkout test

`scripts/load-test-checkouts.mjs` sent 50 simultaneous Server Action checkouts for the same customer and dish, each with a unique note, then verified persistence and cleanup. Raw output: [`load-test-checkouts.txt`](./load-test-checkouts.txt).

```text
HTTP requests: 50 fulfilled, 0 rejected
HTTP statuses: 200×50
Database rows: 50 orders, 50 unique ids, 50 unique notes, 50 item rows, 37,400 ETB
API list rows with prefix: 50
Duration: 1713 ms (29.2 checkouts/s)
RESULT: PASS — 50/50 simultaneous checkouts persisted with zero lost orders.
Cleanup: deleted 50 verification orders.
```

## Database invariants and session revocation

`scripts/verify-invariants.mjs` drives the real trigger paths inside a rolled-back transaction, then performs a real login/sign-out against the running app. Raw output: [`verify-invariants.txt`](./verify-invariants.txt).

```text
[PASS] customer cannot advance an order — SQLSTATE 42501
[PASS] received -> completed is rejected — SQLSTATE 23514
[PASS] employee cannot cancel — SQLSTATE 42501
[PASS] employee received -> preparing is allowed
[PASS] trigger checks rolled back cleanly
[PASS] fresh login has an active session row
[PASS] sign-out sets sessions.revoked_at
[PASS] old cookie no longer authenticates
RESULT: PASS — 8/8 invariant checks passed.
```

The order checks leave the source order unchanged. The session check creates and revokes its own login; the database was reset to the exact source afterward.

## Backup and restore drill

`scripts/backup-restore-drill.mjs` ran `pg_dump` in custom format, created a separate scratch database, restored with `pg_restore`, and compared every counter and revenue aggregate. Raw output: [`backup-restore.txt`](./backup-restore.txt).

```text
PASS  users                    55 = 55
PASS  sessions                  6 = 6
PASS  menu_items                8 = 8
PASS  orders                 3000 = 3000
PASS  order_items            7387 = 7387
PASS  history               13188 = 13188
PASS  audit_log                 1 = 1
PASS  migrations                3 = 3
PASS  revenue_cents       9,977,342.00 ETB = 9,977,342.00 ETB
PASS  completed_revenue   8,753,529.00 ETB = 8,753,529.00 ETB
RESULT: PASS — restored copy matches the source on every counter.
```

## Index performance

Plans and index rationale are in [`DB_PERFORMANCE.md`](./DB_PERFORMANCE.md). Representative improvements at 3,000 orders:

- admin recent orders: 1.932 ms → 0.078 ms;
- kitchen queue counts: 0.660 ms → 0.085 ms;
- customer history: 0.431 ms → 0.058 ms;
- revenue by area: 2.324 ms → 1.192 ms.

The best-selling item aggregate still uses a sequential scan at this data size. That is the expected planner choice, documented rather than hidden.

## Prisma application layer

Runtime persistence now uses Prisma ORM 7.10.1. The existing SQL migrations
remain the schema authority because the database relies on features Prisma
cannot express:

| Database feature | Owner |
| --- | --- |
| Enums, tables, foreign keys, check constraints | `migrations/001_core.sql` |
| Generated `total_cents` / `line_total_cents` | `001_core.sql` |
| Order transition, history, audit and `updated_at` triggers | `001_core.sql` |
| Partial and covering indexes | `002_indexes.sql`, `003_covering_indexes.sql` |
| Expression index on `lower(btrim(email))` | `001_core.sql` |
| Prisma Client models and relations | `prisma/schema.prisma` |

The Prisma schema maps every application table to PascalCase models and
camelCase fields (`User`, `Session`, `MenuItem`, `Order`, `OrderItem`,
`OrderStatusHistory`, `AuditLog`), with generated totals and partial indexes
represented where the client needs them. `schema_migrations` is deliberately
not modelled: it belongs to the SQL migration runner.

`src/lib/prisma.js` caches one `PrismaClient` and constructs it with
`PrismaPg`, using `DATABASE_URL`, `PG_POOL_MAX`, and the same local/SSL rules as
the former `pg` pool. The singleton is cached on `globalThis` so Next's dev
server and route handlers reuse it across hot reloads.

The repositories preserve every invariant:

- `src/lib/db.js` uses `prisma.user` / `prisma.session`, generated UUID defaults,
  case-normalized identifiers, unique-conflict handling, Prisma transactions,
  and revocation-through-`updateMany`.
- `src/lib/orders.js` uses nested Prisma creates for order + items, a stable
  menu-item create/conditional-update sequence, and a conditional
  `updateMany({ where: { status: current } })` for staff transitions. Customer
  cancellation uses the same conditional approach instead of
  `SELECT ... FOR UPDATE`, so concurrent callers cannot both win.
- `setDbActor()` is the only runtime raw statement. It calls
  `set_config('app.actor_id', ..., true)` / `set_config('app.actor_role', ...,
  true)` inside the Prisma transaction so the existing triggers and audit rows
  still see the actor.
- Prisma returns generated totals and trigger-created history rows because the
  repositories re-read the order with `include` after the write.

Operational scripts continue to use `pg`/SQL for migration, bulk import,
reconciliation, `EXPLAIN ANALYZE`, backup/restore, seed generation and
independent invariant checks. These are database/verification operations, not
the application data path.

A Prisma-specific smoke run exercised the full repository against the local
database: create order, generated total, created-history trigger, customer
cancellation, second-cancel rejection, employee transition, invalid-transition
rejection, employee-cancel rejection, admin cancellation, user creation,
duplicate email/phone handling, role update with actor audit, session
resolution and revocation. All checks passed and the test rows were deleted.

## Application changes

- `src/lib/prisma.js` is the cached client/adapter boundary; the file/JSONB
  store and `/tmp` fallback are removed.
- `src/lib/db.js` is now the Prisma user/session repository.
- `src/lib/orders.js` reads and writes `orders`, `order_items`, and
  `order_status_history` through Prisma; order creation and transitions pass
  the actor into the transaction-local trigger context.
- `/api/health` reports `postgres` or `unconfigured` and returns `503` when
  `DATABASE_URL` is absent.
- The admin role update passes the acting admin so the role-change audit row is
  attributable.
- `scripts/seed-orders.mjs` writes normalized tables, supports `--dry-run`, and
  refuses remote writes by default.
- `postinstall` generates Prisma Client; `npm run prisma:generate` refreshes it
  after schema edits.
- The production build succeeds with the local Postgres URL.

## Security regression check

The existing security matrix was rerun against Postgres: **195 pass, 6 fail, 3 warn, 1 skip** ([`security-matrix-postgres.txt`](./security-matrix-postgres.txt)). The failures are the previously known tab/newline/CR open redirects and the soft-404 UI for another customer's order page; no protected order data was exposed. The pricing write test is skipped unless `--allow-write` is passed. No database-specific regression was introduced.

## Remaining production step

Before applying this to the Neon database, take a verified backup, run the migration and import against a staging branch, and run the same reconciliation, load, invariant, and restore checks with production-sized data. That step requires explicit authorization; it was deliberately not performed here.
