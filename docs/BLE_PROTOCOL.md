# BLE Protocol — ASIF RGB Controller

This document is the contract between the ESP32 firmware and every transport
in `src/services/bluetooth/`. **Never change one side without the other.**

## GATT Layout

| Item | Value |
|---|---|
| Device name | `Asif_ESP32_RGB` |
| Service UUID | `12345678-1234-1234-1234-123456789001` |
| Characteristic UUID | `12345678-1234-1234-1234-123456789002` |
| Characteristic properties | READ, WRITE |
| Payload type | UTF-8 text (not raw bytes, not JSON) |

## Command Grammar

| Command | Effect | Firmware responses |
|---|---|---|
| `ON` | LED on at current colour/level | none (READ reflects state) |
| `OFF` | LED off | — |
| `RGB:255,0,0` | set colour, turns LED on | `ERR:BAD_RGB` if malformed, `ERR:RANGE` if out of 0–255 |
| `BRIGHTNESS:100` | brightness percent 0–100 | `ERR:RANGE` if out of range |
| *(anything else)* | ignored | `ERR:UNKNOWN` |

The characteristic's READ value always returns the live state in the form:

```
ON|RGB:255,0,0|BRIGHTNESS:50
```

## Timing Rules (App Side)

Enforced in `BluetoothManager`/`BLECommands`:

- Writes are **serialised** through a promise queue — never two GATT writes in flight.
- Writes are **paced** at ≥ 150 ms apart (`WRITE_INTERVAL_MS`).
- Colour-slider input is **debounced** 180 ms (`CONTROL_DEBOUNCE_MS`).
- Brightness-slider input is debounced 250 ms (`BRIGHTNESS_DEBOUNCE_MS`).

## Firmware ↔ App Wiring

- Firmware: `firmware/Asif_ESP32_RGB_Controller.ino`
- Constants mirror: `src/services/bluetooth/BLEConstants.ts`

## Changing the Protocol

If the UUIDs, device name, or command grammar must change:

1. Edit `firmware/Asif_ESP32_RGB_Controller.ino`, flash the ESP32.
2. Edit `src/services/bluetooth/BLEConstants.ts` and `BLECommands.ts`.
3. Rebuild the web app (`npm run build`) and resync natives (`npx cap sync`).
4. Test scan → connect → each command from Android, iPhone, web.
5. Update the table above and the README section 5.
