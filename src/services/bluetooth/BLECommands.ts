/**
 * BLECommands.ts
 *
 * Builders and validators for the ESP32 text command protocol.
 *
 * Supported grammar (must match the firmware exactly):
 *   ON
 *   OFF
 *   RGB:<r>,<g>,<b>
 *   BRIGHTNESS:<0-100>
 *
 * Commands travel as UTF-8 text through the READ/WRITE characteristic.
 */

import { BluetoothError } from '../../types/bluetooth';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Validate an 8-bit colour channel. */
export function validateChannel(value: number): number {
  if (!Number.isFinite(value)) {
    throw new BluetoothError('write-failed', `Invalid RGB channel: ${value}`);
  }
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 255) {
    throw new BluetoothError(
      'write-failed',
      `RGB channel out of range 0-255: ${rounded}`,
    );
  }
  return rounded;
}

/** Validate brightness 0-100. */
export function validateBrightness(value: number): number {
  if (!Number.isFinite(value)) {
    throw new BluetoothError('write-failed', `Invalid brightness: ${value}`);
  }
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 100) {
    throw new BluetoothError(
      'write-failed',
      `Brightness out of range 0-100: ${rounded}`,
    );
  }
  return rounded;
}

/** Build the ON command text. */
export function turnOn(): string {
  return 'ON';
}

/** Build the OFF command text. */
export function turnOff(): string {
  return 'OFF';
}

/** Build `RGB:R,G,B` with validated, clamped channels. */
export function setRGB(red: number, green: number, blue: number): string {
  const r = clamp(validateChannel(red), 0, 255);
  const g = clamp(validateChannel(green), 0, 255);
  const b = clamp(validateChannel(blue), 0, 255);
  return `RGB:${r},${g},${b}`;
}

/** Build `BRIGHTNESS:<0-100>` with a validated value. */
export function setBrightness(value: number): string {
  return `BRIGHTNESS:${clamp(validateBrightness(value), 0, 100)}`;
}

/** Assert a command is only sent to a live connection. */
export function assertConnected(isConnected: boolean): void {
  if (!isConnected) {
    throw new BluetoothError('not-connected', 'Device is not connected.');
  }
}

/** Preset colours used across the UI and their RGB payloads. */
export const PRESET_COLOURS: Array<{ name: string; rgb: [number, number, number] }> = [
  { name: 'Red', rgb: [255, 0, 0] },
  { name: 'Green', rgb: [0, 255, 0] },
  { name: 'Blue', rgb: [0, 0, 255] },
  { name: 'Yellow', rgb: [255, 255, 0] },
  { name: 'Orange', rgb: [255, 100, 0] },
  { name: 'Purple', rgb: [200, 0, 255] },
  { name: 'Pink', rgb: [255, 80, 180] },
  { name: 'Cyan', rgb: [0, 255, 255] },
  { name: 'White', rgb: [255, 255, 255] },
  { name: 'Warm White', rgb: [255, 180, 100] },
];
