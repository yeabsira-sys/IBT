-- 004_menu_and_reviews.sql — backend-owned menu catalogue, dish options and
-- verified customer reviews.
--
-- The menu is still snapshotted into order_items at checkout, so changing a
-- dish later never rewrites a historical receipt. The new option/review tables
-- are deliberately separate from the order tables; order data remains the
-- source of truth for what a customer bought.

-- ---------------------------------------------------------------------------
-- Menu catalogue fields
-- ---------------------------------------------------------------------------

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS native_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS long_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS spice_level text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS servings text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ingredients text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS allergens text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS badge_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS badge_tone text NOT NULL DEFAULT 'brand',
  ADD COLUMN IF NOT EXISTS is_fasting boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_complimentary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_side boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS menu_items_active_special_idx
  ON menu_items (is_active, is_special, sort_order);
CREATE INDEX IF NOT EXISTS menu_items_category_order_idx
  ON menu_items (category, is_active, sort_order);

CREATE TABLE IF NOT EXISTS menu_categories (
  slug        text PRIMARY KEY,
  label       text NOT NULL CHECK (length(btrim(label)) > 0),
  description text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_option_groups (
  id             text PRIMARY KEY,
  menu_item_id   text NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  key            text NOT NULL,
  title          text NOT NULL,
  icon           text NOT NULL DEFAULT '',
  badge          text NOT NULL DEFAULT '',
  columns        smallint NOT NULL DEFAULT 1 CHECK (columns BETWEEN 1 AND 3),
  is_multi       boolean NOT NULL DEFAULT false,
  max_selections smallint NOT NULL DEFAULT 1 CHECK (max_selections BETWEEN 1 AND 10),
  sort_order     integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, key)
);

CREATE INDEX IF NOT EXISTS menu_option_groups_item_idx
  ON menu_option_groups (menu_item_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS menu_options (
  id               text PRIMARY KEY,
  group_id         text NOT NULL REFERENCES menu_option_groups(id) ON DELETE CASCADE,
  value            text NOT NULL,
  title            text NOT NULL,
  description      text NOT NULL DEFAULT '',
  note             text NOT NULL DEFAULT '',
  price_delta_cents integer NOT NULL DEFAULT 0 CHECK (price_delta_cents >= 0),
  is_default       boolean NOT NULL DEFAULT false,
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, value)
);

