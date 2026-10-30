import { useEffect, useRef, useState } from 'react';
import { CupSoda, Info, Package, Settings } from 'lucide-react';
import { BluetoothManager, type ManagerEvent } from './services/bluetooth/BluetoothManager';
import { BluetoothIndicator } from './components/BluetoothIndicator';
import { TabBar, type TabSpec } from './components/TabBar';
import { Toasts, type ToastEntry } from './components/Toasts';
import { useBluetooth } from './hooks/useBluetooth';
import { useSettings } from './hooks/useSettings';
import { useFavourites, useInventory } from './hooks/useLocalStorage';
import type { DrinkDose, PourPlan } from './types/bar';
import { MenuPage } from './pages/MenuPage';
import { DrinkDetailPage } from './pages/DrinkDetailPage';
import { PourPage } from './pages/PourPage';
import { ShelvesPage } from './pages/ShelvesPage';
import { DeviceInfoPage } from './pages/DeviceInfoPage';
import { SettingsPage } from './pages/SettingsPage';
import { DRINKS } from './data/drinks';

type TabId = 'menu' | 'shelves' | 'device' | 'settings';

const TABS: Array<TabSpec<TabId>> = [
  { id: 'menu', label: 'Menu', icon: CupSoda },
  { id: 'shelves', label: 'Shelves', icon: Package },
  { id: 'device', label: 'Device', icon: Info },
  { id: 'settings', label: 'Setup', icon: Settings },
];

/** In-tab navigation stack for the Menu flow: catalog → drink → pour. */
type MenuView =
  | { kind: 'catalog' }
  | { kind: 'drink'; drinkId: string }
  | { kind: 'pour'; plan: PourPlan; doses: DrinkDose[] };

let toastCounter = 0;

export default function App() {
  const { settings, updateSettings, setLastDevice, recentColours, clearRecentColours } =
    useSettings();
  const { pumps, updatePump } = useInventory();
  const { isFavourite, toggleFavourite } = useFavourites();

  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [tab, setTab] = useState<TabId>('menu');
  const [menuView, setMenuView] = useState<MenuView>({ kind: 'catalog' });
  const menuStack = useRef<MenuView[]>([]);

  const pushMenuView = (next: MenuView) => {
    menuStack.current.push(menuView);
    setMenuView(next);
  };
  const popMenuView = () => {
    const prev = menuStack.current.pop();
    setMenuView(prev ?? { kind: 'catalog' });
  };

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

  // When Bluetooth drops mid-pour, bail out of the pour view to the catalog.
  useEffect(() => {
    if (state.connectionState === 'disconnected' && menuView.kind === 'pour') {
      setMenuView((prev) => (prev.kind === 'pour' ? { kind: 'catalog' } : prev));
      menuStack.current = [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.connectionState]);

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
            ASIF Bartender
          </h1>
          <p className="text-[11px] text-text-muted">ESP32-S3 · 8 pumps · Bluetooth</p>
        </div>
        <BluetoothIndicator state={state} showLabel={false} />
      </header>

      <main className="pt-1">
        {tab === 'menu' && (
          <>
            {menuView.kind === 'catalog' && (
              <MenuPage
                btState={state}
                pumps={pumps}
                isFavourite={isFavourite}
                toggleFavourite={toggleFavourite}
                onOpenDrink={(drinkId) => pushMenuView({ kind: 'drink', drinkId })}
              />
            )}
            {menuView.kind === 'drink' && (() => {
              const drink = DRINKS.find((d) => d.id === menuView.drinkId);
              if (!drink) {
                setMenuView({ kind: 'catalog' });
                return null;
              }
              return (
                <DrinkDetailPage
                  manager={manager}
                  btState={state}
                  drink={drink}
                  pumps={pumps}
                  notify={notify}
                  onBack={popMenuView}
                  onStartPour={(plan, doses) => pushMenuView({ kind: 'pour', plan, doses })}
                />
              );
            })()}
            {menuView.kind === 'pour' && (
              <PourPage
                manager={manager}
                plan={menuView.plan}
                doses={menuView.doses}
                pumpsUsed={pumps}
                notify={notify}
                onDone={() => setMenuView({ kind: 'catalog' })}
              />
            )}
          </>
        )}

        {tab === 'shelves' && (
          <ShelvesPage
            manager={manager}
            state={state}
            pumps={pumps}
            updatePump={updatePump}
            notify={notify}
          />
        )}

        {tab === 'device' && <DeviceInfoPage manager={manager} state={state} notify={notify} />}

        {tab === 'settings' && (
          <SettingsPage
            manager={manager}
            state={state}
            settings={settings}
            updateSettings={updateSettings}
            pumps={pumps}
            updatePump={updatePump}
            recentColours={recentColours}
            clearRecentColours={clearRecentColours}
            notify={notify}
          />
        )}
      </main>

      <div className="h-4" />
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
    </div>
  );
}
