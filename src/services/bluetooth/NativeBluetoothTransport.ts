/**
 * NativeBluetoothTransport.ts
 *
 * Native CoreBluetooth / Android BLE transport via the maintained
 * @capacitor-community/bluetooth-le plugin. This transport is active inside
 * the Capacitor iOS and Android shells only — never in a plain browser.
 */

import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import {
  BluetoothError,
  type BluetoothTransport,
  type DiscoveredDevice,
  type TransportConfig,
} from '../../types/bluetooth';
import { SCAN_NAME_PREFIX, SERVICE_UUID } from './BLEConstants';

const encode = new TextEncoder();

const IGNORE = () => undefined;

export class NativeBluetoothTransport implements BluetoothTransport {
  readonly label = 'Native BLE';

  private readonly config: TransportConfig;
  private connectedId: string | null = null;
  private connectedName: string | null = null;
  private initialised = false;

  constructor(config: TransportConfig) {
    this.config = config;
  }

  async isSupported(): Promise<boolean> {
    return Capacitor.isNativePlatform();
  }

  private async ensureInitialised(): Promise<void> {
    if (this.initialised) return;
    await BleClient.initialize();
    this.initialised = true;
  }

  async ensureReady(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      throw new BluetoothError('unsupported', 'Native transport available only inside the app.');
    }

    // plugin v8: initialize() prompts the OS permissions itself —
    // Android (location pair) and iOS (NSBluetoothAlwaysUsageDescription).
    // androidNeverForLocation matches the neverForLocation manifest flag.
    try {
      await this.ensureInitialised();
      await BleClient.initialize({ androidNeverForLocation: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/permiss|deny/i.test(message)) {
        throw new BluetoothError('permission-denied', 'Bluetooth permission was denied.');
      }
      throw new BluetoothError('disabled', `Bluetooth unavailable: ${message}`);
    }

    let enabled: boolean;
    try {
      enabled = await BleClient.isEnabled();
    } catch (error) {
      throw new BluetoothError(
        'disabled',
        `Bluetooth radio unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!enabled) {
      // Android can show the official "Turn on Bluetooth?" dialog.
      if (Capacitor.getPlatform() === 'android') {
        try {
          await BleClient.requestEnable();
          enabled = await BleClient.isEnabled();
        } catch {
          throw new BluetoothError('disabled', 'Bluetooth is turned off.');
        }
      } else {
        throw new BluetoothError('disabled', 'Bluetooth is turned off.');
      }
    }
    if (!enabled) {
      throw new BluetoothError('disabled', 'Bluetooth is turned off.');
    }
  }

  async startScan(
    timeoutMs: number,
    onDevice: (device: DiscoveredDevice) => void,
  ): Promise<void> {
    await this.ensureReady();

    const seen = new Set<string>();
    setTimeout(() => {
      void BleClient.stopLEScan().catch(IGNORE);
    }, timeoutMs);

    await BleClient.requestLEScan(
      {
        namePrefix: SCAN_NAME_PREFIX,
        allowDuplicates: false,
      },
      (result) => {
        const id = result.device.deviceId;
        if (!id || seen.has(id)) return;
        seen.add(id);
        onDevice({
          id,
          name: result.device.name ?? '(unnamed device)',
          rssi: result.rssi ?? undefined,
        });
      },
    );
  }

  async stopScan(): Promise<void> {
    await BleClient.stopLEScan().catch(IGNORE);
  }

  async connect(deviceId: string, name?: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      throw new BluetoothError('unsupported', 'Native transport available only inside the app.');
    }
    await this.ensureReady();

    // Clear any stale Android GATT cache entry before reconnecting.
    await BleClient.disconnect(deviceId).catch(IGNORE);

    let lostHandler: (() => void) | undefined;
    let lost = false;
    try {
      await BleClient.connect(deviceId, () => {
        if (lost) return;
        lost = true;
        lostHandler?.();
        this.connectedId = null;
        this.connectedName = null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/permiss|deny/i.test(message)) {
        throw new BluetoothError('permission-denied', message);
      }
      if (/timed?\s?out|timeout/i.test(message)) {
        throw new BluetoothError('timeout', 'The device did not answer in time.');
      }
      if (/not found|unknown/i.test(message)) {
        throw new BluetoothError('device-not-found', 'The device is not in range.');
      }
      throw new BluetoothError('device-not-found', `Connection failed: ${message}`);
    }

    // Confirm the configured service + characteristic exist and are usable.
    // The characteristic exposes READ, so a read here doubles as discovery
    // verification before any commands are allowed.
    try {
      await BleClient.read(deviceId, SERVICE_UUID, this.config.characteristicUuid);
    } catch {
      await BleClient.disconnect(deviceId).catch(IGNORE);
      throw new BluetoothError(
        'service-not-found',
        'Connected, but the ESP32 BLE service/characteristic was not found.',
      );
    }

    this.connectedId = deviceId;
    this.connectedName = name ?? this.config.deviceName;
    if (!lost) {
      lostHandler = () => {
        this.connectedId = null;
        this.connectedName = null;
        this.config.onDeviceLost(deviceId);
      };
    }
  }

  async disconnect(): Promise<void> {
    const id = this.connectedId;
    if (id === null) return;
    this.connectedId = null;
    this.connectedName = null;
    await BleClient.disconnect(id).catch(IGNORE);
  }

  async write(text: string): Promise<void> {
    const id = this.connectedId;
    if (id === null) {
      throw new BluetoothError('not-connected', 'Not connected to the ESP32.');
    }
    try {
      await BleClient.write(
        id,
        SERVICE_UUID,
        this.config.characteristicUuid,
        new DataView(encode.encode(text).buffer),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/disconnect|lost|not connect/i.test(message)) {
        throw new BluetoothError('disconnected', message);
      }
      throw new BluetoothError('write-failed', message);
    }
  }

  isConnected(): boolean {
    return this.connectedId !== null;
  }

  getConnectedId(): string | null {
    return this.connectedId;
  }

  getConnectedName(): string | null {
    return this.connectedName;
  }

  async dispose(): Promise<void> {
    await this.disconnect();
  }
}
