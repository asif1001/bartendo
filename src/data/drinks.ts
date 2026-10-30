import type { Drink } from '../types/bar';

/**
 * Phase-1 curated catalogue (25 drinks).
 * All doses are millilitres at "standard" size; the configurator can
 * rescale (short/standard/long/double) or set custom amounts per dose.
 *
 * Only ingredients from data/ingredients.ts may appear here.
 */
export const DRINKS: Drink[] = [
  // ============================ COCKTAILS (12) ============================
  {
    id: 'cuba-libre',
    name: 'Cuba Libre',
    type: 'cocktail',
    blurb: 'Rum, cola and a squeeze of lime — the tie-breaker of cocktail history.',
    recipe: [
      { ingredientId: 'rum', ml: 45 },
      { ingredientId: 'cola', ml: 120 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['rum', 'tall', 'classic'],
  },
  {
    id: 'whisky-coke',
    name: 'Whisky Coke',
    type: 'cocktail',
    blurb: 'Dublin simplicity: two ingredients, zero debate.',
    recipe: [
      { ingredientId: 'whisky', ml: 45 },
      { ingredientId: 'cola', ml: 120 },
    ],
    tags: ['whisky', 'tall'],
  },
  {
    id: 'screwdriver',
    name: 'Screwdriver',
    type: 'cocktail',
    blurb: 'Breakfast orange juice with a Russian accent.',
    recipe: [
      { ingredientId: 'vodka', ml: 45 },
      { ingredientId: 'orange', ml: 120 },
    ],
    tags: ['vodka', 'brunch'],
  },
  {
    id: 'vodka-sprite',
    name: 'Vodka Sprite',
    type: 'cocktail',
    blurb: 'Crisp, clean, carbonated. The midnight default.',
    recipe: [
      { ingredientId: 'vodka', ml: 45 },
      { ingredientId: 'sprite', ml: 120 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['vodka', 'tall'],
  },
  {
    id: 'tequila-sunrise',
    name: 'Tequila Sunrise',
    type: 'cocktail',
    blurb: 'Grenadine sinks, orange shines — a sunset you can drink.',
    recipe: [
      { ingredientId: 'tequila', ml: 45 },
      { ingredientId: 'orange', ml: 90 },
      { ingredientId: 'grenadine', ml: 15 },
    ],
    tags: ['tequila', 'tall', 'layered'],
  },
  {
    id: 'gin-tonic',
    name: 'Gin & Tonic',
    type: 'cocktail',
    blurb: 'Colonial Fever-Remedy, perfected.',
    recipe: [
      { ingredientId: 'gin', ml: 45 },
      { ingredientId: 'tonic', ml: 120 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['gin', 'dry'],
  },
  {
    id: 'moscow-mule',
    name: 'Moscow Mule',
    type: 'cocktail',
    blurb: 'Vodka, lime and a ginger-bite.',
    recipe: [
      { ingredientId: 'vodka', ml: 45 },
      { ingredientId: 'lime', ml: 15 },
      { ingredientId: 'ginger', ml: 120 },
    ],
    tags: ['vodka', 'spicy'],
  },
  {
    id: 'rum-pineapple',
    name: 'Rum Pineapple',
    type: 'cocktail',
    blurb: 'Beach in a glass, no sand included.',
    recipe: [
      { ingredientId: 'rum', ml: 45 },
      { ingredientId: 'pineapple', ml: 120 },
    ],
    tags: ['rum', 'tropical'],
  },
  {
    id: 'vodka-cranberry',
    name: 'Cape Codder',
    type: 'cocktail',
    blurb: 'Vodka + cranberry. Cape Cod in two pours.',
    recipe: [
      { ingredientId: 'vodka', ml: 45 },
      { ingredientId: 'cranberry', ml: 120 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['vodka', 'tart'],
  },
  {
    id: 'sunset-rum',
    name: 'Beach Sunset',
    type: 'cocktail',
    blurb: 'Two spirits, orange and a grenadine horizon.',
    recipe: [
      { ingredientId: 'vodka', ml: 30 },
      { ingredientId: 'rum', ml: 30 },
      { ingredientId: 'orange', ml: 60 },
      { ingredientId: 'grenadine', ml: 10 },
    ],
    tags: ['rum', 'vodka', 'layered'],
  },
  {
    id: 'ginger-whisky',
    name: 'Ginger Whisky',
    type: 'cocktail',
    blurb: 'Whisky warm-up with a ginger burn.',
    recipe: [
      { ingredientId: 'whisky', ml: 45 },
      { ingredientId: 'ginger', ml: 90 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['whisky', 'spicy'],
  },
  {
    id: 'tequila-sprite',
    name: 'Tequila Sprite',
    type: 'cocktail',
    blurb: 'Lime-forward highball with tequila backbone.',
    recipe: [
      { ingredientId: 'tequila', ml: 45 },
      { ingredientId: 'sprite', ml: 120 },
      { ingredientId: 'lime', ml: 15 },
    ],
    tags: ['tequila', 'tall'],
  },

  // ============================ MOCKTAILS (13) ============================
  {
    id: 'virgin-mojito',
    name: 'Virgin Mojito',
    type: 'mocktail',
    blurb: 'Mint, lime and sparkle — the mocktail benchmark.',
    recipe: [
      { ingredientId: 'lime', ml: 20 },
      { ingredientId: 'mint', ml: 10 },
      { ingredientId: 'sugar', ml: 15 },
      { ingredientId: 'sprite', ml: 130 },
    ],
    tags: ['mint', 'sparkling'],
  },
  {
    id: 'shirley-temple',
    name: 'Shirley Temple',
    type: 'mocktail',
    blurb: 'Grenadine, lime and fizz — cinema sweet.',
    recipe: [
      { ingredientId: 'grenadine', ml: 15 },
      { ingredientId: 'sprite', ml: 120 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['sweet', 'kids'],
  },
  {
    id: 'virgin-pina-colada',
    name: 'Virgin Piña Colada',
    type: 'mocktail',
    blurb: 'Coconut cream and pineapple — escape without the rum.',
    recipe: [
      { ingredientId: 'pineapple', ml: 90 },
      { ingredientId: 'coconut', ml: 60 },
    ],
    tags: ['tropical', 'creamy'],
  },
  {
    id: 'fruit-punch',
    name: 'Fruit Punch',
    type: 'mocktail',
    blurb: 'Pineapple, orange and a grenadine wink.',
    recipe: [
      { ingredientId: 'pineapple', ml: 60 },
      { ingredientId: 'orange', ml: 60 },
      { ingredientId: 'grenadine', ml: 10 },
    ],
    tags: ['party', 'sweet'],
  },
  {
    id: 'virgin-mary',
    name: 'Virgin Mary',
    type: 'mocktail',
    blurb: 'Tomato juice with lemon bite — Bloody Mary off duty.',
    recipe: [
      { ingredientId: 'tomato', ml: 120 },
      { ingredientId: 'lemon', ml: 15 },
    ],
    tags: ['savory'],
  },
  {
    id: 'lemon-punch',
    name: 'Lemon Lime Punch',
    type: 'mocktail',
    blurb: 'Fresh lemon, syrup and soda for balance.',
    recipe: [
      { ingredientId: 'lemon', ml: 20 },
      { ingredientId: 'sugar', ml: 10 },
      { ingredientId: 'soda', ml: 120 },
    ],
    tags: ['citrus', 'refreshing'],
  },
  {
    id: 'ginger-fizz',
    name: 'Ginger Lime Fizz',
    type: 'mocktail',
    blurb: 'Ginger beer with a lime snap.',
    recipe: [
      { ingredientId: 'ginger', ml: 120 },
      { ingredientId: 'lime', ml: 15 },
    ],
    tags: ['spicy', 'quick'],
  },
  {
    id: 'orange-fizz',
    name: 'Orange Fizz',
    type: 'mocktail',
    blurb: 'Orange juice lifted by soda bubbles.',
    recipe: [
      { ingredientId: 'orange', ml: 90 },
      { ingredientId: 'soda', ml: 60 },
    ],
    tags: ['brunch', 'easy'],
  },
  {
    id: 'cranberry-cooler',
    name: 'Cranberry Cooler',
    type: 'mocktail',
    blurb: 'Cranberry lengthened with sprite and lime.',
    recipe: [
      { ingredientId: 'cranberry', ml: 90 },
      { ingredientId: 'sprite', ml: 60 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['tart', 'refreshing'],
  },
  {
    id: 'tropical-sunset',
    name: 'Tropical Sunset',
    type: 'mocktail',
    blurb: 'Layered pineapple-orange with grenadine base.',
    recipe: [
      { ingredientId: 'pineapple', ml: 60 },
      { ingredientId: 'orange', ml: 40 },
      { ingredientId: 'grenadine', ml: 15 },
    ],
    tags: ['layered', 'pretty'],
  },
  {
    id: 'lime-water',
    name: 'Citrus Water',
    type: 'mocktail',
    blurb: 'The palate-cleansing classic: lime and still water.',
    recipe: [
      { ingredientId: 'lime', ml: 15 },
      { ingredientId: 'water', ml: 130 },
    ],
    tags: ['light', 'zero-sugar'],
  },
  {
    id: 'sunrise-fizz',
    name: 'Sprite Sunrise',
    type: 'mocktail',
    blurb: 'Fizzy orange-grenadine gradient.',
    recipe: [
      { ingredientId: 'sprite', ml: 120 },
      { ingredientId: 'orange', ml: 30 },
      { ingredientId: 'grenadine', ml: 15 },
    ],
    tags: ['sweet', 'sparkling'],
  },
  {
    id: 'coconut-pineapple',
    name: 'Coconut Pineapple',
    type: 'mocktail',
    blurb: 'Two-ingredient island cooler.',
    recipe: [
      { ingredientId: 'pineapple', ml: 90 },
      { ingredientId: 'coconut', ml: 40 },
    ],
    tags: ['tropical', 'creamy'],
  },
];

/** Rough header strength shown on cocktail cards (ABV% of the whole drink). */
export function estimateABV(drink: Drink): number {
  let spiritMl = 0;
  let totalMl = 0;
  for (const dose of drink.recipe) {
    totalMl += dose.ml;
    if (dose.ingredientId === 'rum' || dose.ingredientId === 'whisky' ||
        dose.ingredientId === 'vodka' || dose.ingredientId === 'tequila' ||
        dose.ingredientId === 'gin') {
      spiritMl += dose.ml;
    }
  }
  if (totalMl === 0) return 0;
  return Math.round(((spiritMl * 0.4) / totalMl) * 100);
}
