import type { Drink } from '../types/bar';
import { INGREDIENT_MAP } from './ingredients';
import { DRINKS_DB, DRINKS_DB_IMAGES } from './generated/drinksDb';

/**
 * Locally curated catalogue (recipes written to work perfectly with the
 * 8-pump machine). The API-sourced catalogue in generated/drinksDb.ts is
 * merged after these; curated wins on id collisions.
 */
const CURATED_DRINKS: Drink[] = [
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

  /* ================= BAR BASICS — simple serves ==================
   * Every bottle on the shelf should be able to make something on
   * its own. These are the no-fuss bartender standards: spirit (or
   * fruit) with water, soda, lemonade or a single juice.            */
  { // whisky + still water — thedistilled original
    id: 'whisky-water',
    name: 'Whisky Water',
    type: 'cocktail',
    blurb: 'Neat whisky, lengthened with still water.',
    recipe: [
      { ingredientId: 'whisky', ml: 45 },
      { ingredientId: 'water', ml: 90 },
    ],
    tags: ['whisky', 'light', 'easy'],
  },
  {
    id: 'whisky-soda',
    name: 'Whisky Highball',
    type: 'cocktail',
    blurb: 'The classic after-work serve: whisky over soda.',
    recipe: [
      { ingredientId: 'whisky', ml: 45 },
      { ingredientId: 'soda', ml: 120 },
    ],
    tags: ['whisky', 'easy', 'fizz'],
  },
  {
    id: 'rum-water',
    name: 'Rum Water',
    type: 'cocktail',
    blurb: 'Old sailor style — rum cut with still water.',
    recipe: [
      { ingredientId: 'rum', ml: 45 },
      { ingredientId: 'water', ml: 90 },
    ],
    tags: ['rum', 'light', 'easy'],
  },
  {
    id: 'vodka-soda-serve',
    name: 'Vodka Soda',
    type: 'cocktail',
    blurb: 'Two ingredients, zero sugar, always cool.',
    recipe: [
      { ingredientId: 'vodka', ml: 45 },
      { ingredientId: 'soda', ml: 120 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['vodka', 'zero-sugar', 'easy'],
  },
  {
    id: 'vodka-water',
    name: 'Vodka Water',
    type: 'cocktail',
    blurb: 'The leanest of them all, with a lime snap.',
    recipe: [
      { ingredientId: 'vodka', ml: 45 },
      { ingredientId: 'water', ml: 120 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['vodka', 'light', 'zero-sugar'],
  },
  {
    id: 'gin-soda-serve',
    name: 'Gin Highball',
    type: 'cocktail',
    blurb: 'Gin over sparking soda, lime as the middleman.',
    recipe: [
      { ingredientId: 'gin', ml: 45 },
      { ingredientId: 'soda', ml: 120 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['gin', 'easy', 'fizz'],
  },
  {
    id: 'gin-lemon-serve',
    name: 'Gin Lemonade',
    type: 'cocktail',
    blurb: 'London lemonade — lemonade carries the gin.',
    recipe: [
      { ingredientId: 'gin', ml: 45 },
      { ingredientId: 'lemonade', ml: 120 },
    ],
    tags: ['gin', 'easy', 'citrus'],
  },
  {
    id: 'vodka-lemonade',
    name: 'Vodka Lemonade',
    type: 'cocktail',
    blurb: 'House-party lawn mop. Sweet, cool, easy.',
    recipe: [
      { ingredientId: 'vodka', ml: 45 },
      { ingredientId: 'lemonade', ml: 120 },
    ],
    tags: ['vodka', 'easy', 'citrus'],
  },
  {
    id: 'rum-lemonade',
    name: 'Rum Lemonade',
    type: 'cocktail',
    blurb: 'Caribbean lemonade — rum making it shine.',
    recipe: [
      { ingredientId: 'rum', ml: 45 },
      { ingredientId: 'lemonade', ml: 120 },
    ],
    tags: ['rum', 'easy', 'citrus'],
  },
  {
    id: 'vodka-tonic-serve',
    name: 'Vodka Tonic',
    type: 'cocktail',
    blurb: 'Gin-fresh but neutral — quinine meets calcium.',
    recipe: [
      { ingredientId: 'vodka', ml: 45 },
      { ingredientId: 'tonic', ml: 120 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['vodka', 'easy', 'dry'],
  },
  {
    id: 'tequila-grapefruit',
    name: 'Tequila Grapefruit',
    type: 'cocktail',
    blurb: 'A squeeze of Paloma spirit without the soda.',
    recipe: [
      { ingredientId: 'tequila', ml: 45 },
      { ingredientId: 'grapefruit', ml: 120 },
    ],
    tags: ['tequila', 'easy', 'citrus'],
  },
  {
    id: 'tequila-orange',
    name: 'Tequila Orange',
    type: 'cocktail',
    blurb: 'Sunrise without the gradient — citrus straight up.',
    recipe: [
      { ingredientId: 'tequila', ml: 45 },
      { ingredientId: 'orange', ml: 120 },
    ],
    tags: ['tequila', 'easy', 'brunch'],
  },
  {
    id: 'vodka-apple',
    name: 'Vodka Apple',
    type: 'cocktail',
    blurb: 'Crisp apple squash meets neutral vodka.',
    recipe: [
      { ingredientId: 'vodka', ml: 45 },
      { ingredientId: 'apple', ml: 120 },
    ],
    tags: ['vodka', 'easy', 'sweet'],
  },
  {
    id: 'rum-ginger',
    name: 'Rum Ginger',
    type: 'cocktail',
    blurb: 'Dark rum over ginger beer — stormy relative.',
    recipe: [
      { ingredientId: 'rum', ml: 45 },
      { ingredientId: 'ginger', ml: 120 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['rum', 'easy', 'spicy'],
  },
  // ---- bar basics: mocktails ----
  {
    id: 'apple-soda',
    name: 'Apple Fizz',
    type: 'mocktail',
    blurb: 'Apple juice over soda — orchard bubbles.',
    recipe: [
      { ingredientId: 'apple', ml: 120 },
      { ingredientId: 'soda', ml: 60 },
    ],
    tags: ['easy', 'fizz'],
  },
  {
    id: 'peach-soda',
    name: 'Peach Fizz',
    type: 'mocktail',
    blurb: 'Peach nectar lifted by soda and spirit-free.',
    recipe: [
      { ingredientId: 'peach', ml: 120 },
      { ingredientId: 'sprite', ml: 60 },
    ],
    tags: ['easy', 'sweet', 'fizz'],
  },
  {
    id: 'cranberry-soda',
    name: 'Cranberry Fizz',
    type: 'mocktail',
    blurb: 'Tart cranberry sparkling with soda.',
    recipe: [
      { ingredientId: 'cranberry', ml: 90 },
      { ingredientId: 'soda', ml: 60 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['easy', 'tart', 'fizz'],
  },
  {
    id: 'pineapple-soda',
    name: 'Pineapple Fizz',
    type: 'mocktail',
    blurb: 'Island juice over soda water.',
    recipe: [
      { ingredientId: 'pineapple', ml: 120 },
      { ingredientId: 'soda', ml: 60 },
    ],
    tags: ['easy', 'tropical', 'fizz'],
  },
  {
    id: 'grapefruit-soda',
    name: 'Grapefruit Fizz',
    type: 'mocktail',
    blurb: 'Bitter-fresh pink grapefruit on soda.',
    recipe: [
      { ingredientId: 'grapefruit', ml: 90 },
      { ingredientId: 'soda', ml: 60 },
    ],
    tags: ['easy', 'dry', 'fizz'],
  },
  {
    id: 'virgin-sea-breeze',
    name: 'Virgin Sea Breeze',
    type: 'mocktail',
    blurb: 'Cranberry and grapefruit — salt without theseason.',
    recipe: [
      { ingredientId: 'cranberry', ml: 60 },
      { ingredientId: 'grapefruit', ml: 90 },
    ],
    tags: ['easy', 'tart'],
  },
  {
    id: 'virgin-paloma',
    name: 'Virgin Paloma',
    type: 'mocktail',
    blurb: 'Grapefruit and soda with a lime snap.',
    recipe: [
      { ingredientId: 'grapefruit', ml: 90 },
      { ingredientId: 'soda', ml: 60 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['easy', 'citrus', 'fizz'],
  },
  {
    id: 'peach-lemonade',
    name: 'Peach Lemonade',
    type: 'mocktail',
    blurb: 'Summer lemonade with peach nectar.',
    recipe: [
      { ingredientId: 'peach', ml: 90 },
      { ingredientId: 'lemonade', ml: 90 },
    ],
    tags: ['easy', 'sweet'],
  },
  {
    id: 'cranberry-lemonade',
    name: 'Cranberry Lemonade',
    type: 'mocktail',
    blurb: 'Tart cranberry meeting herb lemonade.',
    recipe: [
      { ingredientId: 'cranberry', ml: 90 },
      { ingredientId: 'lemonade', ml: 90 },
      { ingredientId: 'lime', ml: 10 },
    ],
    tags: ['easy', 'tart', 'citrus'],
  },
  {
    id: 'pineapple-lemonade',
    name: 'Pineapple Lemonade',
    type: 'mocktail',
    blurb: 'Tropical lemonade — sunny and sweet.',
    recipe: [
      { ingredientId: 'pineapple', ml: 90 },
      { ingredientId: 'lemonade', ml: 90 },
    ],
    tags: ['easy', 'tropical'],
  },
];

/**
 * Full menu = curated + API catalogue (deduped by id).
 * API entries carry `image` (drinks/<id>.jpg served from public/).
 */
const seenIds = new Set(CURATED_DRINKS.map((d) => d.id));
const withImage = (d: Drink): Drink =>
  d.image ? d : (DRINKS_DB_IMAGES.includes(d.id) ? { ...d, image: `drinks/${d.id}.jpg` } : d);

export const DRINKS: Drink[] = [
  ...CURATED_DRINKS.map(withImage),
  ...(DRINKS_DB as Drink[]).filter((d) => !seenIds.has(d.id)),
];

/**
 * Full catalogue with the user's own recipes on top. Custom drinks (id
 * prefix `custom-`) always surface first — they're the house specials.
 */
export function mergeDrinks(custom: Drink[]): Drink[] {
  return [...custom, ...DRINKS];
}

/** Full catalogue size = 25 curated + extracted clickable recipes. */
const alcoholByCategory: Record<string, number> = {
  spirit: 0.4,
  liqueur: 0.2,
  wine: 0.12,
};

/** Rough header strength shown on cocktail cards (ABV% of the whole drink). */
export function estimateABV(drink: Drink): number {
  let alcoholMl = 0;
  let totalMl = 0;
  for (const dose of drink.recipe) {
    totalMl += dose.ml;
    const ing = INGREDIENT_MAP.get(dose.ingredientId);
    if (ing) {
      const strength = alcoholByCategory[ing.category];
      if (strength) alcoholMl += dose.ml * strength;
    }
  }
  if (totalMl === 0) return 0;
  return Math.round((alcoholMl / totalMl) * 100);
}
