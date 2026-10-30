/**
 * BluetoothManager.ts
 *
 * The single orchestration point for BLE. Owns:
 *  - transport selection (native Capacitor BLE inside the app, Web Bluetooth in the browser)
 *  - connection state machine exposed to React via subscribe()/getSnapshot()
 *  - serialised, paced command queue (never overlapping GATT writes)
 *  - connection timeout, unexpected-disconnect handling and auto-reconnect
 */

import {
  BluetoothError,
  type ConnectionState,
  type DiscoveredDevice,
  type TransportConfig,
} from '../../types/bluetooth';
import type { AppSettings, RememberedDevice } from '../../types/settings';
import {
  CONNECT_TIMEOUT_MS,
  DEVICE_NAME,
  SCAN_TIMEOUT_MS,
  WRITE_INTERVAL_MS,
} from './BLEConstants';
import { assertConnected } from './BLECommands';
import { NativeBluetoothTransport } from './NativeBluetoothTransport';
import { WebBluetoothTransport } from './WebBluetoothTransport';

export type AvailabilityStatus = 'checking' | 'native' | 'web' | 'unavailable';

export interface BluetoothState {
  connectionState: ConnectionState;
  /** True once the transport choice and capability check have finished. */
  availabilityChecked: boolean;
  availability: AvailabilityStatus;
  transportLabel: string;
  /** Active scan window. */
  scanning: boolean;
  devices: DiscoveredDevice[];
  connectedDevice: DiscoveredDevice | null;
  reconnecting: boolean;
  reconnectAttempt: number;
  /** Text of the last command sent (or attempted). */
  lastCommand: string | null;
  /** ISO timestamp of the last successful write. */
  lastCommandAt: string | null;
  busyWrites: boolean;
}

export type ManagerEvent =
  | { type: 'error'; message: string }
  | { type: 'success'; message: string }
  | { type: 'info'; message: string };

interface ManagerOptions {
  /** Persist (or clear) the "last connected device". */
  onRememberDevice: (device: RememberedDevice | null) => void;
  /** Read the stored "last connected device". */
  onGetRememberedDevice: () => RememberedDevice | null;
}

interface TimeoutHandle {
  promise: Promise<never>;
  cancel: () => void;
}

const connectTimeout = (ms: number): TimeoutHandle => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new BluetoothError('timeout', 'The device did not answer in time.')),
      ms,
    );
  });
  return { promise, cancel: () => timer !== undefined && clearTimeout(timer) };
};

const RECONNECT_DELAYS_MS = [2_000, 5_000, 10_000];

export class BluetoothManager {
  private readonly options: ManagerOptions;
  private settings: AppSettings;
  private transport: NativeBluetoothTransport | WebBluetoothTransport | null = null;
  private readonly listeners = new Set<() => void>();
  private state: BluetoothState;
  private writeQueue: Promise<void> = Promise.resolve();
  private lastWriteAt = 0;
  private reconnectTimers: ReturnType<typeof setTimeout>[] = [];
  private disposed = false;
  private eventListener: ((event: ManagerEvent) => void) | null = null;

  constructor(options: ManagerOptions, settings: AppSettings) {
    this.options = options;
    this.settings = settings;
    this.state = {
      connectionState: 'disconnected',
      availabilityChecked: false,
      availability: 'checking',
      transportLabel: '—',
      scanning: false,
      devices: [],
      connectedDevice: null,
      reconnecting: false,
      reconnectAttempt: 0,
      lastCommand: null,
      lastCommandAt: null,
      busyWrites: false,
    };
    void this.selectTransport();
  }

