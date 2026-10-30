import { useState } from 'react';
import {
  AlertTriangle,
  Bluetooth,
  ChevronRight,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Wifi,
  X,
} from 'lucide-react';
import type {
  BluetoothManager,
  BluetoothState,
} from '../services/bluetooth/BluetoothManager';
import { BluetoothError } from '../types/bluetooth';
import { DEVICE_NAME } from '../services/bluetooth/BLEConstants';
import { cn } from '../utils/format';
import { Card, CardTitle } from './Card';

interface BluetoothCardProps {
  manager: BluetoothManager;
  state: BluetoothState;
  lastDevice: { id: string; name: string } | null;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

function friendlyError(error: unknown): string {
  if (error instanceof BluetoothError) {
    switch (error.code) {
      case 'unsupported':
        return 'Bluetooth is not supported in this environment.';
      case 'permission-denied':
        return 'Bluetooth permission was denied. Enable it in system settings.';
      case 'disabled':
        return 'Bluetooth is turned off. Please enable Bluetooth and try again.';
      case 'device-not-found':
        return 'Device not found. Make sure the ESP32 is powered and in range.';
      case 'timeout':
        return 'Connection timed out. Is the ESP32 still advertising?';
      case 'service-not-found':
        return 'Connected, but the BLE service was not found on the device.';
      case 'characteristic-not-found':
        return 'The BLE characteristic is missing or cannot be written.';
      case 'not-connected':
        return 'Not connected. Connect to the ESP32 first.';
      default:
        return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    if (/denied|permiss/i.test(error.message)) {
      return 'Bluetooth permission was denied. Enable it in system settings.';
    }
    if (/turn(ed)? off|disable/i.test(error.message)) {
      return 'Bluetooth is turned off. Please enable Bluetooth and try again.';
    }
    return error.message;
  }
  return 'An unexpected Bluetooth error occurred.';
}

function isAppleMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Screen 1 — Bluetooth connection cockpit. */
export function BluetoothCard({ manager, state, lastDevice, notify }: BluetoothCardProps) {
  const [acting, setActing] = useState(false);
  const { connectionState, scanning, devices, connectedDevice, availability, availabilityChecked, reconnecting } =
    state;

  const isNative = availability === 'native';
  const connected = connectionState === 'connected';
  const busy = connectionState === 'connecting';

  const run = async (action: () => Promise<void>) => {
    if (acting) return;
    setActing(true);
    try {
      await action();
    } catch (error) {
      notify('error', friendlyError(error));
    } finally {
      setActing(false);
    }
  };

  const handleScan = () =>
    run(async () => {
      const found = await manager.scan();
      // Web Bluetooth: the browser returns a single user-picked device —
      // treat the selection as an immediate connect intent.
      if (!isNative && found.length === 1) {
        await manager.connectPickedDevice(found[0]);
      }
    });

  const handleConnectRemembered = () =>
    run(async () => {
      if (!lastDevice) return;
      try {
        await manager.connect(lastDevice.id, lastDevice.name);
      } catch (error) {
        // On web the remembered id is not re-usable; start a scan instead.
        const isWeb = state.availability === 'web';
        if (isWeb) {
          notify('info', 'Re-run a scan and pick the device in the browser dialog.');
          throw error;
        }
        throw error;
      }
    });

  const statusLine = (() => {
    if (connected && connectedDevice) return `Connected to ${connectedDevice.name}`;
    if (busy) return 'Linking to the ESP32…';
    if (scanning) return isNative ? 'Scanning for BLE devices…' : 'Choose a device in the browser dialog…';
    if (reconnecting) return `Reconnect attempt ${state.reconnectAttempt} of 3…`;
    if (availabilityChecked && availability === 'unavailable')
      return 'Bluetooth unavailable on this platform.';
    return 'Disconnected';
  })();

  return (
    <Card>
      <CardTitle icon={<Bluetooth className="h-4 w-4 text-sky-400" />}>Bluetooth</CardTitle>

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-text">{DEVICE_NAME}</p>
          <p
            className={cn(
              'mt-1 flex items-center gap-2 text-[13px]',
              connected && state.transportLabel !== '—' ? 'text-emerald-300' : 'text-text-muted',
            )}
            aria-live="polite"
          >
            {(scanning || busy || reconnecting) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {statusLine}
          </p>
        </div>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border',
            connected
              ? 'animate-pulse-ring border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
              : 'border-outline bg-surface-2 text-text-muted',
          )}
        >
          {connected ? <Wifi className="h-6 w-6" /> : <Bluetooth className="h-6 w-6" />}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {!connected && (
          <button
            type="button"
            disabled={acting || scanning || busy || !availabilityChecked || availability === 'unavailable'}
            onClick={handleScan}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-sky-500 text-[15px] font-bold text-slate-950 shadow-lg shadow-sky-500/25 transition active:scale-[0.97] disabled:opacity-40"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {scanning ? 'Scanning…' : 'Scan'}
          </button>
        )}
        {lastDevice && !connected && !scanning && (
          <button
            type="button"
            disabled={acting || busy || availability === 'unavailable'}
            onClick={handleConnectRemembered}
            className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-2xl border border-outline bg-surface-2 text-[15px] font-semibold text-text transition active:scale-[0.97] enabled:hover:border-sky-400/50 disabled:opacity-40"
          >
            <Lock className="h-4 w-4 text-sky-400" />
            Reconnect to {lastDevice.name}
          </button>
        )}
        {connected && (
          <button
            type="button"
            disabled={acting}
            onClick={() => run(() => manager.disconnect(true))}
            className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-[15px] font-bold text-rose-300 transition active:scale-[0.97] disabled:opacity-40"
          >
            <X className="h-4 w-4" />
            Disconnect
          </button>
        )}
      </div>

      {/* Discovered devices — native scan list only */}
      {isNative && devices.length > 0 && !connected && (
        <div className="mt-4 rounded-2xl border border-outline-soft bg-surface-2/70 p-2" role="list">
          <p className="px-3 py-2 text-[11px] font-bold tracking-widest text-text-muted uppercase">
            Nearby devices
          </p>
          {devices.map((device) => (
            <button
              key={device.id}
              type="button"
              role="listitem"
              disabled={acting || busy}
              onClick={() =>
                run(async () => {
                  await manager.connect(device.id, device.name);
                })
              }
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition enabled:active:scale-[0.98] enabled:hover:bg-outline-soft disabled:opacity-40"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold text-text">{device.name}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-text-muted">
                  {device.rssi !== undefined ? `${device.rssi} dBm · ` : ''}
                  {device.id}
                </span>
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-sky-400">
                Connect <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      )}

      {availability === 'web' && !isAppleMobile() && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-[12px] leading-snug text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Web browser mode — Safari and iOS Safari do not support Web Bluetooth. For iPhone control
          open this page in a Web BLE browser (e.g. free “Bluefy” app), or use the Capacitor native
          app.
        </p>
      )}
      {availability === 'web' && isAppleMobile() && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5 text-[12px] leading-snug text-emerald-200">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
          iPhone with Web Bluetooth active — you are in a BLE-capable browser (e.g. Bluefy).
          Tap Scan to find <span className="font-semibold">Asif_ESP32_RGB</span>.
        </p>
      )}
      {availabilityChecked && availability === 'unavailable' && (
        <>
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2.5 text-[12px] leading-snug text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            This browser has no Bluetooth capability.
          </p>
          {isAppleMobile() && (
            <p className="mt-2 flex items-start gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2.5 text-[12px] leading-snug text-sky-200">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
              iPhone tip: install the free “Bluefy — Web BLE Browser” app and open
              <span className="font-mono break-all"> {window.location.href} </span>
              in Bluefy — Web Bluetooth works there even though Safari doesn’t support it.
            </p>
          )}
          {!isAppleMobile() && (
            <p className="mt-2 flex items-start gap-2 rounded-xl border border-slate-400/20 bg-slate-500/10 px-3 py-2.5 text-[12px] leading-snug text-slate-300">
              Try Google Chrome or Microsoft Edge, or install the native Android/iOS app
              (see the README for build steps).
            </p>
          )}
        </>
      )}
      {availability === 'native' && (
        <p className="mt-4 flex items-center gap-2 text-[12px] text-text-muted">
          <RefreshCw className="h-3.5 w-3.5" /> Native BLE ({state.transportLabel}) — supports
          background reconnection.
        </p>
      )}
    </Card>
  );
}
