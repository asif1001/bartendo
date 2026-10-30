import type { BluetoothManager, BluetoothState } from '../services/bluetooth/BluetoothManager';
import { BluetoothError } from '../types/bluetooth';
import { turnOff, turnOn } from '../services/bluetooth/BLECommands';
import { Card } from '../components/Card';
import { Power } from 'lucide-react';

interface PowerPageProps {
  manager: BluetoothManager;
  state: BluetoothState;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

/** Screen 4 — big LED ON / LED OFF buttons. */
export function PowerPage({ manager, state, notify }: PowerPageProps) {
  const connected = state.connectionState === 'connected';
  const busy = state.busyWrites;

  const send = async (command: string, successMessage: string) => {
    if (!connected) {
      notify('error', 'Not connected. Go to the Dashboard and connect to the ESP32 first.');
      return;
    }
    try {
      await manager.sendCommand(command);
      notify('success', successMessage);
    } catch (error) {
      if (error instanceof BluetoothError && error.code === 'not-connected') {
        notify('error', 'Not connected. Connect to the ESP32 first.');
      } else {
        notify('error', 'The command could not be delivered.');
      }
    }
  };

  return (
    <div className="animate-rise space-y-4">
      <Card>
        <CardTitleWrap />
        <div className="space-y-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void send(turnOn(), 'LED is now ON.')}
            className="flex h-36 w-full flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-xl font-black text-slate-950 shadow-xl shadow-emerald-500/30 transition active:scale-[0.97] disabled:opacity-40"
          >
            <Power className="h-9 w-9" strokeWidth={2.6} />
            LED ON
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void send(turnOff(), 'LED is now OFF.')}
            className="flex h-36 w-full flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-b from-slate-600 to-slate-700 text-xl font-black text-slate-200 shadow-xl transition active:scale-[0.97] disabled:opacity-40"
          >
            <Power className="h-9 w-9" strokeWidth={2.6} />
            LED OFF
          </button>
        </div>
        <p className="mt-4 text-center text-[12px] text-text-muted" aria-live="polite">
          {connected
            ? busy
              ? 'Writing to the device…'
              : `Sends the "ON"/"OFF" command to ${state.connectedDevice?.name ?? 'the ESP32'}`
            : 'Connect to the ESP32 to enable these buttons.'}
        </p>
      </Card>
    </div>
  );
}

function CardTitleWrap() {
  return (
    <p className="mb-5 text-center text-sm font-semibold tracking-wide text-text-muted uppercase">
      LED Power
    </p>
  );
}
