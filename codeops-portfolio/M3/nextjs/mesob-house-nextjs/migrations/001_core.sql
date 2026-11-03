-- 001_core.sql — normalized Mesob House schema.
--
-- Money is stored as integer cents. Orders keep a snapshot of customer,
-- contact, delivery and item data so historical receipts do not change when
-- the live menu or a customer profile changes.

DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'employee', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE order_status AS ENUM (
    'received',
    'preparing',
    'ready',
    'out_for_delivery',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE order_fulfillment AS ENUM ('pickup', 'delivery');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (length(btrim(full_name)) > 0),
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  password_hash text,
  role user_role NOT NULL DEFAULT 'customer',
  preference text,
  provider text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_not_blank CHECK (position('@' in email) > 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key
  ON users (lower(btrim(email)));
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_key
  ON users (phone)
  WHERE btrim(phone) <> '';
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  user_agent text,
  ip_address text,
  CONSTRAINT sessions_token_hash_shape CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT sessions_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_active_expiry_idx
  ON sessions (expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS menu_items (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'menu',
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  image_url text NOT NULL DEFAULT '',
  is_special boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_items_category_idx
  ON menu_items (category, is_active);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'received',
  fulfillment order_fulfillment NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL DEFAULT '',
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text NOT NULL,
  delivery_sub_city text NOT NULL DEFAULT '',
  delivery_street text NOT NULL DEFAULT '',
  delivery_landmark text NOT NULL DEFAULT '',
  delivery_timing text NOT NULL DEFAULT 'immediate'
    CHECK (delivery_timing IN ('immediate', 'scheduled')),
  payment_method text NOT NULL,
  coupon_code text,
  note text NOT NULL DEFAULT '',
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  injera_cents integer NOT NULL DEFAULT 0 CHECK (injera_cents >= 0),
  packaging_cents integer NOT NULL DEFAULT 0 CHECK (packaging_cents >= 0),
  vat_cents integer NOT NULL DEFAULT 0 CHECK (vat_cents >= 0),
  discount_cents integer NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents integer GENERATED ALWAYS AS (
    GREATEST(
      0,
      subtotal_cents + injera_cents + packaging_cents + vat_cents - discount_cents
    )
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_id_shape CHECK (id ~ '^MH-[A-Z0-9]{8}$'),
  CONSTRAINT orders_delivery_address CHECK (
    fulfillment = 'pickup' OR length(btrim(delivery_street)) >= 3
  )
);

CREATE TABLE IF NOT EXISTS order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  line_no integer NOT NULL CHECK (line_no > 0),
  menu_item_id text NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  item_name text NOT NULL,
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 50),
  line_total_cents integer GENERATED ALWAYS AS (unit_price_cents * quantity) STORED,
  UNIQUE (order_id, line_no)
);

CREATE INDEX IF NOT EXISTS order_items_menu_item_idx
  ON order_items (menu_item_id, order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_by_name text NOT NULL DEFAULT '',
  note text,
  UNIQUE (order_id, status, changed_at)
);

CREATE INDEX IF NOT EXISTS order_status_history_order_idx
  ON order_status_history (order_id, changed_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_role text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx
  ON audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_created_idx
  ON audit_log (created_at DESC);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION current_actor_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.actor_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION current_actor_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.actor_role', true), ''), '');
$$;

CREATE OR REPLACE FUNCTION actor_display_name()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT full_name FROM users WHERE id = current_actor_id()),
    'System'
  );
$$;

-- ---------------------------------------------------------------------------
-- Order status machine
-- ---------------------------------------------------------------------------
--
-- Structural transitions are always enforced. Cancellation is role-aware:
-- customers may cancel only `received`; admins may cancel any non-terminal
-- order; employees cannot cancel. The application sets app.actor_id /
-- app.actor_role with SET LOCAL inside the same transaction as the write.
-- Data migration sets app.importing='on' so historical rows keep their
-- original timestamps and history.

CREATE OR REPLACE FUNCTION enforce_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_role text := current_actor_role();
  v_importing text := COALESCE(current_setting('app.importing', true), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF v_importing <> 'on' AND NEW.status <> 'received' THEN
      RAISE EXCEPTION 'new orders must start in received (got %)', NEW.status
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF v_importing = 'on' THEN
    RETURN NEW;
  END IF;

  IF OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'order % is already terminal (%)', OLD.id, OLD.status
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'cancelled' THEN
    IF OLD.status = 'received' AND v_role IN ('', 'customer') THEN
      RETURN NEW;
    END IF;
    IF v_role = 'admin' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'role % cannot cancel order % in status %',
      COALESCE(NULLIF(v_role, ''), 'unknown'), OLD.id, OLD.status
      USING ERRCODE = '42501';
  END IF;

  IF v_role = 'customer' THEN
    RAISE EXCEPTION 'customers cannot advance order %', OLD.id
      USING ERRCODE = '42501';
  END IF;

  IF NOT (
    (OLD.status = 'received' AND NEW.status = 'preparing')
    OR (OLD.status = 'preparing' AND NEW.status = 'ready')
    OR (OLD.status = 'ready' AND NEW.fulfillment = 'pickup' AND NEW.status = 'completed')
    OR (OLD.status = 'ready' AND NEW.fulfillment = 'delivery' AND NEW.status = 'out_for_delivery')
    OR (OLD.status = 'out_for_delivery' AND NEW.status = 'completed')
  ) THEN
    RAISE EXCEPTION 'invalid order transition % -> % for %',
      OLD.status, NEW.status, NEW.fulfillment
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION record_order_created()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.importing', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  INSERT INTO order_status_history (
    order_id, status, changed_at, changed_by, changed_by_name, note
  ) VALUES (
    NEW.id, NEW.status, NEW.created_at, current_actor_id(),
    actor_display_name(), 'order created'
  );

  INSERT INTO audit_log (
    entity_type, entity_id, action, actor_id, actor_role, after_data
  ) VALUES (
    'order', NEW.id, 'created', current_actor_id(), current_actor_role(),
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION record_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF COALESCE(current_setting('app.importing', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  INSERT INTO order_status_history (
    order_id, status, changed_at, changed_by, changed_by_name, note
  ) VALUES (
    NEW.id, NEW.status, now(), current_actor_id(), actor_display_name(),
    format('status changed from %s to %s', OLD.status, NEW.status)
  );

  INSERT INTO audit_log (
    entity_type, entity_id, action, actor_id, actor_role, before_data, after_data
  ) VALUES (
    'order', NEW.id, 'status_changed', current_actor_id(), current_actor_role(),
    jsonb_build_object('status', OLD.status),
    jsonb_build_object('status', NEW.status)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION audit_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  INSERT INTO audit_log (
    entity_type, entity_id, action, actor_id, actor_role, before_data, after_data
  ) VALUES (
    'user', NEW.id::text, 'role_changed', current_actor_id(), current_actor_role(),
    jsonb_build_object('role', OLD.role),
    jsonb_build_object('role', NEW.role)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_enforce_status ON orders;
CREATE TRIGGER orders_enforce_status
  BEFORE INSERT OR UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION enforce_order_status_transition();

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS orders_record_created ON orders;
CREATE TRIGGER orders_record_created
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION record_order_created();

DROP TRIGGER IF EXISTS orders_record_status_change ON orders;
CREATE TRIGGER orders_record_status_change
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION record_order_status_change();

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS users_audit_role_change ON users;
CREATE TRIGGER users_audit_role_change
  AFTER UPDATE OF role ON users
  FOR EACH ROW EXECUTE FUNCTION audit_user_role_change();

DROP TRIGGER IF EXISTS menu_items_set_updated_at ON menu_items;
CREATE TRIGGER menu_items_set_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
