import { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingCart, Loader2, PackageSearch, Store, TrendingDown, MapPin, Flame, Home, Search, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { City, Supermarket, Product, PriceWithSupermarket, ProductWithPrices } from '@/types/database';
import { LocationSelector } from '@/components/LocationSelector';
import { SearchBar } from '@/components/SearchBar';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetail } from '@/components/ProductDetail';
import type { Coordinates } from '@/lib/geo';

const STORAGE_KEY = 'pricecheck_selected_city';

export default function App() {
  const [cities, setCities] = useState<City[]>([]);
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<PriceWithSupermarket[]>([]);

  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);

  // Load cities and supermarkets (once)
  useEffect(() => {
    async function loadInitial() {
      const [citiesRes, smRes] = await Promise.all([
        supabase.from('cities').select('*').order('name'),
        supabase.from('supermarkets').select('*').order('name'),
      ]);

      if (citiesRes.error || smRes.error) {
        setError('No se pudieron cargar los datos iniciales.');
        return;
      }

      setCities(citiesRes.data || []);
      setSupermarkets(smRes.data || []);

      // Restore saved city or default to first
      const savedId = localStorage.getItem(STORAGE_KEY);
      const cityList = citiesRes.data || [];
      const saved = savedId ? cityList.find((c) => c.id === savedId) : null;
      setSelectedCity(saved || cityList[0] || null);
    }
    loadInitial();
  }, []);

  // Load products (once)
  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('category')
        .order('name');

      if (error) {
        setError('No se pudieron cargar los productos.');
        return;
      }
      setProducts(data || []);
    }
    loadProducts();
  }, []);

  // Load prices when city changes
  const loadPrices = useCallback(async (cityId: string) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('prices')
      .select('*, supermarkets(*)')
      .eq('city_id', cityId);

    if (error) {
      setError('No se pudieron cargar los precios.');
      setLoading(false);
      return;
    }
    setPrices(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedCity) {
      localStorage.setItem(STORAGE_KEY, selectedCity.id);
      loadPrices(selectedCity.id);
    }
  }, [selectedCity, loadPrices]);

  // Group prices by product
  const productsWithPrices: ProductWithPrices[] = useMemo(() => {
    const priceMap = new Map<string, PriceWithSupermarket[]>();
    for (const p of prices) {
      const arr = priceMap.get(p.product_id) || [];
      arr.push(p);
      priceMap.set(p.product_id, arr);
    }
    return products.map((prod) => ({
      ...prod,
      prices: priceMap.get(prod.id) || [],
    }));
  }, [products, prices]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = productsWithPrices;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand?.toLowerCase().includes(q) ?? false) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }
    // Only products that actually have prices in this city
    result = result.filter((p) => p.prices.length > 0);
    return result;
  }, [productsWithPrices, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [products]);

  // Best deal of the day: product with biggest % savings across supermarkets
  const bestDeal = useMemo(() => {
    let best: { product: ProductWithPrices; lowest: number; highest: number; pct: number; lowestSm: Supermarket | null } | null = null;
    for (const p of productsWithPrices) {
      if (p.prices.length < 2) continue;
      const sorted = [...p.prices].sort((a, b) => a.price - b.price);
      const low = sorted[0];
      const high = sorted[sorted.length - 1];
      if (high.price <= low.price) continue;
      const pct = Math.round(((high.price - low.price) / high.price) * 100);
      if (!best || pct > best.pct) {
        best = { product: p, lowest: low.price, highest: high.price, pct, lowestSm: low.supermarkets };
      }
    }
    return best;
  }, [productsWithPrices]);

  // Stats
  const stats = useMemo(() => {
    if (filteredProducts.length === 0) return null;
    let totalSavings = 0;
    for (const p of filteredProducts) {
      if (p.prices.length > 1) {
        const sorted = [...p.prices].sort((a, b) => a.price - b.price);
        totalSavings += sorted[sorted.length - 1].price - sorted[0].price;
      }
    }
    return {
      productCount: filteredProducts.length,
      storeCount: supermarkets.length,
      totalSavings,
    };
  }, [filteredProducts, supermarkets.length]);

  const scrollToSearch = () => {
    document.getElementById('mobile-search-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[placeholder^="Buscar productos"]');
      input?.focus();
    }, 400);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToCategories = () => {
    document.getElementById('mobile-search-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 sm:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-4">
            {/* Logo */}
            <button
              onClick={() => { setSelectedProductId(null); scrollToTop(); }}
              className="flex items-center gap-2 transition-opacity hover:opacity-80 sm:gap-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-200 sm:h-9 sm:w-9">
                <ShoppingCart className="h-4 w-4 text-white sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  PriceCheck
                </h1>
                <p className="hidden text-xs text-slate-400 sm:block">
                  Compara precios de supermercados
                </p>
              </div>
            </button>

            {/* Location */}
            <LocationSelector
              cities={cities}
              selectedCity={selectedCity}
              onSelectCity={setSelectedCity}
              onLocate={setUserCoords}
              userCoords={userCoords}
            />
          </div>
        </div>
      </header>

      {/* Detail page */}
      {selectedProductId && selectedCity ? (
        <main className="py-6 sm:py-8">
          <ProductDetail
            productId={selectedProductId}
            city={selectedCity}
            allSupermarkets={supermarkets}
            userCoords={userCoords}
            onBack={() => setSelectedProductId(null)}
          />
        </main>
      ) : (
      <>
      {/* Hero + Search */}
      <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mb-5 text-center sm:mb-6 sm:text-left">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl sm:text-3xl">
              Compara y ahorra en cada compra
            </h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              {selectedCity ? (
                <>
                  Mostrando precios en <span className="font-semibold text-emerald-700">{selectedCity.name}</span>
                  {' '}· Encuentra el mejor precio en {supermarkets.length} supermercados
                </>
              ) : (
                'Selecciona tu ciudad para ver los precios actualizados'
              )}
            </p>
          </div>

          <div id="mobile-search-anchor">
            <SearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>

          {/* Stats bar */}
          {stats && (
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1 sm:mt-6 sm:flex-wrap sm:gap-4 sm:overflow-visible sm:pb-0">
              <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white/80 px-3.5 py-2.5 shadow-sm ring-1 ring-slate-100 sm:px-4">
                <PackageSearch className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">{stats.productCount}</span>
                <span className="text-sm text-slate-500">productos</span>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white/80 px-3.5 py-2.5 shadow-sm ring-1 ring-slate-100 sm:px-4">
                <Store className="h-4 w-4 text-sky-600" />
                <span className="text-sm font-semibold text-slate-700">{stats.storeCount}</span>
                <span className="text-sm text-slate-500">tiendas</span>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white/80 px-3.5 py-2.5 shadow-sm ring-1 ring-slate-100 sm:px-4">
                <TrendingDown className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-slate-500">Ahorro</span>
                <span className="text-sm font-bold text-amber-700">
                  {stats.totalSavings.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Mejor Oferta del Día */}
        {!loading && !error && bestDeal && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 shadow-sm sm:mb-8">
            <div className="flex flex-col gap-0 sm:flex-row sm:items-center">
              {/* Badge section */}
              <div className="flex items-center gap-3 bg-gradient-to-br from-amber-400 to-orange-500 px-5 py-4 text-white sm:flex-col sm:gap-2 sm:px-6 sm:py-8">
                <Flame className="h-6 w-6 sm:h-7 sm:w-7" />
                <div className="sm:text-center">
                  <p className="text-xs font-medium uppercase tracking-wider opacity-90">Mejor Oferta</p>
                  <p className="text-base font-bold leading-tight sm:text-lg">del Día</p>
                </div>
              </div>

              {/* Deal content */}
              <div className="flex flex-1 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm sm:h-14 sm:w-14 sm:text-3xl">
                    {bestDeal.product.image_url || '📦'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold leading-tight text-slate-900 sm:text-base">{bestDeal.product.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {bestDeal.product.brand && (
                        <span className="text-xs text-slate-500">{bestDeal.product.brand}</span>
                      )}
                      {bestDeal.product.unit_size && (
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">{bestDeal.product.unit_size}</span>
                      )}
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{bestDeal.product.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:gap-6">
                  {/* Savings percentage */}
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-amber-600 sm:text-3xl">{bestDeal.pct}%</p>
                    <p className="text-xs font-medium text-amber-700">ahorro</p>
                  </div>
                  {/* Price comparison */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 line-through">{bestDeal.highest.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                      <p className="text-xl font-bold text-emerald-600 sm:text-2xl">{bestDeal.lowest.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                    </div>
                    {bestDeal.lowestSm && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-2 shadow-sm sm:px-3">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bestDeal.lowestSm.logo_color }} />
                        <span className="text-xs font-semibold text-slate-700 sm:text-sm">{bestDeal.lowestSm.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 sm:py-24">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="mt-4 text-sm text-slate-500">Cargando precios...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center sm:py-24">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <PackageSearch className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-700">No se encontraron productos</h3>
            <p className="mt-1 text-sm text-slate-500">
              Prueba con otra búsqueda o cambia la categoría.
            </p>
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                }}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="animate-fade-in">
                <ProductCard product={product} allSupermarkets={supermarkets} userCoords={userCoords} onClick={() => setSelectedProductId(product.id)} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
              <span>PriceCheck · Compara precios de supermercados</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              <span>Precios actualizados en tiempo real · {cities.length} ciudades disponibles</span>
            </div>
          </div>
        </div>
      </footer>
      </>
      )}

      {/* Mobile bottom navigation */}
      {!selectedProductId && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-lg sm:hidden">
          <div className="flex items-center justify-around px-2 py-1.5">
            <button
              onClick={scrollToTop}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-slate-600 transition-colors active:bg-slate-100"
            >
              <Home className="h-5 w-5" />
              <span className="text-[10px] font-medium">Inicio</span>
            </button>
            <button
              onClick={scrollToSearch}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-slate-600 transition-colors active:bg-slate-100"
            >
              <Search className="h-5 w-5" />
              <span className="text-[10px] font-medium">Buscar</span>
            </button>
            <button
              onClick={scrollToCategories}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-slate-600 transition-colors active:bg-slate-100"
            >
              <Tag className="h-5 w-5" />
              <span className="text-[10px] font-medium">Categorías</span>
            </button>
            <button
              onClick={() => {
                const el = document.querySelector('[aria-label*="ciudad"]') as HTMLButtonElement | null;
                el?.click();
              }}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-slate-600 transition-colors active:bg-slate-100"
            >
              <MapPin className="h-5 w-5" />
              <span className="text-[10px] font-medium">Ciudad</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
