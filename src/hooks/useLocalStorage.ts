import { useCallback, useEffect, useState } from 'react';
import type { Drink, PumpConfig } from '../types/bar';

/** Generic persisted state (guarding against private-mode storage throws). */
export function useLocalStorage<T>(
  key: string,
  initial: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      /* fall through to initial */
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — state simply doesn't persist */
    }
  }, [key, value]);

  return [value, setValue];
}

/** 8 pumps, empty shelves, factory flow rate 60 ml/min (calibrate in Setup/Shelves). */
export function DEFAULT_PUMP_CONFIG(): PumpConfig[] {
  return Array.from({ length: 8 }, (_, i) => ({
    pumpNo: i + 1,
    ingredientId: null,
    mlPerSec: 1, // = 60 ml/min; stored internally in ml/s, UI shows ml/min
  }));
}

const INVENTORY_KEY = 'asif-rgb-inventory-v2'; // v2 = unit change to ml/min UI
const FAVOURITES_KEY = 'asif-rgb-favourites-v1';

/**
 * Shelves/pump state: which pump holds which ingredient and its calibrated
 * flow rate. Persists locally; the Shelves screen syncs assignments to the
 * firmware (PUMP:CFG) when connected.
 */
export function useInventory() {
  const [pumps, setPumps] = useLocalStorage<PumpConfig[]>(INVENTORY_KEY, DEFAULT_PUMP_CONFIG);

  const updatePump = useCallback(
    (pumpNo: number, patch: Partial<Omit<PumpConfig, 'pumpNo'>>) => {
      setPumps((prev) =>
        prev.map((p) => (p.pumpNo === pumpNo ? { ...p, ...patch } : p)),
      );
    },
    [setPumps],
  );

  return { pumps, updatePump };
}

/** Favourite drinks, persisted by drink id. */
export function useFavourites() {
  const [favourites, setFavourites] = useLocalStorage<string[]>(FAVOURITES_KEY, []);

  const toggleFavourite = useCallback(
    (drinkId: string) => {
      setFavourites((prev) =>
        prev.includes(drinkId) ? prev.filter((d) => d !== drinkId) : [...prev, drinkId],
      );
    },
    [setFavourites],
  );

  return { favourites, toggleFavourite, isFavourite: useCallback((d: string) => favourites.includes(d), [favourites]) };
}

const CUSTOM_DRINKS_KEY = 'asif-rgb-custom-drinks-v1';
const MAX_CUSTOM_DRINKS = 30;

/**
 * User-created recipes ("mix your own"), persisted locally. Keeps insertion
 * order; update/delete by drink id. Custom ids should use the `custom-`
 * prefix so the UI can offer edit/delete only on these.
 */
export function useCustomDrinks() {
  const [customDrinks, setCustomDrinks] = useLocalStorage<Drink[]>(CUSTOM_DRINKS_KEY, []);

  const addDrink = useCallback(
    (drink: Drink) => {
      setCustomDrinks((prev) =>
        prev.length >= MAX_CUSTOM_DRINKS ? prev : [drink, ...prev],
      );
    },
    [setCustomDrinks],
  );

  const updateDrink = useCallback(
    (id: string, patch: Partial<Drink>) => {
      setCustomDrinks((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    },
    [setCustomDrinks],
  );

  const deleteDrink = useCallback(
    (id: string) => {
      setCustomDrinks((prev) => prev.filter((d) => d.id !== id));
    },
    [setCustomDrinks],
  );

  return { customDrinks, addDrink, updateDrink, deleteDrink };
}
