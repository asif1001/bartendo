/**
 * Barrel for the Bluetooth service layer.
 */

export { BluetoothManager, type BluetoothState, type ManagerEvent, type AvailabilityStatus } from './BluetoothManager';
export * from './BLEConstants';
export * from './BLECommands';
export { NativeBluetoothTransport } from './NativeBluetoothTransport';
export { WebBluetoothTransport } from './WebBluetoothTransport';
