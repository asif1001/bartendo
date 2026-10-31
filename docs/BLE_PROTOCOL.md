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

## Command Grammar v2 — Pumps & Pouring

Implemented in firmware v2 (`firmware/Asif_ESP32_RGB_Controller.ino`). The
firmware is a **dumb executor**: the app computes every duration from the
calibrated flow rate; the ESP32 only runs timed switches.

| Command | Effect | ./note |
|---|---|---|
| `PUMP:CFG:<n>:<NAME>:<rate>` | pump `n` (1–8) holds liquid `NAME` (≤8 chars A–Z0–9) flowing `rate` ml/s (0.1–100) | `ERR:BAD_PUMP` / `ERR:RANGE` if invalid |
| `PUMP:ON:<n>:F` / `PUMP:ON:<n>:B` | run pump n forward/backward for manual priming; **auto-stops after 120 s** as a safety net | stop with `PUMP:OFF:<n>` |
| `PUMP:OFF:<n>` | stop pump n | — |
| `POUR:<n>:<ms>,<n>:<ms>,…` | synchronized pour — all pumps start together, each with an independent timer (100–600000 ms). Parse is all-or-nothing: a bad token starts nothing | LED pulses cyan while pouring |
| `POUR:ABORT` | stop **every** pump immediately | red flash 3 s |
| `STATUS` | reply with full LED + pump state text | — |

READ value with pumps configured:

```
ON|RGB:255,0,0|BRIGHTNESS:50|PUMPS:1:RUM@7.5,4:WATER@10.3
ON|…|PUMPS:1:RUM@7.5:POUR|POUR:RUNNING      ← a pour in flight
ON|…|POUR:DONE / POUR:ABORTED                ← 3 s after finish/abort
```

Status LED (onboard WS2812, always reflects machine state):

| LED | Meaning |
|---|---|
| **blue blink** (1 Hz) | advertising — discoverable, waiting for the app |
| **green solid** | app connected, healthy |
| **cyan pulse** | pouring a drink |
| **red blink** | fault — pour aborted, command rejected (`ERR:*`), or the phone dropped mid-pour |

The legacy `ON`/`OFF`/`RGB`/`BRIGHTNESS` commands are still accepted (protocol
frozen) but the status LED owns the pixel, so the state remains readable at a glance.

Safety behaviours baked into the firmware:

- All motor pins go `LOW` during boot before anything touches the L298Ns.
- A BLE **disconnect mid-pour triggers `POUR:ABORT`** automatically.
- Manual runs auto-stop; pours are bounded by `POUR_MAX_MS` (10 min).

The APP converts its ml/min calibration to ml/s before building
`PUMP:CFG` (÷ 60), and builds `POUR` durations as `ml ÷ mlPerSec × 1000`
in `src/services/bar/resolver.ts`.

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
