import { useMemo, useState } from 'react';
import { Filter, Heart, Search, Sparkles } from 'lucide-react';
import { DRINKS, estimateABV } from '../data/drinks';
import { getIngredient } from '../data/ingredients';
import { resolveDrink } from '../services/bar/resolver';
import type { InventorySnapshot } from '../types/bar';
import { Card } from '../components/Card';
import { DrinkImage } from '../components/DrinkImage';
import { cn } from '../utils/format';

type CatalogFilter = 'cocktail' | 'mocktail' | 'favourites' | 'ready';

interface MenuPageProps {
  pumps: InventorySnapshot['pumps'];
  isFavourite: (drinkId: string) => boolean;
  toggleFavourite: (drinkId: string) => void;
  onOpenDrink: (drinkId: string) => void;
}

type Availability = { status: ReturnType<typeof resolveDrink>['status']; missing: string[] };

/** Screen — the drink menu (cocktails / mocktails / favourites). */
export function MenuPage({ pumps, isFavourite, toggleFavourite, onOpenDrink }: MenuPageProps) {
  const [filter, setFilter] = useState<CatalogFilter>('cocktail');
  const [search, setSearch] = useState('');
  /** When bottles are loaded, the menu defaults to only pourable drinks. */
  const [showAll, setShowAll] = useState(false);

  const inventory: InventorySnapshot = { pumps };
  const loadedCount = pumps.filter((p) => p.ingredientId !== null).length;

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
    // Shelf-aware menu: hide drinks the loaded bottles can't make yet.
    if (!showAll && loadedCount > 0) {
      list = list.filter((d) => resolutions.get(d.id)?.status === 'ok');
    }
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
  }, [filter, search, isFavourite, resolutions, showAll, loadedCount]);

  const readyCount = DRINKS.filter((d) => resolutions.get(d.id)?.status === 'ok').length;

  /** Featured rail: photo cards — ready ones first, otherwise the house classics. */
  const { picks, picksAreReady } = useMemo(() => {
    const imaged = DRINKS.filter((d) => d.image);
    const ready = imaged.filter((d) => resolutions.get(d.id)?.status === 'ok');
    if (loadedCount > 0 && ready.length > 0) return { picks: ready.slice(0, 8), picksAreReady: true };
    const fallback = loadedCount > 0 ? imaged.filter((d) => resolutions.get(d.id)?.status === 'partial') : [];
    return { picks: (fallback.length > 0 ? fallback : imaged).slice(0, 8), picksAreReady: false };
  }, [resolutions, loadedCount]);

  return (
    <div className="animate-rise space-y-4">
      {/* Featured picks — first thing you see when bottles are loaded */}
      {picks.length > 0 && (
        <section aria-label="Featured drinks">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="font-display text-[16px] font-semibold tracking-wide">{picksAreReady ? 'Tonight’s picks' : 'House signatures'}</h2>
            <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase">
              {picksAreReady ? 'Fresh from your shelf' : 'Add bottles to unlock more'}
            </span>
          </div>
          <div className="no-scrollbar snap-rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {picks.map((drink) => (
              <button
                key={drink.id}
                type="button"
                onClick={() => onOpenDrink(drink.id)}
                className="relative h-44 w-32 shrink-0 overflow-hidden rounded-3xl border border-outline-soft shadow-[0_14px_35px_-12px_rgb(0_0_0/0.6)] transition active:scale-[0.97]"
              >
                <DrinkImage
                  src={drink.image}
                  alt={drink.name}
                  className="absolute inset-0 h-full w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-2.5 text-left">
                  <p className="font-display truncate text-[13px] font-semibold text-white">
                    {drink.name}
                  </p>
                  <p className="text-[10px] font-semibold text-white/70">
                    {drink.type === 'cocktail' ? `~${estimateABV(drink)}%` : '0%'} · {drink.recipe.length} ingredients
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

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

      {/* Shelf-aware filter toggle */}
      {loadedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className={cn(
            'flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-[12px] font-bold transition active:scale-[0.98]',
            showAll
              ? 'border-outline bg-surface text-text-muted'
              : 'border-sky-400/40 bg-sky-500/10 text-sky-300',
          )}
        >
          <Filter className={cn('h-4 w-4', !showAll && 'text-sky-400')} />
          {showAll
            ? `Browsing all ${DRINKS.length} drinks`
            : `Showing the ${readyCount} drinks you can mix — tap to browse all`}
        </button>
      )}

      {/* Search */}
      {visible.length === 0 && (
        <Card>
          <p className="py-6 text-center text-[13px] text-text-muted">
            {filter === 'favourites'
              ? 'No favourites yet — tap the heart on any drink.'
              : loadedCount > 0 && !showAll
                ? 'Nothing pourable in this tab yet — load matching bottles in Shelves or browse the whole menu.'
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
                <div className="flex min-w-0 gap-3.5">
                  <DrinkImage
                    src={drink.image}
                    alt={drink.name}
                    className="h-[76px] w-[76px] shrink-0 rounded-[20px] border border-outline-soft"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display truncate text-[17px] font-semibold leading-snug text-text">
                        {drink.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-outline/60 px-2 py-0.5 text-[9px] font-bold tracking-wide text-text-muted uppercase">
                        {drink.type === 'cocktail' ? `${estimateABV(drink)}%` : '0%'}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-text-muted">{drink.blurb}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {drink.recipe.slice(0, 3).map((dose) => {
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
                      {drink.recipe.length > 3 && (
                        <span className="rounded-full border border-outline-soft bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                          +{drink.recipe.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    'mt-1 shrink-0 rounded-full px-2 py-1 text-[9px] font-black tracking-widest uppercase',
                    available ? 'bg-emerald-500/15 text-emerald-300' : partial ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300',
                  )}
                >
                  {available ? 'Ready' : partial ? 'Short' : 'Load'}
                </span>
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
