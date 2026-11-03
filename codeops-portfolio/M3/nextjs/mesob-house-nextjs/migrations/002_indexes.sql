-- 002_indexes.sql — indexes selected from EXPLAIN ANALYZE on the kitchen,
-- admin and analytics query shapes. The plans are recorded in
-- docs/DB_PERFORMANCE.md.

-- Admin: newest orders, status-filtered lists, and a customer's history.
CREATE INDEX IF NOT EXISTS orders_created_at_idx
  ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
  ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_user_created_at_idx
  ON orders (user_id, created_at DESC);

-- Kitchen: the live queue is the small hot set. A partial index keeps it
-- small even when the archive grows.
CREATE INDEX IF NOT EXISTS orders_live_queue_idx
  ON orders (created_at ASC)
  WHERE status IN ('received', 'preparing', 'ready', 'out_for_delivery');

-- Analytics: completed revenue by pickup / delivery area.
CREATE INDEX IF NOT EXISTS orders_completed_area_idx
  ON orders (fulfillment, delivery_sub_city)
  WHERE status = 'completed';

-- Analytics: best-selling menu items and completed-order item joins.
CREATE INDEX IF NOT EXISTS order_items_menu_completed_idx
  ON order_items (menu_item_id)
  INCLUDE (order_id, quantity, unit_price_cents);

-- Order detail and SSE polling: items and history are fetched by order id.
CREATE INDEX IF NOT EXISTS order_status_history_recent_idx
  ON order_status_history (order_id, changed_at DESC);
