import { useState } from 'react';
import type { BluetoothManager, BluetoothState } from '../services/bluetooth/BluetoothManager';
import { BluetoothCard } from '../components/BluetoothCard';
import { Card, CardTitle } from '../components/Card';
import { Power, Zap } from 'lucide-react';

interface DashboardPageProps {
  manager: BluetoothManager;
  state: BluetoothState;
  lastDevice: { id: string; name: string } | null;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

/** Screen 1 — Bluetooth connection and quick status. */
export function DashboardPage({ manager, state, lastDevice, notify }: DashboardPageProps) {
  const [quickAction, setQuickAction] = useState<'on' | 'off' | null>(null);

  const connected = state.connectionState === 'connected';
  const sendPower = async (command: 'ON' | 'OFF') => {
    setQuickAction(command === 'ON' ? 'on' : 'off');
    try {
      await manager.sendCommand(command);
      notify('success', `LED turned ${command === 'ON' ? 'ON' : 'OFF'}.`);
    } catch {
      notify('error', 'Could not send the command — check the connection.');
    } finally {
      setQuickAction(null);
    }
  };

  return (
    <div className="animate-rise space-y-4">
      <BluetoothCard manager={manager} state={state} lastDevice={lastDevice} notify={notify} />

      {connected && (
        <Card>
          <CardTitle icon={<Zap className="h-4 w-4 text-sky-400" />}>Quick LED control</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={quickAction !== null || state.busyWrites}
              onClick={() => void sendPower('ON')}
              className="flex h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-500/90 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition active:scale-[0.97] disabled:opacity-50"
            >
              <Power className="h-5 w-5" /> LED ON
            </button>
            <button
              type="button"
              disabled={quickAction !== null || state.busyWrites}
              onClick={() => void sendPower('OFF')}
              className="flex h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-slate-500/50 text-sm font-bold text-slate-100 transition active:scale-[0.97] disabled:opacity-50"
            >
              <Power className="h-5 w-5" /> LED OFF
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
