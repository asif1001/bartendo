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

/* -------------------------------------------------------------------------
 * Pump / pour protocol v2 (firmware v2 compatible)
 *   PUMP:CFG:<n>:<NAME>:<mlPerSec>   — assign liquid + flow rate to pump
 *   PUMP:ON:<n>:F / :B               — manual pump, forward or backward
 *   PUMP:OFF:<n>                     — stop a single pump
 *   POUR:<n>:<ms>,<n>:<ms>,…         — synchronized multi-pump pour
 *   POUR:ABORT                       — emergency stop of every output
 * ---------------------------------------------------------------------- */

export const PUMP_COUNT = 8;

/** Pump index 1-8 validation. */
export function validatePumpNo(pumpNo: number): number {
  const n = Math.round(pumpNo);
  if (!Number.isFinite(n) || n < 1 || n > PUMP_COUNT) {
    throw new BluetoothError('write-failed', `Pump number must be 1-${PUMP_COUNT}, got ${pumpNo}`);
  }
  return n;
}

/** Pump config name must be short, uppercase, BLE-grammar safe. */
export function validatePumpName(name: string): string {
  const clean = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (clean.length === 0) {
    throw new BluetoothError('write-failed', 'Pump ingredient name must not be empty.');
  }
  return clean;
}

/** `PUMP:CFG:<n>:<NAME>:<mlPerSec>` — flow rate in ml/s, 0.1–100 range, 0.1 resolution.
 *  The app UI works in ml/min and converts (divide by 60) before sending. */
export function configurePump(pumpNo: number, name: string, mlPerSec: number): string {
  const n = validatePumpNo(pumpNo);
  const rate = Math.round(clamp(mlPerSec, 0.1, 100) * 10) / 10;
  return `PUMP:CFG:${n}:${validatePumpName(name)}:${rate}`;
}

/** `PUMP:ON:<n>:F` or `PUMP:ON:<n>:B` — manual run (not for dosing). */
export function pumpOn(pumpNo: number, direction: 'F' | 'B'): string {
  return `PUMP:ON:${validatePumpNo(pumpNo)}:${direction}`;
}

/** `PUMP:OFF:<n>` */
export function pumpOff(pumpNo: number): string {
  return `PUMP:OFF:${validatePumpNo(pumpNo)}`;
}

/** POUR ms bounds — dosing engine clamps nonsense before it hits the air. */
export const POUR_MIN_MS = 100;
export const POUR_MAX_MS = 600_000;

export interface PourPair {
  pumpNo: number;
  ms: number;
}

/** `POUR:<n>:<ms>,<n>:<ms>,…` — synchronized pour, firmware runs each timer. */
export function pour(pairs: PourPair[]): string {
  if (pairs.length === 0) {
    throw new BluetoothError('write-failed', 'A pour needs at least one pump.');
  }
  const parts = pairs.map(({ pumpNo, ms }) => {
    const n = validatePumpNo(pumpNo);
    const duration = Math.round(clamp(ms, POUR_MIN_MS, POUR_MAX_MS));
    return `${n}:${duration}`;
  });
  return `POUR:${parts.join(',')}`;
}

/** `POUR:ABORT` — stops every pump immediately. */
export function abortPour(): string {
  return 'POUR:ABORT';
}

/** `STATUS` — firmware answers with its current run state (READ characteristic). */
export function queryStatus(): string {
  return 'STATUS';
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
