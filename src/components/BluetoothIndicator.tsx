import { Bluetooth, BluetoothConnected, BluetoothOff, Loader2, Radio } from 'lucide-react';
import type { BluetoothState } from '../services/bluetooth/BluetoothManager';
import { cn } from '../utils/format';

interface BluetoothIndicatorProps {
  state: BluetoothState;
  /** Show the textual label next to the icon. */
  showLabel?: boolean;
  /** When provided, the pill becomes a button (e.g. jump to the connect screen). */
  onPress?: () => void;
}

interface IndicatorConfig {
  Icon: typeof Bluetooth;
  label: string;
  cls: string;
  /** Highlight treatment for the header dot. */
  glow?: boolean;
}

/** Connection pill for the header — gold-lit when the machine is online. */
export function BluetoothIndicator({ state, showLabel = true, onPress }: BluetoothIndicatorProps) {
  const { connectionState, reconnecting, availabilityChecked, availability } = state;

  let resolved: IndicatorConfig;
  if (connectionState === 'connected') {
    resolved = {
      Icon: BluetoothConnected,
      label: 'Connected',
      // Solid gold coin — the machine is live.
      cls: 'text-[#2b1d07] bg-gradient-to-br from-sky-300 to-sky-500 border-transparent shadow-[0_0_20px_rgb(199_145_58/0.6)]',
      glow: true,
    };
  } else if (connectionState === 'connecting') {
    resolved = { Icon: Loader2, label: 'Connecting…', cls: 'text-sky-300 border-sky-400/40 bg-sky-500/10' };
  } else if (connectionState === 'scanning') {
    resolved = { Icon: Radio, label: 'Scanning…', cls: 'text-sky-300 border-sky-400/40 bg-sky-500/10' };
  } else if (reconnecting) {
    resolved = { Icon: BluetoothOff, label: `Reconnecting (${state.reconnectAttempt}/3)`, cls: 'text-amber-300 border-amber-400/40 bg-amber-500/10' };
  } else if (availabilityChecked && availability === 'unavailable') {
    resolved = { Icon: BluetoothOff, label: 'BLE Unavailable', cls: 'text-rose-300 border-rose-400/40 bg-rose-500/10' };
  } else {
    resolved = { Icon: Bluetooth, label: 'Connect', cls: 'text-text-muted border-outline bg-surface-2' };
  }

  const IndicatorIcon = resolved.Icon;

  const inner = (
    <>
      <IndicatorIcon
        className={cn(
          'h-[18px] w-[18px]',
          (connectionState === 'connecting' || connectionState === 'scanning') && 'animate-spin',
        )}
        strokeWidth={resolved.glow ? 2.5 : 2}
      />
      {showLabel && <span>{resolved.label}</span>}
      {!showLabel && !resolved.glow && (
        <span aria-hidden className="h-0 w-0 overflow-hidden">{resolved.label}</span>
      )}
    </>
  );

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className={cn(
          'flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all active:scale-95',
          resolved.cls,
          resolved.glow && 'animate-pulse-ring border-transparent',
        )}
        aria-label={`${resolved.label} — open device connection`}
        aria-live="polite"
        title={resolved.label}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all',
        resolved.cls,
        resolved.glow && 'animate-pulse-ring border-transparent',
      )}
      aria-live="polite"
      title={resolved.label}
    >
      {inner}
    </div>
  );
}
