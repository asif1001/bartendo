/**
 * Bar domain types.
 *
 * Drinks are expressed in INGREDIENTS, never in pump numbers — pumps are
 * just bottles on a shelf. The resolver (services/bar) maps ingredient →
 * pump at pour time from the live inventory.
 */

export type IngredientCategory = 'spirit' | 'mixer' | 'juice' | 'syrup';

export interface Ingredient {
  /** Stable id used across drinks, inventory and persistence. */
  id: string;
  name: string;
  category: IngredientCategory;
  /** Food-safe hint colour for chips and pump dots. */
  colour: string;
}

export type DrinkType = 'cocktail' | 'mocktail';

export interface DrinkDose {
  ingredientId: string;
  /** Millilitres at "standard" size. The UI lets the user scale/redefine. */
  ml: number;
}

export interface Drink {
  id: string;
  name: string;
  type: DrinkType;
  /** One-line description shown on the card. */
  blurb: string;
  /** Canonical recipe at standard dose. */
  recipe: DrinkDose[];
  tags: string[];
}

export interface ResolvedPump {
  pumpNo: number;
  ingredientId: string;
  ml: number;
  /** Milliseconds the pump must run (ml ÷ mlPerSec). */
  ms: number;
}

export interface PourPlan {
  drinkId: string;
  drinkName: string;
  /** All doses resolved; one entry per ingredient. */
  pumps: ResolvedPump[];
  /** Longest single-pump time = when the drink is complete. */
  totalMs: number;
}

export interface PumpConfig {
  /** 1–8, matches firmware convention. */
  pumpNo: number;
  /** Currently loaded ingredient id; null = empty shelf. */
  ingredientId: string | null;
  /** Measured flow rate in ml per second (calibration). */
  mlPerSec: number;
}

export interface InventorySnapshot {
  pumps: PumpConfig[];
}
