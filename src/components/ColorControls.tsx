import { useState } from 'react';
import type { RGB } from '../utils/color';
import { rgbToHex } from '../utils/color';
import { Card, CardTitle } from './Card';
import { Palette } from 'lucide-react';

interface ColorPreviewProps {
  rgb: RGB;
  label: string;
}

/** Large live colour orb with a glow that transitions smoothly. */
export function ColorPreview({ rgb, label }: ColorPreviewProps) {
  const hex = rgbToHex(rgb);
  return (
    <div className="flex flex-col items-center">
      <div
        className="h-44 w-44 rounded-full transition-colors duration-500 ease-out"
        style={{
          backgroundColor: hex,
          boxShadow: `0 0 60px 10px color-mix(in srgb, ${hex} 55%, transparent), 0 0 140px 30px color-mix(in srgb, ${hex} 28%, transparent), inset 0 0 40px rgb(255 255 255 / 0.12)`,
        }}
      />
      <p className="mt-4 font-mono text-xl font-bold tracking-widest text-text">{hex}</p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
    </div>
  );
}

interface RGBSlidersProps {
  rgb: RGB;
  onChange: (rgb: RGB) => void;
  disabled?: boolean;
}

const CHANNELS: Array<{ key: 0 | 1 | 2; label: string; accent: string }> = [
  { key: 0, label: 'Red', accent: '#ef4444' },
  { key: 1, label: 'Green', accent: '#22c55e' },
  { key: 2, label: 'Blue', accent: '#3b82f6' },
];

export function RGBSliders({ rgb, onChange, disabled }: RGBSlidersProps) {
  return (
    <div className="space-y-1">
      {CHANNELS.map(({ key, label, accent }) => (
        <label key={label} className="block">
          <span className="mb-0.5 flex items-center justify-between text-[13px] font-semibold">
            <span style={{ color: accent }}>{label}</span>
            <span className="font-mono text-text-muted">{rgb[key]}</span>
          </span>
          <input
            type="range"
            className="slider"
            style={
              {
                '--track-accent': accent,
                '--track-progress': `${(rgb[key] / 255) * 100}%`,
              } as React.CSSProperties
            }
            value={rgb[key]}
            min={0}
            max={255}
            step={1}
            disabled={disabled}
            onChange={(e) => {
              const next = [...rgb] as RGB;
              next[key] = Number(e.target.value);
              onChange(next);
            }}
          />
        </label>
      ))}
    </div>
  );
}

interface HexInputProps {
  rgb: RGB;
  onChange: (rgb: RGB) => void;
  disabled?: boolean;
}

export function HexInput({ rgb, onChange, disabled }: HexInputProps) {
  const [text, setText] = useState(rgbToHex(rgb));
  const committed = rgbToHex(rgb);
  if (text.replace('#', '').toUpperCase() !== committed.slice(1)) {
    // Keep input in sync when colour changes elsewhere (presets, sliders).
    setText(committed);
  }

  const apply = (value: string) => {
    const raw = value.trim();
    const candidate = raw.startsWith('#') ? raw : `#${raw}`;
    const re = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;
    if (re.test(candidate) && !disabled) {
      let hex6 = candidate.slice(1);
      if (hex6.length === 3) {
        hex6 = hex6.split('').map((c) => c + c).join('');
      }
      const r = parseInt(hex6.slice(0, 2), 16);
      const g = parseInt(hex6.slice(2, 4), 16);
      const b = parseInt(hex6.slice(4, 6), 16);
      onChange([r, g, b]);
      setText(rgbToHex([r, g, b]));
    } else {
      setText(committed);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply(text);
      }}
      className="flex items-center gap-3"
    >
      <input
        type="color"
        aria-label="Colour picker"
        value={committed}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          onChange([
            parseInt(v.slice(1, 3), 16),
            parseInt(v.slice(3, 5), 16),
            parseInt(v.slice(5, 7), 16),
          ]);
        }}
        className="h-11 w-14 shrink-0 rounded-full"
      />
      <div className="relative flex-1">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-text-muted">
          #
        </span>
        <input
          inputMode="text"
          autoCapitalize="characters"
          className="h-11 w-full rounded-2xl border border-outline bg-surface-2 pl-8 pr-3 font-mono text-[15px] font-semibold text-text outline-none transition focus:border-sky-400/60"
          value={text.replace('#', '')}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => apply(text)}
        />
      </div>
    </form>
  );
}

interface PresetGridProps {
  presets: Array<{ name: string; rgb: RGB }>;
  activeHex: string;
  onSelect: (rgb: RGB) => void;
  disabled?: boolean;
}

export function PresetGrid({ presets, activeHex, onSelect, disabled }: PresetGridProps) {
  return (
    <Card>
      <CardTitle icon={<Palette className="h-4 w-4 text-sky-400" />}>Presets</CardTitle>
      <div className="grid grid-cols-5 gap-2.5">
        {presets.map((preset) => {
          const hex = rgbToHex(preset.rgb);
          const active = hex === activeHex;
          return (
            <button
              key={preset.name}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(preset.rgb)}
              title={preset.name}
              className={cnSelf(active)}
            >
              <span
                className="block h-10 w-full rounded-xl border-2 transition"
                style={{
                  backgroundColor: hex,
                  borderColor: active ? '#ffffff' : 'rgb(255 255 255 / 0.15)',
                  boxShadow: active ? `0 0 16px color-mix(in srgb, ${hex} 70%, transparent)` : undefined,
                }}
              />
              <span className="mt-1 block truncate text-[10px] text-text-muted">{preset.name}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function cnSelf(active: boolean): string {
  return [
    'flex flex-col items-center rounded-2xl p-1.5 transition active:scale-95 disabled:opacity-40',
    active ? 'bg-surface-2 ring-1 ring-sky-400/50' : 'hover:bg-surface-2/60',
  ].join(' ');
}

interface RecentSwatchesProps {
  colours: string[];
  onSelect: (hex: string) => void;
  disabled?: boolean;
}

export function RecentSwatches({ colours, onSelect, disabled }: RecentSwatchesProps) {
  if (colours.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold tracking-widest text-text-muted uppercase">Recent</span>
      <div className="flex flex-1 flex-wrap gap-2">
        {colours.map((hex, i) => (
          <button
            key={`${hex}-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(hex)}
            aria-label={`Recent colour ${hex}`}
            className="h-9 w-9 rounded-full border-2 border-white/15 transition active:scale-90 disabled:opacity-40"
            style={{ backgroundColor: hex, boxShadow: `0 0 12px color-mix(in srgb, ${hex} 45%, transparent)` }}
          />
        ))}
      </div>
    </div>
  );
}
