/*
# Price History Table

## Overview
Creates a `price_history` table to track historical price changes for products
across supermarkets and cities over time. This enables the price history chart
on the product detail page.

## New Table
### price_history
- `id` (uuid, PK)
- `product_id` (uuid, FK -> products, cascade delete)
- `supermarket_id` (uuid, FK -> supermarkets, cascade delete)
- `city_id` (uuid, FK -> cities, cascade delete)
- `price` (numeric(10,2), not null) — recorded price in EUR at that point in time
- `recorded_at` (timestamptz, not null) — when the price was recorded

## Security
- RLS enabled on price_history.
- Public read access (TO anon, authenticated) because this is a single-tenant
  no-auth app, same as all other tables.

## Indexes
- `idx_price_history_product_city` on (product_id, city_id) for the detail page query
- `idx_price_history_recorded_at` on recorded_at for time-based sorting
*/

CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supermarket_id uuid NOT NULL REFERENCES supermarkets(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  price numeric(10,2) NOT NULL,
  recorded_at timestamptz NOT NULL,
  UNIQUE(product_id, supermarket_id, city_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_city
  ON price_history(product_id, city_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at
  ON price_history(recorded_at);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_price_history" ON price_history;
CREATE POLICY "anon_select_price_history" ON price_history FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_price_history" ON price_history;
CREATE POLICY "anon_insert_price_history" ON price_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_price_history" ON price_history;
CREATE POLICY "anon_update_price_history" ON price_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_price_history" ON price_history;
CREATE POLICY "anon_delete_price_history" ON price_history FOR DELETE
  TO anon, authenticated USING (true);
