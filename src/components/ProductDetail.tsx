import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingDown, TrendingUp, Store, Loader2, Package, Clock, Minus, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Supermarket, PriceWithSupermarket, PriceHistoryEntry, PriceHistoryBySupermarket, City } from '@/types/database';
import { PriceChart } from '@/components/PriceChart';
import { haversineDistance, formatDistance, type Coordinates } from '@/lib/geo';

interface ProductDetailProps {
  productId: string;
  city: City;
  allSupermarkets: Supermarket[];
  userCoords?: Coordinates | null;
  onBack: () => void;
}

function formatPrice(price: number): string {
  return price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'hace minutos';
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export function ProductDetail({ productId, city, allSupermarkets, userCoords, onBack }: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [currentPrices, setCurrentPrices] = useState<PriceWithSupermarket[]>([]);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError(null);
      const [prodRes, priceRes, histRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).maybeSingle(),
        supabase
          .from('prices')
          .select('*, supermarkets(*)')
          .eq('product_id', productId)
          .eq('city_id', city.id),
        supabase
          .from('price_history')
          .select('*, supermarkets(*)')
          .eq('product_id', productId)
          .eq('city_id', city.id)
          .order('recorded_at', { ascending: true }),
      ]);

      if (cancelled) return;
      if (prodRes.error || priceRes.error || histRes.error) {
        setError('No se pudieron cargar los datos del producto.');
        setLoading(false);
        return;
      }
      setProduct(prodRes.data);
      setCurrentPrices(priceRes.data || []);
      setHistory(histRes.data || []);
      setLoading(false);
    }
    loadData();
    return () => { cancelled = true; };
  }, [productId, city.id]);

  // Group history by supermarket
  const historyBySupermarket = useMemo<PriceHistoryBySupermarket[]>(() => {
    const map = new Map<string, PriceHistoryBySupermarket>();
    for (const h of history) {
      const smId = h.supermarket_id;
      if (!map.has(smId)) {
        map.set(smId, {
          supermarket: h.supermarkets,
          history: [],
        });
      }
      map.get(smId)!.history.push({ recorded_at: h.recorded_at, price: h.price });
    }
    // Sort each series by date
    for (const series of map.values()) {
      series.history.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    }
    return Array.from(map.values()).sort((a, b) =>
      a.supermarket.name.localeCompare(b.supermarket.name, 'es')
    );
  }, [history]);

  // Current price stats
  const stats = useMemo(() => {
    if (currentPrices.length === 0) return null;
    const sorted = [...currentPrices].sort((a, b) => a.price - b.price);
    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];
    const savings = highest.price - lowest.price;
    const savingsPct = highest.price > 0 ? Math.round((savings / highest.price) * 100) : 0;
    return { lowest, highest, savings, savingsPct };
  }, [currentPrices]);

  // Price trend (compare first vs last data point for lowest supermarket)
  const trend = useMemo(() => {
    if (historyBySupermarket.length === 0) return null;
    const lowestSm = stats?.lowest?.supermarket_id;
    const series = historyBySupermarket.find((s) => s.supermarket.id === lowestSm);
    if (!series || series.history.length < 2) return null;
    const first = series.history[0].price;
    const last = series.history[series.history.length - 1].price;
    const diff = last - first;
    const pct = first > 0 ? Math.round((diff / first) * 100) : 0;
    return { diff, pct, isUp: diff > 0, isDown: diff < 0 };
  }, [historyBySupermarket, stats]);

  // Price map for display
  const priceMap = useMemo(
    () => new Map(currentPrices.map((p) => [p.supermarket_id, p])),
    [currentPrices]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="mt-4 text-sm text-slate-500">Cargando detalle del producto...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-red-50">
          <Package className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-700">
          {error || 'Producto no encontrado'}
        </h3>
        <button
          onClick={onBack}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-700 sm:mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a productos
      </button>

      {/* Product header */}
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:gap-5 sm:p-6">
        <div className="flex items-center gap-4 sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 text-3xl sm:h-20 sm:w-20 sm:text-4xl">
            {product.image_url || '📦'}
          </div>
          {/* Mobile: name + badges next to icon */}
          <div className="min-w-0 flex-1 sm:hidden">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">{product.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {product.brand && (
                <span className="text-sm font-medium text-slate-500">{product.brand}</span>
              )}
              {product.unit_size && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{product.unit_size}</span>
              )}
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{product.category}</span>
            </div>
          </div>
        </div>
        {/* Desktop: name + badges */}
        <div className="hidden min-w-0 flex-1 sm:block">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {product.brand && (
              <span className="text-sm font-medium text-slate-500">{product.brand}</span>
            )}
            {product.unit_size && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{product.unit_size}</span>
            )}
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">{product.category}</span>
          </div>
        </div>
        {stats && (
          <div className="shrink-0 text-right">
            <p className="text-xs text-slate-400">Mejor precio en {city.name}</p>
            <p className="text-2xl font-bold text-emerald-600 sm:text-3xl">{formatPrice(stats.lowest.price)}</p>
            <p className="mt-1 flex items-center justify-end gap-1 text-xs font-medium text-emerald-700">
              <Store className="h-3 w-3" />
              {stats.lowest.supermarkets.name}
            </p>
          </div>
        )}
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-4">
          {/* Lowest price */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Mínimo</span>
            </div>
            <p className="mt-1.5 text-xl font-bold text-emerald-700 sm:mt-2 sm:text-2xl">{formatPrice(stats.lowest.price)}</p>
            <p className="mt-0.5 truncate text-xs text-emerald-600">{stats.lowest.supermarkets.name}</p>
          </div>

          {/* Highest price */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Máximo</span>
            </div>
            <p className="mt-1.5 text-xl font-bold text-slate-700 sm:mt-2 sm:text-2xl">{formatPrice(stats.highest.price)}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{stats.highest.supermarkets.name}</p>
          </div>

          {/* Savings */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-amber-700">
              <span className="text-xs font-medium uppercase tracking-wide">Ahorro</span>
            </div>
            <p className="mt-1.5 text-xl font-bold text-amber-600 sm:mt-2 sm:text-2xl">{formatPrice(stats.savings)}</p>
            <p className="mt-0.5 text-xs text-amber-600">{stats.savingsPct}% comparando</p>
          </div>

          {/* Trend */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="h-4 w-4" />
              <span className="text-[10px] font-medium uppercase tracking-wide sm:text-xs">Tendencia 30d</span>
            </div>
            {trend ? (
              <p
                className={`mt-1.5 flex items-center gap-1 text-xl font-bold sm:mt-2 sm:text-2xl ${
                  trend.isUp ? 'text-red-500' : trend.isDown ? 'text-emerald-600' : 'text-slate-500'
                }`}
              >
                {trend.isUp ? <TrendingUp className="h-5 w-5" /> : trend.isDown ? <TrendingDown className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                {trend.pct > 0 ? '+' : ''}{trend.pct}%
              </p>
            ) : (
              <p className="mt-1.5 text-xl font-bold text-slate-300 sm:mt-2 sm:text-2xl">—</p>
            )}
            <p className="mt-0.5 text-xs text-slate-400">vs. hace 30 días</p>
          </div>
        </div>
      )}

      {/* Price history chart */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Historial de precios</h2>
          <p className="text-sm text-slate-500">
            Evolución en {city.name} durante los últimos 30 días
          </p>
        </div>
        <PriceChart data={historyBySupermarket} />
      </div>

      {/* Current prices table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-base font-bold text-slate-900 sm:text-lg">Precios actuales en {city.name}</h2>
        <div className="space-y-2">
          {allSupermarkets.map((sm) => {
            const priceEntry = priceMap.get(sm.id);
            const isLowest = stats && priceEntry && priceEntry.price === stats.lowest.price;
            const distance = userCoords && sm.latitude != null && sm.longitude != null
              ? haversineDistance(userCoords, { lat: sm.latitude, lng: sm.longitude })
              : null;
            if (!priceEntry) {
              return (
                <div
                  key={sm.id}
                  className="flex items-center justify-between rounded-xl px-3 py-3 opacity-40 sm:px-4"
                >
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: sm.logo_color }} />
                    <span className="truncate text-sm text-slate-500">{sm.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-2">
                    {distance != null && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {formatDistance(distance)}
                      </span>
                    )}
                    <span className="text-sm text-slate-400">Sin datos</span>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={sm.id}
                className={`flex items-center justify-between rounded-xl px-3 py-3 transition-colors sm:px-4 ${
                  isLowest ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: sm.logo_color }} />
                  <span className="truncate text-sm font-medium text-slate-700">{sm.name}</span>
                  {isLowest && (
                    <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Mejor
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-2 sm:gap-3">
                  {distance != null && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-3 w-3" />
                      {formatDistance(distance)}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{timeAgo(priceEntry.updated_at)}</span>
                  <span className={`text-base font-semibold ${isLowest ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {formatPrice(priceEntry.price)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
