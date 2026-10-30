import { useState } from 'react';
import type { BluetoothManager, BluetoothState } from '../services/bluetooth/BluetoothManager';
import { ColorPage } from './ColorPage';
import { BrightnessPage } from './BrightnessPage';
import { PowerPage } from './PowerPage';
import { cn } from '../utils/format';

type LightsSection = 'colour' | 'brightness' | 'power';

const SECTIONS: Array<{ id: LightsSection; label: string }> = [
  { id: 'colour', label: 'Colour' },
  { id: 'brightness', label: 'Brightness' },
  { id: 'power', label: 'Power' },
];

interface LightsPageProps {
  manager: BluetoothManager;
  state: BluetoothState;
  recentColours: string[];
  pushRecentColour: (hex: string) => void;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

/** All LED control in one tab: colour, brightness and power sections. */
export function LightsPage(props: LightsPageProps) {
  const [section, setSection] = useState<LightsSection>('colour');

  return (
    <div className="animate-rise space-y-4">
      <div className="flex rounded-2xl border border-outline bg-surface p-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              'h-10 flex-1 rounded-xl text-[13px] font-bold transition',
              section === s.id ? 'bg-sky-500 text-slate-950' : 'text-text-muted',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'colour' && (
        <ColorPage
          manager={props.manager}
          state={props.state}
          recentColours={props.recentColours}
          pushRecentColour={props.pushRecentColour}
          notify={props.notify}
        />
      )}
      {section === 'brightness' && (
        <BrightnessPage manager={props.manager} state={props.state} notify={props.notify} />
      )}
      {section === 'power' && (
        <PowerPage manager={props.manager} state={props.state} notify={props.notify} />
      )}
    </div>
  );
}
