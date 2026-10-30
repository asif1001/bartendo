import { useMemo, useState } from 'react';
import { Beer, Heart, Search, Sparkles } from 'lucide-react';
import type { BluetoothState } from '../services/bluetooth/BluetoothManager';
import { DRINKS, estimateABV } from '../data/drinks';
import { getIngredient } from '../data/ingredients';
import { resolveDrink } from '../services/bar/resolver';
import type { InventorySnapshot } from '../types/bar';
import { Card } from '../components/Card';
import { DrinkImage } from '../components/DrinkImage';
import { cn } from '../utils/format';

type CatalogFilter = 'cocktail' | 'mocktail' | 'favourites' | 'ready';

interface MenuPageProps {
  btState: BluetoothState;
  pumps: InventorySnapshot['pumps'];
  isFavourite: (drinkId: string) => boolean;
  toggleFavourite: (drinkId: string) => void;
  onOpenDrink: (drinkId: string) => void;
}

type Availability = { status: ReturnType<typeof resolveDrink>['status']; missing: string[] };

/** Screen — the drink menu (cocktails / mocktails / favourites). */
export function MenuPage({ btState, pumps, isFavourite, toggleFavourite, onOpenDrink }: MenuPageProps) {
  const [filter, setFilter] = useState<CatalogFilter>('cocktail');
  const [search, setSearch] = useState('');

  const inventory: InventorySnapshot = { pumps };

  const resolutions = useMemo(() => {
    const map = new Map<string, Availability>();
    DRINKS.forEach((drink) => {
      const r = resolveDrink(drink, inventory);
      map.set(drink.id, { status: r.status as Availability['status'], missing: r.missing });
    });
    return map;
  }, [inventory]);

  const visible = useMemo(() => {
    let list = DRINKS.filter((d) => {
      if (filter === 'cocktail') return d.type === 'cocktail';
      if (filter === 'mocktail') return d.type === 'mocktail';
      if (filter === 'favourites') return isFavourite(d.id);
      if (filter === 'ready') return resolutions.get(d.id)?.status === 'ok';
      return true;
    });
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.tags.some((t) => t.includes(q)) ||
          d.recipe.some((r) => getIngredient(r.ingredientId).name.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [filter, search, isFavourite, resolutions]);

  const readyCount = DRINKS.filter((d) => resolutions.get(d.id)?.status === 'ok').length;

  return (
    <div className="animate-rise space-y-4">
      {/* Status strip */}
      <Card className="!p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Beer className="h-5 w-5 text-sky-400" />
            <div>
              <p className="text-[15px] font-black">The Bar</p>
              <p className="text-[11px] text-text-muted">
                {readyCount} of {DRINKS.length} drinks pourable with your loaded bottles
              </p>
            </div>
          </div>
          <div className={cn('rounded-full px-3 py-1.5 text-[11px] font-bold', btState.connectionState === 'connected' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-surface-2 text-text-muted')}>
            {btState.connectionState === 'connected' ? 'MACHINE ONLINE' : 'OFFLINE'}
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search drinks or ingredients…"
          className="h-12 w-full rounded-2xl border border-outline bg-surface pl-11 pr-4 text-[15px] text-text outline-none transition focus:border-sky-400/60"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-4 gap-2">
        {([
          { id: 'cocktail', label: 'Cocktails' },
          { id: 'mocktail', label: 'Mocktails' },
          { id: 'favourites', label: '★ Faves' },
          { id: 'ready', label: 'Ready now' },
        ] as const).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'h-10 rounded-xl text-[12px] font-bold transition',
              filter === f.id ? 'bg-sky-500 text-slate-950' : 'bg-surface text-text-muted border border-outline',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {visible.length === 0 && (
        <Card>
          <p className="py-6 text-center text-[13px] text-text-muted">
            {filter === 'favourites'
              ? 'No favourites yet — tap the heart on any drink.'
              : 'No drinks match your search.'}
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {visible.map((drink) => {
          const r = resolutions.get(drink.id);
          const available = r?.status === 'ok';
          const partial = r?.status === 'partial';
          return (
            <Card key={drink.id} className={cn('!p-4 transition', !available && !partial && 'opacity-60')}>
              <button type="button" onClick={() => onOpenDrink(drink.id)} className="flex w-full items-start justify-between gap-3 text-left">
                <div className="flex min-w-0 gap-3">
                  <DrinkImage
                    src={drink.image}
                    alt={drink.name}
                    className="h-16 w-16 shrink-0 rounded-2xl border border-outline-soft"
                  />
                  <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[16px] font-black text-text">{drink.name}</span>
                    <span className="rounded-full bg-outline/60 px-2 py-0.5 text-[10px] font-bold text-text-muted uppercase">
                      {drink.type === 'cocktail' ? `ABV ~${estimateABV(drink)}%` : '0%'}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-text-muted">{drink.blurb}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {drink.recipe.map((dose) => {
                      const ing = getIngredient(dose.ingredientId);
                      return (
                        <span
                          key={dose.ingredientId}
                          className="flex items-center gap-1 rounded-full border border-outline-soft bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-text"
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ing.colour }} />
                          {ing.name} {dose.ml}ml
                        </span>
                      );
                    })}
                  </div>
                  </div>
                  </div>
                <div
                  className={cn(
                    'mt-1 shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase',
                    available ? 'bg-emerald-500/15 text-emerald-300' : partial ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300',
                  )}
                >
                  {available ? 'Ready' : partial ? 'Missing mix' : 'Load bottle'}
                </div>
              </button>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-text-muted">
                  ≈ {Math.round(totalVolume(drink.recipe) / 30)} cl · {drink.recipe.length} ingredients
                </span>
                <button
                  type="button"
                  aria-label={isFavourite(drink.id) ? 'Remove favourite' : 'Add favourite'}
                  onClick={() => toggleFavourite(drink.id)}
                  className="rounded-full bg-surface-2 p-2 transition active:scale-90"
                >
                  <Heart className={cn('h-4 w-4', isFavourite(drink.id) ? 'fill-rose-400 text-rose-400' : 'text-text-muted')} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="!p-4">
        <div className="flex items-start gap-2 text-[12px] text-text-muted">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
          <p>
            Drinks are defined by <b>ingredients</b> — never by pump numbers. Swap
            bottles on any pump and the whole menu updates itself.
          </p>
        </div>
      </Card>
    </div>
  );
}

function totalVolume(recipe: Array<{ ml: number }>): number {
  return recipe.reduce((s, r) => s + r.ml, 0);
}
