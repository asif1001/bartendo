# Wiring Document — ESP32-S3 × 4 × L298N × 8 Pumps

Validated pin map for the bartender machine. Every pin in this document was
verified against the actual expansion-board rails (left rail: 3V3/RST/4/5/6/7/
15/16/17/18/8/3/46/9/10/11/12/13/14/5VIN/GND, right rail: GND/GND/19/20/21/17/
18/45/0/35/36/37/38/39/40/41/42/1/2/RX/TX/GND/GND).

**Current policy: EN jumper CAPS stay installed on all four L298N boards.**
Only the 16 IN wires are connected. Direction + stop are fully controlled by
the IN pins; speed control (PWM via EN) is a documented, optional later upgrade.

---

## 1. Parts in this build

| Part | Qty | Role |
|---|---|---|
| ESP32-S3 WROOM (N16R8 DevKit) | 1 | Controller / BLE server |
| L298N dual H-bridge | 4 | 2 pump channels each |
| DC pump (peristaltic) | 8 | 1 per liquid |
| 12 V PSU (≥ pump count × stall current, headroom ×2) | 1 | Motor power |
| 18–22 AWG wire, common ground bus | — | Signal + power |
| Jumper caps (pre-installed on ENA/ENB) | 8 | Keep for v1 |

Default ingredient assignment (persisted in firmware config, changeable in app):

| Pump | L298N / Channel | Liquid |
|---|---|---|
| 1 | Driver 1 / Motor A | Rum |
| 2 | Driver 1 / Motor B | Whisky |
| 3 | Driver 2 / Motor A | Vodka |
| 4 | Driver 2 / Motor B | Water |
| 5 | Driver 3 / Motor A | Sprite |
| 6 | Driver 3 / Motor B | Coke |
| 7 | Driver 4 / Motor A | Lemon |
| 8 | Driver 4 / Motor B | Syrup |

---

## 2. Signal wiring — 16 wires (v1, jumpers on)

IN pins from ESP32 GPIOs to L298N terminals. The ESP32's 3.3 V logic drives
both IN and (when later wired) EN reliably — the L298N's HIGH threshold is
Vih ≈ 2.3 V, well below 3.3 V.

### Driver 1 — Pump 1 (Rum, Motor A) & Pump 2 (Whisky, Motor B) — left rail

| Pump | Direction signal | ESP32 GPIO | L298N terminal |
|---|---|---|---|
| 1 | Forward / Reverse A | **GPIO 4 → IN1** | IN1 |
| 1 | | **GPIO 5 → IN2** | IN2 |
| 2 | Forward / Reverse B | **GPIO 6 → IN3** | IN3 |
| 2 | | **GPIO 7 → IN4** | IN4 |

### Driver 2 — Pump 3 (Vodka, Motor A) & Pump 4 (Water, Motor B) — left rail

| Pump | Signal | ESP32 GPIO | L298N terminal |
|---|---|---|---|
| 3 | Fwd / Rev A | **GPIO 15 → IN1** | IN1 |
| 3 | | **GPIO 16 → IN2** | IN2 |
| 4 | Fwd / Rev B | **GPIO 17 → IN3** | IN3 |
| 4 | | **GPIO 18 → IN4** | IN4 |

### Driver 3 — Pump 5 (Sprite, Motor A) & Pump 6 (Coke, Motor B) — left rail

| Pump | Signal | ESP32 GPIO | L298N terminal |
|---|---|---|---|
| 5 | Fwd / Rev A | **GPIO 13 → IN1** | IN1 |
| 5 | | **GPIO 14 → IN2** | IN2 |
| 6 | Fwd / Rev B | **GPIO 12 → IN3** | IN3 |
| 6 | | **GPIO 11 → IN4** | IN4 |

### Driver 4 — Pump 7 (Lemon, Motor A) & Pump 8 (Syrup, Motor B) — right rail

| Pump | Signal | ESP32 GPIO | L298N terminal |
|---|---|---|---|
| 7 | Fwd / Rev A | **GPIO 39 → IN1** | IN1 |
| 7 | | **GPIO 38 → IN2** | IN2 |
| 8 | Fwd / Rev B | **GPIO 41 → IN3** | IN3 |
| 8 | | **GPIO 40 → IN4** | IN4 |

> GPIO 17/18 appear on **both** expansion-board rails — they are the same pin
> internally. Use whichever side is physically convenient (one wire only).

### Direction truth table (per channel)

| IN_a | IN_b | Motor |
|---|---|---|
| HIGH | LOW | Forward (dispense) |
| LOW | HIGH | Reverse (purge/prime) |
| LOW | LOW | Stop (coast) — **firmware default** |
| HIGH | HIGH | Stop (brake) — unused |

Reversed pump? Flip it with the per-pump `INVERT` flag in firmware config.
Never swap wires for this.

