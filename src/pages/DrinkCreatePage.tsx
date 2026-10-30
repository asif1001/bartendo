import { useRef, useState } from 'react';
import { ArrowLeft, Camera, ImagePlus, Trash2 } from 'lucide-react';
import { INGREDIENTS, getIngredient } from '../data/ingredients';
import type { Drink, DrinkDose, DrinkType } from '../types/bar';
import { Card, CardTitle } from '../components/Card';
import { DrinkImage } from '../components/DrinkImage';
import { cn } from '../utils/format';

interface DrinkCreatePageProps {
  /** When set, the form edits that custom drink instead of creating one. */
  drink?: Drink;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
  onSave: (drink: Drink) => void;
  onBack: () => void;
}

const CATEGORIES = [
  { id: 'spirit', label: 'Spirits' },
  { id: 'liqueur', label: 'Liqueurs' },
  { id: 'mixer', label: 'Mixers' },
  { id: 'juice', label: 'Juices' },
  { id: 'syrup', label: 'Syrups' },
  { id: 'wine', label: 'Wine' },
] as const;

const QUICK_ML = [15, 30, 45, 60, 90, 120];

/** Downscale the uploaded photo to a compact square-ish JPEG data URL. */
function compressImage(file: File, maxSide = 512, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Auto-write the blurb from the recipe so the card is never empty. */
function defaultBlurb(recipe: DrinkDose[], type: DrinkType): string {
  if (recipe.length === 0) return type === 'cocktail' ? 'A house mix.' : 'A house cooler.';
  const names = recipe.map((d) => getIngredient(d.ingredientId).name).slice(0, 3).join(', ');
  return `${type === 'cocktail' ? 'House mix' : 'House cooler'}: ${names}.`;
}

/** Screen — create or edit a user recipe ("mix your own"), with photo. */
export function DrinkCreatePage({ drink, notify, onSave, onBack }: DrinkCreatePageProps) {
  const editing = drink !== undefined;

  const [name, setName] = useState(drink?.name ?? '');
  const [type, setType] = useState<DrinkType>(drink?.type ?? 'cocktail');
  const [blurb, setBlurb] = useState(drink?.blurb ?? '');
  const [image, setImage] = useState<string | undefined>(drink?.image);
  const [recipe, setRecipe] = useState<DrinkDose[]>(
    drink?.recipe.map((d) => ({ ...d })) ?? [{ ingredientId: '', ml: 45 } as DrinkDose],
  );
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('error', 'Choose an image file (photo of the drink).');
      return;
    }
    setPhotoBusy(true);
    compressImage(file)
      .then((dataUrl) => setImage(dataUrl))
      .catch(() => notify('error', 'Could not process that photo — try another one.'))
      .finally(() => setPhotoBusy(false));
  };

  const setDose = (index: number, patch: Partial<DrinkDose>) => {
    setRecipe((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const save = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      notify('error', 'Give your drink a name first.');
      return;
    }
    // Merge by ingredient id (two rows can't target one ingredient twice).
    const merged = new Map<string, number>();
    for (const dose of recipe) {
      if (!dose.ingredientId || dose.ml <= 0) continue;
      merged.set(dose.ingredientId, (merged.get(dose.ingredientId) ?? 0) + Math.min(500, Math.round(dose.ml)));
    }
    if (merged.size === 0) {
      notify('error', 'Add at least one ingredient with an amount.');
      return;
    }
    const finalRecipe = [...merged].map(([ingredientId, ml]) => ({ ingredientId, ml }));
    const record: Drink = {
      id: drink?.id ?? `custom-${Date.now()}`,
      name: trimmed,
      type,
      blurb: blurb.trim() || defaultBlurb(finalRecipe, type),
      recipe: finalRecipe,
      tags: ['custom', type],
      image,
    };
    onSave(record);
  };

  return (
    <div className="animate-rise space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline bg-surface transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-display truncate text-[22px] leading-tight font-semibold text-text">
            {editing ? 'Edit drink' : 'Mix your own'}
          </h2>
          <p className="text-[12px] text-text-muted">Recipe + photo, saved to your bar</p>
        </div>
      </div>

      {/* Photo picker */}
      <Card>
        <CardTitle icon={<Camera className="h-4 w-4 text-sky-400" />}>Photo</CardTitle>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative block w-full overflow-hidden rounded-2xl border-2 border-dashed border-outline transition hover:border-sky-400/60"
        >
          <DrinkImage
            src={image}
            alt={name || 'New drink'}
            className={cn('w-full', image ? 'h-40' : 'h-32')}
          />
          {!image && (
            <span className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 text-[12px] font-bold text-text-muted">
              <ImagePlus className="h-4 w-4" />
              {photoBusy ? 'Processing…' : 'Add a photo'}
            </span>
          )}
          {image && (
            <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white">
              Tap to change
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pickPhoto(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </Card>

      {/* Identity */}
      <Card>
        <CardTitle>Name &amp; style</CardTitle>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 32))}
          placeholder="e.g. Midnight Mango"
          maxLength={32}
          className="h-12 w-full rounded-2xl border border-outline bg-surface px-4 text-[15px] font-semibold text-text outline-none transition focus:border-sky-400/60"
          aria-label="Drink name"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['cocktail', 'mocktail'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'h-11 rounded-xl text-[13px] font-bold capitalize transition active:scale-95',
                type === t ? 'bg-sky-500 text-slate-950' : 'border border-outline bg-surface-2 text-text-muted',
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <textarea
          value={blurb}
          onChange={(e) => setBlurb(e.target.value.slice(0, 90))}
          placeholder="One-line description (optional — we'll write one for you)"
          rows={2}
          maxLength={90}
          className="mt-3 w-full resize-none rounded-2xl border border-outline bg-surface px-4 py-3 text-[14px] text-text outline-none transition focus:border-sky-400/60"
          aria-label="Description"
        />
      </Card>

      {/* Recipe builder */}
      <Card>
        <CardTitle>Recipe</CardTitle>
        <div className="space-y-3">
          {recipe.map((dose, index) => (
            <div key={index} className="rounded-2xl border border-outline-soft bg-surface-2/50 p-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: dose.ingredientId ? getIngredient(dose.ingredientId).colour : 'transparent', border: '1px solid rgb(var(--outline))' }}
                />
                <select
                  aria-label={`Ingredient ${index + 1}`}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-outline bg-surface px-2 text-[13px] font-semibold text-text outline-none focus:border-sky-400/60"
                  value={dose.ingredientId}
                  onChange={(e) => setDose(index, { ingredientId: e.target.value })}
                >
                  <option value="">— choose ingredient —</option>
                  {CATEGORIES.map((cat) => (
                    <optgroup key={cat.id} label={cat.label}>
                      {INGREDIENTS.filter((i) => i.category === cat.id).map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {recipe.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRecipe((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={`Remove ingredient row ${index + 1}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-text-muted transition active:scale-90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {dose.ingredientId && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <input
                    type="number"
                    value={dose.ml}
                    min={5}
                    max={500}
                    onChange={(e) => setDose(index, { ml: Math.max(0, Math.min(500, Number(e.target.value) || 0)) })}
                    className="h-9 w-20 rounded-lg border border-outline bg-surface px-2 text-center font-mono text-[13px] font-bold text-text outline-none focus:border-sky-400/60"
                    aria-label={`Millilitres for ingredient ${index + 1}`}
                  />
                  <span className="text-[12px] font-bold text-text-muted">ml</span>
                  {QUICK_ML.map((ml) => (
                    <button
                      key={ml}
                      type="button"
                      onClick={() => setDose(index, { ml })}
                      className={cn(
                        'h-8 rounded-lg px-2 text-[11px] font-bold transition active:scale-95',
                        dose.ml === ml
                          ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/50'
                          : 'bg-surface text-text-muted border border-outline',
                      )}
                    >
                      {ml}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {recipe.length < 6 && (
          <button
            type="button"
            onClick={() => setRecipe((prev) => [...prev, { ingredientId: '', ml: 30 } as DrinkDose])}
            className="mt-3 h-10 w-full rounded-xl border border-dashed border-outline text-[12px] font-bold text-text-muted transition hover:border-sky-400/60 hover:text-sky-300"
          >
            + Add ingredient
          </button>
        )}
      </Card>

      <button
        type="button"
        onClick={save}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-3xl bg-gradient-to-b from-sky-400 to-sky-600 text-base font-black text-slate-950 shadow-xl shadow-sky-500/30 transition active:scale-[0.97]"
      >
        {editing ? 'Save changes' : 'Save to my menu'}
      </button>
    </div>
  );
}
