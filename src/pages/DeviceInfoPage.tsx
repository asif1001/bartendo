import type { BluetoothManager, BluetoothState } from '../services/bluetooth/BluetoothManager';
import { CHARACTERISTIC_UUID, DEVICE_NAME, SERVICE_UUID } from '../services/bluetooth/BLEConstants';
import { Card, CardTitle } from '../components/Card';
import { Clipboard, Server, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { timeAgo } from '../utils/format';

interface DeviceInfoPageProps {
  manager: BluetoothManager;
  state: BluetoothState;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-outline-soft py-3 last:border-b-0">
      <span className="shrink-0 text-[12px] font-semibold tracking-wide text-text-muted uppercase">
        {label}
      </span>
      <span className={`min-w-0 text-right text-[14px] text-text ${mono ? 'font-mono text-[12px] break-all' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}

function copy(text: string, notify: DeviceInfoPageProps['notify']) {
  void navigator.clipboard
    ?.writeText(text)
    .then(() => notify('success', 'Copied to clipboard.'))
    .catch(() => notify('info', text));
}

/** Screen 5 — connection + protocol details. */
export function DeviceInfoPage({ state, notify }: DeviceInfoPageProps) {
  const platform = Capacitor.isNativePlatform() ? `Native app (${Capacitor.getPlatform()})` : 'Web browser (PWA)';

  return (
    <div className="animate-rise space-y-4">
      <Card>
        <CardTitle icon={<Server className="h-4 w-4 text-sky-400" />}>Device</CardTitle>
        <Row label="Device name" value={state.connectedDevice?.name ?? DEVICE_NAME} />
        <Row
          label="Connection"
          value={
            state.connectionState === 'connected'
              ? `Connected via ${state.transportLabel}`
              : reconnectText(state)
          }
        />
        <Row label="Device ID" value={state.connectedDevice?.id ?? '—'} mono />
        <div className="mt-2 space-y-2">
          <CopyRow label="Service UUID" value={SERVICE_UUID} onCopy={() => copy(SERVICE_UUID, notify)} />
          <CopyRow
            label="Characteristic UUID"
            value={CHARACTERISTIC_UUID}
            onCopy={() => copy(CHARACTERISTIC_UUID, notify)}
          />
        </div>
      </Card>

      <Card>
        <CardTitle icon={<Smartphone className="h-4 w-4 text-sky-400" />}>App & activity</CardTitle>
        <Row label="Platform" value={platform} />
        <Row label="Last command sent" value={state.lastCommand ?? '—'} mono />
        <Row label="Last successful write" value={timeAgo(state.lastCommandAt)} />
        <Row label="Write queue" value={state.busyWrites ? 'Busy — pacing writes' : 'Idle'} />
      </Card>

      <Card>
        <CardTitle icon={<Clipboard className="h-4 w-4 text-sky-400" />}>Protocol</CardTitle>
        <ul className="space-y-1.5 font-mono text-[12px] leading-relaxed text-text-muted">
          <li>ON — switch LED on</li>
          <li>OFF — switch LED off</li>
          <li>RGB:R,G,B — 0-255 channels</li>
          <li>BRIGHTNESS:0-100 — percent</li>
        </ul>
      </Card>
    </div>
  );
}

function reconnectText(state: BluetoothState): string {
  switch (state.connectionState) {
    case 'connecting':
      return 'Connecting…';
    case 'scanning':
      return 'Scanning…';
    case 'disconnected':
      return state.reconnecting ? `Reconnecting (attempt ${state.reconnectAttempt}/3)` : 'Disconnected';
    default:
      return state.connectionState;
  }
}

function CopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-outline-soft bg-surface-2/60 px-3 py-2.5 text-left transition hover:border-sky-400/40"
    >
      <span className="min-w-0">
        <span className="block text-[10px] font-bold tracking-widest text-text-muted uppercase">
          {label}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-text">{value}</span>
      </span>
      <Clipboard className="h-4 w-4 shrink-0 text-text-muted opacity-60 transition group-hover:opacity-100" />
    </button>
  );
}
