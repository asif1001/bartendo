import { useMemo, useState } from 'react';
import type { BluetoothManager, BluetoothState } from '../services/bluetooth/BluetoothManager';
import { PRESET_COLOURS, setRGB } from '../services/bluetooth/BLECommands';
import { BluetoothError } from '../types/bluetooth';
import {
  ColorPreview,
  HexInput,
  PresetGrid,
  RGBSliders,
  RecentSwatches,
} from '../components/ColorControls';
import { Card, CardTitle } from '../components/Card';
import { CONTROL_DEBOUNCE_MS } from '../services/bluetooth/BLEConstants';
import { debounce } from '../utils/timing';
import { rgbToHex, type RGB } from '../utils/color';

interface ColorPageProps {
  manager: BluetoothManager;
  state: BluetoothState;
  recentColours: string[];
  pushRecentColour: (hex: string) => void;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

/** Screen 2 — colour selection and live preview. */
export function ColorPage({ manager, state, recentColours, pushRecentColour, notify }: ColorPageProps) {
  const [rgb, setRgb] = useState<RGB>([255, 0, 0]);
  const connected = state.connectionState === 'connected';

  const sendPending = useMemo(
    () =>
      debounce((target: RGB) => {
        const command = setRGB(...target);
        manager
          .sendCommand(command)
          .then(() => pushRecentColour(rgbToHex(target)))
          .catch((error: unknown) => {
            if (error instanceof BluetoothError && error.code === 'not-connected') {
              notify('error', 'Connect to the ESP32 before changing colours.');
            }
            // Write failures surface through the manager's toast channel.
          });
      }, CONTROL_DEBOUNCE_MS),
    [manager, pushRecentColour, notify],
  );

  const change = (next: RGB) => {
    setRgb(next);
    if (connected) {
      sendPending(next);
    }
  };

  const hex = rgbToHex(rgb);

  return (
    <div className="animate-rise space-y-4">
      <Card className="pt-6 pb-7">
        {!connected && (
          <p className="mt-1 mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-center text-[12px] text-amber-200">
            Connect on the Dashboard first — LED controls transmit once the link is live.
          </p>
        )}
        <ColorPreview
          rgb={rgb}
          label={state.busyWrites ? 'Sending…' : connected ? 'Ready to transmit' : 'Preview only'}
        />
      </Card>

      <Card>
        <CardTitle icon={<span className="h-4 w-4 rounded bg-sky-500/40" />}>Colour picker</CardTitle>
        <HexInput rgb={rgb} onChange={change} />
        <div className="mt-5">
          <RGBSliders rgb={rgb} onChange={change} />
        </div>
        <div className="mt-4">
          <RecentSwatches
            colours={recentColours}
            disabled={!connected}
            onSelect={(selectedHex) => {
              const raw = selectedHex.replace('#', '').toUpperCase();
              const next: RGB = [
                parseInt(raw.slice(0, 2), 16),
                parseInt(raw.slice(2, 4), 16),
                parseInt(raw.slice(4, 6), 16),
              ];
              if (!raw.split('').some((c) => Number.isNaN(parseInt(c, 16)))) {
                change(next);
              }
            }}
          />
        </div>
      </Card>

      <PresetGrid
        presets={PRESET_COLOURS.map((p) => ({ name: p.name, rgb: p.rgb as RGB }))}
        activeHex={hex}
        onSelect={change}
        disabled={!connected}
      />
    </div>
  );
}
