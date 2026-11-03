# Database Performance

The normalized schema was profiled with `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` on the imported production document. The raw plans are in [`explain-before.txt`](./explain-before.txt) and [`explain-after.txt`](./explain-after.txt).

The index design was selected from these SQL shapes. Runtime queries now use
Prisma Client, but the repositories preserve the same predicates and orderings:
the kitchen queue filters `status IN (...) ORDER BY createdAt`, customer history
filters `userId ORDER BY createdAt DESC`, and admin reads
`ORDER BY createdAt`. Prisma emits PostgreSQL `SELECT`/`INSERT`/`UPDATE`
statements for those model queries and therefore uses the same indexes. The only
runtime raw statement is the transaction-local `set_config` actor context, which
does not read application rows. The 50-checkout test is rerun through the Prisma
repositories after the conversion.

## Workload

| Table | Rows |
| --- | ---: |
| `users` | 55 |
| `sessions` | 6 |
| `menu_items` | 8 |
| `orders` | 3,000 |
| `order_items` | 7,387 |
| `order_status_history` | 13,188 |

Environment: PostgreSQL 18, local loopback, warm shared buffers, `ANALYZE` run by autovacuum after import. Absolute times are sub-millisecond to low-millisecond because this is a 3,000-order dataset. The useful signal is the plan shape and the relative improvement, not a production capacity claim.

`before` = `001_core.sql` only. `after` = `001` + `002_indexes.sql` + `003_covering_indexes.sql`.

## Results

| Query shape | Before | After | Plan change |
| --- | ---: | ---: | --- |
| Kitchen live queue | 0.678 ms, seq scan + sort | 0.226 ms, bitmap index | `orders_live_queue_idx` partial scan of 103 active rows |
| Kitchen queue counts | 0.660 ms, seq scan | 0.085 ms, index-only | `orders_status_created_at_idx` |
| Admin recent orders | 1.932 ms, seq scan + top-N | 0.078 ms, index scan | `orders_created_at_idx` |
| Admin completed filter | 1.819 ms, seq scan + top-N | 0.114 ms, index scan | `orders_status_created_at_idx` |
| Revenue by area | 2.324 ms, seq scan + sort | 1.192 ms, index-only | `orders_completed_area_cover_idx` |
| Top customers | 2.497 ms, seq scan + sort | 0.739 ms, index-only | `orders_completed_user_cover_idx` |
| Customer order history | 0.431 ms, seq scan | 0.058 ms, index scan | `orders_user_created_at_idx` |
| Order detail items + history | 1.600 ms | 0.114 ms | primary-key and child-order indexes |
| Best-selling items | 9.530 ms | 6.425 ms | still seq scans at this size |
| Session lookup | 0.050 ms | 0.067 ms | unique token index; 55-row users table seq scan |

The best-selling query intentionally remains a sequential scan. It aggregates every `completed` order and every line item, so at 7,387 rows a scan is cheaper than random heap access. `order_items_menu_completed_idx` is kept for selective per-item paths and for growth; it is not claimed to be used by this full-table aggregate. This is the correct planner decision, not a missing index.

## Index rationale

All indexes are introduced by versioned migrations, not by application startup:

- `orders_created_at_idx` — admin's `ORDER BY created_at DESC LIMIT 50`; eliminates the full scan and top-N sort.
- `orders_status_created_at_idx` — status-filtered admin lists and the kitchen count; supports both the filter and the newest-first order.
- `orders_user_created_at_idx` — customer history scoped by `user_id`, newest first.
- `orders_live_queue_idx` — partial index on the four active statuses, ordered by `created_at`. The archive can grow without enlarging the kitchen's hot index.
- `orders_completed_area_cover_idx` — partial covering index for completed revenue grouped by pickup/delivery area; `total_cents` is included so the aggregate is index-only.
- `orders_completed_user_cover_idx` — partial covering index for completed lifetime spend per customer; also index-only.
- `order_status_history_recent_idx` — order-detail and SSE reads by order, newest first. At this size the planner uses the unique `(order_id, status, changed_at)` key for the sample; the explicit recent index is available for larger histories.
- `order_items_menu_completed_idx` — selective menu-item/completed joins and future volume; see the caveat above.
- `sessions_token_hash_key`, `sessions_user_idx`, `sessions_active_expiry_idx` — constant-time token lookup, per-user session listing, and expiry cleanup.

`003_covering_indexes.sql` replaces the narrower `orders_completed_area_idx` after the second plan pass showed a heap fetch for `total_cents`. The replacement is the version committed in the migration chain; the old index is dropped explicitly so a fresh database and an upgraded database converge.

## Reproducing

```bash
# Before: schema only, then import the legacy document
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/mesob_house_before \
  node scripts/db-migrate.mjs --to 001
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/mesob_house_before \
  node scripts/import-legacy.mjs --file .data/mesob-house.json
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/mesob_house_before \
  node scripts/explain-queries.mjs --label before > docs/explain-before.txt

# After: full migration chain
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/mesob_house \
  node scripts/db-migrate.mjs
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/mesob_house \
  node scripts/explain-queries.mjs --label after > docs/explain-after.txt
```

`scripts/explain-queries.mjs` is read-only; every statement is an `EXPLAIN`, never a write. The migration and import scripts refuse non-local targets unless `--allow-remote` is passed.
