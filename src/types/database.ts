export interface City {
  id: string;
  name: string;
  postal_code: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Supermarket {
  id: string;
  name: string;
  logo_color: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  image_url: string | null;
  unit_size: string | null;
}

export interface Price {
  id: string;
  product_id: string;
  supermarket_id: string;
  city_id: string;
  price: number;
  updated_at: string;
}

export interface PriceWithSupermarket extends Price {
  supermarkets: Supermarket;
}

export interface ProductWithPrices extends Product {
  prices: PriceWithSupermarket[];
}

export interface PriceHistoryEntry {
  id: string;
  product_id: string;
  supermarket_id: string;
  city_id: string;
  price: number;
  recorded_at: string;
  supermarkets: Supermarket;
}

export interface PriceHistoryBySupermarket {
  supermarket: Supermarket;
  history: { recorded_at: string; price: number }[];
}
