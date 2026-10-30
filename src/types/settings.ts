/** Persisted user preferences and device memory. */

export type ThemeMode = 'dark' | 'light';

export interface RememberedDevice {
  id: string;
  name: string;
}

export interface AppSettings {
  /** Transparently reconnect to the last device after an unexpected drop (native only). */
  autoReconnect: boolean;
  /** Keep the last connected device so it can be re-joined with one tap. */
  rememberDevice: boolean;
  /** Brightness applied after a fresh connection. */
  defaultBrightness: number;
  /** Visual theme. */
  theme: ThemeMode;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoReconnect: true,
  rememberDevice: true,
  defaultBrightness: 50,
  theme: 'dark',
};
