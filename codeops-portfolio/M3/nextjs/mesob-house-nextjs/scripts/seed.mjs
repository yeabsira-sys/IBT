#!/usr/bin/env node

/**
 * Idempotent local seed for the Mesob House catalogue.
 *
 *   node scripts/seed.mjs
 *   DATABASE_URL=postgresql://... node scripts/seed.mjs --allow-remote
 *
 * The seed refuses non-local databases unless --allow-remote is passed. It is
 * intentionally rerunnable: catalogue records are upserted, while seed-owned
 * child rows (option links, ingredient links, opening hours, delivery zones)
 * are replaced.
 */

import fs from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import {
  assertLocalWriteTarget,
  createPool,
  databaseUrlFromEnv,
  loadEnv,
  parseArgs,
  printDatabaseTarget,
  withTransaction,
} from "./lib/db-cli.mjs";

loadEnv();
const args = parseArgs();
const databaseUrl = databaseUrlFromEnv();
assertLocalWriteTarget(databaseUrl, args);
printDatabaseTarget("Seed target", databaseUrl);

const root = path.dirname(new URL(import.meta.url).pathname);
const seed = JSON.parse(
  fs.readFileSync(path.join(root, "data", "menu.seed.json"), "utf8"),
);

const RESTAURANT = {
  name: "Mesob House",
  slug: "mesob-house",
  legalName: "Mesob House Restaurant PLC",
  description:
    "A modern Ethiopian table in Addis Ababa, serving slow-simmered wats, fire-kissed tibs, kitfo and house-fermented tej.",
  logoUrl: "/icon.svg",
  phone: "+251 11 555 0100",
  email: "hello@mesob.house",
  address: "Bole Medhanialem, Addis Ababa, Ethiopia",
  timezone: "Africa/Addis_Ababa",
  defaultLocale: "en",
  defaultCurrency: "ETB",
  defaultTaxInclusive: true,
};

const BRANCH = {
  name: "Bole Medhanialem",
  slug: "bole-medhanialem",
  address: "Bole Road, near Medhanialem Church, Addis Ababa",
  latitude: 8.995,
  longitude: 38.787,
  phone: "+251 11 555 0101",
  timezone: "Africa/Addis_Ababa",
  serviceChargeType: "NONE",
  serviceChargeValue: 0,
  serviceChargeTaxable: false,
};

const TAX = {
  code: "VAT",
  name: "VAT (15%)",
  description: "Ethiopian value-added tax, inclusive by default.",
  rateBasisPoints: 1500,
  inclusiveDefault: true,
  validFrom: "2020-01-01T00:00:00.000Z",
};

const PROMOTION = {
  code: "GURSHA2025",
  name: "Gursha welcome offer",
  description: "ETB 200 off orders of ETB 500 or more.",
  type: "FIXED",
  value: 20000,
  minOrderMinor: 50000,
  maxDiscountMinor: 20000,
  startsAt: "2020-01-01T00:00:00.000Z",
};

const DELIVERY_ZONES = [
  {
    name: "Bole Medhanialem",
    description: "Bole Medhanialem and nearby streets.",
    baseFeeMinor: 5000,
    minOrderMinor: 30000,
    centerLat: 8.995,
    centerLng: 38.787,
    radiusMeters: 3000,
    sortOrder: 1,
  },
  {
    name: "Kazanchis",
    description: "Kazanchis, ECA and the surrounding business district.",
    baseFeeMinor: 8000,
    minOrderMinor: 30000,
    centerLat: 9.015,
    centerLng: 38.765,
    radiusMeters: 4000,
    sortOrder: 2,
  },
  {
    name: "Sarbet",
    description: "Sarbet and the roads toward old airport.",
    baseFeeMinor: 10000,
    minOrderMinor: 40000,
    centerLat: 9.0,
    centerLng: 38.745,
    radiusMeters: 4000,
    sortOrder: 3,
  },
  {
    name: "Old Airport",
    description: "Old Airport, Hayahulet and nearby neighbourhoods.",
    baseFeeMinor: 9000,
    minOrderMinor: 35000,
    centerLat: 8.985,
    centerLng: 38.75,
    radiusMeters: 3500,
    sortOrder: 4,
  },
  {
    name: "CMC",
    description: "CMC, Megenagna and the eastern residential belt.",
    baseFeeMinor: 15000,
    minOrderMinor: 50000,
    centerLat: 9.02,
    centerLng: 38.82,
    radiusMeters: 5000,
    sortOrder: 5,
  },
];

