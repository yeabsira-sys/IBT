-- 005_review_purchase_integrity.sql — keep the verified-review promise in the
-- database, not only in the Server Action. A review must point at a completed
-- order owned by the same user that contains the reviewed dish.

CREATE OR REPLACE FUNCTION enforce_verified_review()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_id IS NULL THEN
    RAISE EXCEPTION 'a review requires a completed order'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = NEW.order_id
      AND o.user_id = NEW.user_id
      AND o.status = 'completed'
      AND oi.menu_item_id = NEW.menu_item_id
  ) THEN
    RAISE EXCEPTION 'review order must be completed, belong to the reviewer, and contain the dish'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_require_verified_purchase ON reviews;
CREATE TRIGGER reviews_require_verified_purchase
  BEFORE INSERT OR UPDATE OF order_id, user_id, menu_item_id ON reviews
  FOR EACH ROW EXECUTE FUNCTION enforce_verified_review();

-- Existing verified rows are expected to satisfy the rule; fail loudly instead
-- of silently keeping an invalid review if a legacy/manual row slipped in.
DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT count(*) INTO invalid_count
  FROM reviews r
  WHERE r.order_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = r.order_id
         AND o.user_id = r.user_id
         AND o.status = 'completed'
         AND oi.menu_item_id = r.menu_item_id
     );

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'reviews contains % row(s) without a verified completed order', invalid_count;
  END IF;
END $$;
