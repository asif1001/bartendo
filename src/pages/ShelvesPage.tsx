import { useMemo, useState } from 'react';
import { Droplets, FlaskConical, Play, RotateCcw, Square, UploadCloud } from 'lucide-react';
import type { BluetoothManager, BluetoothState } from '../services/bluetooth/BluetoothManager';
import { configurePump, pumpOff, pumpOn, pour } from '../services/bluetooth/BLECommands';
import { INGREDIENTS } from '../data/ingredients';
import { getIngredient } from '../data/ingredients';
import type { PumpConfig } from '../types/bar';
import { PUMP_COUNT } from '../services/bluetooth/BLECommands';
import { Card, CardTitle } from '../components/Card';
import { cn } from '../utils/format';

interface ShelvesPageProps {
  manager: BluetoothManager;
  state: BluetoothState;
  pumps: PumpConfig[];
  updatePump: (pumpNo: number, patch: Partial<Omit<PumpConfig, 'pumpNo'>>) => void;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

const CATEGORIES = [
  { id: 'spirit', label: 'Spirits' },
  { id: 'liqueur', label: 'Liqueurs' },
  { id: 'mixer', label: 'Mixers' },
  { id: 'juice', label: 'Juices' },
  { id: 'syrup', label: 'Syrups' },
  { id: 'wine', label: 'Wine' },
] as const;

/** Screen — assign liquids to the 8 pumps, calibrate, and prime/purge. */
export function ShelvesPage({ manager, state, pumps, updatePump, notify }: ShelvesPageProps) {
  const connected = state.connectionState === 'connected';
  const [busyPump, setBusyPump] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const byPumpNo = useMemo(
    () => new Map(pumps.map((p) => [p.pumpNo, p])),
    [pumps],
  );

  const assertConnected = (): boolean => {
    if (!connected) {
      notify('error', 'Connect to the ESP32 first (any bar card shows the device).');
      return false;
    }
    return true;
  };

  const runTest = async (pumpNo: number, kind: 'F' | 'B' | 'stop') => {
    if (!assertConnected() || busyPump !== null) return;
    setBusyPump(pumpNo);
    try {
      if (kind === 'F') {
        // Timed forward prime: firmware self-stops after ms.
        await manager.sendCommand(pour([{ pumpNo, ms: 2000 }]));
      } else if (kind === 'B') {
        await manager.sendCommand(pumpOn(pumpNo, 'B'));
        window.setTimeout(() => {
          void manager.sendCommand(pumpOff(pumpNo)).catch(() => undefined);
          setBusyPump(null);
        }, 2000);
        return;
      } else {
        await manager.sendCommand(pumpOff(pumpNo));
      }
    } catch {
      notify('error', `Pump ${pumpNo} test failed — is the ESP32 connected?`);
    } finally {
      if (kind !== 'B') setBusyPump(null);
    }
  };

  const syncToDevice = async () => {
    if (!assertConnected() || syncing) return;
    setSyncing(true);
    let sent = 0;
    try {
      for (const pump of pumps) {
        if (pump.ingredientId === null) continue;
        const name = getIngredient(pump.ingredientId).name;
        await manager.sendCommand(configurePump(pump.pumpNo, name, pump.mlPerSec));
        sent += 1;
      }
      notify('success', `${sent} pump${sent === 1 ? '' : 's'} configured on the ESP32.`);
    } catch {
      notify('error', 'Pump configuration failed — check the connection.');
    } finally {
      setSyncing(false);
    }
  };

  const loadedCount = pumps.filter((p) => p.ingredientId !== null).length;

  return (
    <div className="animate-rise space-y-4">
      <Card>
        <CardTitle icon={<Droplets className="h-4 w-4 text-sky-400" />}>Bar shelves</CardTitle>
        <p className="text-[13px] text-text-muted">
          Assign which bottle feeds each pump. The order is free — drinks resolve
          automatically from whatever is loaded. ({loadedCount}/8 loaded)
        </p>
        <div className="mt-3 space-y-3">
          {Array.from({ length: PUMP_COUNT }, (_, i) => i + 1).map((pumpNo) => {
            const pump = byPumpNo.get(pumpNo);
            const ingredient = pump?.ingredientId ? getIngredient(pump.ingredientId) : null;
            return (
              <div
                key={pumpNo}
                className="rounded-2xl border border-outline-soft bg-surface-2/60 p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-black"
                    style={{
                      backgroundColor: ingredient?.colour ?? 'transparent',
                      border: ingredient ? undefined : '2px dashed var(--outline)',
                      color: ingredient ? '#0f172a' : '#64748b',
                    }}
                  >
                    {ingredient ? ingredient.name.slice(0, 2).toUpperCase() : `P${pumpNo}`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-text">Pump {pumpNo}</p>
                    <p className="truncate text-[11px] text-text-muted">
                      {ingredient ? ingredient.name : 'Empty — choose a bottle'}
                    </p>
                  </div>
                  <select
                    aria-label={`Ingredient for pump ${pumpNo}`}
                    className="h-10 max-w-[10rem] rounded-xl border border-outline bg-surface px-2 text-[13px] font-semibold text-text outline-none focus:border-sky-400/60"
                    value={pump?.ingredientId ?? ''}
                    onChange={(e) =>
                      updatePump(pumpNo, { ingredientId: e.target.value === '' ? null : e.target.value })
                    }
                  >
                    <option value="">— empty —</option>
                    {CATEGORIES.map((cat) => (
                      <optgroup key={cat.id} label={cat.label}>
                        {INGREDIENTS.filter((ing) => ing.category === cat.id).map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {pump?.ingredientId && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted">
                      <span>Flow rate</span>
                      <span className="font-mono text-sky-300">
                        {pump.mlPerSec.toFixed(1)} ml/s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={40}
                      step={0.5}
                      value={pump.mlPerSec}
                      onChange={(e) => updatePump(pumpNo, { mlPerSec: Number(e.target.value) })}
                      className="slider mt-1"
                      style={{ '--track-accent': '#38bdf8', '--track-progress': `${(pump.mlPerSec / 40) * 100}%` } as React.CSSProperties}
                      aria-label={`Flow rate for pump ${pumpNo}`}
                    />
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={!connected || busyPump !== null}
                        onClick={() => void runTest(pumpNo, 'F')}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/90 text-[12px] font-bold text-slate-950 transition active:scale-95 disabled:opacity-40"
                      >
                        {busyPump === pumpNo ? <FlaskConical className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        Fwd 2s
                      </button>
                      <button
                        type="button"
                        disabled={!connected || busyPump !== null}
                        onClick={() => void runTest(pumpNo, 'B')}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-surface text-[12px] font-bold text-text transition active:scale-95 disabled:opacity-40"
                      >
                        <RotateCcw className="h-4 w-4" /> Rev 2s
                      </button>
                      <button
                        type="button"
                        disabled={!connected}
                        onClick={() => void runTest(pumpNo, 'stop')}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-rose-500/20 text-[12px] font-bold text-rose-300 transition active:scale-95 disabled:opacity-40"
                      >
                        <Square className="h-4 w-4" /> Stop
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <button
        type="button"
        disabled={!connected || syncing || loadedCount === 0}
        onClick={() => void syncToDevice()}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 text-[15px] font-black text-slate-950 shadow-lg shadow-sky-500/25 transition active:scale-[0.97] disabled:opacity-40"
      >
        <UploadCloud className={cn('h-5 w-5', syncing && 'animate-pulse')} />
        {syncing ? 'Syncing…' : 'Apply to device'}
      </button>
      <p className="-mt-1 px-1 text-[11px] text-text-muted">
        Pushes the shelf + flow rates to the ESP32 (survives its reboots). Re-apply
        after changing bottles or calibration.
      </p>
    </div>
  );
}
