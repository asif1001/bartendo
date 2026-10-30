/**
 * WebBluetoothTransport.ts
 *
 * Web Bluetooth (navigator.bluetooth) transport for browsers that support it:
 * Chrome / Edge / Android WebView. Important: Safari (macOS + iOS) does NOT
 * support Web Bluetooth — on iPhones the app uses the native Capacitor
 * transport instead.
 */

import {
  BluetoothError,
  type BluetoothTransport,
  type DiscoveredDevice,
  type TransportConfig,
} from '../../types/bluetooth';
import { CHARACTERISTIC_UUID, SERVICE_UUID } from './BLEConstants';

interface CachedCharacteristics {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

const encode = new TextEncoder();

export class WebBluetoothTransport implements BluetoothTransport {
  readonly label = 'Web Bluetooth';

  private readonly config: TransportConfig;
  private cached: CachedCharacteristics | null = null;
  private watching = new WeakSet<BluetoothDevice>();

  constructor(config: TransportConfig) {
    this.config = config;
  }

  async isSupported(): Promise<boolean> {
    if (!('bluetooth' in navigator) || navigator.bluetooth === undefined) {
      return false;
    }
    try {
      // getAvailability() reflects whether a BT adapter exists on the machine.
      return await navigator.bluetooth.getAvailability();
    } catch {
      return true; // Feature-detected API present; assume usable.
    }
  }

  async ensureReady(): Promise<void> {
    if (!('bluetooth' in navigator)) {
      throw new BluetoothError('unsupported', 'This browser does not support Web Bluetooth.');
    }
  }

  async startScan(
    _timeoutMs: number,
    onDevice: (device: DiscoveredDevice) => void,
  ): Promise<void> {
    await this.ensureReady();

    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { name: this.config.deviceName },
        { namePrefix: 'Asif' },
        { services: [SERVICE_UUID] },
      ],
      optionalServices: [SERVICE_UUID],
    });

    // Web Bluetooth cannot list devices; the browser chooser acts as the scan
    // UI and returns exactly one selection, which we surface immediately.
    onDevice({
      id: device.id,
      name: device.name ?? this.config.deviceName,
    });
  }

  async stopScan(): Promise<void> {
    // Web Bluetooth chooser closes itself; nothing to stop.
  }

  async connect(deviceId: string): Promise<void> {
    this.cached = null;
    if (!navigator.bluetooth) {
      throw new BluetoothError('unsupported', 'Web Bluetooth unavailable.');
    }

    const device = await navigator.bluetooth.getDevices().then((devices) =>
      devices.find((d) => d.id === deviceId),
    );

    if (!device) {
      throw new BluetoothError('device-not-found', 'Selected device is no longer available.');
    }

    this.watchForLoss(device);

    const gatt = device.gatt;
    if (!gatt) {
      throw new BluetoothError('device-not-found', 'GATT server unavailable.');
    }

    const server = await gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    if (!service) {
      throw new BluetoothError('service-not-found', `Service ${SERVICE_UUID} not found.`);
    }

    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    if (!characteristic) {
      throw new BluetoothError('characteristic-not-found', `Characteristic ${CHARACTERISTIC_UUID} not found.`);
    }

    if (!characteristic.properties.write && !characteristic.properties.writeWithoutResponse) {
      throw new BluetoothError('characteristic-not-found', 'Characteristic does not support writing.');
    }

    this.cached = { device, characteristic };
  }

  async disconnect(): Promise<void> {
    this.cached?.device.gatt?.disconnect();
    this.cached = null;
  }

  async write(text: string): Promise<void> {
    if (!this.cached) {
      throw new BluetoothError('not-connected', 'Not connected to the ESP32.');
    }
    try {
      await this.cached.characteristic.writeValue(encode.encode(text));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NetworkError') {
        throw new BluetoothError('disconnected', 'Bluetooth link was lost during write.');
      }
      throw new BluetoothError(
        'write-failed',
        error instanceof Error ? error.message : 'Write failed.',
      );
    }
  }

  isConnected(): boolean {
    return this.cached !== null && this.cached.device.gatt?.connected === true;
  }

  getConnectedId(): string | null {
    return this.cached?.device.id ?? null;
  }

  getConnectedName(): string | null {
    return this.cached?.device.name ?? null;
  }

  async dispose(): Promise<void> {
    await this.disconnect();
  }

  private watchForLoss(device: BluetoothDevice): void {
    if (this.watching.has(device)) return;
    this.watching.add(device);
    device.addEventListener('gattserverdisconnected', () => {
      this.cached = null;
      this.config.onDeviceLost(device.id);
    });
  }
}