CREATE INDEX IF NOT EXISTS menu_options_group_idx
  ON menu_options (group_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS menu_pairings (
  menu_item_id        text NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  paired_menu_item_id text NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  sort_order          integer NOT NULL DEFAULT 0,
  PRIMARY KEY (menu_item_id, paired_menu_item_id),
  CHECK (menu_item_id <> paired_menu_item_id)
);

CREATE INDEX IF NOT EXISTS menu_pairings_item_idx
  ON menu_pairings (menu_item_id, sort_order);

-- ---------------------------------------------------------------------------
-- Customer reviews
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id text NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id     text REFERENCES orders(id) ON DELETE SET NULL,
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message      text NOT NULL DEFAULT '' CHECK (char_length(message) <= 1200),
  status       review_status NOT NULL DEFAULT 'approved',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS reviews_menu_status_idx
  ON reviews (menu_item_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_status_idx
  ON reviews (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_user_idx
  ON reviews (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_order_idx
  ON reviews (order_id);

DROP TRIGGER IF EXISTS menu_categories_set_updated_at ON menu_categories;
CREATE TRIGGER menu_categories_set_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS menu_option_groups_set_updated_at ON menu_option_groups;
CREATE TRIGGER menu_option_groups_set_updated_at
  BEFORE UPDATE ON menu_option_groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS menu_options_set_updated_at ON menu_options;
CREATE TRIGGER menu_options_set_updated_at
  BEFORE UPDATE ON menu_options
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS reviews_set_updated_at ON reviews;
CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Canonical menu seed (idempotent). The admin UI edits these rows afterwards;
-- a migration only runs once, so this never overwrites a later admin change.
-- ---------------------------------------------------------------------------

INSERT INTO menu_categories (slug, label, description, sort_order) VALUES
  ('stews', 'Traditional Stews & Wat', 'Slow-simmered clay-pot wats and berbere-rich stews.', 1),
  ('grills', 'Tibs & Grills', 'Pan-seared and fire-kissed meats and fish.', 2),
  ('fasting', 'Fasting & Vegan / Tsom', 'Plant-based fasting dishes and vegan platters.', 3),
  ('kitfo', 'Raw & Cured Delicacies / Kitfo', 'Hand-cut kitfo, gored gored and dulet.', 4),
  ('drinks', 'Beverages & Tej', 'House-fermented tej, jebena coffee and spiced shai.', 5),
  ('sides', 'Sides & Add-ons', 'Complimentary side accents, extra injera and add-ons.', 6)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO menu_items (
  id, name, native_name, tagline, description, long_description, category,
  price_cents, image_url, is_special, is_fasting, is_complimentary, is_side,
  spice_level, servings, ingredients, allergens, tags, badge_text, badge_tone,
  sort_order, is_active
) VALUES
('doro-wat', 'Classic Doro Wat', 'የዶሮ ወጥ', '', 'Slow-simmered highland chicken simmered in rich caramelized shallots, 12-spice berbere, and organic niter kibbeh with a hard-boiled egg.', 'Slow-simmered highland chicken simmered in rich caramelized shallots, 12-spice berbere, and organic niter kibbeh with a hard-boiled egg.', 'stews', 65000, 'https://images.unsplash.com/photo-1580651315530-69c8e0026377?auto=format&fit=crop&w=900&q=70', true, false, false, false, 'Fiery Berbere (3/3)', 'Serves 1-2 generously', ARRAY['Free-range chicken', 'Berbere', 'Niter Kibbeh', 'Farm Egg', 'Red Onions', 'Garlic', 'Ginger']::text[], ARRAY['Dairy', 'Egg']::text[], ARRAY['special', 'popular']::text[], 'Chef''s Special', 'gold', 1, true),
('siga-wat', 'Prime Siga Wat (Beef Stew)', 'የስጋ ወጥ', '', 'Tender grass-fed beef chuck cubes slowly braised in deep berbere gravy until meltingly tender.', 'Tender grass-fed beef chuck cubes slowly braised in deep berbere gravy until meltingly tender.', 'stews', 58000, 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=900&q=70', false, false, false, false, 'Medium-Hot (2/3)', 'Serves 1', ARRAY['Prime Beef', 'Highland Berbere', 'Niter Kibbeh', 'Cardamom', 'Garlic']::text[], ARRAY['Dairy']::text[], '{}'::text[], 'House Classic', 'brand', 2, true),
('beg-alicha-wat', 'Beg Alicha Wat (Mild Lamb Stew)', 'የበግ አልጫ ወጥ', '', 'Fragrant, mild highland lamb stew slow-cooked with fresh ginger, turmeric roots, garlic, and wild rosemary.', 'Fragrant, mild highland lamb stew slow-cooked with fresh ginger, turmeric roots, garlic, and wild rosemary.', 'stews', 62000, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=70', false, false, false, false, 'Mild (Turmeric & Ginger)', 'Serves 1-2', ARRAY['Highland Lamb', 'Fresh Turmeric', 'Ginger', 'Clarified Spiced Butter', 'Garlic']::text[], ARRAY['Dairy']::text[], '{}'::text[], 'House Classic', 'brand', 3, true),
('shiro-tegamino', 'Clay-Pot Shiro Tegamino', 'ሽሮ ተጋሚኖ', '', 'Spiced chickpea and broad bean stew whipped with herbs and extra virgin seed oil, served boiling hot in earthenware.', 'Spiced chickpea and broad bean stew whipped with herbs and extra virgin seed oil, served boiling hot in earthenware.', 'stews', 42000, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=70', false, true, false, false, 'Medium (1/3)', 'Serves 1', ARRAY['Chickpea flour', 'Cardamom', 'Garlic', 'Shallots', 'Seed Oil', 'Green Chili']::text[], ARRAY['Legumes']::text[], ARRAY['fasting']::text[], 'Fasting / Vegan', 'green', 4, true),
('shiro-bozena', 'Shiro Bozena (Beef Enriched Shiro)', 'ሽሮ ቦዘና', '', 'Traditional spiced chickpea puree enriched with savoury diced prime beef morsels and fragrant niter kibbeh.', 'Traditional spiced chickpea puree enriched with savoury diced prime beef morsels and fragrant niter kibbeh.', 'stews', 49000, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=70', false, false, false, false, 'Medium-Hot (2/3)', 'Serves 1', ARRAY['Chickpea Flour', 'Beef Bites', 'Spiced Butter', 'Berbere', 'Garlic']::text[], ARRAY['Dairy', 'Legumes']::text[], '{}'::text[], 'House Classic', 'brand', 5, true),
('siga-derek-tibs', 'Crisp Siga Derek Tibs', 'የደረቅ ስጋ ጥብስ', 'Crispy pan-fried prime beef with Awaze', 'Pan-charred pasture beef chunks seared with garden rosemary sprigs, seared jalapeño rounds, served with house Awaze dip.', 'Pan-charred pasture beef chunks seared with garden rosemary sprigs, seared jalapeño rounds, served with house Awaze dip.', 'grills', 62000, 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=900&q=70', true, false, false, false, 'Chef Signature Crisp', 'Serves 1', ARRAY['Prime Tenderloin Beef', 'Rosemary', 'Jalapeño', 'Garlic', 'Awaze Paste']::text[], '{}'::text[], ARRAY['special', 'popular']::text[], 'Chef''s Special', 'gold', 6, true),
('awaze-lamb-tibs', 'Awaze Lamb Tibs', 'የበግ አዋዜ ጥብስ', '', 'Succulent lamb tenderloin morsels wok-fried with our proprietary Awaze chili glaze, red shallots, and fresh thyme.', 'Succulent lamb tenderloin morsels wok-fried with our proprietary Awaze chili glaze, red shallots, and fresh thyme.', 'grills', 68000, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=70', false, false, false, false, 'Fiery Hot Awaze (3/3)', 'Serves 1', ARRAY['Highland Lamb', 'House Awaze', 'Red Onions', 'Rosemary', 'Butter']::text[], '{}'::text[], '{}'::text[], 'House Classic', 'brand', 7, true),
('quanta-firfir', 'Spicy Quanta Firfir', 'የቋንጣ ፍርፍር', '', 'Sun-dried house-cured highland beef jerky shredded and sautéed in rich berbere butter gravy, laced with shredded teff injera.', 'Sun-dried house-cured highland beef jerky shredded and sautéed in rich berbere butter gravy, laced with shredded teff injera.', 'grills', 54000, 'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=70', false, false, false, false, 'Robust Berbere (2/3)', 'Serves 1-2', ARRAY['House Quanta Jerky', 'Teff Injera Pieces', 'Berbere', 'Niter Kibbeh', 'Shallots']::text[], ARRAY['Gluten']::text[], '{}'::text[], 'House Classic', 'brand', 8, true),
('chornake-fish-tibs', 'Lake Tana Crispy Fish Tibs', 'የዓሳ ጥብስ', '', 'Fresh golden pan-crisped freshwater tilapia chunks dusted with korarima and served with spicy mitmita salt and lime.', 'Fresh golden pan-crisped freshwater tilapia chunks dusted with korarima and served with spicy mitmita salt and lime.', 'grills', 56000, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=70', false, true, false, false, 'Zesty Lemon & Chili (1/3)', 'Serves 1', ARRAY['Fresh Tilapia fillet', 'Korarima', 'Lime', 'Garlic oil', 'Mitmita']::text[], ARRAY['Fish']::text[], ARRAY['fasting']::text[], 'Fasting / Vegan', 'green', 9, true),
('prime-beef-kitfo', 'Prime Beef Kitfo', 'የከብት ስጋ ክትፎ', '', 'Finely minced extra-lean tenderloin beef steeped in warm aromatic herbal butter and fiery orange mitmita spice blend.', 'Finely minced extra-lean tenderloin beef steeped in warm aromatic herbal butter and fiery orange mitmita spice blend.', 'kitfo', 72000, 'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=70', true, false, false, false, 'Choice: Leb-Leb or Raw', 'Serves 1', ARRAY['Top sirloin', 'Niter Kibbeh', 'Mitmita', 'Cardamom seed powder']::text[], ARRAY['Dairy']::text[], ARRAY['special', 'popular']::text[], 'Chef''s Special', 'gold', 10, true),
('gored-gored', 'Highland Gored Gored', 'ጎረድ ጎረድ', '', 'Succulent raw tenderloin beef cut into neat geometric bite-sized cubes, rolled in fiery mitmita chili and melted herbal butter.', 'Succulent raw tenderloin beef cut into neat geometric bite-sized cubes, rolled in fiery mitmita chili and melted herbal butter.', 'kitfo', 75000, 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=900&q=70', false, false, false, false, 'Extra Hot Mitmita (3/3)', 'Serves 1', ARRAY['Raw Prime Tenderloin', 'Melted Ghee', 'Mitmita', 'Awaze dip']::text[], ARRAY['Dairy']::text[], '{}'::text[], 'House Classic', 'brand', 11, true),
('kitfo-dulet', 'Addis Style Dulet', 'ዱለት', '', 'Traditional minced beef, tripe, and liver seasoned with finely chopped green peppers, shallots, and fragrant niter kibbeh.', 'Traditional minced beef, tripe, and liver seasoned with finely chopped green peppers, shallots, and fragrant niter kibbeh.', 'kitfo', 58000, 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=900&q=70', false, false, false, false, 'Spicy & Tangy (2/3)', 'Serves 1', ARRAY['Minced Beef & Offal', 'Jalapeño', 'Red Onion', 'Mitmita', 'Niter Kibbeh']::text[], ARRAY['Dairy']::text[], '{}'::text[], 'House Classic', 'brand', 12, true),
('full-vegan-beyaynetu', 'Full Vegan Beyaynetu Platter', 'የጾም በያይነቱ ድልድል', '', 'Grand rainbow tasting platter of Misir Wat, Kik Alicha, braised Gomen, sweet Fosolia with carrots, and Atakilt Wat.', 'Grand rainbow tasting platter of Misir Wat, Kik Alicha, braised Gomen, sweet Fosolia with carrots, and Atakilt Wat.', 'fasting', 48000, 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?auto=format&fit=crop&w=900&q=70', true, true, false, false, 'Varied Spices (1-2/3)', 'Serves 1-2 generously', ARRAY['Lentils', 'Split peas', 'Collard greens', 'Carrots & Green beans', 'Cabbage & Potatoes']::text[], ARRAY['Gluten']::text[], ARRAY['special', 'popular', 'fasting']::text[], 'Chef''s Special', 'gold', 13, true),
('misir-wat', 'Highland Red Misir Wat', 'የምስር ወጥ', '', 'Split red lentils simmered gently in rich spiced berbere sauce, caramelized red onions, and cold-pressed sunflower oil.', 'Split red lentils simmered gently in rich spiced berbere sauce, caramelized red onions, and cold-pressed sunflower oil.', 'fasting', 36000, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=70', false, true, false, false, 'Warm Berbere (2/3)', 'Serves 1', ARRAY['Red lentils', 'Berbere', 'Shallots', 'Garlic', 'Sunflower oil']::text[], '{}'::text[], ARRAY['fasting']::text[], 'Fasting / Vegan', 'green', 14, true),
('kik-alicha-wat', 'Golden Kik Alicha', 'የክክ አልጫ ወጥ', '', 'Yellow split peas slow-cooked to a buttery creaminess with garlic, ginger, and golden turmeric broth.', 'Yellow split peas slow-cooked to a buttery creaminess with garlic, ginger, and golden turmeric broth.', 'fasting', 34000, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=70', false, true, false, false, 'Mild Herb Fragrant (1/3)', 'Serves 1', ARRAY['Yellow split peas', 'Turmeric', 'Garlic', 'Ginger', 'White onions']::text[], '{}'::text[], ARRAY['fasting']::text[], 'Fasting / Vegan', 'green', 15, true),
('gomen-collards', 'Braised Ye''abesha Gomen', 'የሀበሻ ጎመን', '', 'Tender young collard greens braised with sweet garlic, sliced shallots, and fresh green jalapeños.', 'Tender young collard greens braised with sweet garlic, sliced shallots, and fresh green jalapeños.', 'fasting', 32000, 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?auto=format&fit=crop&w=900&q=70', false, true, false, false, 'Mild & Savory (1/3)', 'Serves 1', ARRAY['Collard greens', 'Garlic cloves', 'Green chilies', 'Onions', 'Cold-pressed oil']::text[], '{}'::text[], ARRAY['fasting']::text[], 'Fasting / Vegan', 'green', 16, true),
('fresh-timatim-fitfit', 'Fresh Timatim Fitfit', 'ቲማቲም ፍትፍት', '', 'Crisp heirloom tomatoes, minced red shallots, and sliced green peppers tossed with torn cold injera and tangy mustard dressing.', 'Crisp heirloom tomatoes, minced red shallots, and sliced green peppers tossed with torn cold injera and tangy mustard dressing.', 'fasting', 28000, 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?auto=format&fit=crop&w=900&q=70', false, true, false, false, 'Cooling & Tangy (1/3)', 'Serves 1 (Great as side)', ARRAY['Fresh tomatoes', 'Injera pieces', 'Shallots', 'Mustard dressing', 'Jalapeño']::text[], ARRAY['Gluten']::text[], ARRAY['fasting']::text[], 'Fasting / Vegan', 'green', 17, true),
('house-tej-carafe', 'House Fermented Tej (500ml Carafe)', 'የማር ጠጅ', '', 'Traditional golden mead naturally fermented for 21 days with pure highland wildflower honey and bitter gesho wood.', 'Traditional golden mead naturally fermented for 21 days with pure highland wildflower honey and bitter gesho wood.', 'drinks', 35000, 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=70', true, true, false, false, 'Pure Sweet Ferment', '500ml Flask (11% ABV)', ARRAY['Pure Wild Honey', 'Gesho Wood', 'Spring Water']::text[], '{}'::text[], ARRAY['special', 'popular', 'fasting']::text[], 'Chef''s Special', 'gold', 18, true),
('jebena-spiced-coffee', 'Traditional Jebena Coffee', 'የጀበና ቡና', '', 'Addis-style freshly roasted Yirgacheffe arabica beans boiled in clay Jebena with a hint of tenadam rue herb.', 'Addis-style freshly roasted Yirgacheffe arabica beans boiled in clay Jebena with a hint of tenadam rue herb.', 'drinks', 8000, 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=70', false, true, false, false, 'Smoky & Aromatic', 'Ceremonial Sini Cup', ARRAY['Yirgacheffe Coffee Beans', 'Tenadam Herb (optional)', 'Cardamom']::text[], '{}'::text[], ARRAY['fasting']::text[], 'Fasting / Vegan', 'green', 19, true),
('spiced-habesha-chai', 'Highland Spiced Shai', 'የቅመም ሻይ', '', 'Slow-infused black highland tea leaves brewed with crushed cinnamon bark, fragrant cardamom pods, and cloves.', 'Slow-infused black highland tea leaves brewed with crushed cinnamon bark, fragrant cardamom pods, and cloves.', 'drinks', 8000, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=70', false, true, false, false, 'Cardamom & Cinnamon Infusion', 'Served hot with raw cane sugar', ARRAY['Black tea leaves', 'Cinnamon', 'Cardamom', 'Cloves', 'Ginger root']::text[], '{}'::text[], ARRAY['fasting']::text[], 'Fasting / Vegan', 'green', 20, true),
('fresh-ayib', 'Fresh Ayib', 'አይብ', 'Cooling house-made curd', 'Mild fresh cottage curd, churned daily and served cool to balance berbere heat.', 'Mild fresh cottage curd, churned daily and served cool to balance berbere heat.', 'sides', 0, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=70', false, false, true, true, '', 'Side portion', ARRAY['Cottage cheese', 'Sea salt']::text[], ARRAY['Dairy']::text[], ARRAY['side', 'complimentary']::text[], 'Complimentary', 'gold', 21, true),
('stewed-gomen-side', 'Stewed Gomen (Side)', 'ጎመን', 'Garlic-infused collard greens', 'Slow-braised collard greens with garlic, ginger and a touch of niter kibbeh.', 'Slow-braised collard greens with garlic, ginger and a touch of niter kibbeh.', 'sides', 0, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=70', false, false, true, true, 'Mild', 'Side portion', ARRAY['Collard greens', 'Garlic', 'Ginger']::text[], ARRAY['Dairy']::text[], ARRAY['side', 'complimentary']::text[], 'Complimentary', 'gold', 22, true),
('house-awaze', 'House Awaze Paste', 'አዋዜ', 'Aged berbere and tej sauce', 'A fiery house condiment of aged berbere, tej and aromatic spices.', 'A fiery house condiment of aged berbere, tej and aromatic spices.', 'sides', 0, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=70', false, true, true, true, 'Fiery', 'Side portion', ARRAY['Berbere', 'Tej', 'Garlic']::text[], '{}'::text[], ARRAY['side', 'complimentary', 'fasting']::text[], 'Complimentary', 'gold', 23, true),
('extra-braised-egg', 'Extra Braised Egg', 'እንቁላል', 'Simmered in wat broth', 'A whole farm egg slow-braised in the house wat broth.', 'A whole farm egg slow-braised in the house wat broth.', 'sides', 40, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=70', false, false, false, true, 'Mild', '1 egg', ARRAY['Farm egg', 'Wat broth']::text[], ARRAY['Egg']::text[], ARRAY['side']::text[], 'Side', 'brand', 24, true),
('extra-teff-injera', 'Extra Teff Injera (3 rolls)', 'እንጀራ', 'Warm basket for the table', 'Three extra rolls of our naturally fermented teff injera.', 'Three extra rolls of our naturally fermented teff injera.', 'sides', 90, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=70', false, true, false, true, '', '3 rolls', ARRAY['Teff', 'Spring water']::text[], '{}'::text[], ARRAY['side', 'fasting']::text[], 'Side', 'brand', 25, true),
('pure-teff-injera', '100% Pure Teff Injera', 'ንጹህ ጤፍ እንጀራ', 'Naturally gluten-free', 'A whole injera made from 100% pure organic brown teff.', 'A whole injera made from 100% pure organic brown teff.', 'sides', 60, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=70', false, true, false, true, '', '1 large injera', ARRAY['Pure teff', 'Spring water']::text[], '{}'::text[], ARRAY['side', 'fasting']::text[], 'Side', 'brand', 26, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  native_name = EXCLUDED.native_name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  long_description = EXCLUDED.long_description,
  category = EXCLUDED.category,
  price_cents = EXCLUDED.price_cents,
  image_url = EXCLUDED.image_url,
  is_special = EXCLUDED.is_special,
  is_fasting = EXCLUDED.is_fasting,
  is_complimentary = EXCLUDED.is_complimentary,
  is_side = EXCLUDED.is_side,
  spice_level = EXCLUDED.spice_level,
  servings = EXCLUDED.servings,
  ingredients = EXCLUDED.ingredients,
  allergens = EXCLUDED.allergens,
  tags = EXCLUDED.tags,
  badge_text = EXCLUDED.badge_text,
  badge_tone = EXCLUDED.badge_tone,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO menu_option_groups (
  id, menu_item_id, key, title, icon, badge, columns, is_multi,
  max_selections, sort_order, is_active
) VALUES
('doro-wat:heat', 'doro-wat', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('doro-wat:injera', 'doro-wat', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('doro-wat:sides', 'doro-wat', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('siga-wat:heat', 'siga-wat', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('siga-wat:injera', 'siga-wat', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('siga-wat:sides', 'siga-wat', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('beg-alicha-wat:heat', 'beg-alicha-wat', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('beg-alicha-wat:injera', 'beg-alicha-wat', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('beg-alicha-wat:sides', 'beg-alicha-wat', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('shiro-tegamino:heat', 'shiro-tegamino', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('shiro-tegamino:injera', 'shiro-tegamino', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('shiro-tegamino:sides', 'shiro-tegamino', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('shiro-bozena:heat', 'shiro-bozena', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('shiro-bozena:injera', 'shiro-bozena', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('shiro-bozena:sides', 'shiro-bozena', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('siga-derek-tibs:heat', 'siga-derek-tibs', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('siga-derek-tibs:injera', 'siga-derek-tibs', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('siga-derek-tibs:sides', 'siga-derek-tibs', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('awaze-lamb-tibs:heat', 'awaze-lamb-tibs', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('awaze-lamb-tibs:injera', 'awaze-lamb-tibs', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('awaze-lamb-tibs:sides', 'awaze-lamb-tibs', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('quanta-firfir:heat', 'quanta-firfir', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('quanta-firfir:injera', 'quanta-firfir', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('quanta-firfir:sides', 'quanta-firfir', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('chornake-fish-tibs:heat', 'chornake-fish-tibs', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('chornake-fish-tibs:injera', 'chornake-fish-tibs', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('chornake-fish-tibs:sides', 'chornake-fish-tibs', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('prime-beef-kitfo:heat', 'prime-beef-kitfo', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('prime-beef-kitfo:injera', 'prime-beef-kitfo', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('prime-beef-kitfo:sides', 'prime-beef-kitfo', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('gored-gored:heat', 'gored-gored', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('gored-gored:injera', 'gored-gored', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('gored-gored:sides', 'gored-gored', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('kitfo-dulet:heat', 'kitfo-dulet', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('kitfo-dulet:injera', 'kitfo-dulet', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('kitfo-dulet:sides', 'kitfo-dulet', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('full-vegan-beyaynetu:heat', 'full-vegan-beyaynetu', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('full-vegan-beyaynetu:injera', 'full-vegan-beyaynetu', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('full-vegan-beyaynetu:sides', 'full-vegan-beyaynetu', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('misir-wat:heat', 'misir-wat', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('misir-wat:injera', 'misir-wat', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('misir-wat:sides', 'misir-wat', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('kik-alicha-wat:heat', 'kik-alicha-wat', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('kik-alicha-wat:injera', 'kik-alicha-wat', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('kik-alicha-wat:sides', 'kik-alicha-wat', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('gomen-collards:heat', 'gomen-collards', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('gomen-collards:injera', 'gomen-collards', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('gomen-collards:sides', 'gomen-collards', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true),
('fresh-timatim-fitfit:heat', 'fresh-timatim-fitfit', 'heat', 'Heat & Spice Level', '🌶️', 'Required', 3, false, 1, 1, true),
('fresh-timatim-fitfit:injera', 'fresh-timatim-fitfit', 'injera', 'Traditional Injera Base', '🍞', 'Choose 1', 1, false, 1, 2, true),
('fresh-timatim-fitfit:sides', 'fresh-timatim-fitfit', 'sides', 'Complimentary Side Accents', '🥗', 'Up to 2', 2, true, 2, 3, true)
ON CONFLICT DO NOTHING;

INSERT INTO menu_options (
  id, group_id, value, title, description, note, price_delta_cents,
  is_default, is_active, sort_order
) VALUES
('doro-wat:heat:mild', 'doro-wat:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('doro-wat:heat:traditional', 'doro-wat:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('doro-wat:heat:fiery', 'doro-wat:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('doro-wat:injera:standard', 'doro-wat:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('doro-wat:injera:pure-teff', 'doro-wat:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('doro-wat:sides:ayib', 'doro-wat:sides', 'ayib', 'Fresh Ayib', 'Mild fresh cottage curd', 'Free', 0, true, true, 1),
('doro-wat:sides:gomen', 'doro-wat:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, false, true, 2),
('doro-wat:sides:awaze', 'doro-wat:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 3),
('doro-wat:sides:extra-braised-egg', 'doro-wat:sides', 'extra-braised-egg', 'Extra Braised Egg', 'Slow-cooked in the wat broth', '+ETB 40', 4000, false, true, 4),
('siga-wat:heat:mild', 'siga-wat:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('siga-wat:heat:traditional', 'siga-wat:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('siga-wat:heat:fiery', 'siga-wat:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('siga-wat:injera:standard', 'siga-wat:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('siga-wat:injera:pure-teff', 'siga-wat:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('siga-wat:sides:ayib', 'siga-wat:sides', 'ayib', 'Fresh Ayib', 'Mild fresh cottage curd', 'Free', 0, true, true, 1),
('siga-wat:sides:gomen', 'siga-wat:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, false, true, 2),
('siga-wat:sides:awaze', 'siga-wat:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 3),
('siga-wat:sides:extra-braised-egg', 'siga-wat:sides', 'extra-braised-egg', 'Extra Braised Egg', 'Slow-cooked in the wat broth', '+ETB 40', 4000, false, true, 4),
('beg-alicha-wat:heat:mild', 'beg-alicha-wat:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('beg-alicha-wat:heat:traditional', 'beg-alicha-wat:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('beg-alicha-wat:heat:fiery', 'beg-alicha-wat:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('beg-alicha-wat:injera:standard', 'beg-alicha-wat:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('beg-alicha-wat:injera:pure-teff', 'beg-alicha-wat:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('beg-alicha-wat:sides:ayib', 'beg-alicha-wat:sides', 'ayib', 'Fresh Ayib', 'Mild fresh cottage curd', 'Free', 0, true, true, 1),
('beg-alicha-wat:sides:gomen', 'beg-alicha-wat:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, false, true, 2),
('beg-alicha-wat:sides:awaze', 'beg-alicha-wat:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 3),
('beg-alicha-wat:sides:extra-braised-egg', 'beg-alicha-wat:sides', 'extra-braised-egg', 'Extra Braised Egg', 'Slow-cooked in the wat broth', '+ETB 40', 4000, false, true, 4),
('shiro-tegamino:heat:mild', 'shiro-tegamino:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('shiro-tegamino:heat:traditional', 'shiro-tegamino:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('shiro-tegamino:heat:fiery', 'shiro-tegamino:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('shiro-tegamino:injera:standard', 'shiro-tegamino:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('shiro-tegamino:injera:pure-teff', 'shiro-tegamino:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('shiro-tegamino:sides:gomen', 'shiro-tegamino:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, true, true, 1),
('shiro-tegamino:sides:awaze', 'shiro-tegamino:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 2),
('shiro-tegamino:sides:extra-teff-injera', 'shiro-tegamino:sides', 'extra-teff-injera', 'Extra Teff Injera', 'A basket of three warm rolls', '+ETB 90', 9000, false, true, 3),
('shiro-tegamino:sides:pure-teff-injera', 'shiro-tegamino:sides', 'pure-teff-injera', '100% Pure Teff Injera', 'Naturally gluten-free whole injera', '+ETB 60', 6000, false, true, 4),
('shiro-bozena:heat:mild', 'shiro-bozena:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('shiro-bozena:heat:traditional', 'shiro-bozena:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('shiro-bozena:heat:fiery', 'shiro-bozena:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('shiro-bozena:injera:standard', 'shiro-bozena:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('shiro-bozena:injera:pure-teff', 'shiro-bozena:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('shiro-bozena:sides:ayib', 'shiro-bozena:sides', 'ayib', 'Fresh Ayib', 'Mild fresh cottage curd', 'Free', 0, true, true, 1),
('shiro-bozena:sides:gomen', 'shiro-bozena:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, false, true, 2),
('shiro-bozena:sides:awaze', 'shiro-bozena:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 3),
('shiro-bozena:sides:extra-braised-egg', 'shiro-bozena:sides', 'extra-braised-egg', 'Extra Braised Egg', 'Slow-cooked in the wat broth', '+ETB 40', 4000, false, true, 4),
('siga-derek-tibs:heat:mild', 'siga-derek-tibs:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('siga-derek-tibs:heat:traditional', 'siga-derek-tibs:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('siga-derek-tibs:heat:fiery', 'siga-derek-tibs:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('siga-derek-tibs:injera:standard', 'siga-derek-tibs:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('siga-derek-tibs:injera:pure-teff', 'siga-derek-tibs:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('siga-derek-tibs:sides:ayib', 'siga-derek-tibs:sides', 'ayib', 'Fresh Ayib', 'Mild fresh cottage curd', 'Free', 0, true, true, 1),
('siga-derek-tibs:sides:gomen', 'siga-derek-tibs:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, false, true, 2),
('siga-derek-tibs:sides:awaze', 'siga-derek-tibs:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 3),
('siga-derek-tibs:sides:extra-braised-egg', 'siga-derek-tibs:sides', 'extra-braised-egg', 'Extra Braised Egg', 'Slow-cooked in the wat broth', '+ETB 40', 4000, false, true, 4),
('awaze-lamb-tibs:heat:mild', 'awaze-lamb-tibs:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('awaze-lamb-tibs:heat:traditional', 'awaze-lamb-tibs:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('awaze-lamb-tibs:heat:fiery', 'awaze-lamb-tibs:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('awaze-lamb-tibs:injera:standard', 'awaze-lamb-tibs:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('awaze-lamb-tibs:injera:pure-teff', 'awaze-lamb-tibs:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('awaze-lamb-tibs:sides:ayib', 'awaze-lamb-tibs:sides', 'ayib', 'Fresh Ayib', 'Mild fresh cottage curd', 'Free', 0, true, true, 1),
('awaze-lamb-tibs:sides:gomen', 'awaze-lamb-tibs:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, false, true, 2),
('awaze-lamb-tibs:sides:awaze', 'awaze-lamb-tibs:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 3),
('awaze-lamb-tibs:sides:extra-braised-egg', 'awaze-lamb-tibs:sides', 'extra-braised-egg', 'Extra Braised Egg', 'Slow-cooked in the wat broth', '+ETB 40', 4000, false, true, 4),
('quanta-firfir:heat:mild', 'quanta-firfir:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('quanta-firfir:heat:traditional', 'quanta-firfir:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('quanta-firfir:heat:fiery', 'quanta-firfir:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('quanta-firfir:injera:standard', 'quanta-firfir:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('quanta-firfir:injera:pure-teff', 'quanta-firfir:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('quanta-firfir:sides:ayib', 'quanta-firfir:sides', 'ayib', 'Fresh Ayib', 'Mild fresh cottage curd', 'Free', 0, true, true, 1),
('quanta-firfir:sides:gomen', 'quanta-firfir:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, false, true, 2),
('quanta-firfir:sides:awaze', 'quanta-firfir:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 3),
('quanta-firfir:sides:extra-braised-egg', 'quanta-firfir:sides', 'extra-braised-egg', 'Extra Braised Egg', 'Slow-cooked in the wat broth', '+ETB 40', 4000, false, true, 4),
('chornake-fish-tibs:heat:mild', 'chornake-fish-tibs:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('chornake-fish-tibs:heat:traditional', 'chornake-fish-tibs:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('chornake-fish-tibs:heat:fiery', 'chornake-fish-tibs:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('chornake-fish-tibs:injera:standard', 'chornake-fish-tibs:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('chornake-fish-tibs:injera:pure-teff', 'chornake-fish-tibs:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('chornake-fish-tibs:sides:gomen', 'chornake-fish-tibs:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, true, true, 1),
('chornake-fish-tibs:sides:awaze', 'chornake-fish-tibs:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 2),
('chornake-fish-tibs:sides:extra-teff-injera', 'chornake-fish-tibs:sides', 'extra-teff-injera', 'Extra Teff Injera', 'A basket of three warm rolls', '+ETB 90', 9000, false, true, 3),
('chornake-fish-tibs:sides:pure-teff-injera', 'chornake-fish-tibs:sides', 'pure-teff-injera', '100% Pure Teff Injera', 'Naturally gluten-free whole injera', '+ETB 60', 6000, false, true, 4),
('prime-beef-kitfo:heat:mild', 'prime-beef-kitfo:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('prime-beef-kitfo:heat:traditional', 'prime-beef-kitfo:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('prime-beef-kitfo:heat:fiery', 'prime-beef-kitfo:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('prime-beef-kitfo:injera:standard', 'prime-beef-kitfo:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('prime-beef-kitfo:injera:pure-teff', 'prime-beef-kitfo:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('prime-beef-kitfo:sides:ayib', 'prime-beef-kitfo:sides', 'ayib', 'Fresh Ayib', 'Mild fresh cottage curd', 'Free', 0, true, true, 1),
('prime-beef-kitfo:sides:gomen', 'prime-beef-kitfo:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, false, true, 2),
('prime-beef-kitfo:sides:awaze', 'prime-beef-kitfo:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 3),
('prime-beef-kitfo:sides:extra-braised-egg', 'prime-beef-kitfo:sides', 'extra-braised-egg', 'Extra Braised Egg', 'Slow-cooked in the wat broth', '+ETB 40', 4000, false, true, 4),
('gored-gored:heat:mild', 'gored-gored:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('gored-gored:heat:traditional', 'gored-gored:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('gored-gored:heat:fiery', 'gored-gored:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('gored-gored:injera:standard', 'gored-gored:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('gored-gored:injera:pure-teff', 'gored-gored:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('gored-gored:sides:ayib', 'gored-gored:sides', 'ayib', 'Fresh Ayib', 'Mild fresh cottage curd', 'Free', 0, true, true, 1),
('gored-gored:sides:gomen', 'gored-gored:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, false, true, 2),
('gored-gored:sides:awaze', 'gored-gored:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 3),
('gored-gored:sides:extra-braised-egg', 'gored-gored:sides', 'extra-braised-egg', 'Extra Braised Egg', 'Slow-cooked in the wat broth', '+ETB 40', 4000, false, true, 4),
('kitfo-dulet:heat:mild', 'kitfo-dulet:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('kitfo-dulet:heat:traditional', 'kitfo-dulet:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('kitfo-dulet:heat:fiery', 'kitfo-dulet:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('kitfo-dulet:injera:standard', 'kitfo-dulet:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('kitfo-dulet:injera:pure-teff', 'kitfo-dulet:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('kitfo-dulet:sides:ayib', 'kitfo-dulet:sides', 'ayib', 'Fresh Ayib', 'Mild fresh cottage curd', 'Free', 0, true, true, 1),
('kitfo-dulet:sides:gomen', 'kitfo-dulet:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, false, true, 2),
('kitfo-dulet:sides:awaze', 'kitfo-dulet:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 3),
('kitfo-dulet:sides:extra-braised-egg', 'kitfo-dulet:sides', 'extra-braised-egg', 'Extra Braised Egg', 'Slow-cooked in the wat broth', '+ETB 40', 4000, false, true, 4),
('full-vegan-beyaynetu:heat:mild', 'full-vegan-beyaynetu:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('full-vegan-beyaynetu:heat:traditional', 'full-vegan-beyaynetu:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('full-vegan-beyaynetu:heat:fiery', 'full-vegan-beyaynetu:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('full-vegan-beyaynetu:injera:standard', 'full-vegan-beyaynetu:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('full-vegan-beyaynetu:injera:pure-teff', 'full-vegan-beyaynetu:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('full-vegan-beyaynetu:sides:gomen', 'full-vegan-beyaynetu:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, true, true, 1),
('full-vegan-beyaynetu:sides:awaze', 'full-vegan-beyaynetu:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 2),
('full-vegan-beyaynetu:sides:extra-teff-injera', 'full-vegan-beyaynetu:sides', 'extra-teff-injera', 'Extra Teff Injera', 'A basket of three warm rolls', '+ETB 90', 9000, false, true, 3),
('full-vegan-beyaynetu:sides:pure-teff-injera', 'full-vegan-beyaynetu:sides', 'pure-teff-injera', '100% Pure Teff Injera', 'Naturally gluten-free whole injera', '+ETB 60', 6000, false, true, 4),
('misir-wat:heat:mild', 'misir-wat:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('misir-wat:heat:traditional', 'misir-wat:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('misir-wat:heat:fiery', 'misir-wat:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('misir-wat:injera:standard', 'misir-wat:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('misir-wat:injera:pure-teff', 'misir-wat:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('misir-wat:sides:gomen', 'misir-wat:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, true, true, 1),
('misir-wat:sides:awaze', 'misir-wat:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 2),
('misir-wat:sides:extra-teff-injera', 'misir-wat:sides', 'extra-teff-injera', 'Extra Teff Injera', 'A basket of three warm rolls', '+ETB 90', 9000, false, true, 3),
('misir-wat:sides:pure-teff-injera', 'misir-wat:sides', 'pure-teff-injera', '100% Pure Teff Injera', 'Naturally gluten-free whole injera', '+ETB 60', 6000, false, true, 4),
('kik-alicha-wat:heat:mild', 'kik-alicha-wat:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('kik-alicha-wat:heat:traditional', 'kik-alicha-wat:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('kik-alicha-wat:heat:fiery', 'kik-alicha-wat:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('kik-alicha-wat:injera:standard', 'kik-alicha-wat:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('kik-alicha-wat:injera:pure-teff', 'kik-alicha-wat:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('kik-alicha-wat:sides:gomen', 'kik-alicha-wat:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, true, true, 1),
('kik-alicha-wat:sides:awaze', 'kik-alicha-wat:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 2),
('kik-alicha-wat:sides:extra-teff-injera', 'kik-alicha-wat:sides', 'extra-teff-injera', 'Extra Teff Injera', 'A basket of three warm rolls', '+ETB 90', 9000, false, true, 3),
('kik-alicha-wat:sides:pure-teff-injera', 'kik-alicha-wat:sides', 'pure-teff-injera', '100% Pure Teff Injera', 'Naturally gluten-free whole injera', '+ETB 60', 6000, false, true, 4),
('gomen-collards:heat:mild', 'gomen-collards:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('gomen-collards:heat:traditional', 'gomen-collards:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('gomen-collards:heat:fiery', 'gomen-collards:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('gomen-collards:injera:standard', 'gomen-collards:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('gomen-collards:injera:pure-teff', 'gomen-collards:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('gomen-collards:sides:gomen', 'gomen-collards:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, true, true, 1),
('gomen-collards:sides:awaze', 'gomen-collards:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 2),
('gomen-collards:sides:extra-teff-injera', 'gomen-collards:sides', 'extra-teff-injera', 'Extra Teff Injera', 'A basket of three warm rolls', '+ETB 90', 9000, false, true, 3),
('gomen-collards:sides:pure-teff-injera', 'gomen-collards:sides', 'pure-teff-injera', '100% Pure Teff Injera', 'Naturally gluten-free whole injera', '+ETB 60', 6000, false, true, 4),
('fresh-timatim-fitfit:heat:mild', 'fresh-timatim-fitfit:heat', 'mild', 'Mild', 'Alicha touch, fragrant cardamoms', '1/3', 0, false, true, 1),
('fresh-timatim-fitfit:heat:traditional', 'fresh-timatim-fitfit:heat', 'traditional', 'Traditional', 'Berbere warmth (recommended)', '2/3', 0, true, true, 2),
('fresh-timatim-fitfit:heat:fiery', 'fresh-timatim-fitfit:heat', 'fiery', 'Fiery Awaze', 'Served with awaze & mitmita dip', '3/3', 0, false, true, 3),
('fresh-timatim-fitfit:injera:standard', 'fresh-timatim-fitfit:injera', 'standard', 'Standard Teff & Barley Blend', 'Spongy, tart sourdough, naturally soft (traditional)', 'Included', 0, true, true, 1),
('fresh-timatim-fitfit:injera:pure-teff', 'fresh-timatim-fitfit:injera', 'pure-teff', '100% Pure Organic Brown Teff', 'Naturally gluten-free, iron-rich nutty grain', '+ETB 60', 6000, false, true, 2),
('fresh-timatim-fitfit:sides:gomen', 'fresh-timatim-fitfit:sides', 'gomen', 'Stewed Gomen', 'Garlic-infused collard greens', 'Free', 0, true, true, 1),
('fresh-timatim-fitfit:sides:awaze', 'fresh-timatim-fitfit:sides', 'awaze', 'House Awaze Paste', 'Aged tej and berbere sauce', 'Free', 0, false, true, 2),
('fresh-timatim-fitfit:sides:extra-teff-injera', 'fresh-timatim-fitfit:sides', 'extra-teff-injera', 'Extra Teff Injera', 'A basket of three warm rolls', '+ETB 90', 9000, false, true, 3),
('fresh-timatim-fitfit:sides:pure-teff-injera', 'fresh-timatim-fitfit:sides', 'pure-teff-injera', '100% Pure Teff Injera', 'Naturally gluten-free whole injera', '+ETB 60', 6000, false, true, 4)
ON CONFLICT DO NOTHING;

INSERT INTO menu_pairings (menu_item_id, paired_menu_item_id, sort_order) VALUES
('doro-wat', 'house-tej-carafe', 1),
('doro-wat', 'fresh-timatim-fitfit', 2),
('doro-wat', 'jebena-spiced-coffee', 3),
('siga-wat', 'house-tej-carafe', 1),
('siga-wat', 'fresh-timatim-fitfit', 2),
('siga-wat', 'jebena-spiced-coffee', 3),
('beg-alicha-wat', 'house-tej-carafe', 1),
('beg-alicha-wat', 'fresh-timatim-fitfit', 2),
('beg-alicha-wat', 'jebena-spiced-coffee', 3),
('shiro-tegamino', 'house-tej-carafe', 1),
('shiro-tegamino', 'fresh-timatim-fitfit', 2),
('shiro-tegamino', 'jebena-spiced-coffee', 3),
('shiro-bozena', 'house-tej-carafe', 1),
('shiro-bozena', 'fresh-timatim-fitfit', 2),
('shiro-bozena', 'jebena-spiced-coffee', 3),
('siga-derek-tibs', 'house-tej-carafe', 1),
('siga-derek-tibs', 'fresh-timatim-fitfit', 2),
('siga-derek-tibs', 'jebena-spiced-coffee', 3),
('awaze-lamb-tibs', 'house-tej-carafe', 1),
('awaze-lamb-tibs', 'fresh-timatim-fitfit', 2),
('awaze-lamb-tibs', 'jebena-spiced-coffee', 3),
('quanta-firfir', 'house-tej-carafe', 1),
('quanta-firfir', 'fresh-timatim-fitfit', 2),
('quanta-firfir', 'jebena-spiced-coffee', 3),
('chornake-fish-tibs', 'house-tej-carafe', 1),
('chornake-fish-tibs', 'fresh-timatim-fitfit', 2),
('chornake-fish-tibs', 'jebena-spiced-coffee', 3),
('prime-beef-kitfo', 'house-tej-carafe', 1),
('prime-beef-kitfo', 'fresh-timatim-fitfit', 2),
('prime-beef-kitfo', 'jebena-spiced-coffee', 3),
('gored-gored', 'house-tej-carafe', 1),
('gored-gored', 'fresh-timatim-fitfit', 2),
('gored-gored', 'jebena-spiced-coffee', 3),
('kitfo-dulet', 'house-tej-carafe', 1),
('kitfo-dulet', 'fresh-timatim-fitfit', 2),
('kitfo-dulet', 'jebena-spiced-coffee', 3),
('full-vegan-beyaynetu', 'house-tej-carafe', 1),
('full-vegan-beyaynetu', 'fresh-timatim-fitfit', 2),
('full-vegan-beyaynetu', 'jebena-spiced-coffee', 3),
('misir-wat', 'house-tej-carafe', 1),
('misir-wat', 'fresh-timatim-fitfit', 2),
('misir-wat', 'jebena-spiced-coffee', 3),
('kik-alicha-wat', 'house-tej-carafe', 1),
('kik-alicha-wat', 'fresh-timatim-fitfit', 2),
('kik-alicha-wat', 'jebena-spiced-coffee', 3),
('gomen-collards', 'house-tej-carafe', 1),
('gomen-collards', 'fresh-timatim-fitfit', 2),
('gomen-collards', 'jebena-spiced-coffee', 3),
('fresh-timatim-fitfit', 'house-tej-carafe', 1),
('fresh-timatim-fitfit', 'jebena-spiced-coffee', 3),
('house-tej-carafe', 'fresh-timatim-fitfit', 2),
('house-tej-carafe', 'jebena-spiced-coffee', 3),
('jebena-spiced-coffee', 'house-tej-carafe', 1),
('jebena-spiced-coffee', 'fresh-timatim-fitfit', 2),
('spiced-habesha-chai', 'house-tej-carafe', 1),
('spiced-habesha-chai', 'fresh-timatim-fitfit', 2),
('spiced-habesha-chai', 'jebena-spiced-coffee', 3)
ON CONFLICT DO NOTHING;

-- The legacy importer used this slug for the same dish that the canonical
-- catalogue now calls shiro-bozena. Keep the row for old receipts, but hide the
-- duplicate from the live menu.
UPDATE menu_items
SET is_active = false
WHERE id = 'clay-pot-shiro-bozena';