const ACCOUNTS = [
  {
    key: "owner",
    fullName: "Mesob House Owner",
    email: process.env.SEED_ADMIN_EMAIL || "owner@mesob.house",
    phone: "911000001",
    password: process.env.SEED_ADMIN_PASSWORD || "MesobOwner2026!",
    accountType: "STAFF",
    role: "RESTAURANT_OWNER",
    branch: null,
  },
  {
    key: "kitchen",
    fullName: "Mesob Kitchen",
    email: process.env.SEED_KITCHEN_EMAIL || "kitchen@mesob.house",
    phone: "911000002",
    password: process.env.SEED_KITCHEN_PASSWORD || "MesobKitchen2026!",
    accountType: "STAFF",
    role: "KITCHEN_STAFF",
    branch: "branch",
  },
  {
    key: "delivery",
    fullName: "Mesob Delivery",
    email: process.env.SEED_DELIVERY_EMAIL || "delivery@mesob.house",
    phone: "911000004",
    password: process.env.SEED_DELIVERY_PASSWORD || "MesobDelivery2026!",
    accountType: "STAFF",
    role: "DELIVERY_STAFF",
    branch: "branch",
  },
  {
    key: "guest",
    fullName: "Mesob Guest",
    email: process.env.SEED_GUEST_EMAIL || "guest@mesob.house",
    phone: "911000003",
    password: process.env.SEED_GUEST_PASSWORD || "MesobGuest2026!",
    accountType: "CUSTOMER",
    role: null,
    branch: null,
  },
];

const ALLERGENS = [
  ["celery", "Celery", "Celery and products derived from it."],
  ["gluten", "Cereals containing gluten", "Wheat, rye, barley, oats and spelt."],
  ["crustaceans", "Crustaceans", "Crab, prawn, lobster and similar shellfish."],
  ["eggs", "Eggs", "Eggs and egg-based ingredients."],
  ["fish", "Fish", "Fish and fish-derived ingredients."],
  ["lupin", "Lupin", "Lupin flour, seeds and derived ingredients."],
  ["milk", "Milk", "Milk, dairy and lactose-containing ingredients."],
  ["molluscs", "Molluscs", "Mussels, oysters, squid and similar shellfish."],
  ["mustard", "Mustard", "Mustard paste, seeds and powder."],
  ["nuts", "Tree nuts", "Almonds, cashews, walnuts and other tree nuts."],
  ["peanuts", "Peanuts", "Peanuts and peanut-derived ingredients."],
  ["sesame", "Sesame", "Sesame seeds, tahini and sesame oil."],
  ["soybeans", "Soybeans", "Soybeans, tofu, soy sauce and derived ingredients."],
  ["sulphites", "Sulphur dioxide and sulphites", "Sulphite preservatives."],
];

const DIETARY_ATTRIBUTES = [
  ["VEGETARIAN", "Vegetarian", "No meat, poultry or fish."],
  ["VEGAN", "Vegan", "No animal-derived ingredients."],
  ["GLUTEN_FREE", "Gluten free", "No gluten-containing ingredients."],
  ["DAIRY_FREE", "Dairy free", "No milk or dairy ingredients."],
  ["NUT_FREE", "Nut free", "No tree nuts or peanuts."],
  ["HALAL", "Halal", "Prepared according to halal requirements."],
  ["FASTING", "Fasting", "Suitable for Ethiopian Orthodox fasting meals."],
  ["LOW_CALORIE", "Low calorie", "A lighter option under the kitchen's guidance."],
  ["HIGH_PROTEIN", "High protein", "A protein-rich dish."],
  ["SPICY", "Spicy", "A deliberately spicy dish."],
];

