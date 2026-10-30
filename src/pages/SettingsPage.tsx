import type { BluetoothManager, BluetoothState } from '../services/bluetooth/BluetoothManager';
import type { ThemeMode } from '../types/settings';
import { Card, CardTitle } from '../components/Card';
import { Toggle } from '../components/Toggle';
import { Trash2, WifiOff } from 'lucide-react';

interface SettingsPageProps {
  manager: BluetoothManager;
  state: BluetoothState;
  settings: {
    autoReconnect: boolean;
    rememberDevice: boolean;
    defaultBrightness: number;
    theme: ThemeMode;
  };
  updateSettings: (patch: Partial<{
    autoReconnect: boolean;
    rememberDevice: boolean;
    defaultBrightness: number;
    theme: ThemeMode;
  }>) => void;
  recentColours: string[];
  clearRecentColours: () => void;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

/** Screen 6 — persistence, theme and privacy options. */
export function SettingsPage({
  manager,
  state,
  settings,
  updateSettings,
  recentColours,
  clearRecentColours,
  notify,
}: SettingsPageProps) {
  return (
    <div className="animate-rise space-y-4">
      <Card>
        <CardTitle icon={<span className="h-4 w-4 rounded bg-sky-500/40" />}>Connection</CardTitle>
        <div className="divide-y divide-outline-soft">
          <Toggle
            label="Auto reconnect"
            description="Retry the last device automatically after a drop (native app only)"
            checked={settings.autoReconnect}
            onChange={(v) => updateSettings({ autoReconnect: v })}
          />
          <Toggle
            label="Remember last connected device"
            description="One-tap reconnect from the Dashboard"
            checked={settings.rememberDevice}
            onChange={(v) => updateSettings({ rememberDevice: v })}
          />
        </div>
      </Card>

      <Card>
        <CardTitle icon={<span className="h-4 w-4 rounded bg-amber-400/40" />}>LED defaults</CardTitle>
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-[13px] font-semibold">
            <span>Default brightness after connecting</span>
            <span className="font-mono text-amber-300">{settings.defaultBrightness}%</span>
          </span>
          <input
            type="range"
            className="slider"
            style={
              {
                '--track-accent': '#f59e0b',
                '--track-progress': `${settings.defaultBrightness}%`,
              } as React.CSSProperties
            }
            min={0}
            max={100}
            value={settings.defaultBrightness}
            onChange={(e) => updateSettings({ defaultBrightness: Number(e.target.value) })}
          />
        </label>
      </Card>

      <Card>
        <CardTitle icon={<span className="h-4 w-4 rounded bg-emerald-400/40" />}>Appearance</CardTitle>
        <div className="grid grid-cols-2 gap-2.5">
          {(['dark', 'light'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => updateSettings({ theme: mode })}
              className={`h-12 rounded-2xl border text-[15px] font-bold capitalize transition active:scale-[0.97] ${
                settings.theme === mode
                  ? 'border-sky-400/60 bg-sky-500/15 text-sky-300'
                  : 'border-outline bg-surface-2 text-text-muted'
              }`}
            >
              {mode} theme
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle icon={<span className="h-4 w-4 rounded bg-rose-400/40" />}>Data & device</CardTitle>
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={recentColours.length === 0}
            onClick={() => {
              clearRecentColours();
              notify('info', 'Recent colours cleared.');
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-outline bg-surface-2 text-[15px] font-semibold text-text transition active:scale-[0.97] disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> Clear recent colours ({recentColours.length})
          </button>
          <button
            type="button"
            disabled={state.connectionState !== 'connected'}
            onClick={() => {
              void manager
                .disconnect(true)
                .then(() => notify('info', 'Device disconnected.'))
                .catch(() => notify('error', 'Disconnect failed.'));
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-[15px] font-bold text-rose-300 transition active:scale-[0.97] disabled:opacity-40"
          >
            <WifiOff className="h-4 w-4" /> Disconnect device
          </button>
        </div>
      </Card>
    </div>
  );
}
