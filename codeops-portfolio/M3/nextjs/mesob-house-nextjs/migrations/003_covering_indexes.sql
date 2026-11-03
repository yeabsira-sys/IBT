-- 003_covering_indexes.sql — refinements justified by the second
-- EXPLAIN ANALYZE pass. These turn the area-revenue and top-customer
-- aggregates into index-only scans at the seeded 3,000-order volume.

DROP INDEX IF EXISTS orders_completed_area_idx;

CREATE INDEX IF NOT EXISTS orders_completed_area_cover_idx
  ON orders (fulfillment, delivery_sub_city)
  INCLUDE (total_cents)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS orders_completed_user_cover_idx
  ON orders (user_id)
  INCLUDE (total_cents)
  WHERE status = 'completed';
