# Test Matrix — ASIF RGB Controller

Status legend: ☐ pending hardware test · ✅ passed · ❌ failed (note below)

All BLE behaviour is exact-protocol; no simulated responses exist in
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

> iOS **web** Bluetooth on Safari is intentionally unsupported — the app shows
> the informative banner; do not open a bug for it.

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

## Known Behavioural Notes

- Web Bluetooth grants are per-origin. Chrome keeps a permission grant for the
  session; `navigator.bluetooth.getDevices()` is used to re-find the device,
  but a fresh selection is required in private mode.
- Auto-reconnect only attempts programmatically on the native transports;
  Web Bluetooth has no background reconnection API.
- The manager paces writes ≥ 150 ms apart and debounces slider input; sending
  dozens of colour changes per second still can't exceed ~6 writes/s by
  design.
