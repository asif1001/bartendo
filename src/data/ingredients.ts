import type { Ingredient } from '../types/bar';

/**
 * The controlled ingredient vocabulary.
 * Every drink recipe and every pump entry references one of these ids.
 * Adding an ingredient here automatically makes it available in the
 * Shelves picker and the drink configurator.
 */
export const INGREDIENTS: Ingredient[] = [
  // ---- spirits ----
  { id: 'rum', name: 'Rum', category: 'spirit', colour: '#b45309' },
  { id: 'whisky', name: 'Whisky', category: 'spirit', colour: '#92400e' },
  { id: 'vodka', name: 'Vodka', category: 'spirit', colour: '#94a3b8' },
  { id: 'tequila', name: 'Tequila', category: 'spirit', colour: '#eab308' },
  { id: 'gin', name: 'Gin', category: 'spirit', colour: '#a3b7c4' },

  // ---- liqueurs (used in 2nd tier of the catalogue) ----
  { id: 'triple-sec', name: 'Triple Sec', category: 'liqueur', colour: '#f59e0b' },
  { id: 'blue-curacao', name: 'Blue Curaçao', category: 'liqueur', colour: '#2563eb' },
  { id: 'campari', name: 'Campari', category: 'liqueur', colour: '#dc2626' },
  { id: 'aperol', name: 'Aperol', category: 'liqueur', colour: '#f97316' },
  { id: 'vermouth-dry', name: 'Dry Vermouth', category: 'liqueur', colour: '#d1d5db' },
  { id: 'vermouth-sweet', name: 'Sweet Vermouth', category: 'liqueur', colour: '#a16207' },
  { id: 'amaretto', name: 'Amaretto', category: 'liqueur', colour: '#b45309' },
  { id: 'kahlua', name: 'Coffee Liqueur', category: 'liqueur', colour: '#4a2c1a' },
  { id: 'baileys', name: 'Irish Cream', category: 'liqueur', colour: '#c8a06a' },
  { id: 'peach-schnapps', name: 'Peach Schnapps', category: 'liqueur', colour: '#fb923c' },
  { id: 'banana-liqueur', name: 'Melon/Banana Liqueur', category: 'liqueur', colour: '#84cc16' },

  // ---- wine ----
  { id: 'champagne', name: 'Prosecco / Champagne', category: 'wine', colour: '#fde68a' },

  // ---- mixers ----
  { id: 'cola', name: 'Coca-Cola', category: 'mixer', colour: '#3f2412' },
  { id: 'sprite', name: 'Sprite', category: 'mixer', colour: '#bbf7d0' },
  { id: 'tonic', name: 'Tonic Water', category: 'mixer', colour: '#dbeafe' },
  { id: 'soda', name: 'Soda Water', category: 'mixer', colour: '#e0f2fe' },
  { id: 'ginger', name: 'Ginger Beer', category: 'mixer', colour: '#d97706' },
  { id: 'coconut', name: 'Coconut Milk', category: 'mixer', colour: '#fef9c3' },
  { id: 'water', name: 'Water', category: 'mixer', colour: '#bae6fd' },
  { id: 'cream', name: 'Cream', category: 'mixer', colour: '#fef3c7' },
  { id: 'lemonade', name: 'Lemonade', category: 'mixer', colour: '#fde047' },

  // ---- juices ----
  { id: 'orange', name: 'Orange Juice', category: 'juice', colour: '#f97316' },
  { id: 'cranberry', name: 'Cranberry Juice', category: 'juice', colour: '#be123c' },
  { id: 'lemon', name: 'Lemon Juice', category: 'juice', colour: '#fde047' },
  { id: 'lime', name: 'Lime Juice', category: 'juice', colour: '#84cc16' },
  { id: 'pineapple', name: 'Pineapple Juice', category: 'juice', colour: '#facc15' },
  { id: 'grapefruit', name: 'Grapefruit Juice', category: 'juice', colour: '#fb7185' },
  { id: 'apple', name: 'Apple Juice', category: 'juice', colour: '#eab308' },
  { id: 'peach', name: 'Peach Nectar', category: 'juice', colour: '#fda4af' },
  { id: 'tomato', name: 'Tomato Juice', category: 'juice', colour: '#dc2626' },

  // ---- syrups ----
  { id: 'grenadine', name: 'Grenadine', category: 'syrup', colour: '#9f1239' },
  { id: 'sugar', name: 'Sugar Syrup', category: 'syrup', colour: '#f8fafc' },
  { id: 'mint', name: 'Mint Syrup', category: 'syrup', colour: '#22c55e' },
];

export const INGREDIENT_MAP: Map<string, Ingredient> = new Map(
  INGREDIENTS.map((i) => [i.id, i]),
);

export function getIngredient(id: string): Ingredient {
  return INGREDIENT_MAP.get(id) ?? { id, name: id, category: 'mixer', colour: '#64748b' };
}
