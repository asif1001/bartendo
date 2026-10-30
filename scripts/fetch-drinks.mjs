/**
 * Drink database generator — TheCocktailDB → bartendo catalogue.
 *
 * 1. Looks up a curated list of classic cocktails + every API mocktail.
 * 2. Converts imperial measures → ml, maps raw ingredient names onto the
 *    app's pumpable vocabulary (src/data/ingredients.ts).
 *    Drinks with ANY unmapped pourable ingredient are skipped (no silent
 *    recipe corruption), garnishes are dropped silently.
 * 3. Downloads each drink's official thumbnail to public/drinks/<id>.jpg.
 * 4. Emits src/data/generated/drinksDb.ts (plain data, cast in drinks.ts).
 *
 * Rerun: node scripts/fetch-drinks.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://www.thecocktaildb.com/api/json/v1/1';
const HEADERS = { 'User-Agent': 'bartendo-generator/1.0 (personal app)' };
const GEN_DIR = 'src/data/generated';
const IMG_DIR = 'public/drinks';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Curated classic cocktails to look up by name                        */
/* ------------------------------------------------------------------ */
const COCKTAIL_NAMES = [
  'Mojito', 'Margarita', 'Daiquiri', 'Pina colada', 'Long island iced tea',
  'Mai tai', 'Cosmopolitan', 'Manhattan', 'Negroni', 'Old fashioned',
  'Whiskey sour', 'Tequila sunrise', 'Screwdriver', 'Bloody mary',
  'Gin tonic', 'Moscow mule', 'Aperol spritz', 'White russian',
  'Black russian', 'Sea breeze', 'Sex on the beach', 'Tom collins',
  'French 75', 'Mimosa', 'Bellini', 'Kamikaze', 'Hurricane', 'Cuba libre',
  'Tequila sour', 'Amaretto sour', 'Caipirinha', 'Dark n stormy',
  'Singapore sling', 'Bahama mama', 'Rusty nail', 'Rob roy',
  'Boulevardier', 'Grasshopper', 'Blue hawaii', 'Blue lagoon',
  'Planters punch', 'Zombie', 'Pegu club', 'Bramble', 'Sloe comfortable screw',
  'Harvey wallbanger', 'Yellow bird', 'Bacardi cocktail', 'Fuzzy navel',
  'Gimlet', 'Salty dog', 'Greyhound', 'Paloma', 'Matador', 'Vesper',
  'Godfather', 'Godmother', 'White lady', 'Gin fizz', 'Mint julep',
  'Malibu bay breeze', 'Jack and coke', 'Kentucky mule', 'Orgasm',
  'Blue hawaiian', 'dark and stormy',
];

/* Extra image-only lookups for locally curated drinks (recipes stay ours) */
const IMAGE_ONLY_NAMES = [
  'Cuba libre', 'Tequila sunrise', 'Gin tonic', 'Moscow mule', 'Screwdriver',
  'Shirley temple', 'Virgin pina colada' /* → Virgin colada */,
];

/* ------------------------------------------------------------------ */
/* Ingredient mapping (TheCocktailDB name → our vocabulary)            */
/* ------------------------------------------------------------------ */

/** Garnishes / non-pourable / non-essential — dropped silently. */
const GARNISH = new Set([
  'salt', 'sugar cube', 'maraschino cherry', 'cherry', 'lemon peel', 'lemon twist',
  'orange peel', 'orange twist', 'olive', 'strawberry', 'banana', 'mint leaf',
  'mint leaves', 'mint sprig', 'lime peel', 'pineapple leaf', 'pineapple chunk',
  'orange slice', 'lemon slice', 'lime wedge', 'lemon wedge', 'apple slice',
  'cucumber', 'cucumber slice', 'lavender', 'rosemary', 'nutmeg', 'cinnamon',
  'coffee beans', 'ground coffee', 'grapes', 'chocolate powder', 'powder sugar',
  'chocolate sprinkles', 'melon balls', 'blueberries', 'raspberries', 'blackberries',
  'strawberries', 'celery', 'cloves', 'orange', 'lemon', 'lime', 'apricot',
  'passionfruit', 'passion fruit', 'apple', 'cherry brandy', 'maraschino liqueur',
  'watermelon', 'pineapple', 'ice', 'crushed ice', 'ice cube', 'mulled berries',
  'orange bitters', 'angostura bitters', 'bitters', 'cherry bitters', 'peach bitters',
  'parsley', 'basil', 'ginger', 'fresh ginger', 'cardamom', 'saffron', 'vanilla extract',
  'heavy whipping cream  (see note?)', 'salt/swans down', 'whipped cream', 'ice-cream',
  'milk chocolate', 'strawberry syrup', 'raspberry syrup', 'red wine', 'calvados',
]);

