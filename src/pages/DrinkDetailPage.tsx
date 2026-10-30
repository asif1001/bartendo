import { useMemo, useState } from 'react';
import { ArrowLeft, PlayCircle, TriangleAlert, Zap } from 'lucide-react';
import type { BluetoothManager, BluetoothState } from '../services/bluetooth/BluetoothManager';
import { getIngredient } from '../data/ingredients';
import { estimateABV } from '../data/drinks';
import { resolveDoses, totalMl } from '../services/bar/resolver';
import type { Drink, DrinkDose, InventorySnapshot, PourPlan } from '../types/bar';
import { Card } from '../components/Card';
import { cn } from '../utils/format';

interface DrinkDetailPageProps {
  manager: BluetoothManager;
  btState: BluetoothState;
  drink: Drink;
  pumps: InventorySnapshot['pumps'];
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
  onBack: () => void;
  onStartPour: (plan: PourPlan, doses: DrinkDose[]) => void;
}

const SIZE_MULTIPLIERS: Array<{ label: string; factor: number }> = [
  { label: 'Short ×½', factor: 0.5 },
  { label: 'Standard', factor: 1 },
  { label: 'Long ×1½', factor: 1.5 },
  { label: 'Double ×2', factor: 2 },
];

const PRESET_ML = [30, 45, 60, 90];

/** Screen — configure doses and resolve the pump plan before pouring. */
export function DrinkDetailPage({ manager, btState, drink, pumps, notify, onBack, onStartPour }: DrinkDetailPageProps) {
  const [doses, setDoses] = useState<DrinkDose[]>(drink.recipe.map((d) => ({ ...d })));
  const [scale, setScale] = useState(1);

  const connected = btState.connectionState === 'connected';
  const inventory: InventorySnapshot = { pumps };

  const resolution = useMemo(() => resolveDoses(drink, doses, inventory), [drink, doses, inventory]);
  void manager;
  void notify; // driven by parent callback; kept for symmetry with other pages

  const changeDose = (ingredientId: string, ml: number) => {
    setDoses((prev) => prev.map((d) => (d.ingredientId === ingredientId ? { ...d, ml } : d)));
  };

  const applySize = (factor: number) => {
    setScale(factor);
    setDoses((prev) =>
      prev.map((d) => ({ ...d, ml: Math.min(200, Math.round(drink.recipe.find((r) => r.ingredientId === d.ingredientId)!.ml * factor)) })),
    );
  };

  const start = () => {
    if (!connected) {
      notify('error', 'Connect the machine on the Menu tab header first.');
      return;
    }
    if (resolution.status !== 'ok' || !resolution.plan) {
      notify('error', `Cannot pour — missing: ${resolution.missing.map((m) => getIngredient(m).name).join(', ')}`);
      return;
    }
    onStartPour(resolution.plan, doses);
  };

  return (
    <div className="animate-rise space-y-4">
      <div className="flex items-center gap-3">        <button
          type="button"
          onClick={onBack}
          aria-label="Back to menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline bg-surface transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-black">{drink.name}</h2>
          <p className="text-[12px] text-text-muted">
            {drink.type === 'cocktail' ? `Cocktail · ABV ~${estimateABV(drink)}%` : 'Mocktail · 0%'} · {Math.round(totalMl(doses))} ml total
          </p>
        </div>
      </div>

      <Card>
        <p className="text-[13px] text-text-muted">{drink.blurb}</p>
      </Card>

      {/* Sizes */}
      <Card>
        <p className="mb-3 text-[11px] font-bold tracking-widest text-text-muted uppercase">Glass size</p>
        <div className="grid grid-cols-4 gap-2">
          {SIZE_MULTIPLIERS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => applySize(s.factor)}
              className={cn(
                'h-16 rounded-2xl border text-[12px] font-bold leading-tight transition active:scale-95',
                scale === s.factor ? 'border-sky-400/70 bg-sky-500/15 text-sky-300' : 'border-outline bg-surface-2 text-text-muted',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Per-ingredient dosing */}
      <Card>
        <p className="mb-3 text-[11px] font-bold tracking-widest text-text-muted uppercase">Ingredients</p>
        <div className="space-y-4">
          {doses.map((dose) => {
            const ing = getIngredient(dose.ingredientId);
            return (
              <div key={dose.ingredientId}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[14px] font-bold">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ing.colour }} />
                    {ing.name}
                  </span>
                  <span className="font-mono text-[14px] font-bold text-sky-300">{dose.ml} ml</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {PRESET_ML.map((ml) => (
                    <button
                      key={ml}
                      type="button"
                      onClick={() => changeDose(dose.ingredientId, ml)}
                      className={cn(
                        'h-9 rounded-lg text-[12px] font-bold transition active:scale-95',
                        dose.ml === ml ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/50' : 'bg-surface-2 text-text-muted',
                      )}
                    >
                      {ml}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  className="slider mt-1"
                  min={10}
                  max={200}
                  step={5}
                  value={dose.ml}
                  onChange={(e) => changeDose(dose.ingredientId, Number(e.target.value))}
                  style={{ '--track-accent': ing.colour, '--track-progress': `${((dose.ml - 10) / 190) * 100}%` } as React.CSSProperties}
                  aria-label={`${ing.name} amount`}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Resolution preview */}
      <Card>
        <p className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-widest text-text-muted uppercase">
          <Zap className="h-3.5 w-3.5 text-amber-300" /> Pump plan
        </p>
        {resolution.status === 'ok' && resolution.plan ? (
          <div className="space-y-1.5">
            {resolution.plan.pumps.map((p) => (
              <div key={p.pumpNo} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getIngredient(p.ingredientId).colour }} />
                  {getIngredient(p.ingredientId).name} ({p.ml} ml)
                </span>
                <span className="font-mono text-[12px] text-text-muted">Pump {p.pumpNo} · {(p.ms / 1000).toFixed(1)}s</span>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between border-t border-outline-soft pt-3 text-[13px] font-bold">
              <span>Serve ready in</span>
              <span className="text-emerald-300">≈ {Math.ceil(resolution.plan.totalMs / 1000)}s</span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-[12px] text-amber-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Load these bottles in any pump first:{' '}
              <b>{resolution.missing.map((m) => getIngredient(m).name).join(', ')}</b>
              {' '}— then tap Shelves and assign them.
            </span>
          </div>
        )}
      </Card>

      <button
        type="button"
        disabled={resolution.status !== 'ok' || !resolution.plan}
        onClick={start}
        className="flex h-16 w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-b from-sky-400 to-sky-600 text-lg font-black text-slate-950 shadow-xl shadow-sky-500/30 transition active:scale-[0.97] disabled:opacity-40"
      >
        <PlayCircle className="h-7 w-7" strokeWidth={2.4} />
        POUR DRINK
      </button>
    </div>
  );
}
