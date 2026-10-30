import { useState } from 'react';
import type { BluetoothManager, BluetoothState } from '../services/bluetooth/BluetoothManager';
import type { ThemeMode } from '../types/settings';
import type { PumpConfig } from '../types/bar';
import { configurePump, pour, PUMP_COUNT } from '../services/bluetooth/BLECommands';
import { Card, CardTitle } from '../components/Card';
import { Toggle } from '../components/Toggle';
import { Beaker, Gauge, Trash2, UploadCloud, WifiOff } from 'lucide-react';

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
  pumps: PumpConfig[];
  updatePump: (pumpNo: number, patch: Partial<Omit<PumpConfig, 'pumpNo'>>) => void;
  recentColours: string[];
  clearRecentColours: () => void;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

/** Screen — persistence, theme, privacy and PUMP FLOW calibration. */
export function SettingsPage({
  manager,
  state,
  settings,
  updateSettings,
  pumps,
  updatePump,
  recentColours,
  clearRecentColours,
  notify,
}: SettingsPageProps) {
  const connected = state.connectionState === 'connected';

  /* -------------------- pump flow calibration -------------------- */
  // All 8 pumps are the same model → ONE shared flow rate.
  // Internally the app stores ml/s (pour math is in seconds), but the
  // calibration UI works in the practical unit: ml per MINUTE.
  const sharedRate = pumps[0]?.mlPerSec ?? 1;
  const sharedPerMin = sharedRate * 60;
  const [testPump, setTestPump] = useState(1);
  const [testSeconds, setTestSeconds] = useState(10);
  const [measuredMl, setMeasuredMl] = useState('');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  /** Slider/helper input in ml per MINUTE → stored internally as ml/s. */
  const setAllRates = (perMinute: number) => {
    const perMin = Math.min(100, Math.max(1, perMinute));
    pumps.forEach((p) => updatePump(p.pumpNo, { mlPerSec: perMin / 60 }));
  };

  const runTestPour = async () => {
    if (!connected || testing) return;
    setTesting(true);
    try {
      await manager.sendCommand(pour([{ pumpNo: testPump, ms: testSeconds * 1000 }]));
      notify('info', `Pump ${testPump} running for ${testSeconds}s — put it over a measuring cup now.`);
    } catch {
      notify('error', 'Test pour failed — check the connection (needs firmware v2).');
    } finally {
      setTesting(false);
    }
  };

  const applyMeasured = () => {
    const ml = parseFloat(measuredMl);
    if (!Number.isFinite(ml) || ml <= 0 || ml > 500) {
      notify('error', 'Enter the measured ml (e.g. 85).');
      return;
    }
    const perMin = Math.round(((ml / testSeconds) * 60) * 10) / 10;
    setAllRates(perMin);
    setMeasuredMl('');
    notify('success', `All pumps calibrated to ${perMin} ml/min (${ml} ml in ${testSeconds}s).`);
  };

  const syncToDevice = async () => {
    if (!connected || syncing) return;
    setSyncing(true);
    let sent = 0;
    try {
      for (const pump of pumps) {
        if (pump.ingredientId === null) continue;
        const label = pump.ingredientId.replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
        await manager.sendCommand(configurePump(pump.pumpNo, label || 'LIQUID', pump.mlPerSec));
        sent += 1;
      }
      notify('success', sent > 0 ? `${sent} pumps configured on the ESP32.` : 'Shelves are empty — nothing to send.');
    } catch {
      notify('error', 'Pump configuration failed — check the connection.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="animate-rise space-y-4">
      {/* ---------------- pump flow calibration ---------------- */}
      <Card>
        <CardTitle icon={<Gauge className="h-4 w-4 text-sky-400" />}>Pump flow calibration</CardTitle>
        <p className="mb-1 text-[13px] text-text-muted">
          All 8 pumps are the same model, so they share <b>one flow rate</b>. The bar
          computes every pour time from it (time = ml ÷ flow).
        </p>

        <label className="mt-3 block">
          <span className="mb-1 flex items-center justify-between text-[13px] font-semibold">
            <span>Flow rate (all pumps)</span>
            <span className="font-mono text-sky-300">{sharedPerMin.toFixed(1)} ml/min</span>
          </span>
          <input
            type="range"
            className="slider"
            style={
              {
                '--track-accent': '#38bdf8',
                '--track-progress': `${(Math.min(100, sharedPerMin) / 100) * 100}%`,
              } as React.CSSProperties
            }
            min={1}
            max={100}
            step={1}
            value={Math.min(100, Math.max(1, sharedPerMin))}
            onChange={(e) => setAllRates(Number(e.target.value))}
            aria-label="Shared pump flow rate"
          />
          <span className="mt-1 flex justify-between text-[10px] text-text-muted">
            <span>1</span>
            <span>100 ml/min</span>
          </span>
        </label>

        {/* measure-and-calculate helper */}
        <div className="mt-4 rounded-2xl border border-outline-soft bg-surface-2/60 p-3">
          <p className="mb-2 flex items-center gap-2 text-[12px] font-bold">
            <Beaker className="h-4 w-4 text-amber-300" /> Measure it precisely
          </p>
          <ol className="mb-3 list-decimal space-y-0.5 pl-4 text-[11px] text-text-muted">
            <li>Put pump <b>1</b>'s tube in your ingredient and the outlet over a measuring jug.</li>
            <li>Run the test pour below ({testSeconds}s).</li>
            <li>Type how many ml you caught — all pumps get that flow rate.</li>
          </ol>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-text-muted">
              Test duration
              <select
                value={testSeconds}
                onChange={(e) => setTestSeconds(Number(e.target.value))}
                className="h-10 rounded-xl border border-outline bg-surface px-2 text-[13px] font-semibold text-text outline-none focus:border-sky-400/60"
                aria-label="Test pour duration"
              >
                {[5, 10, 20, 30].map((s) => (
                  <option key={s} value={s}>{s} seconds</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-text-muted">
              Test pump
              <select
                value={testPump}
                onChange={(e) => setTestPump(Number(e.target.value))}
                className="h-10 rounded-xl border border-outline bg-surface px-2 text-[13px] font-semibold text-text outline-none focus:border-sky-400/60"
                aria-label="Test pump number"
              >
                {Array.from({ length: PUMP_COUNT }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>Pump {n}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!connected || testing}
              onClick={() => void runTestPour()}
              className="h-11 rounded-xl bg-sky-500 text-[13px] font-bold text-slate-950 transition active:scale-95 disabled:opacity-40"
            >
              {testing ? 'Pouring…' : `Run ${testSeconds}s test`}
            </button>
            <div className="flex h-11 items-center rounded-xl border border-outline bg-surface px-2">
              <input
                type="number"
                min={1}
                max={500}
                value={measuredMl}
                onChange={(e) => setMeasuredMl(e.target.value)}
                placeholder="measured ml"
                aria-label="Measured millilitres"
                className="w-full bg-transparent text-[13px] font-semibold text-text outline-none placeholder:text-text-muted"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={measuredMl.length === 0}
            onClick={applyMeasured}
            className="mt-2 h-11 w-full rounded-xl bg-emerald-500/90 text-[13px] font-bold text-slate-950 transition active:scale-95 disabled:opacity-40"
          >
            Set all pumps from measurement
          </button>
        </div>

        <button
          type="button"
          disabled={!connected || syncing}
          onClick={() => void syncToDevice()}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/10 text-[13px] font-bold text-sky-300 transition active:scale-95 disabled:opacity-40"
        >
          <UploadCloud className={syncing ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} />
          Send flow rates to device
        </button>
        <p className="mt-1 text-[11px] text-text-muted">
          Calibration tips: run the test with the tube actually filled and at your
          normal bottle level — viscosity changes the rate. Re-measure whenever you
          swap liquid.
        </p>
      </Card>

      {/* ---------------- connection ---------------- */}
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

      {/* ---------------- appearance ---------------- */}
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

      {/* ---------------- data & device ---------------- */}
      <Card>
        <CardTitle icon={<span className="h-4 w-4 rounded bg-rose-400/40" />}>Data &amp; device</CardTitle>
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