/** db ingredient name (normalised) → our ingredient id (null = skip drink). */
const ALIAS = new Map(Object.entries({
  // spirits
  'gin': 'gin', 'steinie gin': 'gin', 'vodka': 'vodka', 'citrus vodka': 'vodka',
  'pepper vodka': 'vodka',
  'rum': 'rum', 'light rum': 'rum', 'white rum': 'rum', 'dark rum': 'rum',
  'gold rum': 'rum', 'spiced rum': 'rum', 'coconut rum': 'rum', 'malibu rum': 'rum',
  'demerara rum': 'rum', ' CAMUS OFFICIEL BACARRA COGNAC': 'rum',
  'whiskey': 'whisky', 'whisky': 'whisky', 'blended whiskey': 'whisky',
  'irish whiskey': 'whisky', 'scotch': 'whisky', 'bourbon': 'whisky',
  'rye whiskey': 'whisky', 'jack daniels': 'whisky', 'canadian whisky': 'whisky',
  'tequila': 'tequila', 'silver tequila': 'tequila', 'blanco tequila': 'tequila',
  'gold tequila': 'tequila', 'mezcal': 'tequila',
  'brandy': null, 'cognac': null, 'apricot brandy': null, 'cherry brandy': null,
  'blackberry brandy': null, 'peach brandy': null, 'coffee brandy': null,
  'slivovitz': null, 'everclear': null, 'grain alcohol': null,
  // liqueurs
  'triple sec': 'triple-sec', 'cointreau': 'triple-sec', 'grand marnier': 'triple-sec',
  'powdered sugar': 'sugar', 'confectioners sugar': 'sugar',
  'light cream': 'cream', 'light whipping cream': 'cream',
  'orange curacao': 'triple-sec', 'orange curasao': 'triple-sec',
  'cachaca': 'rum', '151 proof rum': 'rum', '151': 'rum',
  'grape soda': 'sprite', 'grape juice': 'cranberry',
  'creme de cacao': null, 'white creme de cacao': null, 'dark creme de cacao': null,
  'drambuie': null, 'green creme de menthe': null, 'white creme de menthe': null,
  'dry orange curacao': 'triple-sec', 'curacao': 'triple-sec', 'rumple minze': null,
  'blue curacao': 'blue-curacao', 'blue curacao liqueur': 'blue-curacao',
  'blue curasao': 'blue-curacao', 'campari': 'campari', 'aperol': 'aperol',
  'amaro nonino': null, 'galliano': null, 'sambuca': null, 'absinthe': null,
  'ouzo': null, 'anise': null, 'dry vermouth': 'vermouth-dry',
  'francois villeroy vermouth': 'vermouth-dry', 'sweet vermouth': 'vermouth-sweet',
  'italian vermouth': 'vermouth-sweet', 'vermouth': 'vermouth-sweet',
  'lillet blanc': 'vermouth-dry', 'amaretto': 'amaretto', 'disaronno': 'amaretto',
  'kahlua': 'kahlua', 'coffee liqueur': 'kahlua', 'tia maria': 'kahlua',
  'baileys irish cream': 'baileys', 'irish cream': 'baileys',
  'peach schnapps': 'peach-schnapps', 'peachtree schnaffels': 'peach-schnapps',
  'creme de banana': 'banana-liqueur', 'banana liqueur': 'banana-liqueur',
  'melon liqueur': 'banana-liqueur', 'midori melon liqueur': 'banana-liqueur',
  'midori': 'banana-liqueur', 'sloe gin': 'banana-liqueur',
  'damiana liqueur': 'banana-liqueur', 'elderflower cordial': null,
  'passoa': null, 'passion fruit syrup': null, 'creme de cassis': null,
  'creme de mure': null, 'creme de violette': null, 'benedictine dom': null,
  'g earthly': null, 'cherry heering': null, 'chartreuse': null,
  'creme de menthe': null, 'peppermint schnapps': null, 'butterscotch schnapps': null,
  'frangelico': null, 'grenadine': 'grenadine', 'grenadin syrup': 'grenadine',
  // juices & fruit
  'orange juice': 'orange', 'cranberry juice': 'cranberry', 'cranberry juice cocktail': 'cranberry',
  'lemon juice': 'lemon', 'lime juice': 'lime', 'pineapple juice': 'pineapple',
  'tomato juice': 'tomato', 'grapefruit juice': 'grapefruit',
  'pink grapefruit juice': 'grapefruit', 'apricot nectar': 'peach',
  'peach nectar': 'peach', 'orange melon liqueur': 'banana-liqueur',
  'apple juice': 'apple', 'guava juice': null, 'mango': null, 'mango juice': null,
  'cream of coconut': 'coconut', 'coconut cream': 'coconut', 'coconut milk': 'coconut',
  'cream': 'cream', 'single cream': 'cream', 'double cream': 'cream',
  'heavy cream': 'cream', 'skim milk': 'cream', 'milk': 'cream',
  'heavy whipping cream': 'cream', 'vanilla ice-cream': null, 'egg white': null,
  'eggs': null, 'egg yolk': null, 'whole egg': null, 'gelatin': null,
  'yoghurt': null, 'sour mix': null, 'sweet and sour': null, 'sweet and sour mix': null,
  'lime cordial': 'lime', 'rosewater': null, 'orange blossom water': null,
  // mixers
  'coca-cola': 'cola', 'coke': 'cola', 'cola': 'cola', 'coca cola': 'cola',
  'pepsi': 'cola', 'sprite': 'sprite', '7-up': 'sprite', 'seven-up': 'sprite',
  'lemon-lime soda': 'sprite', 'lemon lime soda': 'sprite', 'sprite/7up': 'sprite',
  'white soda': 'sprite', 'mountain dew': 'sprite',
  'tonic water': 'tonic', 'indian tonic water': 'tonic', 'tonic': 'tonic',
  'club soda': 'soda', 'soda water': 'soda', 'soda': 'soda',
  'ginger ale': 'ginger', 'ginger beer': 'ginger', 'ginger syrup': 'ginger',
  'water': 'water', 'still water': 'water', 'carbonated water': 'soda',
  'lemonade': 'lemonade', 'strawberry lemonade': 'lemonade',
  'champagne': 'champagne', 'prosecco': 'champagne', 'sparkling wine': 'champagne',
  'chardonnay': null, 'wine': null, 'beer': null, 'ale': null, 'lager': null,
  'espresso': null, 'coffee': null, 'cold brew coffee': null, 'cocoa': null,
  'tea': null, 'green tea': null, 'worcestershire sauce': null, 'tabasco': null,
  'hot sauce': null, 'horseradish': null, 'tabasco sauce': null, 'soy sauce': null,
  'honey': 'sugar', 'honey syrup': 'sugar', 'sugar': 'sugar', 'sugar syrup': 'sugar',
  'simple syrup': 'sugar', 'caster sugar': 'sugar', 'icing sugar': 'sugar',
  'caster sugar/sugar': 'sugar', 'brown sugar': 'sugar', 'demerara syrup': 'sugar',
  'orgeat syrup': 'mint', 'orgeat': 'mint', 'falernum syrup': null,
  'mint': 'mint', 'fresh mint': 'mint', 'mint syrup': 'mint', 'syrup': 'sugar',
  'raspberry liqueur': null, 'maple syrup': 'sugar', 'agave syrup': 'sugar',
  'agave nectar': 'sugar', 'spinaction': null, 'vegetable? no': null,
}));

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* ------------------------------------------------------------------ */
/* Measure parsing → ml                                                */
/* ------------------------------------------------------------------ */
const FRAC = { '½': 0.5, '⅓': 1 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅔': 2 / 3 };

function parseNumbers(s) {
  // "1 1/2" → 1.5 ; "½" → 0.5 ; "2" → 2
  let sum = 0;
  const tokens = s.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (FRAC[t] !== undefined) { sum += FRAC[t]; continue; }
    const m = t.match(/^(\d+)\/(\d+)$/);
    if (m) { sum += Number(m[1]) / Number(m[2]); continue; }
    const n = parseFloat(t);
    if (!Number.isNaN(n)) sum += n;
  }
  return sum;
}

