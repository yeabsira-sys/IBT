-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "account_type" AS ENUM ('CUSTOMER', 'STAFF');

-- CreateEnum
CREATE TYPE "staff_role" AS ENUM ('RESTAURANT_OWNER', 'SUPER_ADMIN', 'RESTAURANT_MANAGER', 'BRANCH_MANAGER', 'CASHIER', 'KITCHEN_STAFF', 'INVENTORY_MANAGER', 'DELIVERY_STAFF');

-- CreateEnum
CREATE TYPE "restaurant_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "branch_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "menu_type" AS ENUM ('ALL_DAY', 'BREAKFAST', 'LUNCH', 'DINNER', 'DRINKS', 'DESSERTS', 'SEASONAL', 'SPECIAL');

-- CreateEnum
CREATE TYPE "serving_temperature" AS ENUM ('HOT', 'COLD', 'ROOM_TEMPERATURE');

-- CreateEnum
CREATE TYPE "difficulty_level" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "spice_level" AS ENUM ('NONE', 'MILD', 'MEDIUM', 'HOT', 'EXTRA_HOT');

-- CreateEnum
CREATE TYPE "unit" AS ENUM ('G', 'KG', 'ML', 'L', 'PIECE', 'TBSP', 'TSP', 'CUP', 'PORTION');

-- CreateEnum
CREATE TYPE "media_type" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "allergen_source" AS ENUM ('INGREDIENT', 'CROSS_CONTACT');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "nutrition_source" AS ENUM ('LAB_TESTED', 'CALCULATED', 'MANUFACTURER', 'ESTIMATED');

-- CreateEnum
CREATE TYPE "pairing_type" AS ENUM ('RECOMMENDED', 'DRINK', 'SIDE', 'DESSERT', 'RELATED');

