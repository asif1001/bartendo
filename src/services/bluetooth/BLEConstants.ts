/**
 * BLEConstants.ts
 *
 * Single source of truth for the ESP32 BLE configuration.
 * These values MUST match firmware/Asif_ESP32_RGB_Controller.ino exactly.
 *
 * DO NOT change UUIDs, device name, or command grammar here without
 * updating the ESP32 firmware — see docs/BLE_PROTOCOL.md.
 */

/** Advertised BLE device name of the ESP32. */
export const DEVICE_NAME = 'Asif_ESP32_RGB';

/** Custom BLE service 12345678-1234-1234-1234-123456789001 */
export const SERVICE_UUID = '12345678-1234-1234-1234-123456789001';

/** READ/WRITE characteristic 12345678-1234-1234-1234-123456789002 */
export const CHARACTERISTIC_UUID = '12345678-1234-1234-1234-123456789002';

/** Max time to wait for a GATT connection before giving up (ms). */
export const CONNECT_TIMEOUT_MS = 10_000;

/** Max time for an active scan window (ms). */
export const SCAN_TIMEOUT_MS = 8_000;

/** Minimum gap between characteristic writes (ms) — BLE write-safe pacing. */
export const WRITE_INTERVAL_MS = 150;

/** Debounce applied while the colour picker / sliders are moving (ms). */
export const CONTROL_DEBOUNCE_MS = 180;

/** Slightly longer debounce for the brightness slider (ms). */
export const BRIGHTNESS_DEBOUNCE_MS = 250;

/** Only devices advertising a name starting with this prefix are listed in scans. */
export const SCAN_NAME_PREFIX = 'Asif_ESP32_RGB';