const DEFAULT_ML = {
  spirit: 45, liqueur: 25, wine: 90, juice: 30, mixer: 90, syrup: 10,
};

function measureToMl(raw, id, categoryOf) {
  const fallback = DEFAULT_ML[categoryOf] ?? 30;
  if (!raw) return fallback;
  const s = raw.toLowerCase().trim();

  // "juice of 1/2 lemon" style
  if (s.includes('juice of')) {
    const n = parseNumbers(s) || 1;
    return Math.min(90, 45 * n);
  }
  if (s.includes('fill') || s.includes('glass') || s.includes('top')) {
    if (['water', 'soda', 'sprite', 'cola', 'tonic', 'ginger', 'lemonade', 'champagne'].includes(id)) return 90;
    if (id === 'tomato') return 150;
    return 60;
  }
  if (s.includes('dash') || s.includes('drop')) return 1;
  if (s.includes('splash') || s.includes('rinse')) return 5;
  if (s.includes('can')) return 240;
  if (s.includes('bottle')) return 200;
  if (/1\s*pint|pint/.test(s)) return 473;

  const units = { oz: 29.57, cl: 10, ml: 1, dl: 100, tsp: 4.93, tbl: 14.79, tbsp: 14.79, tbs: 14.79, cup: 236, shot: 44, part: 30 };
  for (const [u, f] of Object.entries(units)) {
    if (s.includes(u)) {
      const n = parseNumbers(s);
      if (n > 0) return f * n;
    }
  }
  const n = parseNumbers(s);
  if (n > 0 && n < 100) return n < 4 ? n * 15 : n; // bare number: small = part-ish
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Fetch helpers                                                       */
/* ------------------------------------------------------------------ */
async function api(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 2) return null;
      await sleep(800 * (attempt + 1));
    }
  }
}

