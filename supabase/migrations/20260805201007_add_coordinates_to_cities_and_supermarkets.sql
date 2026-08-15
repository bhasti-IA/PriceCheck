/*
# Add GPS coordinates to cities and supermarkets

## Purpose
Enables geolocation-based features: the browser can request the user's GPS position
(navigator.geolocation) and we can compute the distance to each supermarket and city
using the Haversine formula.

## Changes
1. `cities` table: add `latitude` (double precision, nullable) and `longitude` (double precision, nullable)
2. `supermarkets` table: add `latitude` (double precision, nullable) and `longitude` (double precision, nullable)

Both columns are nullable so existing rows remain valid. The app falls back to
the city-based workflow when coordinates are missing.

## Security
No RLS policy changes — existing policies remain in effect.
*/

ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE supermarkets
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Populate city coordinates for known Spanish cities (best-effort)
UPDATE cities SET latitude = 41.3851, longitude = 2.1734 WHERE name ILIKE '%barcelona%' AND latitude IS NULL;
UPDATE cities SET latitude = 40.4168, longitude = -3.7038 WHERE name ILIKE '%madrid%' AND latitude IS NULL;
UPDATE cities SET latitude = 39.4699, longitude = -0.3763 WHERE name ILIKE '%valencia%' AND latitude IS NULL;
UPDATE cities SET latitude = 37.3886, longitude = -5.9823 WHERE name ILIKE '%sevilla%' AND latitude IS NULL;
UPDATE cities SET latitude = 41.6488, longitude = -0.8891 WHERE name ILIKE '%zaragoza%' AND latitude IS NULL;

-- Populate supermarket coordinates (sample Madrid locations as defaults)
UPDATE supermarkets SET latitude = 40.4170, longitude = -3.7035 WHERE name ILIKE '%mercadona%' AND latitude IS NULL;
UPDATE supermarkets SET latitude = 40.4200, longitude = -3.7000 WHERE name ILIKE '%carrefour%' AND latitude IS NULL;
UPDATE supermarkets SET latitude = 40.4150, longitude = -3.7080 WHERE name ILIKE '%dia%' AND latitude IS NULL;
UPDATE supermarkets SET latitude = 40.4180, longitude = -3.7050 WHERE name ILIKE '%lidl%' AND latitude IS NULL;
UPDATE supermarkets SET latitude = 40.4100, longitude = -3.7020 WHERE name ILIKE '%alcampo%' AND latitude IS NULL;