const OPERATING_HOURS = [
  ["11:30", "15:00"],
  ["17:30", "22:00"],
];

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function one(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0];
}

async function all(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function main() {
  const pool = createPool(databaseUrl, { max: 4 });
  try {
    await withTransaction(pool, async (client) => {
      const restaurant = await one(
        client,
        `INSERT INTO restaurants (
          name, slug, legal_name, description, logo_url, phone, email, address,
          timezone, default_locale, default_currency, default_tax_inclusive, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'ACTIVE')
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          legal_name = EXCLUDED.legal_name,
          description = EXCLUDED.description,
          logo_url = EXCLUDED.logo_url,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          timezone = EXCLUDED.timezone,
          default_locale = EXCLUDED.default_locale,
          default_currency = EXCLUDED.default_currency,
          default_tax_inclusive = EXCLUDED.default_tax_inclusive,
          status = EXCLUDED.status,
          updated_at = now()
        RETURNING id`,
        [
          RESTAURANT.name,
          RESTAURANT.slug,
          RESTAURANT.legalName,
          RESTAURANT.description,
          RESTAURANT.logoUrl,
          RESTAURANT.phone,
          RESTAURANT.email,
          RESTAURANT.address,
          RESTAURANT.timezone,
          RESTAURANT.defaultLocale,
          RESTAURANT.defaultCurrency,
          RESTAURANT.defaultTaxInclusive,
        ],
      );
      const restaurantId = restaurant.id;

      const branch = await one(
        client,
        `INSERT INTO branches (
          restaurant_id, name, slug, address, latitude, longitude, phone, timezone,
          status, is_default, service_charge_type, service_charge_value,
          service_charge_taxable, menu_version
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE',true,'NONE',0,false,1)
        ON CONFLICT (restaurant_id, slug) DO UPDATE SET
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          phone = EXCLUDED.phone,
          timezone = EXCLUDED.timezone,
          status = EXCLUDED.status,
          is_default = EXCLUDED.is_default,
          service_charge_type = EXCLUDED.service_charge_type,
          service_charge_value = EXCLUDED.service_charge_value,
          service_charge_taxable = EXCLUDED.service_charge_taxable,
          updated_at = now()
        RETURNING id`,
        [
          restaurantId,
          BRANCH.name,
          BRANCH.slug,
          BRANCH.address,
          BRANCH.latitude,
          BRANCH.longitude,
          BRANCH.phone,
          BRANCH.timezone,
        ],
      );
      const branchId = branch.id;

      await client.query(
        "UPDATE branches SET is_default = false WHERE restaurant_id = $1 AND id <> $2 AND is_default = true",
        [restaurantId, branchId],
      );

      await client.query(
        "DELETE FROM branch_operating_hours WHERE branch_id = $1",
        [branchId],
      );
      for (let day = 0; day < 7; day += 1) {
        for (const [opensAt, closesAt] of OPERATING_HOURS) {
          await client.query(
            `INSERT INTO branch_operating_hours (
              branch_id, day_of_week, opens_at, closes_at, is_closed
            ) VALUES ($1,$2,$3,$4,false)`,
            [branchId, day, opensAt, closesAt],
          );
        }
      }

      const userIds = new Map();
      for (const account of ACCOUNTS) {
        const user = await one(
          client,
          `INSERT INTO users (
            full_name, email, phone, password_hash, account_type
          ) VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (email) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            password_hash = EXCLUDED.password_hash,
            account_type = EXCLUDED.account_type,
            updated_at = now()
          RETURNING id`,
          [
            account.fullName,
            account.email.toLowerCase(),
            account.phone,
            hashPassword(account.password),
            account.accountType,
          ],
        );
        userIds.set(account.key, user.id);
      }

      const ownerId = userIds.get("owner");
      for (const account of ACCOUNTS) {
        if (!account.role) continue;
        const scopedBranchId = account.branch === "branch" ? branchId : null;
        await client.query(
          `DELETE FROM role_assignments
           WHERE user_id = $1 AND role = $2 AND restaurant_id = $3
             AND branch_id IS NOT DISTINCT FROM $4`,
          [userIds.get(account.key), account.role, restaurantId, scopedBranchId],
        );
        await client.query(
          `INSERT INTO role_assignments (user_id, role, restaurant_id, branch_id)
           VALUES ($1,$2,$3,$4)`,
          [userIds.get(account.key), account.role, restaurantId, scopedBranchId],
        );
      }

      const taxCategory = await one(
        client,
        `INSERT INTO tax_categories (
          restaurant_id, code, name, description, is_inclusive_default, is_active
        ) VALUES ($1,$2,$3,$4,$5,true)
        ON CONFLICT (restaurant_id, code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_inclusive_default = EXCLUDED.is_inclusive_default,
          is_active = true,
          updated_at = now()
        RETURNING id`,
        [
          restaurantId,
          TAX.code,
          TAX.name,
          TAX.description,
          TAX.inclusiveDefault,
        ],
      );

      const openTaxRate = await one(
        client,
        `SELECT id FROM tax_rates
         WHERE tax_category_id = $1 AND valid_until IS NULL
         ORDER BY valid_from DESC LIMIT 1`,
        [taxCategory.id],
      );
      if (openTaxRate) {
        await client.query(
          `UPDATE tax_rates SET rate_basis_points = $1 WHERE id = $2`,
          [TAX.rateBasisPoints, openTaxRate.id],
        );
      } else {
        await client.query(
          `INSERT INTO tax_rates (
            tax_category_id, rate_basis_points, valid_from, valid_until, created_by
          ) VALUES ($1,$2,$3,NULL,$4)`,
          [taxCategory.id, TAX.rateBasisPoints, TAX.validFrom, ownerId],
        );
      }

      const menu = await one(
        client,
        `INSERT INTO menus (
          restaurant_id, name, slug, description, type, is_active, sort_order
        ) VALUES ($1,'Main Menu','main-menu','The Mesob House all-day menu.','ALL_DAY',true,1)
        ON CONFLICT (restaurant_id, slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          type = EXCLUDED.type,
          is_active = true,
          sort_order = EXCLUDED.sort_order,
          updated_at = now()
        RETURNING id`,
        [restaurantId],
      );

      const categoryIds = new Map();
      for (const category of seed.categories) {
        const row = await one(
          client,
          `INSERT INTO menu_categories (
            menu_id, parent_id, name, slug, description, sort_order, is_active
          ) VALUES ($1,NULL,$2,$3,$4,$5,true)
          ON CONFLICT (menu_id, slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            sort_order = EXCLUDED.sort_order,
            is_active = true,
            updated_at = now()
          RETURNING id`,
          [
            menu.id,
            category.name,
            category.slug,
            category.description,
            category.sortOrder,
          ],
        );
        categoryIds.set(category.slug, row.id);
      }

      const optionGroupIds = new Map();
      const optionIds = new Map();
      for (const group of seed.optionGroups) {
        const groupRow = await one(
          client,
          `INSERT INTO menu_option_groups (
            restaurant_id, key, title, description, is_required, selection_type,
            min_selections, max_selections, display_type, sort_order, is_active
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)
          ON CONFLICT (restaurant_id, key) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            is_required = EXCLUDED.is_required,
            selection_type = EXCLUDED.selection_type,
            min_selections = EXCLUDED.min_selections,
            max_selections = EXCLUDED.max_selections,
            display_type = EXCLUDED.display_type,
            sort_order = EXCLUDED.sort_order,
            is_active = true,
            deleted_at = NULL,
            updated_at = now()
          RETURNING id`,
          [
            restaurantId,
            group.key,
            group.title,
            group.description,
            group.isRequired,
            group.selectionType,
            group.minSelections,
            group.maxSelections,
            group.displayType,
            group.sortOrder,
          ],
        );
        optionGroupIds.set(group.key, groupRow.id);

        for (const option of group.options) {
          const optionRow = await one(
            client,
            `INSERT INTO menu_options (
              group_id, value, title, description, note, price_delta_minor,
              is_default, is_active, max_quantity, sort_order
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9)
            ON CONFLICT (group_id, value) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              note = EXCLUDED.note,
              price_delta_minor = EXCLUDED.price_delta_minor,
              is_default = EXCLUDED.is_default,
              is_active = true,
              max_quantity = EXCLUDED.max_quantity,
              sort_order = EXCLUDED.sort_order,
              updated_at = now()
            RETURNING id`,
            [
              groupRow.id,
              option.value,
              option.title,
              option.description,
              option.note || "",
              option.priceDeltaMinor,
              option.isDefault,
              option.maxQuantity,
              option.sortOrder,
            ],
          );
          optionIds.set(`${group.key}:${option.value}`, optionRow.id);
        }
      }

      const allergenIds = new Map();
      for (const [code, name, description] of ALLERGENS) {
        const row = await one(
          client,
          `INSERT INTO allergens (code, name, description)
           VALUES ($1,$2,$3)
           ON CONFLICT (code) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description
           RETURNING id`,
          [code, name, description],
        );
        allergenIds.set(code, row.id);
      }

      const dietaryIds = new Map();
      for (const [code, name, description] of DIETARY_ATTRIBUTES) {
        const row = await one(
          client,
          `INSERT INTO dietary_attributes (code, name, description)
           VALUES ($1,$2,$3)
           ON CONFLICT (code) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description
           RETURNING id`,
          [code, name, description],
        );
        dietaryIds.set(code, row.id);
      }

      const ingredientIds = new Map();
      for (const item of seed.items) {
        for (const ingredient of item.ingredients) {
          if (ingredientIds.has(ingredient.slug)) continue;
          const row = await one(
            client,
            `INSERT INTO ingredients (
              restaurant_id, name, slug, description, default_unit, is_active
            ) VALUES ($1,$2,$3,'',$4,true)
            ON CONFLICT (restaurant_id, slug) DO UPDATE SET
              name = EXCLUDED.name,
              default_unit = EXCLUDED.default_unit,
              is_active = true,
              updated_at = now()
            RETURNING id`,
            [restaurantId, ingredient.name, ingredient.slug, ingredient.defaultUnit],
          );
          ingredientIds.set(ingredient.slug, row.id);
        }
      }

      const itemIds = new Map();
      for (const item of seed.items) {
        const categoryId = categoryIds.get(item.categorySlug);
        if (!categoryId) {
          throw new Error(`Unknown category ${item.categorySlug} for ${item.slug}`);
        }

        const row = await one(
          client,
          `INSERT INTO menu_items (
            restaurant_id, sku, slug, name, native_name, short_description,
            description, search_keywords, sort_order, spice_level, spice_notes,
            is_special, preparation_time_minutes, cooking_time_minutes,
            preparation_methods, preparation_notes, serving_size, serving_unit,
            serving_temperature, serving_notes, difficulty_level, base_price_minor,
            currency, compare_at_price_minor, cost_price_minor, tax_category_id,
            is_tax_inclusive, service_charge_applicable, badge_text, badge_tone,
            deleted_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
            $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,NULL
          )
          ON CONFLICT (restaurant_id, slug) DO UPDATE SET
            sku = EXCLUDED.sku,
            name = EXCLUDED.name,
            native_name = EXCLUDED.native_name,
            short_description = EXCLUDED.short_description,
            description = EXCLUDED.description,
            search_keywords = EXCLUDED.search_keywords,
            sort_order = EXCLUDED.sort_order,
            spice_level = EXCLUDED.spice_level,
            spice_notes = EXCLUDED.spice_notes,
            is_special = EXCLUDED.is_special,
            preparation_time_minutes = EXCLUDED.preparation_time_minutes,
            cooking_time_minutes = EXCLUDED.cooking_time_minutes,
            preparation_methods = EXCLUDED.preparation_methods,
            preparation_notes = EXCLUDED.preparation_notes,
            serving_size = EXCLUDED.serving_size,
            serving_unit = EXCLUDED.serving_unit,
            serving_temperature = EXCLUDED.serving_temperature,
            serving_notes = EXCLUDED.serving_notes,
            difficulty_level = EXCLUDED.difficulty_level,
            base_price_minor = EXCLUDED.base_price_minor,
            currency = EXCLUDED.currency,
            compare_at_price_minor = EXCLUDED.compare_at_price_minor,
            cost_price_minor = EXCLUDED.cost_price_minor,
            tax_category_id = EXCLUDED.tax_category_id,
            is_tax_inclusive = EXCLUDED.is_tax_inclusive,
            service_charge_applicable = EXCLUDED.service_charge_applicable,
            badge_text = EXCLUDED.badge_text,
            badge_tone = EXCLUDED.badge_tone,
            deleted_at = NULL,
            updated_at = now()
          RETURNING id`,
          [
            restaurantId,
            item.sku,
            item.slug,
            item.name,
            item.nativeName,
            item.shortDescription,
            item.description,
            item.searchKeywords,
            item.sortOrder,
            item.spiceLevel,
            item.spiceNotes,
            item.isSpecial,
            item.preparationTimeMinutes,
            item.cookingTimeMinutes,
            item.preparationMethods,
            item.preparationNotes,
            item.servingSize,
            item.servingUnit,
            item.servingTemperature,
            item.servingNotes,
            item.difficultyLevel,
            item.basePriceMinor,
            item.currency,
            item.compareAtPriceMinor,
            item.costPriceMinor,
            taxCategory.id,
            item.isTaxInclusive,
            item.serviceChargeApplicable,
            item.badgeText,
            item.badgeTone,
          ],
        );
        const menuItemId = row.id;
        itemIds.set(item.slug, menuItemId);

        await client.query(
          "DELETE FROM menu_item_categories WHERE menu_item_id = $1",
          [menuItemId],
        );
        await client.query(
          `INSERT INTO menu_item_categories (menu_item_id, category_id, sort_order)
           VALUES ($1,$2,$3)`,
          [menuItemId, categoryId, item.sortOrder],
        );

        await client.query(
          "DELETE FROM menu_item_option_groups WHERE menu_item_id = $1",
          [menuItemId],
        );
        for (const [index, key] of item.optionGroupKeys.entries()) {
          const groupId = optionGroupIds.get(key);
          if (!groupId) throw new Error(`Unknown option group ${key} for ${item.slug}`);
          await client.query(
            `INSERT INTO menu_item_option_groups (menu_item_id, group_id, sort_order)
             VALUES ($1,$2,$3)`,
            [menuItemId, groupId, index + 1],
          );
        }

        await client.query(
          "DELETE FROM menu_item_ingredients WHERE menu_item_id = $1",
          [menuItemId],
        );
        for (const ingredient of item.ingredients) {
          const ingredientId = ingredientIds.get(ingredient.slug);
          if (!ingredientId) {
            throw new Error(`Unknown ingredient ${ingredient.slug} for ${item.slug}`);
          }
          await client.query(
            `INSERT INTO menu_item_ingredients (
              menu_item_id, ingredient_id, quantity, unit, is_optional,
              is_substitutable, preparation_note, sort_order
            ) VALUES ($1,$2,$3,$4,false,false,'',$5)`,
            [
              menuItemId,
              ingredientId,
              ingredient.quantity,
              ingredient.unit,
              ingredient.sortOrder,
            ],
          );
        }

        await client.query(
          "DELETE FROM menu_item_media WHERE menu_item_id = $1 AND is_primary = true",
          [menuItemId],
        );
        for (const media of item.media) {
          await client.query(
            `INSERT INTO menu_item_media (
              menu_item_id, url, alt_text, media_type, is_primary, sort_order
            ) VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              menuItemId,
              media.url,
              media.altText,
              media.mediaType,
              media.isPrimary,
              media.sortOrder,
            ],
          );
        }

        for (const translation of item.translations) {
          await client.query(
            `INSERT INTO menu_item_translations (
              menu_item_id, locale, name, short_description, description, native_name
            ) VALUES ($1,$2,$3,$4,$5,$6)
            ON CONFLICT (menu_item_id, locale) DO UPDATE SET
              name = EXCLUDED.name,
              short_description = EXCLUDED.short_description,
              description = EXCLUDED.description,
              native_name = EXCLUDED.native_name,
              updated_at = now()`,
            [
              menuItemId,
              translation.locale,
              translation.name,
              translation.shortDescription,
              translation.description,
              translation.nativeName,
            ],
          );
        }

        for (const allergen of item.allergens) {
          const allergenId = allergenIds.get(allergen.code);
          if (!allergenId) throw new Error(`Unknown allergen ${allergen.code}`);
          await client.query(
            `INSERT INTO menu_item_allergens (
              menu_item_id, allergen_id, source, is_confirmed, notes
            ) VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (menu_item_id, allergen_id, source) DO UPDATE SET
              notes = EXCLUDED.notes`,
            [
              menuItemId,
              allergenId,
              allergen.source,
              allergen.isConfirmed,
              allergen.notes,
            ],
          );
        }

        for (const dietary of item.dietary) {
          const dietaryAttributeId = dietaryIds.get(dietary.code);
          if (!dietaryAttributeId) throw new Error(`Unknown dietary attribute ${dietary.code}`);
          await client.query(
            `INSERT INTO menu_item_dietary_attributes (
              menu_item_id, dietary_attribute_id, verification_status,
              verified_at, verified_by
            ) VALUES ($1,$2,$3,now(),$4)
            ON CONFLICT (menu_item_id, dietary_attribute_id) DO UPDATE SET
              verification_status = EXCLUDED.verification_status,
              verified_at = EXCLUDED.verified_at,
              verified_by = EXCLUDED.verified_by`,
            [
              menuItemId,
              dietaryAttributeId,
              dietary.verificationStatus,
              ownerId,
            ],
          );
        }

        const openPrice = await one(
          client,
          `SELECT id FROM menu_item_prices
           WHERE menu_item_id = $1 AND branch_id IS NULL AND valid_until IS NULL
           ORDER BY valid_from DESC LIMIT 1`,
          [menuItemId],
        );
        if (openPrice) {
          await client.query(
            `UPDATE menu_item_prices SET
              price_minor = $1,
              currency = $2,
              compare_at_price_minor = $3
             WHERE id = $4`,
            [
              item.basePriceMinor,
              item.currency,
              item.compareAtPriceMinor,
              openPrice.id,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO menu_item_prices (
              menu_item_id, branch_id, price_minor, currency,
              compare_at_price_minor, valid_from, valid_until, created_by
            ) VALUES ($1,NULL,$2,$3,$4,'2026-01-01T00:00:00.000Z',NULL,$5)`,
            [
              menuItemId,
              item.basePriceMinor,
              item.currency,
              item.compareAtPriceMinor,
              ownerId,
            ],
          );
        }

        await client.query(
          `INSERT INTO branch_menu_items (
            branch_id, menu_item_id, is_enabled, availability_status,
            preparation_time_override, temporary_unavailable_until
          ) VALUES ($1,$2,true,'AVAILABLE',NULL,NULL)
          ON CONFLICT (branch_id, menu_item_id) DO UPDATE SET
            is_enabled = true,
            availability_status = 'AVAILABLE',
            preparation_time_override = NULL,
            temporary_unavailable_until = NULL,
            updated_at = now()`,
          [branchId, menuItemId],
        );
      }

      for (const pairing of seed.pairings) {
        const menuItemId = itemIds.get(pairing.menuItemSlug);
        const pairedMenuItemId = itemIds.get(pairing.pairedMenuItemSlug);
        if (!menuItemId || !pairedMenuItemId) continue;
        await client.query(
          `INSERT INTO menu_pairings (
            menu_item_id, paired_menu_item_id, type, sort_order
          ) VALUES ($1,$2,$3,$4)
          ON CONFLICT (menu_item_id, paired_menu_item_id) DO UPDATE SET
            type = EXCLUDED.type,
            sort_order = EXCLUDED.sort_order`,
          [menuItemId, pairedMenuItemId, pairing.type, pairing.sortOrder],
        );
      }

      await client.query(
        "DELETE FROM delivery_zones WHERE branch_id = $1 AND name = ANY($2::text[])",
        [branchId, DELIVERY_ZONES.map((zone) => zone.name)],
      );
      for (const zone of DELIVERY_ZONES) {
        await client.query(
          `INSERT INTO delivery_zones (
            branch_id, name, description, base_fee_minor, min_order_minor,
            center_lat, center_lng, radius_meters, is_active, sort_order
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9)`,
          [
            branchId,
            zone.name,
            zone.description,
            zone.baseFeeMinor,
            zone.minOrderMinor,
            zone.centerLat,
            zone.centerLng,
            zone.radiusMeters,
            zone.sortOrder,
          ],
        );
      }

      await client.query(
        `INSERT INTO promotions (
          restaurant_id, branch_id, code, name, description, scope, type, value,
          min_order_minor, max_discount_minor, starts_at, ends_at, is_active, priority
        ) VALUES ($1,NULL,$2,$3,$4,'RESTAURANT','FIXED',$5,$6,$7,$8,NULL,true,0)
        ON CONFLICT (restaurant_id, code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          scope = EXCLUDED.scope,
          type = EXCLUDED.type,
          value = EXCLUDED.value,
          min_order_minor = EXCLUDED.min_order_minor,
          max_discount_minor = EXCLUDED.max_discount_minor,
          starts_at = EXCLUDED.starts_at,
          ends_at = EXCLUDED.ends_at,
          is_active = true,
          priority = EXCLUDED.priority,
          updated_at = now()`,
        [
          restaurantId,
          PROMOTION.code,
          PROMOTION.name,
          PROMOTION.description,
          PROMOTION.value,
          PROMOTION.minOrderMinor,
          PROMOTION.maxDiscountMinor,
          PROMOTION.startsAt,
        ],
      );

      await client.query(
        `INSERT INTO menu_publications (
          branch_id, version, published_by, note
        ) VALUES ($1,1,$2,'Initial catalogue seed')
        ON CONFLICT (branch_id, version) DO NOTHING`,
        [branchId, ownerId],
      );

      const counts = await one(
        client,
        `SELECT
          (SELECT count(*)::int FROM menu_items WHERE restaurant_id = $1 AND deleted_at IS NULL) AS menu_items,
          (SELECT count(*)::int FROM menu_categories mc JOIN menus m ON m.id = mc.menu_id WHERE m.restaurant_id = $1) AS categories,
          (SELECT count(*)::int FROM menu_option_groups WHERE restaurant_id = $1 AND deleted_at IS NULL) AS option_groups,
          (SELECT count(*)::int FROM menu_options mo JOIN menu_option_groups mog ON mog.id = mo.group_id WHERE mog.restaurant_id = $1) AS options,
          (SELECT count(*)::int FROM menu_pairings mp JOIN menu_items mi ON mi.id = mp.menu_item_id WHERE mi.restaurant_id = $1) AS pairings,
          (SELECT count(*)::int FROM ingredients WHERE restaurant_id = $1) AS ingredients,
          (SELECT count(*)::int FROM delivery_zones WHERE branch_id = $2) AS delivery_zones,
          (SELECT count(*)::int FROM users) AS users`,
        [restaurantId, branchId],
      );

      console.log(
        JSON.stringify(
          {
            restaurantId,
            branchId,
            accounts: ACCOUNTS.map((account) => account.email),
            counts,
          },
          null,
          2,
        ),
      );
    });
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
