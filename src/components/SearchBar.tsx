import { Search, X } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface CategoryIcon {
  emoji: string;
}

const CATEGORY_ICONS: Record<string, CategoryIcon> = {
  Lácteos: { emoji: '🥛' },
  Frutas: { emoji: '🍎' },
  Limpieza: { emoji: '🧴' },
  Bebidas: { emoji: '💧' },
  Panadería: { emoji: '🍞' },
  Conservas: { emoji: '🥫' },
  Charcutería: { emoji: '🍖' },
  Despensa: { emoji: '🥫' },
  Snacks: { emoji: '🥔' },
};

function getCategoryEmoji(category: string): string {
  return CATEGORY_ICONS[category]?.emoji ?? '📦';
}

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (c: string) => void;
}

export function SearchBar({
  query,
  onQueryChange,
  categories,
  selectedCategory,
  onCategoryChange,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar productos..."
          className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 py-3.5 pl-12 pr-10 text-base text-white shadow-sm outline-none transition-all backdrop-blur-md placeholder:text-slate-500 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10"
        />
        {query && (
          <button
            onClick={() => onQueryChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        <button
          onClick={() => onCategoryChange('')}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-medium transition-all sm:py-2 ${
            selectedCategory === ''
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'border border-slate-800 bg-slate-900/60 text-slate-400 backdrop-blur-md hover:border-emerald-400/40 hover:text-emerald-400'
          }`}
        >
          <span className="text-base leading-none">🛒</span>
          <span>Todas</span>
        </button>
        {categories.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(active ? '' : cat)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-medium transition-all sm:py-2 ${
                active
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'border border-slate-800 bg-slate-900/60 text-slate-400 backdrop-blur-md hover:border-emerald-400/40 hover:text-emerald-400'
              }`}
            >
              <span className="text-base leading-none">{getCategoryEmoji(cat)}</span>
              <span>{cat}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
