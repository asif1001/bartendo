import { useRef, useState } from 'react';
import type { BluetoothManager, BluetoothState } from '../services/bluetooth/BluetoothManager';
import { setBrightness } from '../services/bluetooth/BLECommands';
import { BluetoothError } from '../types/bluetooth';
import { BRIGHTNESS_DEBOUNCE_MS } from '../services/bluetooth/BLEConstants';
import { debounce } from '../utils/timing';
import { Card, CardTitle } from '../components/Card';
import { SunMedium } from 'lucide-react';

interface BrightnessPageProps {
  manager: BluetoothManager;
  state: BluetoothState;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

const STEPS = [0, 25, 50, 75, 100];

/** Screen 3 — brightness control with debounced transmission. */
export function BrightnessPage({ manager, state, notify }: BrightnessPageProps) {
  const [value, setValue] = useState(50);
  const connected = state.connectionState === 'connected';
  const sendRef = useRef<((v: number) => void) | null>(null);
  if (sendRef.current === null) {
    // Long debounce: BLE writes must not fire continuously while sliding.
    sendRef.current = debounce((next: number) => {
      manager.sendCommand(setBrightness(next)).catch((error: unknown) => {
        if (error instanceof BluetoothError && error.code === 'not-connected') {
          notify('error', 'Connect to the ESP32 before changing brightness.');
        }
      });
    }, BRIGHTNESS_DEBOUNCE_MS);
  }

  const change = (next: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(next)));
    setValue(clamped);
    if (connected) {
      sendRef.current?.(clamped);
    }
  };

  const dialColor = connected ? '#38bdf8' : '#64748b';

  return (
    <div className="animate-rise space-y-4">
      <Card className="pt-7 pb-8">
        <CardTitle icon={<SunMedium className="h-4 w-4 text-amber-300" />}>Brightness</CardTitle>
        <div className="mb-6 flex flex-col items-center">
          <span
            className={`font-mono text-6xl font-black tracking-tight transition-colors ${
              connected ? 'text-amber-300' : 'text-text-muted'
            }`}
          >
            {value}
            <span className="text-2xl text-text-muted">%</span>
          </span>
          <span className="mt-1 text-xs text-text-muted">
            {state.busyWrites ? 'Sending…' : connected ? 'Transmitting BRIGHTNESS:x levels' : 'Preview only — connect first'}
          </span>
        </div>
        <input
          type="range"
          className="slider"
          style={{ '--track-accent': dialColor, '--track-progress': `${value}%` } as React.CSSProperties}
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => change(Number(e.target.value))}
          aria-label="LED brightness"
        />
        <div className="mt-5 grid grid-cols-5 gap-2">
          {STEPS.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => change(step)}
              className={`h-11 rounded-xl text-[13px] font-bold transition active:scale-95 ${
                value === step
                  ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/50'
                  : 'bg-surface-2 text-text-muted hover:text-text'
              }`}
            >
              {step}%
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
