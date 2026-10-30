/**
 * Shared Bluetooth type definitions.
 *
 * UI code depends only on these types — never directly on a specific
 * transport implementation (Web Bluetooth or Capacitor native BLE).
 */

/** Connection lifecycle states reported by BluetoothManager. */
export type ConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected';

/** Error codes emitted across all transports — mapped to friendly UI messages. */
export type BluetoothErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'disabled'
  | 'device-not-found'
  | 'timeout'
  | 'service-not-found'
  | 'characteristic-not-found'
  | 'write-failed'
  | 'not-connected'
  | 'disconnected';

export class BluetoothError extends Error {
  readonly code: BluetoothErrorCode;

  constructor(code: BluetoothErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'BluetoothError';
    this.code = code;
  }
}

/** Platform-agnostic description of a discovered BLE device. */
export interface DiscoveredDevice {
  /** Handle used to connect (mac address on Android, UUID on iOS, Device.id on web). */
  id: string;
  /** Advertised name, if the device provides one. */
  name: string;
  /** Signal strength in dBm when known. */
  rssi?: number;
}

/** Immutable platform/user context needed by transports. */
export interface TransportConfig {
  deviceName: string;
  serviceUuid: string;
  characteristicUuid: string;
  connectTimeoutMs: number;
  scanTimeoutMs: number;
  onDeviceLost: (deviceId: string) => void;
}

/**
 * Minimal contract every transport obeys. The BluetoothManager uses this
 * interface so the UI never knows which BLE stack is active.
 */
export interface BluetoothTransport {
  /** Human-readable transport label for Device Info. */
  readonly label: string;
  /** True when this transport can theoretically run on the current platform. */
  isSupported(): Promise<boolean>;
  /** Rotary knob the manager checks before scanning (permission prompts excluded). */
  ensureReady(): Promise<void>;
  /** Start a scan. When `timeoutMs` elapses the transport itself stops scanning. */
  startScan(timeoutMs: number, onDevice: (device: DiscoveredDevice) => void): Promise<void>;
  stopScan(): Promise<void>;
  /**
   * Connect to a device, discover service + characteristic, and verify the
   * characteristic supports writing. Resolves only once fully usable.
   */
  connect(deviceId: string, name?: string): Promise<void>;
  /** Disconnect the currently connected device (no-op when already down). */
  disconnect(): Promise<void>;
  /** Write UTF-8 text to the configured characteristic. Serialise writes at call site. */
  write(text: string): Promise<void>;
  /** True when a device is currently connected through this transport instance. */
  isConnected(): boolean;
  /** Device id of the active connection (null while disconnected). */
  getConnectedId(): string | null;
  /** Advertised name of the connected device, best effort. */
  getConnectedName(): string | null;
  /** Tear down listeners and disconnect any open link. */
  dispose(): Promise<void>;
}
