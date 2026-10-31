/**
 * Pump_Test — bench test for the 8-pump Bartendo machine.
 * ========================================================
 * Cycles through ALL 8 pumps ONE BY ONE so you can verify each channel's
 * wiring, direction and plumbing before running the BLE app.
 *
 * No Bluetooth, no app needed — this sketch is the ground truth for wiring.
 *
 * Behaviour:
 *   Phase 1: pump 1..8 FORWARD for 3 s each, 2 s pause between pumps
 *   Phase 2: pump 1..8 REVERSE for 2 s each, 2 s pause between pumps
 *   Then it repeats forever, printing a clear log line per pump.
 *
 * Safety:
 *   - All 16 pins are driven LOW at boot, before anything else.
 *   - Send any character from the Serial Monitor to ABORT immediately.
 *   - Send 'r' + Enter to restart the test.
 *   - Hard limit: every run is timed; nothing can run forever.
 *
 * Wiring (must match docs/WIRING.md):
 *   Pump 1  4/5     Pump 2  6/7     Pump 3  15/16   Pump 4  17/18
 *   Pump 5  13/14   Pump 6  12/11   Pump 7  8/9     Pump 8  10/21
 *
 * Do NOT use GPIO 3/38-42/45/46 for motors (strapping / JTAG pins).
 */

#include <Arduino.h>

static const uint8_t PUMP_COUNT = 8;
static const uint8_t PUMP_IN_A[PUMP_COUNT] = { 4, 6, 15, 17, 13, 12, 8, 10 };
static const uint8_t PUMP_IN_B[PUMP_COUNT] = { 5, 7, 16, 18, 14, 11, 9, 21 };

static const uint32_t FWD_MS = 3000;
static const uint32_t REV_MS = 2000;
static const uint32_t GAP_MS = 2000;

static void stopAll() {
  for (uint8_t i = 0; i < PUMP_COUNT; i++) {
    digitalWrite(PUMP_IN_A[i], LOW);
    digitalWrite(PUMP_IN_B[i], LOW);
  }
}

static bool run(uint8_t index, bool forward, uint32_t ms) {
  digitalWrite(PUMP_IN_A[index], forward ? HIGH : LOW);
  digitalWrite(PUMP_IN_B[index], forward ? LOW : HIGH);
  Serial.printf(">>> PUMP %u  %s  %lu ms\n", index + 1, forward ? "FORWARD" : "REVERSE",
                (unsigned long)ms);
  const uint32_t start = millis();
  while (millis() - start < ms) {
    delay(20);
    if (Serial.available()) {           // any key = abort
      while (Serial.available()) Serial.read();
      stopAll();
      Serial.println("!! ABORTED by user.");
      return false;
    }
  }
  stopAll();
  Serial.printf("    pump %u stopped\n", index + 1);
  delay(GAP_MS);
  return true;
}

static bool waitForRestart() {
  while (true) {
    stopAll();
    if (Serial.available()) {
      char c = (char)Serial.read();
      while (Serial.available()) Serial.read();
      if (c == 'r' || c == 'R') return true;
      Serial.println("Send 'r' to start the pump test.");
    }
    delay(50);
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);

  // Pins LOW first — no motor may move before this line runs.
  for (uint8_t i = 0; i < PUMP_COUNT; i++) {
    pinMode(PUMP_IN_A[i], OUTPUT);
    pinMode(PUMP_IN_B[i], OUTPUT);
  }
  stopAll();

  Serial.println();
  Serial.println("==================================================");
  Serial.println("  BARTENDO PUMP TEST — all 8 pumps, one by one");
  Serial.println("==================================================");
  Serial.println("Pins: 1=4/5  2=6/7  3=15/16  4=17/18");
  Serial.println("      5=13/14 6=12/11 7=8/9   8=10/21");
  Serial.println("Send any key to abort. Make sure all tubes are in water.");
  Serial.println();
  delay(3000);  // time to step back
}

void loop() {
  // Phase 1 — forward, one pump at a time.
  Serial.println("---- PHASE 1: FORWARD (dispense direction) ----");
  for (uint8_t i = 0; i < PUMP_COUNT; i++) {
    if (!run(i, true, FWD_MS)) { waitForRestart(); return; }
  }

  // Phase 2 — reverse, one pump at a time.
  Serial.println("---- PHASE 2: REVERSE (purge direction) ----");
  for (uint8_t i = 0; i < PUMP_COUNT; i++) {
    if (!run(i, false, REV_MS)) { waitForRestart(); return; }
  }

  Serial.println("==== TEST PASS COMPLETE — repeating in 5 s ====");
  delay(5000);
}
