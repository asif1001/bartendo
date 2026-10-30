/**
 * Bar resolver — the heart of the bartender.
 *
 * Drinks declare ingredients; the live inventory says which pump holds what.
 * resolvePour() turns a dose list into a synchronized multi-pump plan
 * (`POUR:1:9000,3:1200,…`), or explains exactly why a drink can't be made.
 */

import type { Drink, DrinkDose, InventorySnapshot, PourPlan, PumpConfig, ResolvedPump } from '../../types/bar';
import { POUR_MIN_MS, POUR_MAX_MS } from '../bluetooth/BLECommands';

export interface Resolution {
  status: 'ok' | 'partial' | 'unavailable';
  plan: PourPlan | null;
  /** Ingredients with no pump holding them right now. */
  missing: string[];
}

const clampPour = (ms: number): number => Math.min(POUR_MAX_MS, Math.max(POUR_MIN_MS, Math.round(ms)));

/** Resolve doses (ml already customized) against the shelf. */
export function resolveDoses(
  drink: Pick<Drink, 'id' | 'name'>,
  doses: DrinkDose[],
  inventory: InventorySnapshot,
): Resolution {
  const byIngredient = new Map<number, PumpConfig>();
  inventory.pumps.forEach((p) => {
    if (p.ingredientId !== null && p.mlPerSec > 0) {
      byIngredient.set(p.pumpNo, p);
    }
  });

  const ingredientToPumps = new Map<string, PumpConfig[]>();
  byIngredient.forEach((pump, _pumpNo) => {
    const id = pump.ingredientId!;
    const list = ingredientToPumps.get(id) ?? [];
    list.push(pump);
    ingredientToPumps.set(id, list);
  });

  const missing: string[] = [];
  const pumps: ResolvedPump[] = [];

  for (const dose of doses) {
    if (dose.ml <= 0) continue;
    const candidates = ingredientToPumps.get(dose.ingredientId);
    if (!candidates || candidates.length === 0) {
      missing.push(dose.ingredientId);
      continue;
    }
    // Policy v1: first loaded pump wins (lowest pumpNo deterministically).
    const chosen = candidates.sort((a, b) => a.pumpNo - b.pumpNo)[0];
    const mlPerSec = Math.max(0.1, chosen.mlPerSec);
    pumps.push({
      pumpNo: chosen.pumpNo,
      ingredientId: dose.ingredientId,
      ml: dose.ml,
      ms: clampPour((dose.ml / mlPerSec) * 1000),
    });
  }

  if (missing.length > 0 && pumps.length === 0) {
    return { status: 'unavailable', plan: null, missing };
  }
  if (missing.length > 0) {
    return { status: 'partial', plan: null, missing };
  }

  const totalMs = pumps.reduce((max, p) => Math.max(max, p.ms), 0);
  return {
    status: 'ok',
    plan: {
      drinkId: drink.id,
      drinkName: drink.name,
      pumps,
      totalMs,
    },
    missing: [],
  };
}

/** Convenience: resolve straight from a drink at standard doses. */
export function resolveDrink(drink: Drink, inventory: InventorySnapshot): Resolution {
  return resolveDoses(drink, drink.recipe, inventory);
}

/** Estimated volume already prepared since `sizeMl` quantities are editable. */
export function totalMl(doses: DrinkDose[]): number {
  return doses.reduce((sum, d) => sum + Math.max(0, d.ml), 0);
}