async function downloadImage(url, dest) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return false;
    await writeFile(dest, buf);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */
const used = new Set();
const images = []; // {id, url}
const skipped = [];

async function lookupByName(name) {
  const search = await api(`${API}/search.php?s=${encodeURIComponent(name)}`);
  const hit = search?.drinks?.[0];
  if (!hit) { skipped.push(`${name}: no DB hit`); return null; }
  const detail = await api(`${API}/lookup.php?i=${hit.idDrink}`);
  const d = detail?.drinks?.[0];
  if (!d) { skipped.push(`${name}: no detail`); return null; }
  return d;
}

async function main() {
  await mkdir(GEN_DIR, { recursive: true });
  await mkdir(IMG_DIR, { recursive: true });

  const builder = []; // {dbId, name, type}

  // curated classic cocktails
  for (const n of COCKTAIL_NAMES) builder.push({ name: n, type: 'cocktail' });
  // extra image targets for our locally curated drinks
  for (const n of IMAGE_ONLY_NAMES) builder.push({ name: n, type: 'image-only' });

  // mocktails: everything the API marks Non_Alcoholic
  const na = await api(`${API}/filter.php?a=Non_Alcoholic`);
  if (na?.drinks) {
    for (const d of na.drinks) builder.push({ name: d.strDrink, type: 'mocktail', id: d.idDrink });
  }
  console.log(`candidates: ${builder.length}`);

  const results = [];
  for (const item of builder) {
    const d = item.id ? (await api(`${API}/lookup.php?i=${item.id}`))?.drinks?.[0] : await lookupByName(item.name);
    await sleep(250);
    if (item.type === 'image-only') {
      if (d?.strDrinkThumb) {
        images.push({ id: slug(item.name), url: d.strDrinkThumb });
        results.push({ name: item.name, type: 'image-only', ok: true });
      }
      continue;
    }
  if (!d) { skipped.push(`${item.name}: not found`); continue; }
    // collect recipe
    const items = [];
    let unmapped = null;
    for (let i = 1; i <= 15; i++) {
      const ingRaw = d[`strIngredient${i}`];
      const mRaw = d[`strMeasure${i}`];
      if (!ingRaw) continue;
      const key = ingRaw.toLowerCase().replace(/[^a-z /\-']/g, '').trim().replace(/\s+/g, ' ');
      if (GARNISH.has(key)) continue;
      const mapped = ALIAS.has(key) ? ALIAS.get(key) : (ALIAS.get(key.replace(/s$/, '')) ?? undefined);
      if (mapped === undefined) { unmapped = ingRaw; break; }
      if (mapped === null) continue; // known non-pourable → drop silently
      if (items.some((it) => it.ing === mapped)) continue; // merge dupes
      // optimise later; push raw, ml computed below
      items.push({ ing: mapped, mRaw });
    }
    if (unmapped) { skipped.push(`${d.strDrink}: unmapped '${unmapped}'`); continue; }

    // compute ml
    const recipe = [];
    let dup = false;
    for (const it of items) {
      const cat = CATEGORY[it.ing];
      const ml = measureToMl(it.mRaw, it.ing, cat);
      if (recipe.some((r) => r.ingredientId === it.ing)) {
        const found = recipe.find((r) => r.ingredientId === it.ing);
        found.ml += ml;
        dup = true;
      } else {
        recipe.push({ ingredientId: it.ing, ml: Math.round(ml * 10) / 10 });
      }
    }
    void dup;
    const total = recipe.reduce((s, r) => s + r.ml, 0);
    if (recipe.length < 2) { skipped.push(`${d.strDrink}: too few ingredients`); continue; }
    if (recipe.length > 8) { skipped.push(`${d.strDrink}: ${recipe.length} ingredients`); continue; }
    if (total <= 0 || total > 800) { skipped.push(`${d.strDrink}: total ${total}ml`); continue; }

    const id = slug(d.strDrink);
    if (used.has(id)) continue;
    used.add(id);
    if (d.strDrinkThumb) images.push({ id, url: d.strDrinkThumb });

    const spirit0 = CATEGORY[recipe[0].ingredientId];
    results.push({
      id,
      name: normName(d.strDrink),
      type: item.type,
      blurb: blurbFor(d.strDrink, recipe),
      recipe,
      tags: tagsFor({ type: item.type, first: spirit0, count: recipe.length, total }),
      _dbid: d.idDrink,
    });
  }

  const ok = results.filter((r) => r.type !== 'image-only');
  console.log(`mapped drinks: ${ok.length}, images: ${images.length}`);
  console.log(`skipped: ${skipped.length}`);
  if (skipped.length) console.log(skipped.slice(0, 40).join('\n'));

  // emit TS
  const clean = ok.map((r) => ({
    id: r.id, name: r.name, type: r.type, blurb: r.blurb,
    recipe: r.recipe, tags: r.tags,
    image: `drinks/${r.id}.jpg`,
  }));
  await writeFile(path.join(GEN_DIR, 'drinksDb.ts'), tsFor(clean));
  await writeFile(path.join(GEN_DIR, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), count: clean.length, images }, null, 2));

  // download images
  let downloaded = 0;
  const seen = new Set();
  for (const img of images) {
    if (seen.has(img.id)) continue;
    seen.add(img.id);
    if (await downloadImage(img.url, path.join(IMG_DIR, `${img.id}.jpg`))) downloaded++;
    await sleep(150);
  }
  console.log(`images downloaded: ${downloaded}/${seen.size}`);
}

