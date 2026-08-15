import { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Check, Search, Crosshair, Loader2, AlertCircle } from 'lucide-react';
import type { City } from '@/types/database';
import { getUserCoordinates, haversineDistance, type Coordinates } from '@/lib/geo';

interface LocationSelectorProps {
  cities: City[];
  selectedCity: City | null;
  onSelectCity: (city: City) => void;
  onLocate?: (coords: Coordinates) => void;
  userCoords?: Coordinates | null;
}

export function LocationSelector({ cities, selectedCity, onSelectCity, onLocate, userCoords }: LocationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchQuery('');
        setGeoError(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = cities.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.postal_code.includes(searchQuery)
  );

  const handleLocate = async () => {
    setLocating(true);
    setGeoError(null);
    try {
      const coords = await getUserCoordinates();
      const citiesWithCoords = cities.filter((c) => c.latitude != null && c.longitude != null);
      if (citiesWithCoords.length > 0) {
        let nearest = citiesWithCoords[0];
        let minDist = haversineDistance(coords, { lat: nearest.latitude!, lng: nearest.longitude! });
        for (const c of citiesWithCoords.slice(1)) {
          const d = haversineDistance(coords, { lat: c.latitude!, lng: c.longitude! });
          if (d < minDist) {
            minDist = d;
            nearest = c;
          }
        }
        onSelectCity(nearest);
      }
      onLocate?.(coords);
      setOpen(false);
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : 'Error al obtener la ubicación.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Seleccionar ciudad"
        className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-200 shadow-sm backdrop-blur-md transition-all hover:border-emerald-400/40 hover:bg-slate-800/60 sm:px-4 sm:py-2.5"
      >
        {userCoords ? (
          <Crosshair className="h-4 w-4 text-emerald-400" />
        ) : (
          <MapPin className="h-4 w-4 text-emerald-400" />
        )}
        <span className="hidden sm:inline">
          {selectedCity ? `${selectedCity.name}` : 'Seleccionar ciudad'}
        </span>
        <span className="sm:hidden">{selectedCity ? selectedCity.name : 'Ciudad'}</span>
        {selectedCity && (
          <span className="hidden text-xs text-slate-500 lg:inline">{selectedCity.postal_code}</span>
        )}
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right animate-slide-down rounded-2xl border border-slate-800 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-xl">
          <button
            onClick={handleLocate}
            disabled={locating}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-3 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-300 hover:to-teal-400 disabled:opacity-60"
          >
            {locating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Detectando ubicación...
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" />
                Usar mi ubicación (GPS)
              </>
            )}
          </button>

          {geoError && (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{geoError}</span>
            </div>
          )}

          {userCoords && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-400">
              <Crosshair className="h-3.5 w-3.5 shrink-0" />
              <span>Ubicación activa: {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}</span>
            </div>
          )}

          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              autoFocus
              type="text"
              placeholder="Ciudad o código postal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-800/60 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-400/50"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-500">No se encontraron ciudades</p>
            )}
            {filtered.map((city) => (
              <button
                key={city.id}
                onClick={() => {
                  onSelectCity(city);
                  setOpen(false);
                  setSearchQuery('');
                  setGeoError(null);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-800"
              >
                <div>
                  <span className="font-medium text-slate-200">{city.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{city.postal_code}</span>
                </div>
                {selectedCity?.id === city.id && (
                  <Check className="h-4 w-4 text-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
