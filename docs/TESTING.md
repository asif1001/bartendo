# Test Matrix — ASIF RGB Controller

Status legend: ☐ pending hardware test · ✅ passed · ❌ failed (note below)All BLE behaviour is exact-protocol; no simulated responses exist in
production paths (the only non-BLE code paths are UI-only previews while
disconnected, and they never pretend to transmit).

## Android (devices: Android 12+ primary target)

| # | Test | Expectation | Status |
|---|---|---|---|
| A1 | First scan | Native permission dialogs appear (SCAN + CONNECT); ESP32 listed with RSSI | ☐ |
| A2 | Deny permission | Friendly toast, no crash, hint to enable in settings | ☐ |
| A3 | Bluetooth off | 'Bluetooth is turned off' toast, no crash | ☐ |
| A4 | Connect to Asif_ESP32_RGB | Status flips to Connected only after service+characteristic verified | ☐ |
| A5 | Send each preset colour | LED matches the preset within ~0.5 s | ☐ |
| A6 | Drag colour picker fast | No overflow of BLE queue; LED settles to final colour | ☐ |
| A7 | Brightness slider drag | Debounced BRIGHTNESS:x writes; LED level tracks | ☐ |
| A8 | LED ON / OFF | Immediate single writes, confirm toasts | ☐ |
| A9 | ESP32 power-cycled mid-session | 'disconnected unexpectedly' toast; auto-reconnect 2s→5s→10s | ☐ |
| A10 | Manual disconnect → reconnect | Works repeatedly | ☐ |

## iPhone iOS 16+ (Capacitor native app)

| # | Test | Expectation | Status |
|---|---|---|---|
| I1 | First scan | NSBluetoothAlwaysUsageDescription prompt; device listed | ☐ |
| I2 | Deny permission | Friendly error toast | ☐ |
| I3 | Connect from scan list | Connected state after discovery; CoreBluetooth link visible in system status | ☐ |
| I4 | Colour changes | Real device reflects RGB commands | ☐ |
| I5 | Brightness changes | Real device reflects BRIGHTNESS commands | ☐ |
| I6 | ON / OFF | Works | ☐ |
| I7 | Walk out of range | Disconnect handling + auto-reconnect when back in range | ☐ |
| I8 | Background 5 min → foreground | Reconnect or clean disconnected state (no zombie UI) | ☐ |

## iPhone via Bluefy (Web BLE browser — the no-Mac route, §3 of README)

| # | Test | Expectation | Status |
|---|---|---|---|
| E1 | Open https://asif1001.github.io/bartendo/ inside Bluefy | Green banner: "iPhone with Web Bluetooth active" | ☐ |
| E2 | Open the same URL in Safari on iPhone | Amber/rose informational banner (no crash, app usable, BLE locked) | ☐ |
| E3 | Disconnect permission | "Bluetooth permission was denied" toast + recovery hint | ☐ |
| E4 | Scan → connect to Asif_ESP32_RGB | Connected only after GATT discovery + verification | ☐ |
| E5 | Send every preset colour | LED matches each preset ~0.5 s | ☐ |
| E6 | Brightness slider | Debounced BRIGHTNESS writes, LED tracks | ☐ |
| E7 | LED ON / OFF | Works | ☐ |
| E8 | Bluefy → Home screen → reopen | Clean disconnected state; Scan→reconnect works; no zombie 'Connected' claim | ☐ |

> iOS **web** Bluetooth on Safari is intentionally unsupported — the app shows
> the informative banner and points iPhone users at Bluefy (§3 of the README);
> do not open a bug for it.

## Web (Chrome/Edge desktop, Android Chrome)

| # | Test | Expectation | Status |
|---|---|---|---|
| W1 | Unsupported browser (Safari/Firefox) | 'Bluetooth unavailable' banner + card shows disabled Scan | ☐ |
| W2 | Supported browser loaded over HTTPS | Chooser opens filtered to the ESP32 | ☐ |
| W3 | Device picked in chooser | App connects and shows the chosen device | ☐ |
| W4 | Colour / brightness / power | Commands flow; recent colours recorded | ☐ |
| W5 | Disconnect from ESP32 side | Cleanup + toast; re-scan needed (documented) | ☐ |
| W6 | HTTP page | Web Bluetooth blocked — impossible by browser policy; app stays usable/disconnected | ☐ |

## Build verification (done in CI/local)

| # | Test | Status |
|---|---|---|
| B1 | `tsc --noEmit` passes with strict mode | ✅ (run locally, see `npm run build`) |
| B2 | `vite build` succeeds, PWA manifest + SW generated | ✅ |
| B3 | Firmware compiles in Arduino IDE v2 / ESP32 core v3.x (board ESP32S3 Dev Module) | ☐ |

---

## Bartender firmware v2 — pumps & pour (hardware, after wiring the 4× L298N)

| # | Test | Expected |
|---|---|---|
| B1 | Flash firmware v2, open Serial Monitor | banner `Asif ESP32 Bartender (BLE, v2)`; all pumps silent at boot |
| B2 | `PUMP:CFG:1:RUM:7.5` | Serial: `[CMD] PUMP:1 CFG RUM @ 7.5 ml/s` |
| B3 | `PUMP:ON:1:F` then `PUMP:OFF:1` | pump runs forward, stops instantly on OFF |
| B4 | `PUMP:ON:1:F` … wait 120 s | pump stops by itself (manual safety auto-stop) |
| B5 | `PUMP:ON:1:B` | pump runs backward (purge direction) |
| B6 | `POUR:1:2000,2:3000` | both start together; pump 1 stops at 2 s, pump 2 at 3 s; LED cyan-pulses while running |
| B7 | `POUR:1:600000` then `POUR:ABORT` | instant stop; LED blinks red 5 s, then solid green (still connected) |
| B8 | `POUR:9:1000`, `POUR:1:50`, `POUR:1:2000,1:3000` | all rejected (`ERR:BAD_POUR`), nothing starts (all-or-nothing parse), LED blinks red 3 s |
| B9 | Disconnect phone mid-`POUR` | all pumps stop instantly (safety abort), LED blinks red 8 s, advertising resumes (blue blink) |
| B10 | App: assign bottles in Shelves → **Apply to device** | one `PUMP:x CFG` command per loaded pump on the wire |
| B11 | App: Setup → 1-minute calibration test | wire shows `POUR:1:60000`; measured ml = the flow in ml/min |
| B12 | App: full drink pour (e.g. Cuba Libre) | pumps start simultaneously; stop times match the drink page ratios; LED green at completion |
| B13 | `STATUS` after configuration | READ value lists `PUMPS:` with names + rates |
| B14 | Boot with no app connected | LED **blinks blue** (1 Hz) — discoverable |
| B15 | Connect the app | LED turns **solid green** |
| B16 | Send a rejected command, e.g. `POUR:9:1000` | LED **blinks red** ~3 s, then back to green |
| B17 | Pour a drink | LED **cyan-pulses** during the pour, then solid green |

---

## Known Behavioural Notes

- Web Bluetooth grants are per-origin. Chrome keeps a permission grant for the
  session; `navigator.bluetooth.getDevices()` is used to re-find the device,
  but a fresh selection is required in private mode.
- Auto-reconnect only attempts programmatically on the native transports;
  Web Bluetooth has no background reconnection API.
- The manager paces writes ≥ 150 ms apart and debounces slider input; sending
  dozens of colour changes per second still can't exceed ~6 writes/s by
  design.
