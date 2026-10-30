import { useSyncExternalStore } from 'react';
import type { BluetoothManager, BluetoothState } from '../services/bluetooth/BluetoothManager';

/**
 * @returns the singleton manager (React-independent) so pages can run
 * commands, plus a reactive snapshot through useSyncExternalStore.
 */
export function useBluetooth(
  manager: BluetoothManager | null,
): BluetoothState {
  if (!manager) {
    return {
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
  }
  return useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
}
