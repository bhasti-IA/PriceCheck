import { TrendingDown, Store, Clock, MapPin } from 'lucide-react';
import type { ProductWithPrices, Supermarket } from '@/types/database';
import { haversineDistance, formatDistance, type Coordinates } from '@/lib/geo';

interface ProductCardProps {
  product: ProductWithPrices;
  allSupermarkets: Supermarket[];
  userCoords?: Coordinates | null;
  onClick?: () => void;
}

function formatPrice(price: number): string {
  return price.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'hace minutos';
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export function ProductCard({ product, allSupermarkets, userCoords, onClick }: ProductCardProps) {
  const sorted = [...product.prices].sort((a, b) => a.price - b.price);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  const savings = highest ? highest.price - lowest.price : 0;
  const savingsPct =
    highest && lowest && highest.price > 0
      ? Math.round(((highest.price - lowest.price) / highest.price) * 100)
      : 0;

  const priceMap = new Map(product.prices.map((p) => [p.supermarket_id, p]));
  const smMap = new Map(allSupermarkets.map((sm) => [sm.id, sm]));

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg shadow-slate-950/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/30 hover:shadow-emerald-500/10 ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Product header */}
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-2xl shadow-inner ring-1 ring-slate-800 sm:h-16 sm:w-16 sm:text-3xl">
          {product.image_url || '📦'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white sm:text-base">{product.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {product.brand && (
              <span className="text-xs font-medium text-slate-400">{product.brand}</span>
            )}
            {product.unit_size && (
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                {product.unit_size}
              </span>
            )}
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
              {product.category}
            </span>
          </div>
        </div>
      </div>

      {/* Savings badge */}
      {savings > 0 && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 sm:mx-5">
          <TrendingDown className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-300">
            Ahorra {formatPrice(savings)} ({savingsPct}%)
          </span>
        </div>
      )}

      {/* Price list */}
      <div className="flex-1 space-y-1.5 px-4 pb-4 sm:px-5">
        {allSupermarkets.map((sm) => {
          const priceEntry = priceMap.get(sm.id);
          const distance = userCoords && sm.latitude != null && sm.longitude != null
            ? haversineDistance(userCoords, { lat: sm.latitude, lng: sm.longitude })
            : null;
          if (!priceEntry) return (
            <div
              key={sm.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 opacity-30"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: sm.logo_color }}
                />
                <span className="truncate text-sm text-slate-400">{sm.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {distance != null && (
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <MapPin className="h-3 w-3" />
                    {formatDistance(distance)}
                  </span>
                )}
                <span className="text-sm text-slate-600">—</span>
              </div>
            </div>
          );

          const isLowest = lowest && priceEntry.price === lowest.price;

          return (
            <div
              key={sm.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                isLowest
                  ? 'border border-emerald-500/30 bg-emerald-500/10'
                  : 'hover:bg-slate-800/60'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: sm.logo_color }}
                />
                <span className="truncate text-sm font-medium text-slate-200">{sm.name}</span>
                {isLowest && (
                  <span className="rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-950">
                    Mejor
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                {distance != null && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {formatDistance(distance)}
                  </span>
                )}
                <span
                  className={`text-sm font-semibold ${
                    isLowest ? 'text-emerald-400' : 'text-slate-200'
                  }`}
                >
                  {formatPrice(priceEntry.price)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-800/80 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Store className="h-3.5 w-3.5" />
          <span>{product.prices.length} tiendas</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>Actualizado {timeAgo(lowest.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}
