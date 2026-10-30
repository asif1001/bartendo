import { useEffect, useRef, useState } from 'react';
import { Bluetooth, Info, Palette, Settings, Sun, Zap } from 'lucide-react';
import { BluetoothManager, type ManagerEvent } from './services/bluetooth/BluetoothManager';
import { BluetoothIndicator } from './components/BluetoothIndicator';
import { TabBar, type TabSpec } from './components/TabBar';
import { Toasts, type ToastEntry } from './components/Toasts';
import { useBluetooth } from './hooks/useBluetooth';
import { useSettings } from './hooks/useSettings';
import { DashboardPage } from './pages/DashboardPage';
import { ColorPage } from './pages/ColorPage';
import { BrightnessPage } from './pages/BrightnessPage';
import { PowerPage } from './pages/PowerPage';
import { DeviceInfoPage } from './pages/DeviceInfoPage';
import { SettingsPage } from './pages/SettingsPage';

type TabId = 'home' | 'color' | 'brightness' | 'power' | 'device' | 'settings';

const TABS: Array<TabSpec<TabId>> = [
  { id: 'home', label: 'Home', icon: Bluetooth },
  { id: 'color', label: 'Colors', icon: Palette },
  { id: 'brightness', label: 'Bright', icon: Sun },
  { id: 'power', label: 'Power', icon: Zap },
  { id: 'device', label: 'Device', icon: Info },
  { id: 'settings', label: 'Setup', icon: Settings },
];

let toastCounter = 0;

export default function App() {
  const { settings, updateSettings, lastDevice, setLastDevice, recentColours, pushRecentColour, clearRecentColours } =
    useSettings();

  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [tab, setTab] = useState<TabId>('home');

  // Create the manager exactly once (survives StrictMode double-render).
  const managerRef = useRef<BluetoothManager | null>(null);
  if (managerRef.current === null) {
    managerRef.current = new BluetoothManager(
      {
        onRememberDevice: (device) => setLastDevice(device),
        onGetRememberedDevice: () => {
          try {
            const raw = localStorage.getItem('asif-rgb-last-device-v1');
            return raw ? (JSON.parse(raw) as { id: string; name: string } | null) : null;
          } catch {
            return null;
          }
        },
      },
      settings,
    );
  }
  const manager = managerRef.current;
  const state = useBluetooth(manager);

  const notify = useRef((type: 'success' | 'error' | 'info', message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev.slice(-3), { type, message, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }).current;

  // Push settings into the manager as they change.
  useEffect(() => {
    manager.applySettings(settings);
  }, [manager, settings]);

  // Manager → toast channel.
  useEffect(() => {
    const listener = (event: ManagerEvent) => notify(event.type, event.message);
    manager.setEventListener(listener);
    return () => manager.setEventListener(null);
  }, [manager, notify]);

  const shared = { manager, state, notify };

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col px-4 pb-28">
      <Toasts toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <header className="sticky top-0 z-30 -mx-4 flex items-center gap-3 bg-app-bg/80 px-4 py-4 backdrop-blur-xl">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #f43f5e, #f59e0b, #22d3ee, #818cf8)',
            boxShadow: '0 4px 20px rgb(0 0 0 / 0.35)',
          }}
        >
          <span className="text-lg font-black text-slate-950">A</span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] leading-tight font-black tracking-tight">
            ASIF RGB CONTROLLER
          </h1>
          <p className="text-[11px] text-text-muted">ESP32-S3 · Bluetooth Low Energy</p>
        </div>
        <BluetoothIndicator state={state} showLabel={false} />
      </header>

      <main className="pt-1">
        {tab === 'home' && <DashboardPage {...shared} lastDevice={lastDevice} />}
        {tab === 'color' && (
          <ColorPage
            {...shared}
            recentColours={recentColours}
            pushRecentColour={pushRecentColour}
          />
        )}
        {tab === 'brightness' && <BrightnessPage {...shared} />}
        {tab === 'power' && <PowerPage {...shared} />}
        {tab === 'device' && <DeviceInfoPage {...shared} />}
        {tab === 'settings' && (
          <SettingsPage
            {...shared}
            settings={settings}
            updateSettings={updateSettings}
            recentColours={recentColours}
            clearRecentColours={clearRecentColours}
          />
        )}
      </main>

      <div className="h-4" />
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
    </div>
  );
}