const CATEGORY = {
  rum: 0, vodka: 0, whisky: 0, tequila: 0, gin: 0,
  'triple-sec': 1, 'blue-curacao': 1, campari: 1, aperol: 1,
  'vermouth-dry': 1, 'vermouth-sweet': 1, amaretto: 1, kahlua: 1,
  baileys: 1, 'peach-schnapps': 1, 'banana-liqueur': 1,
  champagne: 2,
  cola: 3, sprite: 3, tonic: 3, soda: 3, ginger: 3, coconut: 3, water: 3,
  cream: 3, lemonade: 3,
  orange: 4, cranberry: 4, lemon: 4, lime: 4, pineapple: 4, tomato: 4,
  grapefruit: 4, apple: 4, peach: 4,
  grenadine: 5, sugar: 5, mint: 5,
};
const CAT_NAME = ['spirit', 'liqueur', 'wine', 'mixer', 'juice', 'syrup'];

function tagForCat(c) {
  return CAT_NAME[c];
}

function tagsFor({ type, first, count, total }) {
  const t = [type];
  if (first !== undefined) t.push(CAT_NAME[first]);
  if (count <= 3) t.push('easy');
  if (total > 250) t.push('tall');
  if (total <= 180) t.push('short');
  return [...new Set(t)];
}

function normName(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function blurbFor(name, recipe) {
  const main = recipe[0].ingredientId.replace(/-/g, ' ');
  const nice = main.charAt(0).toUpperCase() + main.slice(1);
  const total = Math.round(recipe.reduce((s, r) => s + r.ml, 0));
  return `${nice}-based classic · ${recipe.length} ingredients · ${total} ml`;
}

function tsFor(drinksArr) {
  return `/**
 * AUTO-GENERATED by scripts/fetch-drinks.mjs — do not edit by hand.
 * Source: TheCocktailDB (www.thecocktaildb.com). Images downloaded locally
 * to public/drinks/<id>.jpg (free API, attribution in README).
 * Doses are ml; measures converted from imperial with app defaults where
 * the DB had none.
 */

/* eslint-disable */
export const DRINKS_DB = ${JSON.stringify(drinksArr, null, 2)};
`;
}

main().catch((e) => { console.error(e); process.exit(1); });