---

## 3. Power wiring

| From | To | Notes |
|---|---|---|
| 12 V PSU `+V` | All 4 × L298N `+12V` terminals | All four drivers share one supply |
| 12 V PSU `GND` | All 4 × L298N `GND` **and** ESP32 `GND` | **Common ground bus — different grounds is the #1 bring-up failure** |
| L298N `5V-EN` jumper caps | Keep installed | Drivers' logic regulator feeds their own 5 V; ESP32 not involved |
| ESP32 5 V input | Own USB / its rail | Never feed L298N 5 V into the ESP32 (noise + brownouts) |
| Pumps | `OUT1/OUT2` (Motor A) or `OUT3/OUT4` (Motor B) | Match the table's channel per pump |

Cable gauge: PSU → drivers ≥ 20 AWG; signal wires 22–26 AWG fine.
Add 100–470 µF electrolytic across the PSU input at the first driver if the
pump start-up sags the rail visibly.

---

## 4. Pins deliberately NOT used (do not repurpose them)

| GPIO | Reason |
|---|---|
| 0 | SPI CLK / boot mode strapping (BOOT button) — touching it can brick booting |
| 3, 45, 46 | JTAG / boot strapping pins |
| 35, 36, 37 | Internal octal PSRAM of the N16R8 — exposed on the right rail but **unusable** |
| 19, 20 | Native USB D−/D+ (second USB-C port) |
| RX (43) / TX (44) | UART that the other USB-C interface uses for flashing/monitoring |
| 48 | Onboard WS2812 RGB LED (the status LED of the app) |
| 5VIN rail | Power input only, not an I/O |

---

## 5. Optional upgrade — PWM speed control wires (v2)

Lifting the jumper caps gives firmware speed control (`EN` = PWM duty).
**Pump 8's jumper always stays** — the board has exactly one fewer safe GPIO
than a full 24-wire build needs (see §4). Pump 8 then runs at 100 % speed
(no change to pour behaviour, only no speed-equalisation for that channel).

| Signal | ESP32 GPIO | L298N terminal | Note |
|---|---|---|---|
| Driver 1 ENA (Pump 1) | **GPIO 9** | ENA | remove cap |
| Driver 1 ENB (Pump 2) | **GPIO 10** | ENB | remove cap |
| Driver 2 ENA (Pump 3) | **GPIO 8** | ENA | remove cap |
| Driver 2 ENB (Pump 4) | **GPIO 21** | ENB | remove cap |
| Driver 3 ENA (Pump 5) | **GPIO 2** | ENA | remove cap |
| Driver 3 ENB (Pump 6) | **GPIO 1** | ENB | remove cap |
| Driver 4 ENA (Pump 7) | **GPIO 42** | ENA | remove cap |
| Driver 4 ENB (Pump 8) | — jumper cap stays | ENB | full speed only |

Firmware init rule: every wired EN boots to HIGH (100 %) before any IN changes,
so an unexpected reset never leaves a pump half-speed mid-pour.

---

## 6. Bring-up checklist (do this in order)

1. ☐ Power only: 12 V → drivers; measure ~5 V on each driver's 5 V terminal
   (regulator OK), measure 12 V on each driver's `+12V`.
2. ☐ Common ground: one wire ESP32 `GND` → nearest driver `GND`, and confirm
   0 Ω between *all* driver GNDs and the PSU `GND`.
3. ☐ Wire **Driver 1 only** (GPIO 4/5 → IN1/IN2). Flash a test firmware.
4. ☐ In the app (or nRF Connect): `PUMP:ON:1:F` → Pump 1 forward 3 s, stop.
5. ☐ Reversed direction? correction = firmware `INVERT` config, not rewiring.
6. ☐ Repeat steps 3–5 for Drivers 2–4 (per driver, never all at once).
7. ☐ Water test: prime each pump (forward until full tubes), then check
   reverse purge goes back toward the reservoir, not out the nozzle.
8. ☐ Fill in actual measured **ml/s** per pump (one 50 ml cup with a stopwatch)
   → these go into the app's per-ingredient flow calibration.

---

## 7. Troubleshooting quick table

| Symptom | Likely cause |
|---|---|
| Driver LED on, pump never moves | Missing common ground; or IN signal not reaching driver (wrong rail pin) |
| Pump moves with app, moves reversed | Per-pump `INVERT` flag needed — config, not wiring |
| All pumps stop after a few seconds | PSU sagging (add capacitor / higher-current PSU) |
| One channel dead, others fine | Swapped IN wire pair; check the specific rows in §2 |
| ESP32 reboots when pumps start | PSU sag / missing common ground — ESP32 must be on its own supply |
| Boot failures after wiring changes | A signal landed on GPIO 0/3/45/46 — re-check against §4 |
