import { Bluetooth, BluetoothConnected, BluetoothOff, Loader2, Radio } from 'lucide-react';
import type { BluetoothState } from '../services/bluetooth/BluetoothManager';
import { cn } from '../utils/format';

interface BluetoothIndicatorProps {
  state: BluetoothState;
  /** Show the textual label next to the icon. */
  showLabel?: boolean;
}

/** Pulsing connection pill shown in the header. */
export function BluetoothIndicator({ state, showLabel = true }: BluetoothIndicatorProps) {
  const { connectionState, reconnecting, availabilityChecked, availability } = state;

  const config = (() => {
    if (connectionState === 'connected') {
      return { Icon: BluetoothConnected, label: 'Connected', cls: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10' };
    }
    if (connectionState === 'connecting') {
      return { Icon: Loader2, label: 'Connecting…', cls: 'text-sky-300 border-sky-400/40 bg-sky-500/10' };
    }
    if (connectionState === 'scanning') {
      return { Icon: Radio, label: 'Scanning…', cls: 'text-sky-300 border-sky-400/40 bg-sky-500/10' };
    }
    if (reconnecting) {
      return { Icon: BluetoothOff, label: `Reconnecting (${state.reconnectAttempt}/3)`, cls: 'text-amber-300 border-amber-400/40 bg-amber-500/10' };
    }
    if (availabilityChecked && availability === 'unavailable') {
      return { Icon: BluetoothOff, label: 'BLE Unavailable', cls: 'text-rose-300 border-rose-400/40 bg-rose-500/10' };
    }
    return { Icon: Bluetooth, label: 'Disconnected', cls: 'text-text-muted border-outline bg-surface-2' };
  })();

  const IndicatorIcon = config.Icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
        config.cls,
      )}
      aria-live="polite"
    >
      <IndicatorIcon
        className={cn(
          'h-4 w-4',
          (connectionState === 'connecting' || connectionState === 'scanning') && 'animate-spin',
          connectionState === 'connected' && 'animate-pulse-ring',
        )}
      />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}
