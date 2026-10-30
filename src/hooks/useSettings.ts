import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, type AppSettings } from '../types/settings';

const STORAGE_KEY = 'asif-rgb-settings-v1';
const COLOURS_KEY = 'asif-rgb-recent-colours-v1';

interface StoredPayload {
  settings: AppSettings;
  lastDevice: { id: string; name: string } | null;
}

function readStored(): StoredPayload {
  const fallback: StoredPayload = { settings: DEFAULT_SETTINGS, lastDevice: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredPayload>;
    return {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      lastDevice: parsed.lastDevice ?? null,
    };
  } catch {
    return fallback;
  }
}

interface UseSettingsResult {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  lastDevice: { id: string; name: string } | null;
  setLastDevice: (device: { id: string; name: string } | null) => void;
  recentColours: string[];
  pushRecentColour: (hex: string) => void;
  clearRecentColours: () => void;
}

const MAX_RECENT = 6;

export function useSettings(): UseSettingsResult {
  const initial = useRef(readStored());
  const [settings, setSettings] = useState<AppSettings>(initial.current.settings);
  const [lastDevice, setLastDeviceState] = useState(initial.current.lastDevice);
  const [recentColours, setRecentColours] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(COLOURS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed.filter((c) => typeof c === 'string') as string[]) : [];
    } catch {
      return [];
    }
  });

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        const existing = readStored();
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ settings: next, lastDevice: existing.lastDevice } satisfies StoredPayload),
        );
      } catch {
        /* storage unavailable (private mode) — settings simply don't persist */
      }
      return next;
    });
  }, []);

  const setLastDevice = useCallback((device: { id: string; name: string } | null) => {
    setLastDeviceState(device);
    try {
      const existing = readStored();
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ settings: existing.settings, lastDevice: device } satisfies StoredPayload),
      );
    } catch {
      /* ignore */
    }
  }, []);

  const pushRecentColour = useCallback((hex: string) => {
    setRecentColours((prev) => {
      const next = [hex, ...prev.filter((c) => c.toLowerCase() !== hex.toLowerCase())].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(COLOURS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clearRecentColours = useCallback(() => {
    setRecentColours([]);
    try {
      localStorage.removeItem(COLOURS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Theme application on <html>.
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', settings.theme === 'light' ? '#f8fafc' : '#020617');
  }, [settings.theme]);

  return {
    settings,
    updateSettings,
    lastDevice,
    setLastDevice,
    recentColours,
    pushRecentColour,
    clearRecentColours,
  };
}