-- CreateEnum
CREATE TYPE "selection_type" AS ENUM ('SINGLE', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "display_type" AS ENUM ('RADIO', 'CHECKBOX', 'DROPDOWN', 'BUTTON');

-- CreateEnum
CREATE TYPE "availability_status" AS ENUM ('AVAILABLE', 'OUT_OF_STOCK', 'TEMPORARILY_UNAVAILABLE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "service_charge_type" AS ENUM ('NONE', 'PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "promotion_scope" AS ENUM ('RESTAURANT', 'BRANCH');

-- CreateEnum
CREATE TYPE "promotion_type" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('RECEIVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "fulfillment_type" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "inventory_transaction_type" AS ENUM ('PURCHASE', 'DEDUCTION', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN');

-- CreateEnum
CREATE TYPE "transfer_status" AS ENUM ('DRAFT', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "restaurants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legal_name" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "logo_url" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
    "default_locale" TEXT NOT NULL DEFAULT 'en',
    "default_currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "default_tax_inclusive" BOOLEAN NOT NULL DEFAULT true,
    "status" "restaurant_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "phone" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT,
    "status" "branch_status" NOT NULL DEFAULT 'ACTIVE',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "service_charge_type" "service_charge_type" NOT NULL DEFAULT 'NONE',
    "service_charge_value" INTEGER NOT NULL DEFAULT 0,
    "service_charge_taxable" BOOLEAN NOT NULL DEFAULT false,
    "menu_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_operating_hours" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id" UUID NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "opens_at" VARCHAR(5) NOT NULL,
    "closes_at" VARCHAR(5) NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "branch_operating_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_publications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "published_by" UUID,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "menu_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT,
    "account_type" "account_type" NOT NULL DEFAULT 'CUSTOMER',
    "preference" TEXT,
    "provider" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "last_seen_at" TIMESTAMPTZ(6),
    "user_agent" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role" "staff_role" NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "branch_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "menu_type" NOT NULL DEFAULT 'ALL_DAY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMPTZ(6),
    "valid_until" TIMESTAMPTZ(6),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image_url" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "sku" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "native_name" TEXT NOT NULL DEFAULT '',
    "short_description" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "search_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "spice_level" "spice_level",
    "spice_notes" TEXT NOT NULL DEFAULT '',
    "is_special" BOOLEAN NOT NULL DEFAULT false,
    "preparation_time_minutes" INTEGER,
    "cooking_time_minutes" INTEGER,
    "preparation_methods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preparation_notes" TEXT NOT NULL DEFAULT '',
    "serving_size" DECIMAL(10,3),
    "serving_unit" "unit",
    "serving_temperature" "serving_temperature",
    "serving_notes" TEXT NOT NULL DEFAULT '',
    "difficulty_level" "difficulty_level",
    "base_price_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "compare_at_price_minor" INTEGER,
    "cost_price_minor" INTEGER,
    "tax_category_id" UUID,
    "is_tax_inclusive" BOOLEAN NOT NULL DEFAULT true,
    "service_charge_applicable" BOOLEAN NOT NULL DEFAULT true,
    "badge_text" TEXT NOT NULL DEFAULT '',
    "badge_tone" TEXT NOT NULL DEFAULT 'brand',
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_description" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "native_name" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_item_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_categories" (
    "menu_item_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_item_categories_pkey" PRIMARY KEY ("menu_item_id","category_id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "default_unit" "unit" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "quantity" DECIMAL(10,3),
    "unit" "unit" NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "is_substitutable" BOOLEAN NOT NULL DEFAULT false,
    "preparation_note" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_item_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "allergens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_allergens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "allergen_id" UUID NOT NULL,
    "source" "allergen_source" NOT NULL DEFAULT 'INGREDIENT',
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "menu_item_allergens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietary_attributes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "dietary_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_dietary_attributes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "dietary_attribute_id" UUID NOT NULL,
    "verification_status" "verification_status" NOT NULL DEFAULT 'UNVERIFIED',
    "verified_at" TIMESTAMPTZ(6),
    "verified_by" UUID,

    CONSTRAINT "menu_item_dietary_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "serving_size" DECIMAL(10,3) NOT NULL,
    "serving_unit" "unit" NOT NULL,
    "calories_kcal" INTEGER,
    "energy_kj" INTEGER,
    "protein_g" DECIMAL(10,3),
    "carbohydrates_g" DECIMAL(10,3),
    "sugars_g" DECIMAL(10,3),
    "added_sugars_g" DECIMAL(10,3),
    "total_fat_g" DECIMAL(10,3),
    "saturated_fat_g" DECIMAL(10,3),
    "trans_fat_g" DECIMAL(10,3),
    "fiber_g" DECIMAL(10,3),
    "sodium_mg" DECIMAL(10,3),
    "cholesterol_mg" DECIMAL(10,3),
    "nutrition_source" "nutrition_source" NOT NULL,
    "nutrition_verified_at" TIMESTAMPTZ(6),
    "verified_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "nutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "alt_text" TEXT NOT NULL DEFAULT '',
    "media_type" "media_type" NOT NULL DEFAULT 'IMAGE',
    "width" INTEGER,
    "height" INTEGER,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_pairings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "paired_menu_item_id" UUID NOT NULL,
    "type" "pairing_type" NOT NULL DEFAULT 'RECOMMENDED',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_pairings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_option_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "selection_type" "selection_type" NOT NULL,
    "min_selections" INTEGER NOT NULL DEFAULT 0,
    "max_selections" INTEGER NOT NULL DEFAULT 1,
    "display_type" "display_type" NOT NULL DEFAULT 'RADIO',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "price_delta_minor" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_quantity" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_option_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_required_override" BOOLEAN,
    "min_selections_override" INTEGER,
    "max_selections_override" INTEGER,

    CONSTRAINT "menu_item_option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_menu_option_availability" (
    "branch_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branch_menu_option_availability_pkey" PRIMARY KEY ("branch_id","option_id")
);

-- CreateTable
CREATE TABLE "menu_item_prices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "branch_id" UUID,
    "price_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "compare_at_price_minor" INTEGER,
    "valid_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "is_inclusive_default" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tax_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tax_category_id" UUID NOT NULL,
    "rate_basis_points" INTEGER NOT NULL,
    "valid_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "branch_id" UUID,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "scope" "promotion_scope" NOT NULL,
    "type" "promotion_type" NOT NULL,
    "value" INTEGER NOT NULL,
    "min_order_minor" INTEGER NOT NULL DEFAULT 0,
    "max_discount_minor" INTEGER,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "base_fee_minor" INTEGER NOT NULL,
    "min_order_minor" INTEGER NOT NULL DEFAULT 0,
    "center_lat" DECIMAL(9,6),
    "center_lng" DECIMAL(9,6),
    "radius_meters" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_menu_items" (
    "branch_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "availability_status" "availability_status" NOT NULL DEFAULT 'AVAILABLE',
    "preparation_time_override" INTEGER,
    "temporary_unavailable_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branch_menu_items_pkey" PRIMARY KEY ("branch_id","menu_item_id")
);

-- CreateTable
CREATE TABLE "menu_item_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "day_of_week" SMALLINT,
    "available_from" VARCHAR(5) NOT NULL,
    "available_until" VARCHAR(5) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMPTZ(6),
    "valid_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_id" TEXT NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'RECEIVED',
    "fulfillment" "fulfillment_type" NOT NULL,
    "payment_method" TEXT NOT NULL DEFAULT 'cash',
    "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "promotion_id" UUID,
    "delivery_zone_id" UUID,
    "delivery_staff_id" UUID,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL DEFAULT '',
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "delivery_address_line" TEXT NOT NULL DEFAULT '',
    "delivery_landmark" TEXT NOT NULL DEFAULT '',
    "delivery_zone_name" TEXT NOT NULL DEFAULT '',
    "delivery_latitude" DECIMAL(9,6),
    "delivery_longitude" DECIMAL(9,6),
    "note" TEXT NOT NULL DEFAULT '',
    "scheduled_for" TIMESTAMPTZ(6),
    "subtotal_minor" INTEGER NOT NULL,
    "discount_minor" INTEGER NOT NULL DEFAULT 0,
    "service_charge_minor" INTEGER NOT NULL DEFAULT 0,
    "tax_minor" INTEGER NOT NULL DEFAULT 0,
    "delivery_fee_minor" INTEGER NOT NULL DEFAULT 0,
    "total_minor" INTEGER GENERATED ALWAYS AS (GREATEST(0, ((subtotal_minor - discount_minor) + service_charge_minor) + delivery_fee_minor + (CASE WHEN tax_inclusive THEN 0 ELSE tax_minor END))) STORED,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "tax_inclusive" BOOLEAN NOT NULL DEFAULT true,
    "tax_rate_basis_points" INTEGER NOT NULL DEFAULT 0,
    "service_charge_taxable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" BIGSERIAL NOT NULL,
    "order_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "menu_item_id" UUID,
    "menu_item_slug" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_description" TEXT NOT NULL DEFAULT '',
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price_minor" INTEGER NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "substitutions" JSONB NOT NULL DEFAULT '[]',
    "allergens" JSONB NOT NULL DEFAULT '[]',
    "dietary" JSONB NOT NULL DEFAULT '[]',
    "tax_minor" INTEGER NOT NULL DEFAULT 0,
    "discount_minor" INTEGER NOT NULL DEFAULT 0,
    "line_total_minor" INTEGER GENERATED ALWAYS AS (unit_price_minor * quantity) STORED,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" BIGSERIAL NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "order_status" NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" UUID,
    "changed_by_name" TEXT NOT NULL DEFAULT '',
    "note" TEXT,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "rating" SMALLINT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "status" "review_status" NOT NULL DEFAULT 'APPROVED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "unit" "unit" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_inventory" (
    "branch_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "current_stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minimum_stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "reorder_level" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branch_inventory_pkey" PRIMARY KEY ("branch_id","inventory_item_id")
);

-- CreateTable
CREATE TABLE "menu_item_inventory" (
    "menu_item_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "required_quantity" DECIMAL(12,3) NOT NULL,
    "unit" "unit" NOT NULL,

    CONSTRAINT "menu_item_inventory_pkey" PRIMARY KEY ("menu_item_id","inventory_item_id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" BIGSERIAL NOT NULL,
    "branch_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "type" "inventory_transaction_type" NOT NULL,
    "quantity_delta" DECIMAL(12,3) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "order_id" UUID,
    "transfer_id" UUID,
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_branch_id" UUID NOT NULL,
    "to_branch_id" UUID NOT NULL,
    "status" "transfer_status" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transfer_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transfer_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "inventory_transfer_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "restaurant_id" UUID,
    "branch_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" UUID,
    "actor_role" TEXT,
    "before_data" JSONB,
    "after_data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- CreateIndex
CREATE INDEX "branches_restaurant_id_status_idx" ON "branches"("restaurant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "branches_restaurant_id_slug_key" ON "branches"("restaurant_id", "slug");

-- CreateIndex
CREATE INDEX "branch_operating_hours_branch_id_day_of_week_idx" ON "branch_operating_hours"("branch_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "menu_publications_branch_id_version_key" ON "menu_publications"("branch_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_account_type_idx" ON "users"("account_type");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "role_assignments_restaurant_id_role_idx" ON "role_assignments"("restaurant_id", "role");

-- CreateIndex
CREATE INDEX "role_assignments_branch_id_role_idx" ON "role_assignments"("branch_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_user_id_role_restaurant_id_branch_id_key" ON "role_assignments"("user_id", "role", "restaurant_id", "branch_id");

-- CreateIndex
CREATE INDEX "menus_restaurant_id_is_active_idx" ON "menus"("restaurant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "menus_restaurant_id_slug_key" ON "menus"("restaurant_id", "slug");

-- CreateIndex
CREATE INDEX "menu_categories_menu_id_parent_id_sort_order_idx" ON "menu_categories"("menu_id", "parent_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_categories_menu_id_slug_key" ON "menu_categories"("menu_id", "slug");

-- CreateIndex
CREATE INDEX "menu_items_restaurant_id_deleted_at_idx" ON "menu_items"("restaurant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "menu_items_restaurant_id_is_special_sort_order_idx" ON "menu_items"("restaurant_id", "is_special", "sort_order");

-- CreateIndex
CREATE INDEX "menu_items_restaurant_id_base_price_minor_idx" ON "menu_items"("restaurant_id", "base_price_minor");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_restaurant_id_slug_key" ON "menu_items"("restaurant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_restaurant_id_sku_key" ON "menu_items"("restaurant_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_translations_menu_item_id_locale_key" ON "menu_item_translations"("menu_item_id", "locale");

-- CreateIndex
CREATE INDEX "menu_item_categories_category_id_sort_order_idx" ON "menu_item_categories"("category_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_restaurant_id_slug_key" ON "ingredients"("restaurant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_ingredients_menu_item_id_ingredient_id_key" ON "menu_item_ingredients"("menu_item_id", "ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "allergens_code_key" ON "allergens"("code");

-- CreateIndex
CREATE INDEX "menu_item_allergens_allergen_id_is_confirmed_idx" ON "menu_item_allergens"("allergen_id", "is_confirmed");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_allergens_menu_item_id_allergen_id_source_key" ON "menu_item_allergens"("menu_item_id", "allergen_id", "source");

-- CreateIndex
CREATE UNIQUE INDEX "dietary_attributes_code_key" ON "dietary_attributes"("code");

-- CreateIndex
CREATE INDEX "menu_item_dietary_attributes_dietary_attribute_id_verificat_idx" ON "menu_item_dietary_attributes"("dietary_attribute_id", "verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_dietary_attributes_menu_item_id_dietary_attribute_key" ON "menu_item_dietary_attributes"("menu_item_id", "dietary_attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "nutrition_menu_item_id_key" ON "nutrition"("menu_item_id");

-- CreateIndex
CREATE INDEX "menu_item_media_menu_item_id_sort_order_idx" ON "menu_item_media"("menu_item_id", "sort_order");

-- CreateIndex
CREATE INDEX "menu_pairings_menu_item_id_sort_order_idx" ON "menu_pairings"("menu_item_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_pairings_menu_item_id_paired_menu_item_id_key" ON "menu_pairings"("menu_item_id", "paired_menu_item_id");

-- CreateIndex
CREATE INDEX "menu_option_groups_restaurant_id_is_active_sort_order_idx" ON "menu_option_groups"("restaurant_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_option_groups_restaurant_id_key_key" ON "menu_option_groups"("restaurant_id", "key");

-- CreateIndex
CREATE INDEX "menu_options_group_id_is_active_sort_order_idx" ON "menu_options"("group_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_options_group_id_value_key" ON "menu_options"("group_id", "value");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_option_groups_menu_item_id_group_id_key" ON "menu_item_option_groups"("menu_item_id", "group_id");

-- CreateIndex
CREATE INDEX "menu_item_prices_menu_item_id_branch_id_valid_from_idx" ON "menu_item_prices"("menu_item_id", "branch_id", "valid_from");

-- CreateIndex
CREATE UNIQUE INDEX "tax_categories_restaurant_id_code_key" ON "tax_categories"("restaurant_id", "code");

-- CreateIndex
CREATE INDEX "tax_rates_tax_category_id_valid_from_idx" ON "tax_rates"("tax_category_id", "valid_from");

-- CreateIndex
CREATE INDEX "promotions_restaurant_id_is_active_starts_at_ends_at_idx" ON "promotions"("restaurant_id", "is_active", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_restaurant_id_code_key" ON "promotions"("restaurant_id", "code");

-- CreateIndex
CREATE INDEX "delivery_zones_branch_id_is_active_sort_order_idx" ON "delivery_zones"("branch_id", "is_active", "sort_order");

-- CreateIndex
CREATE INDEX "branch_menu_items_menu_item_id_idx" ON "branch_menu_items"("menu_item_id");

-- CreateIndex
CREATE INDEX "menu_item_availability_branch_id_menu_item_id_day_of_week_idx" ON "menu_item_availability"("branch_id", "menu_item_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "orders_public_id_key" ON "orders"("public_id");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_branch_id_status_created_at_idx" ON "orders"("branch_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_delivery_staff_id_status_idx" ON "orders"("delivery_staff_id", "status");

-- CreateIndex
CREATE INDEX "order_items_menu_item_id_order_id_idx" ON "order_items"("menu_item_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_line_no_key" ON "order_items"("order_id", "line_no");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_changed_at_idx" ON "order_status_history"("order_id", "changed_at");

-- CreateIndex
CREATE INDEX "reviews_menu_item_id_status_created_at_idx" ON "reviews"("menu_item_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reviews_status_created_at_idx" ON "reviews"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_menu_item_id_user_id_key" ON "reviews"("menu_item_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_restaurant_id_sku_key" ON "inventory_items"("restaurant_id", "sku");

-- CreateIndex
CREATE INDEX "inventory_transactions_branch_id_inventory_item_id_created__idx" ON "inventory_transactions"("branch_id", "inventory_item_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "inventory_transactions_order_id_idx" ON "inventory_transactions"("order_id");

-- CreateIndex
CREATE INDEX "inventory_transfers_from_branch_id_status_idx" ON "inventory_transfers"("from_branch_id", "status");

-- CreateIndex
CREATE INDEX "inventory_transfers_to_branch_id_status_idx" ON "inventory_transfers"("to_branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_transfer_lines_transfer_id_inventory_item_id_key" ON "inventory_transfer_lines"("transfer_id", "inventory_item_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_created_at_idx" ON "audit_log"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_branch_id_created_at_idx" ON "audit_log"("branch_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_operating_hours" ADD CONSTRAINT "branch_operating_hours_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_publications" ADD CONSTRAINT "menu_publications_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_publications" ADD CONSTRAINT "menu_publications_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menu_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tax_category_id_fkey" FOREIGN KEY ("tax_category_id") REFERENCES "tax_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_translations" ADD CONSTRAINT "menu_item_translations_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_categories" ADD CONSTRAINT "menu_item_categories_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_categories" ADD CONSTRAINT "menu_item_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_ingredients" ADD CONSTRAINT "menu_item_ingredients_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_ingredients" ADD CONSTRAINT "menu_item_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_allergens" ADD CONSTRAINT "menu_item_allergens_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_allergens" ADD CONSTRAINT "menu_item_allergens_allergen_id_fkey" FOREIGN KEY ("allergen_id") REFERENCES "allergens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_dietary_attributes" ADD CONSTRAINT "menu_item_dietary_attributes_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_dietary_attributes" ADD CONSTRAINT "menu_item_dietary_attributes_dietary_attribute_id_fkey" FOREIGN KEY ("dietary_attribute_id") REFERENCES "dietary_attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition" ADD CONSTRAINT "nutrition_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_media" ADD CONSTRAINT "menu_item_media_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_pairings" ADD CONSTRAINT "menu_pairings_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_pairings" ADD CONSTRAINT "menu_pairings_paired_menu_item_id_fkey" FOREIGN KEY ("paired_menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_option_groups" ADD CONSTRAINT "menu_option_groups_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_options" ADD CONSTRAINT "menu_options_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "menu_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_option_groups" ADD CONSTRAINT "menu_item_option_groups_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_option_groups" ADD CONSTRAINT "menu_item_option_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "menu_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_option_availability" ADD CONSTRAINT "branch_menu_option_availability_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_option_availability" ADD CONSTRAINT "branch_menu_option_availability_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "menu_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_prices" ADD CONSTRAINT "menu_item_prices_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_prices" ADD CONSTRAINT "menu_item_prices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_prices" ADD CONSTRAINT "menu_item_prices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_categories" ADD CONSTRAINT "tax_categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_tax_category_id_fkey" FOREIGN KEY ("tax_category_id") REFERENCES "tax_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_items" ADD CONSTRAINT "branch_menu_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_menu_items" ADD CONSTRAINT "branch_menu_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_availability" ADD CONSTRAINT "menu_item_availability_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_availability" ADD CONSTRAINT "menu_item_availability_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_staff_id_fkey" FOREIGN KEY ("delivery_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_inventory" ADD CONSTRAINT "menu_item_inventory_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_inventory" ADD CONSTRAINT "menu_item_inventory_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "inventory_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_from_branch_id_fkey" FOREIGN KEY ("from_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_to_branch_id_fkey" FOREIGN KEY ("to_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfer_lines" ADD CONSTRAINT "inventory_transfer_lines_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "inventory_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfer_lines" ADD CONSTRAINT "inventory_transfer_lines_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Invariants and triggers that Prisma cannot express.
-- ---------------------------------------------------------------------------

-- One primary media row per dish.
CREATE UNIQUE INDEX "menu_item_media_one_primary_idx"
  ON "menu_item_media" ("menu_item_id")
  WHERE "is_primary" = true;

-- At most one default branch per restaurant.
CREATE UNIQUE INDEX "branches_one_default_idx"
  ON "branches" ("restaurant_id")
  WHERE "is_default" = true;

-- Null branch_id means restaurant-level role. PostgreSQL unique indexes allow
-- duplicate NULLs, so add an explicit partial unique index for that scope.
CREATE UNIQUE INDEX "role_assignments_restaurant_scope_key"
  ON "role_assignments" ("user_id", "role", "restaurant_id")
  WHERE "branch_id" IS NULL;

-- Search index for keyword arrays.
CREATE INDEX "menu_items_search_keywords_gin_idx"
  ON "menu_items" USING GIN ("search_keywords");

-- Basic value checks.
ALTER TABLE "menu_pairings"
  ADD CONSTRAINT "menu_pairings_no_self_check"
  CHECK ("menu_item_id" <> "paired_menu_item_id");

ALTER TABLE "branch_inventory"
  ADD CONSTRAINT "branch_inventory_nonnegative_check"
  CHECK ("current_stock" >= 0 AND "minimum_stock" >= 0 AND "reorder_level" >= 0);

ALTER TABLE "menu_items"
  ADD CONSTRAINT "menu_items_money_nonnegative_check"
  CHECK (
    "base_price_minor" >= 0
    AND ("compare_at_price_minor" IS NULL OR "compare_at_price_minor" >= 0)
    AND ("cost_price_minor" IS NULL OR "cost_price_minor" >= 0)
  );

ALTER TABLE "menu_items"
  ADD CONSTRAINT "menu_items_compare_at_price_check"
  CHECK ("compare_at_price_minor" IS NULL OR "compare_at_price_minor" >= "base_price_minor");

ALTER TABLE "menu_items"
  ADD CONSTRAINT "menu_items_prep_nonnegative_check"
  CHECK (
    ("preparation_time_minutes" IS NULL OR "preparation_time_minutes" >= 0)
    AND ("cooking_time_minutes" IS NULL OR "cooking_time_minutes" >= 0)
    AND ("serving_size" IS NULL OR "serving_size" >= 0)
  );

ALTER TABLE "branches"
  ADD CONSTRAINT "branches_service_charge_valid_check"
  CHECK (
    ("service_charge_type" = 'NONE' AND "service_charge_value" = 0)
    OR ("service_charge_type" = 'PERCENTAGE' AND "service_charge_value" BETWEEN 0 AND 10000)
    OR ("service_charge_type" = 'FIXED' AND "service_charge_value" >= 0)
  );

ALTER TABLE "menu_item_prices"
  ADD CONSTRAINT "menu_item_prices_valid_check"
  CHECK (
    "price_minor" >= 0
    AND ("compare_at_price_minor" IS NULL OR "compare_at_price_minor" >= "price_minor")
    AND ("valid_until" IS NULL OR "valid_until" > "valid_from")
  );

ALTER TABLE "tax_rates"
  ADD CONSTRAINT "tax_rates_valid_check"
  CHECK (
    "rate_basis_points" BETWEEN 0 AND 10000
    AND ("valid_until" IS NULL OR "valid_until" > "valid_from")
  );

ALTER TABLE "promotions"
  ADD CONSTRAINT "promotions_valid_check"
  CHECK (
    "value" >= 0
    AND "min_order_minor" >= 0
    AND ("max_discount_minor" IS NULL OR "max_discount_minor" >= 0)
    AND ("ends_at" IS NULL OR "ends_at" > "starts_at")
    AND (
      ("scope" = 'RESTAURANT' AND "branch_id" IS NULL)
      OR ("scope" = 'BRANCH' AND "branch_id" IS NOT NULL)
    )
  );

ALTER TABLE "delivery_zones"
  ADD CONSTRAINT "delivery_zones_valid_check"
  CHECK (
    "base_fee_minor" >= 0
    AND "min_order_minor" >= 0
    AND ("radius_meters" IS NULL OR "radius_meters" > 0)
  );

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_money_nonnegative_check"
  CHECK (
    "subtotal_minor" >= 0
    AND "discount_minor" >= 0
    AND "service_charge_minor" >= 0
    AND "tax_minor" >= 0
    AND "delivery_fee_minor" >= 0
    AND "tax_rate_basis_points" BETWEEN 0 AND 10000
  );

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_valid_check"
  CHECK (
    "quantity" > 0
    AND "unit_price_minor" >= 0
    AND "tax_minor" >= 0
    AND "discount_minor" >= 0
  );

ALTER TABLE "menu_item_ingredients"
  ADD CONSTRAINT "menu_item_ingredients_quantity_check"
  CHECK ("quantity" IS NULL OR "quantity" >= 0);

ALTER TABLE "nutrition"
  ADD CONSTRAINT "nutrition_nonnegative_check"
  CHECK (
    "serving_size" >= 0
    AND ("calories_kcal" IS NULL OR "calories_kcal" >= 0)
    AND ("energy_kj" IS NULL OR "energy_kj" >= 0)
    AND ("protein_g" IS NULL OR "protein_g" >= 0)
    AND ("carbohydrates_g" IS NULL OR "carbohydrates_g" >= 0)
    AND ("sugars_g" IS NULL OR "sugars_g" >= 0)
    AND ("added_sugars_g" IS NULL OR "added_sugars_g" >= 0)
    AND ("total_fat_g" IS NULL OR "total_fat_g" >= 0)
    AND ("saturated_fat_g" IS NULL OR "saturated_fat_g" >= 0)
    AND ("trans_fat_g" IS NULL OR "trans_fat_g" >= 0)
    AND ("fiber_g" IS NULL OR "fiber_g" >= 0)
    AND ("sodium_mg" IS NULL OR "sodium_mg" >= 0)
    AND ("cholesterol_mg" IS NULL OR "cholesterol_mg" >= 0)
  );

ALTER TABLE "branch_operating_hours"
  ADD CONSTRAINT "branch_operating_hours_valid_check"
  CHECK (
    "day_of_week" BETWEEN 0 AND 6
    AND "opens_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "closes_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );

ALTER TABLE "menu_item_availability"
  ADD CONSTRAINT "menu_item_availability_valid_check"
  CHECK (
    ("day_of_week" IS NULL OR "day_of_week" BETWEEN 0 AND 6)
    AND "available_from" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "available_until" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND ("valid_until" IS NULL OR "valid_from" IS NULL OR "valid_until" > "valid_from")
  );

ALTER TABLE "menu_option_groups"
  ADD CONSTRAINT "menu_option_groups_selection_check"
  CHECK (
    "min_selections" >= 0
    AND "max_selections" >= 1
    AND "min_selections" <= "max_selections"
    AND ("selection_type" = 'SINGLE' OR "max_selections" >= 1)
  );

ALTER TABLE "menu_options"
  ADD CONSTRAINT "menu_options_valid_check"
  CHECK ("price_delta_minor" >= 0 AND "max_quantity" >= 1);

-- ---------------------------------------------------------------------------
-- Scope validation triggers.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_role_assignment_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM branches
    WHERE id = NEW.branch_id AND restaurant_id = NEW.restaurant_id
  ) THEN
    RAISE EXCEPTION 'role assignment branch does not belong to restaurant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER role_assignments_scope_trigger
  BEFORE INSERT OR UPDATE ON role_assignments
  FOR EACH ROW EXECUTE FUNCTION validate_role_assignment_scope();

CREATE OR REPLACE FUNCTION validate_menu_item_price_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM branches b
    JOIN menu_items mi ON mi.restaurant_id = b.restaurant_id
    WHERE b.id = NEW.branch_id AND mi.id = NEW.menu_item_id
  ) THEN
    RAISE EXCEPTION 'menu item price branch does not belong to item restaurant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_item_prices_scope_trigger
  BEFORE INSERT OR UPDATE ON menu_item_prices
  FOR EACH ROW EXECUTE FUNCTION validate_menu_item_price_scope();

CREATE OR REPLACE FUNCTION validate_menu_item_category_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM menu_items mi
    JOIN menu_categories mc ON mc.id = NEW.category_id
    JOIN menus m ON m.id = mc.menu_id
    WHERE mi.id = NEW.menu_item_id AND mi.restaurant_id = m.restaurant_id
  ) THEN
    RAISE EXCEPTION 'menu item category belongs to a different restaurant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_item_categories_scope_trigger
  BEFORE INSERT OR UPDATE ON menu_item_categories
  FOR EACH ROW EXECUTE FUNCTION validate_menu_item_category_scope();

CREATE OR REPLACE FUNCTION validate_category_parent_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM menu_categories
    WHERE id = NEW.parent_id AND menu_id = NEW.menu_id AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'category parent must belong to the same menu';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_categories_parent_scope_trigger
  BEFORE INSERT OR UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION validate_category_parent_scope();

CREATE OR REPLACE FUNCTION validate_menu_item_option_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM menu_items mi
    JOIN menu_option_groups mog ON mog.id = NEW.group_id
    WHERE mi.id = NEW.menu_item_id AND mi.restaurant_id = mog.restaurant_id
  ) THEN
    RAISE EXCEPTION 'option group belongs to a different restaurant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_item_option_groups_scope_trigger
  BEFORE INSERT OR UPDATE ON menu_item_option_groups
  FOR EACH ROW EXECUTE FUNCTION validate_menu_item_option_scope();

CREATE OR REPLACE FUNCTION validate_branch_inventory_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM branches b
    JOIN inventory_items ii ON ii.restaurant_id = b.restaurant_id
    WHERE b.id = NEW.branch_id AND ii.id = NEW.inventory_item_id
  ) THEN
    RAISE EXCEPTION 'inventory item branch does not belong to item restaurant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER branch_inventory_scope_trigger
  BEFORE INSERT OR UPDATE ON branch_inventory
  FOR EACH ROW EXECUTE FUNCTION validate_branch_inventory_scope();

CREATE OR REPLACE FUNCTION validate_menu_item_inventory_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM menu_items mi
    JOIN inventory_items ii ON ii.restaurant_id = mi.restaurant_id
    WHERE mi.id = NEW.menu_item_id AND ii.id = NEW.inventory_item_id
  ) THEN
    RAISE EXCEPTION 'menu item inventory belongs to a different restaurant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_item_inventory_scope_trigger
  BEFORE INSERT OR UPDATE ON menu_item_inventory
  FOR EACH ROW EXECUTE FUNCTION validate_menu_item_inventory_scope();

CREATE OR REPLACE FUNCTION validate_branch_menu_item_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM branches b
    JOIN menu_items mi ON mi.restaurant_id = b.restaurant_id
    WHERE b.id = NEW.branch_id AND mi.id = NEW.menu_item_id
  ) THEN
    RAISE EXCEPTION 'branch menu item belongs to a different restaurant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER branch_menu_items_scope_trigger
  BEFORE INSERT OR UPDATE ON branch_menu_items
  FOR EACH ROW EXECUTE FUNCTION validate_branch_menu_item_scope();

CREATE OR REPLACE FUNCTION validate_menu_item_availability_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM branches b
    JOIN menu_items mi ON mi.restaurant_id = b.restaurant_id
    WHERE b.id = NEW.branch_id AND mi.id = NEW.menu_item_id
  ) THEN
    RAISE EXCEPTION 'menu item availability belongs to a different restaurant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_item_availability_scope_trigger
  BEFORE INSERT OR UPDATE ON menu_item_availability
  FOR EACH ROW EXECUTE FUNCTION validate_menu_item_availability_scope();

CREATE OR REPLACE FUNCTION validate_order_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM branches
    WHERE id = NEW.branch_id AND restaurant_id = NEW.restaurant_id
  ) THEN
    RAISE EXCEPTION 'order branch does not belong to restaurant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_scope_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION validate_order_scope();

-- ---------------------------------------------------------------------------
-- Effective-date overlap protection.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_tax_rate_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM tax_rates tr
    WHERE tr.tax_category_id = NEW.tax_category_id
      AND tr.id <> NEW.id
      AND tstzrange(tr.valid_from, COALESCE(tr.valid_until, 'infinity'::timestamptz), '[)')
          && tstzrange(NEW.valid_from, COALESCE(NEW.valid_until, 'infinity'::timestamptz), '[)')
  ) THEN
    RAISE EXCEPTION 'tax rate windows overlap for category %', NEW.tax_category_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tax_rates_no_overlap_trigger
  BEFORE INSERT OR UPDATE ON tax_rates
  FOR EACH ROW EXECUTE FUNCTION prevent_tax_rate_overlap();

CREATE OR REPLACE FUNCTION prevent_menu_item_price_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM menu_item_prices mip
    WHERE mip.menu_item_id = NEW.menu_item_id
      AND mip.branch_id IS NOT DISTINCT FROM NEW.branch_id
      AND mip.id <> NEW.id
      AND tstzrange(mip.valid_from, COALESCE(mip.valid_until, 'infinity'::timestamptz), '[)')
          && tstzrange(NEW.valid_from, COALESCE(NEW.valid_until, 'infinity'::timestamptz), '[)')
  ) THEN
    RAISE EXCEPTION 'menu item price windows overlap for item % branch %',
      NEW.menu_item_id, NEW.branch_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_item_prices_no_overlap_trigger
  BEFORE INSERT OR UPDATE ON menu_item_prices
  FOR EACH ROW EXECUTE FUNCTION prevent_menu_item_price_overlap();

-- ---------------------------------------------------------------------------
-- Version and history support.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_branch_menu_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE branches
  SET menu_version = GREATEST(menu_version, NEW.version)
  WHERE id = NEW.branch_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_publications_version_trigger
  AFTER INSERT ON menu_publications
  FOR EACH ROW EXECUTE FUNCTION sync_branch_menu_version();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'restaurants', 'branches', 'users', 'menus', 'menu_categories',
    'menu_items', 'menu_item_translations', 'ingredients',
    'menu_option_groups', 'menu_options', 'tax_categories', 'promotions',
    'delivery_zones', 'branch_menu_items', 'branch_inventory',
    'branch_menu_option_availability', 'inventory_items', 'nutrition',
    'reviews', 'orders'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Verified reviews: an approved review must be backed by a completed order
-- owned by the reviewer and containing the reviewed dish.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION enforce_verified_review()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'APPROVED' THEN
    IF NEW.order_id IS NULL THEN
      RAISE EXCEPTION 'approved reviews require a completed order';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.id = NEW.order_id
        AND o.user_id = NEW.user_id
        AND o.status = 'COMPLETED'
        AND oi.menu_item_id = NEW.menu_item_id
    ) THEN
      RAISE EXCEPTION 'review is not backed by a completed purchase';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_verified_purchase_trigger
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION enforce_verified_review();

-- Make direct SQL inserts and seed scripts safe: Prisma's @updatedAt still
-- supplies the value, and the triggers above keep it current on updates.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'restaurants', 'branches', 'users', 'menus', 'menu_categories',
    'menu_items', 'menu_item_translations', 'ingredients',
    'menu_option_groups', 'menu_options', 'tax_categories', 'promotions',
    'delivery_zones', 'branch_menu_items', 'branch_inventory',
    'branch_menu_option_availability', 'inventory_items', 'nutrition',
    'reviews', 'orders'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP',
      table_name
    );
  END LOOP;
END;
$$;