  /* ---------------------------------------------------------------- store */

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): BluetoothState => this.state;

  private setState(patch: Partial<BluetoothState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** UI hook for toast/notification events; manager itself stays UI-agnostic. */
  setEventListener(listener: ((event: ManagerEvent) => void) | null): void {
    this.eventListener = listener;
  }

  private fire(event: ManagerEvent): void {
    this.eventListener?.(event);
  }

  /* ------------------------------------------------------------- settings */

  applySettings(next: AppSettings): void {
    this.settings = next;
    if (!next.rememberDevice) {
      this.options.onRememberDevice(null);
    }
  }

  /* ------------------------------------------------------------ transport */

  private async selectTransport(): Promise<void> {
    const config: TransportConfig = {
      deviceName: DEVICE_NAME,
      serviceUuid: '',
      characteristicUuid: '',
      connectTimeoutMs: CONNECT_TIMEOUT_MS,
      scanTimeoutMs: SCAN_TIMEOUT_MS,
      onDeviceLost: () => {
        void this.handleUnexpectedDisconnect();
      },
    };
    // Transports read BLEConstants directly for UUIDs; config keeps the shape.
    void config.serviceUuid;
    void config.characteristicUuid;

    const native = new NativeBluetoothTransport(config);
    const web = new WebBluetoothTransport(config);

    try {
      if (await native.isSupported()) {
        this.transport = native;
      } else if (await web.isSupported()) {
        this.transport = web;
      } else {
        this.transport = null;
      }
    } catch {
      this.transport = null;
    }

    if (this.transport === native) {
      this.setState({ availability: 'native', transportLabel: native.label, availabilityChecked: true });
    } else if (this.transport === web) {
      this.setState({ availability: 'web', transportLabel: web.label, availabilityChecked: true });
    } else {
      this.setState({
        availability: 'unavailable',
        transportLabel: '—',
        availabilityChecked: true,
      });
      this.fire({
        type: 'error',
        message:
          'Bluetooth is not available here. Open the PWA in Chrome/Edge, or install the Android/iOS app for native BLE.',
      });
    }
  }

  /* ----------------------------------------------------------------- scan */

  async scan(): Promise<DiscoveredDevice[]> {
    if (!this.transport) {
      throw new BluetoothError('unsupported', 'No Bluetooth transport available.');
    }
    if (this.state.scanning) return this.state.devices;

    this.setState({ devices: [], scanning: true, connectionState: 'scanning' });
    try {
      const scanComplete = new Promise<void>((resolve) => {
        setTimeout(resolve, SCAN_TIMEOUT_MS);
      });
      // On Web Bluetooth this surfaces the browser chooser selection instantly;
      // on native it runs a real LE window filtered by the device name prefix.
      await Promise.allSettled([
        this.transport.startScan(SCAN_TIMEOUT_MS, (device) => {
          const rest = this.state.devices.filter((d) => d.id !== device.id);
          this.setState({ devices: [...rest, device] });
        }),
        scanComplete,
      ]);
      await this.transport.stopScan();

      if (this.state.connectionState === 'scanning') {
        this.setState({ connectionState: 'disconnected', scanning: false });
      }

      const found = this.state.devices.length;
      if (found === 0) {
        this.fire({
          type: 'info',
          message: 'Scan finished — no devices found. Make sure the ESP32 is powered on.',
        });
      } else {
        this.fire({
          type: 'success',
          message: `Scan finished — ${found} device${found > 1 ? 's' : ''} found.`,
        });
      }
      return this.state.devices;
    } catch (error) {
      this.setState({ connectionState: 'disconnected', scanning: false });
      throw error;
    }
  }

  cancelScan(): void {
    if (!this.state.scanning) return;
    void this.transport?.stopScan();
    this.setState({ connectionState: 'disconnected', scanning: false });
  }

  /** Connect straight to the browser-chooser selection (Web Bluetooth flow). */
  async connectPickedDevice(device: DiscoveredDevice): Promise<void> {
    this.setState({ devices: [device], scanning: false, connectionState: 'disconnected' });
    await this.connect(device.id, device.name);
  }

  /* -------------------------------------------------------------- connect */

  async connect(deviceId: string, name?: string): Promise<void> {
    if (!this.transport) {
      throw new BluetoothError('unsupported', 'No Bluetooth transport available.');
    }
    if (this.state.connectionState === 'connected') {
      await this.disconnect(false);
    }

    this.setState({ connectionState: 'connecting', reconnecting: false, reconnectAttempt: 0 });
    const race = connectTimeout(CONNECT_TIMEOUT_MS);
    try {
      await Promise.race([this.transport.connect(deviceId, name), race.promise]);
      race.cancel();

      const device: DiscoveredDevice = {
        id: deviceId,
        name: this.transport.getConnectedName() ?? name ?? DEVICE_NAME,
      };
      this.setState({
        connectionState: 'connected',
        connectedDevice: device,
        lastCommand: null,
        lastCommandAt: null,
      });

      if (this.settings.rememberDevice) {
        this.options.onRememberDevice({ id: deviceId, name: device.name });
      }

      if (this.settings.defaultBrightness !== 50) {
        void this.sendCommand(`BRIGHTNESS:${this.settings.defaultBrightness}`);
      }

      this.fire({ type: 'success', message: `Connected to ${device.name}` });
    } catch (error) {
      race.cancel();
      await this.transport.disconnect().catch(() => undefined);
      this.setState({ connectionState: 'disconnected', connectedDevice: null });
      throw error;
    }
  }

  async disconnect(userInitiated = true): Promise<void> {
    this.cancelReconnect();
    const device = this.state.connectedDevice;
    await this.transport?.disconnect();
    this.setState({
      connectionState: 'disconnected',
      connectedDevice: null,
      reconnecting: false,
      reconnectAttempt: 0,
    });
    if (userInitiated && device) {
      this.fire({ type: 'info', message: `Disconnected from ${device.name}` });
      this.options.onRememberDevice(null);
    }
  }

  /* ------------------------------------------------------------- commands */

  /** Queue a text command. Writes are strictly serial and paced — a UI can
   *  call this rapidly without flooding the stack. Rejects when disconnected. */
  sendCommand(command: string): Promise<void> {
    const attempt = this.writeQueue.then(async () => {
      assertConnected(this.state.connectionState === 'connected');
      const now = Date.now();
      if (now - this.lastWriteAt < WRITE_INTERVAL_MS) {
        await new Promise((r) =>
          setTimeout(r, WRITE_INTERVAL_MS - (now - this.lastWriteAt)),
        );
      }

      this.setState({ busyWrites: true });
      try {
        await this.transport!.write(command);
        this.lastWriteAt = Date.now();
        this.setState({
          busyWrites: false,
          lastCommand: command,
          lastCommandAt: new Date().toISOString(),
        });
      } catch (error) {
        this.setState({ busyWrites: false });
        if (error instanceof BluetoothError && error.code === 'disconnected') {
          this.setState({ connectionState: 'disconnected', connectedDevice: null });
          this.fire({ type: 'error', message: 'A write failed — the link dropped.' });
          void this.handleUnexpectedDisconnect();
        }
        throw error;
      }
    });

    // Queue robustness: a failed write must not poison following commands.
    this.writeQueue = attempt.catch(() => undefined);
    this.setState({ lastCommand: command });
    return attempt;
  }

  clearLastCommand(): void {
    this.setState({ lastCommand: null, lastCommandAt: null });
  }

  /* --------------------------------------------------------- reconnection */

  private async handleUnexpectedDisconnect(): Promise<void> {
    if (this.disposed) return;
    if (this.state.connectionState !== 'connected') return;

    const lostDevice = { ...this.state.connectedDevice! };
    this.setState({ connectionState: 'disconnected', connectedDevice: null });
    this.fire({ type: 'error', message: `${lostDevice.name} disconnected unexpectedly.` });

    if (!this.settings.autoReconnect) return;

    const remembered = this.options.onGetRememberedDevice();
    if (!remembered) {
      this.fire({
        type: 'info',
        message: 'Tip: enable “Remember last device” in Settings for auto-reconnect.',
      });
      return;
    }
    if (this.transport instanceof WebBluetoothTransport) {
      // The browser silently forgets granted devices; manual re-pick is needed.
      this.fire({
        type: 'info',
        message: 'Reconnect from the Bluetooth card — the browser requires a fresh selection.',
      });
      return;
    }

    this.setState({ reconnecting: true, reconnectAttempt: 0 });
    RECONNECT_DELAYS_MS.forEach((delay, index) => {
      const timer = setTimeout(async () => {
        if (this.disposed) return;
        if (this.state.connectionState !== 'disconnected') {
          this.setState({ reconnecting: false, reconnectAttempt: 0 });
          return;
        }
        this.setState({ reconnectAttempt: index + 1 });
        try {
          await this.connect(remembered.id, remembered.name);
          this.setState({
            reconnecting: false,
            reconnectAttempt: 0,
          });
        } catch {
          if (index === RECONNECT_DELAYS_MS.length - 1) {
            this.setState({ reconnecting: false, reconnectAttempt: 0 });
            this.fire({
              type: 'error',
              message: 'Auto-reconnect failed. Tap Reconnect to try manually.',
            });
          }
        }
      }, delay);
      this.reconnectTimers.push(timer);
    });
  }

  private cancelReconnect(): void {
    this.reconnectTimers.forEach(clearTimeout);
    this.reconnectTimers = [];
    this.setState({ reconnecting: false, reconnectAttempt: 0 });
  }

  /* -------------------------------------------------------------- dispose */

  async dispose(): Promise<void> {
    this.disposed = true;
    this.cancelReconnect();
    await this.transport?.dispose();
  }
}
