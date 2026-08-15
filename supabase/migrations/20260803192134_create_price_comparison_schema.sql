/*
# Supermarket Price Comparison Schema

## Overview
Creates a schema for comparing product prices across different supermarket chains
in various cities. This is a single-tenant app (no sign-in) so all data is publicly
readable via the anon key.

## New Tables

### cities
- `id` (uuid, PK)
- `name` (text, not null) — city name (e.g. "Madrid", "Barcelona")
- `postal_code` (text, not null) — representative postal code for the city
- `created_at` (timestamptz)

### supermarkets
- `id` (uuid, PK)
- `name` (text, not null) — chain name (e.g. "Mercadona", "Carrefour")
- `logo_color` (text) — hex color used for visual branding in the UI
- `created_at` (timestamptz)

### products
- `id` (uuid, PK)
- `name` (text, not null) — product name (e.g. "Leche entera 1L")
- `brand` (text) — brand name
- `category` (text, not null) — category (e.g. "Lácteos", "Panadería")
- `image_url` (text) — product image URL
- `unit_size` (text) — size description (e.g. "1L", "500g")
- `created_at` (timestamptz)

### prices
- `id` (uuid, PK)
- `product_id` (uuid, FK → products, cascade delete)
- `supermarket_id` (uuid, FK → supermarkets, cascade delete)
- `city_id` (uuid, FK → cities, cascade delete)
- `price` (numeric(10,2), not null) — price in EUR
- `updated_at` (timestamptz, default now()) — when the price was last updated
- Unique constraint on (product_id, supermarket_id, city_id)

## Security
- RLS enabled on all tables.
- All tables use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant public app with no sign-in.

## Indexes
- `idx_prices_product_city` on prices(city_id, product_id) for the main query
- `idx_products_category` on products(category) for category filtering
- `idx_products_name_trgm` GIN trigram index on products(name) for fuzzy search
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  postal_code text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supermarkets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_color text NOT NULL DEFAULT '#2563eb',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  category text NOT NULL,
  image_url text,
  unit_size text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supermarket_id uuid NOT NULL REFERENCES supermarkets(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  price numeric(10,2) NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, supermarket_id, city_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prices_product_city ON prices(city_id, product_id);
CREATE INDEX IF NOT EXISTS idx_prices_supermarket ON prices(supermarket_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- RLS
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE supermarkets ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Cities policies
DROP POLICY IF EXISTS "anon_select_cities" ON cities;
CREATE POLICY "anon_select_cities" ON cities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cities" ON cities;
CREATE POLICY "anon_insert_cities" ON cities FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cities" ON cities;
CREATE POLICY "anon_update_cities" ON cities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cities" ON cities;
CREATE POLICY "anon_delete_cities" ON cities FOR DELETE TO anon, authenticated USING (true);

-- Supermarkets policies
DROP POLICY IF EXISTS "anon_select_supermarkets" ON supermarkets;
CREATE POLICY "anon_select_supermarkets" ON supermarkets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_supermarkets" ON supermarkets;
CREATE POLICY "anon_insert_supermarkets" ON supermarkets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_supermarkets" ON supermarkets;
CREATE POLICY "anon_update_supermarkets" ON supermarkets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_supermarkets" ON supermarkets;
CREATE POLICY "anon_delete_supermarkets" ON supermarkets FOR DELETE TO anon, authenticated USING (true);

-- Products policies
DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE TO anon, authenticated USING (true);

-- Prices policies
DROP POLICY IF EXISTS "anon_select_prices" ON prices;
CREATE POLICY "anon_select_prices" ON prices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_prices" ON prices;
CREATE POLICY "anon_insert_prices" ON prices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_prices" ON prices;
CREATE POLICY "anon_update_prices" ON prices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_prices" ON prices;
CREATE POLICY "anon_delete_prices" ON prices FOR DELETE TO anon, authenticated USING (true);