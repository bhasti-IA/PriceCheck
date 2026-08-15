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

      // Find nearest city with coordinates
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
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-md sm:px-4 sm:py-2.5"
      >
        {userCoords ? (
          <Crosshair className="h-4 w-4 text-emerald-600" />
        ) : (
          <MapPin className="h-4 w-4 text-emerald-600" />
        )}
        <span className="hidden sm:inline">
          {selectedCity ? `${selectedCity.name}` : 'Seleccionar ciudad'}
        </span>
        <span className="sm:hidden">{selectedCity ? selectedCity.name : 'Ciudad'}</span>
        {selectedCity && (
          <span className="hidden text-xs text-slate-400 lg:inline">{selectedCity.postal_code}</span>
        )}
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right animate-slide-down rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {/* GPS button */}
          <button
            onClick={handleLocate}
            disabled={locating}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
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
            <div className="mb-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{geoError}</span>
            </div>
          )}

          {userCoords && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <Crosshair className="h-3.5 w-3.5 shrink-0" />
              <span>Ubicación activa: {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}</span>
            </div>
          )}

          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="Ciudad o código postal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-emerald-400 focus:bg-white"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">No se encontraron ciudades</p>
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
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-emerald-50"
              >
                <div>
                  <span className="font-medium text-slate-800">{city.name}</span>
                  <span className="ml-2 text-xs text-slate-400">{city.postal_code}</span>
                </div>
                {selectedCity?.id === city.id && (
                  <Check className="h-4 w-4 text-emerald-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
