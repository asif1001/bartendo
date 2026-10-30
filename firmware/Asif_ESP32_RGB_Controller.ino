/**
 * Asif_ESP32_RGB_Controller.ino  (v2 — bartender firmware)
 * ========================================================
 * BLE RGB LED + 8-pump peristaltic bar firmware for ESP32-S3 WROOM
 * (onboard WS2812 LED on GPIO 48, 4× L298N drivers on the pins below).
 *
 * Pairs with the ASIF Bartender app. This file is the SINGLE SOURCE OF
 * TRUTH for the BLE protocol; the app mirrors it in
 * src/services/bluetooth/BLEConstants.ts and BLECommands.ts.
 *
 * --------------------------- PROTOCOL (do not change) ----------------------
 *   BLE device name           : Asif_ESP32_RGB
 *   Service UUID              : 12345678-1234-1234-1234-123456789001
 *   Characteristic UUID       : 12345678-1234-1234-1234-123456789002
 *   Characteristic properties : READ | WRITE
 *   Payload type              : UTF-8 text
 *
 *   Commands received by the ESP32:
 *     --- LED (v1, unchanged) ---
 *     ON                     - turn the LED on
 *     OFF                    - turn the LED off
 *     RGB:255,0,0            - set colour (R,G,B each 0-255)
 *     BRIGHTNESS:100         - set brightness 0-100 (percent)
 *     --- pumps / pour (v2) ---
 *     PUMP:CFG:<n>:<NAME>:<rate>  - pump n (1-8): liquid NAME (≤8 chars) and
 *                                   flow rate in ml/s (0.1-100); saved to
 *                                   flash and restored after power loss
 *     PUMP:ON:<n>:<F|B>      - run pump n manually, Forward or Backward
 *                              (safety auto-stop after 120 s)
 *     PUMP:OFF:<n>           - stop pump n
 *     POUR:<n>:<ms>,<n>:<ms> - synchronized pour; each pump's timer runs
 *                              independently (100-600000 ms)
 *     POUR:ABORT             - stop every pump immediately (LED flashes red)
 *     STATUS                 - state text of LED + pumps
 *     (unknown commands return the text "ERR:UNKNOWN")
 *
 *   READ on the characteristic returns the current state text, e.g.
 *   "ON|RGB:255,0,0|BRIGHTNESS:50|PUMPS:1:RUM@1.5|POUR:RUNNING"
 *
 *   Pour LED signals (onboard, overrides the user colour temporarily):
 *     pouring  = cyan pulse · finished = green (3 s) · aborted/err = red (3 s)
 * ---------------------------------------------------------------------------
 *
 * Required ArduinoIDE libraries:
 *   - Adafruit NeoPixel        (Library Manager)
 *   - ESP32 BLE Arduino (Bluedroid BLE, ships with the Espressif ESP32 board
 *     package under "ESP32S3 Dev Module" + "ESP32-S3 DevKitC-1" style boards)
 *
 * Board settings: Tools > USB CDC On Boot = Enabled (when programming over
 * native USB), otherwise defaults for ESP32-S3 Dev Module.
 */

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Adafruit_NeoPixel.h>
#include <Preferences.h>
#include <math.h>

// ------------------------------- BLE config ---------------------------------
static const char* DEVICE_NAME = "Asif_ESP32_RGB";
static const char* SERVICE_UUID = "12345678-1234-1234-1234-123456789001";
static const char* CHARACTERISTIC_UUID = "12345678-1234-1234-1234-123456789002";

// ------------------------------- LED config ---------------------------------
static const uint8_t LED_PIN = 48;   // Onboard WS2812 RGB LED on ESP32-S3 DevKit
static const uint8_t LED_COUNT = 1;  // Single onboard addressable LED

// ------------------------------ Pump config ---------------------------------
static const uint8_t PUMP_COUNT = 8;
// L298N direction pins per the agreed wiring (docs/WIRING.md §3, EN jumpers kept).
// index 0 = Pump 1 … index 7 = Pump 8 (inA = forward terminal, inB = reverse).
static const uint8_t PUMP_IN_A[PUMP_COUNT] = { 4, 6, 15, 17, 13, 12, 39, 41 };
static const uint8_t PUMP_IN_B[PUMP_COUNT] = { 5, 7, 16, 18, 14, 11, 38, 40 };

// Safety limits (mirrors the app in BLECommands.ts)
static const uint16_t POUR_MIN_MS = 100;
static const uint32_t POUR_MAX_MS = 600000;   // 10 minutes
static const uint32_t MAX_MANUAL_MS = 120000; // manual PUMP:ON auto-stop 2 min
static const float ML_PER_SEC_MIN = 0.1f;
static const float ML_PER_SEC_MAX = 100.0f;

enum PumpMode : uint8_t { PUMP_IDLE = 0, PUMP_MANUAL = 1, PUMP_POUR = 2 };

struct PumpState {
  PumpMode mode;
  bool forward;        // true = FWD (IN-A high), false = REV (IN-B high)
  uint32_t endTime;    // millis() stop time (manual gets MAX_MANUAL_MS)
  char name[9];        // ≤8 chars + NUL ("" = not configured)
  float mlPerSec;      // calibrated flow (default 1.0 = 60 ml/min)
};

PumpState pumps[PUMP_COUNT];

// ------------------------- Settings persistence (NVS) -----------------------
// PUMP:CFG values survive power loss: saved to flash on every PUMP:CFG and
// restored in setup(). Preferences is trivially fast for 8 tiny records.
static const char* CFG_NS = "barcfg";   // NVS namespace
static const char* CFG_MAGIC = "magic"; // guard key — bump when layout changes
static const uint8_t CFG_VERSION = 1;

static void savePumpConfig(uint8_t index) {
  Preferences prefs;
  prefs.begin(CFG_NS, false);
  prefs.putUChar(CFG_MAGIC, CFG_VERSION);
  char key[8];
  snprintf(key, sizeof(key), "n%u", index + 1);
  prefs.putString(key, String(pumps[index].name));
  snprintf(key, sizeof(key), "r%u", index + 1);
  prefs.putFloat(key, pumps[index].mlPerSec);
  prefs.end();
}

static void loadPumpConfig() {
  Preferences prefs;
  prefs.begin(CFG_NS, true);
  bool valid = prefs.getUChar(CFG_MAGIC, 0) == CFG_VERSION;
  for (uint8_t i = 0; i < PUMP_COUNT; i++) {
    if (!valid) break;
    char key[8];
    snprintf(key, sizeof(key), "n%u", i + 1);
    String name = prefs.getString(key, "");
    if (name.length() > 0) strlcpy(pumps[i].name, name.c_str(), sizeof(pumps[i].name));
    snprintf(key, sizeof(key), "r%u", i + 1);
    float rate = prefs.getFloat(key, -1.0f);
    if (rate >= ML_PER_SEC_MIN && rate <= ML_PER_SEC_MAX) pumps[i].mlPerSec = rate;
  }
  prefs.end();
}


// Pour-signal LED tempos
uint32_t pourFinishedAt = 0;    // when the last pour pump ended (green flash)
uint32_t pourAbortedAt = 0;     // when POUR:ABORT happened (red flash)

// ------------------------------- State --------------------------------------
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

bool ledOn = true;
uint8_t ledBrightness = 50;          // percent 0-100
uint8_t ledRGB[3] = { 255, 0, 0 };   // stored at full value, scaled by brightness

BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected = false;

// ------------------------------ Pump helpers --------------------------------
static void allMotorsOff() {
  for (uint8_t i = 0; i < PUMP_COUNT; i++) {
    digitalWrite(PUMP_IN_A[i], LOW);
    digitalWrite(PUMP_IN_B[i], LOW);
    pumps[i].mode = PUMP_IDLE;
    pumps[i].endTime = 0;
  }
}

static void setPumpMotion(uint8_t index, bool forward) {
  digitalWrite(PUMP_IN_A[index], forward ? HIGH : LOW);
  digitalWrite(PUMP_IN_B[index], forward ? LOW  : HIGH);
}

static void pumpStop(uint8_t index) {
  digitalWrite(PUMP_IN_A[index], LOW);
  digitalWrite(PUMP_IN_B[index], LOW);
  pumps[index].mode = PUMP_IDLE;
  pumps[index].endTime = 0;
}

static bool pourActive() {
  for (uint8_t i = 0; i < PUMP_COUNT; i++) {
    if (pumps[i].mode == PUMP_POUR) return true;
  }
  return false;
}

// --------------------------- Rendering helper ------------------------------
static void renderLED() {
  uint8_t scaled = ledOn ? map(ledBrightness, 0, 100, 0, 255) : 0;
  strip.setBrightness(scaled);
  strip.setPixelColor(0, strip.Color(ledRGB[0], ledRGB[1], ledRGB[2]));
  strip.show();
}

static void flashColour(uint8_t r, uint8_t g, uint8_t b) {
  strip.setBrightness(200);
  strip.setPixelColor(0, strip.Color(r, g, b));
  strip.show();
}

/**
 * Pumps idled by their timers and draws the signal LED states.
 * Call from loop() as often as possible (non-blocking).
 */
static void servicePumpsAndLED() {
  const uint32_t now = millis();

  // 1. Timer expiry for manual + pour pumps.
  for (uint8_t i = 0; i < PUMP_COUNT; i++) {
    if (pumps[i].mode != PUMP_IDLE && (int32_t)(now - pumps[i].endTime) >= 0) {
      pumpStop(i);
      Serial.printf("[PUMP] %u stopped (timer)\n", i + 1);
    }
  }

  // 2. Signal LED (overrides the user colour while a signal is active).
  static bool needsRestore = false;
  if (pourActive()) {
    // Cyan pulse: breathing at ~1 Hz.
    const float phase = fabsf(sinf((float)now / 300.0f)); // 0..1
    const uint8_t level = (uint8_t)(60 + phase * 160.0f);
    strip.setBrightness(255);
    strip.setPixelColor(0, strip.Color(0, (uint8_t)(level * 0.75f), level));
    strip.show();
    needsRestore = true;
  } else if (pourAbortedAt != 0 && now - pourAbortedAt < 3000) {
    flashColour(255, 0, 0);  // red = aborted / emergency
    needsRestore = true;
  } else if (pourFinishedAt != 0 && now - pourFinishedAt < 3000) {
    flashColour(0, 255, 0);  // green = drink complete
    needsRestore = true;
  } else if (needsRestore) {
    renderLED();             // signal over — back to the user's colour
    needsRestore = false;
  }
}

static String currentStateText() {
  String s = ledOn ? "ON" : "OFF";
  s += "|RGB:";
  s += String(ledRGB[0]) + "," + String(ledRGB[1]) + "," + String(ledRGB[2]);
  s += "|BRIGHTNESS:";
  s += String(ledBrightness);

  // Pump summary — only configured pumps, compact: n:NAME@rate(:F/B when running)
  String p;
  for (uint8_t i = 0; i < PUMP_COUNT; i++) {
    if (pumps[i].name[0] == '\0' && pumps[i].mode == PUMP_IDLE) continue;
    if (p.length() > 0) p += ",";
    p += String(i + 1);
    if (pumps[i].name[0] != '\0') {
      p += ":";
      p += pumps[i].name;
      p += "@";
      p += String(pumps[i].mlPerSec, 1);
    }
    if (pumps[i].mode == PUMP_POUR) p += ":POUR";
    else if (pumps[i].mode == PUMP_MANUAL) p += pumps[i].forward ? ":F" : ":B";
  }
  if (p.length() > 0) s += "|PUMPS:" + p;
  if (pourActive()) s += "|POUR:RUNNING";
  else if (pourFinishedAt != 0 && millis() - pourFinishedAt < 3000) s += "|POUR:DONE";
  else if (pourAbortedAt != 0 && millis() - pourAbortedAt < 3000) s += "|POUR:ABORTED";
  return s;
}

// --------------------------- Command executor ------------------------------
static void handleCommand(const String& raw) {
  String cmd = raw;
  cmd.trim();
  cmd.toUpperCase();

  /* ------------------------- v1 LED commands ------------------------- */
  if (cmd == "ON") {
    ledOn = true;
    renderLED();
    Serial.println("[CMD] ON");
    return;
  }
  if (cmd == "OFF") {
    ledOn = false;
    renderLED();
    Serial.println("[CMD] OFF");
    return;
  }
  if (cmd.startsWith("RGB:")) {
    String args = cmd.substring(4);
    int c1 = args.indexOf(',');
    int c2 = args.indexOf(',', c1 + 1);
    if (c1 < 0 || c2 < 0) {
      pCharacteristic->setValue("ERR:BAD_RGB");
      return;
    }
    long r = args.substring(0, c1).toInt();
    long g = args.substring(c1 + 1, c2).toInt();
    long b = args.substring(c2 + 1).toInt();
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      pCharacteristic->setValue("ERR:RANGE");
      return;
    }
    ledRGB[0] = (uint8_t)r;
    ledRGB[1] = (uint8_t)g;
    ledRGB[2] = (uint8_t)b;
    ledOn = true;
    renderLED();
    Serial.printf("[CMD] RGB:%d,%d,%d\n", ledRGB[0], ledRGB[1], ledRGB[2]);
    return;
  }
  if (cmd.startsWith("BRIGHTNESS:")) {
    long value = cmd.substring(11).toInt();
    if (value < 0 || value > 100) {
      pCharacteristic->setValue("ERR:RANGE");
      return;
    }
    ledBrightness = (uint8_t)value;
    ledOn = true;
    renderLED();
    Serial.printf("[CMD] BRIGHTNESS:%d\n", ledBrightness);
    return;
  }

  /* ------------------------- v2 pump commands ------------------------ */
  if (cmd.startsWith("PUMP:CFG:")) {
    // PUMP:CFG:<n>:<NAME>:<rate>
    String rest = cmd.substring(9);
    int sep1 = rest.indexOf(':');
    if (sep1 < 0) { pCharacteristic->setValue("ERR:BAD_PUMP"); return; }
    long n = rest.substring(0, sep1).toInt();
    String rem = rest.substring(sep1 + 1);
    int sep2 = rem.lastIndexOf(':');
    if (n < 1 || n > PUMP_COUNT || sep2 < 1) {
      pCharacteristic->setValue("ERR:BAD_PUMP");
      return;
    }
    String name = rem.substring(0, sep2);
    name = name.substring(0, 8);
    float rate = rem.substring(sep2 + 1).toFloat();
    if (name.length() == 0 || rate < ML_PER_SEC_MIN || rate > ML_PER_SEC_MAX) {
      pCharacteristic->setValue("ERR:RANGE");
      return;
    }
    uint8_t i = n - 1;
    strlcpy(pumps[i].name, name.c_str(), sizeof(pumps[i].name));
    pumps[i].mlPerSec = rate;
    savePumpConfig(i);   // survive power cycles — the bar remembers its setup
    Serial.printf("[CMD] PUMP:%u CFG %s @ %.1f ml/s (saved)\n", n, pumps[i].name, rate);
    return;
  }

  if (cmd.startsWith("PUMP:ON:")) {
    // PUMP:ON:<n>:<F|B>
    String rest = cmd.substring(8);
    int sep = rest.indexOf(':');
    if (sep < 0) { pCharacteristic->setValue("ERR:BAD_PUMP"); return; }
    long n = rest.substring(0, sep).toInt();
    String dir = rest.substring(sep + 1);
    if (n < 1 || n > PUMP_COUNT || (dir != "F" && dir != "B")) {
      pCharacteristic->setValue("ERR:BAD_PUMP");
      return;
    }
    uint8_t i = n - 1;
    pumps[i].mode = PUMP_MANUAL;
    pumps[i].forward = (dir == "F");
    pumps[i].endTime = millis() + MAX_MANUAL_MS;   // safety auto-stop
    setPumpMotion(i, pumps[i].forward);
    Serial.printf("[CMD] PUMP:%u ON %s (auto-stop %lus)\n", n, dir.c_str(),
                  (unsigned long)(MAX_MANUAL_MS / 1000));
    return;
  }

  if (cmd.startsWith("PUMP:OFF:")) {
    long n = cmd.substring(9).toInt();
    if (n < 1 || n > PUMP_COUNT) {
      pCharacteristic->setValue("ERR:BAD_PUMP");
      return;
    }
    pumpStop(n - 1);
    Serial.printf("[CMD] PUMP:%u OFF\n", n);
    return;
  }

  if (cmd.startsWith("POUR:")) {
    String rest = cmd.substring(5);
    if (rest == "ABORT") {
      allMotorsOff();
      pourAbortedAt = millis();
      pourFinishedAt = 0;
      Serial.println("[CMD] POUR:ABORT");
      return;
    }

    // POUR:<n>:<ms>,<n>:<ms>,… — parse fully BEFORE applying anything so a
    // bad token cannot leave some pumps running.
    uint8_t idx[PUMP_COUNT];
    uint32_t ms[PUMP_COUNT];
    uint8_t count = 0;
    int start = 0;
    while (start < (int)rest.length()) {
      int comma = rest.indexOf(',', start);
      String token = (comma < 0) ? rest.substring(start) : rest.substring(start, comma);
      token.trim();
      int colon = token.indexOf(':');
      if (colon < 1) { pCharacteristic->setValue("ERR:BAD_POUR"); return; }
      long n = token.substring(0, colon).toInt();
      long m = token.substring(colon + 1).toInt();
      if (n < 1 || n > PUMP_COUNT) { pCharacteristic->setValue("ERR:BAD_POUR"); return; }
      for (uint8_t c = 0; c < count; c++) {
        if (idx[c] == (uint8_t)(n - 1)) { pCharacteristic->setValue("ERR:BAD_POUR"); return; }
      }
      if (m < POUR_MIN_MS || m > POUR_MAX_MS) { pCharacteristic->setValue("ERR:BAD_POUR"); return; }
      idx[count] = n - 1;
      ms[count] = (uint32_t)m;
      count++;
      if (comma < 0) break;
      start = comma + 1;
    }
    if (count == 0) { pCharacteristic->setValue("ERR:BAD_POUR"); return; }

    // Apply simultaneously: one start time, independent end times.
    const uint32_t now = millis();
    for (uint8_t c = 0; c < count; c++) {
      uint8_t i = idx[c];
      pumps[i].mode = PUMP_POUR;
      pumps[i].forward = true;   // drinks always pour forward
      pumps[i].endTime = now + ms[c];
      setPumpMotion(i, true);
    }
    pourFinishedAt = 0;          // re-arm the green/done signal
    Serial.printf("[CMD] POUR %u pump(s):\n", count);
    for (uint8_t c = 0; c < count; c++) {
      Serial.printf("  pump %u -> %lu ms\n", idx[c] + 1, (unsigned long)ms[c]);
    }
    return;
  }

  if (cmd == "STATUS") {
    pCharacteristic->setValue(currentStateText());
    Serial.println("[CMD] STATUS");
    return;
  }

  Serial.printf("[CMD] UNKNOWN: %s\n", cmd.c_str());
  if (pCharacteristic) {
    pCharacteristic->setValue("ERR:UNKNOWN");
  }
}

// ---------------------------- GATT callbacks -------------------------------
class WriteCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* characteristic) override {
    String value = String(characteristic->getValue().c_str());
    handleCommand(value);
    // Reflect the new state so READ always answers with live status.
    characteristic->setValue(currentStateText());
  }
};

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    deviceConnected = true;
    Serial.println("[BLE] Device connected");
  }
  void onDisconnect(BLEServer* server) override {
    deviceConnected = false;
    // SAFETY: if the phone vanishes mid-pour, stop the bar.
    if (pourActive()) {
      allMotorsOff();
      pourAbortedAt = millis();
      Serial.println("[SAFETY] Disconnected during pour — all pumps stopped");
    }
    Serial.println("[BLE] Device disconnected - restarting advertising");
    server->getAdvertising()->start();  // allow silent reconnect
  }
};

// -------------------------------- Setup ------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Asif ESP32 Bartender (BLE, v2) ===");

  // Pumps first: pins low so no motor twitches during boot.
  for (uint8_t i = 0; i < PUMP_COUNT; i++) {
    pinMode(PUMP_IN_A[i], OUTPUT);
    pinMode(PUMP_IN_B[i], OUTPUT);
  }
  allMotorsOff();
  for (uint8_t i = 0; i < PUMP_COUNT; i++) {
    pumps[i].name[0] = '\0';
    pumps[i].mlPerSec = 1.0f;   // 60 ml/min until calibrated
  }
  loadPumpConfig();             // restore saved pump names + flow rates

  strip.begin();
  strip.clear();
  renderLED();

  BLEDevice::init(DEVICE_NAME);
  BLEDevice::setMTU(256);

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE);
  pCharacteristic->setCallbacks(new WriteCallback());
  pCharacteristic->addDescriptor(new BLE2902());
  pCharacteristic->setValue(currentStateText());

  pService->start();

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);  // helps iPhone pairing resolve the name
  advertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Advertising as Asif_ESP32_RGB");
  Serial.println("[PUMP] 8 pumps idle — waiting for PUMP:CFG / POUR commands");
}

// --------------------------------- Loop ------------------------------------
void loop() {
  // Pump timers + pour-signal LED rendering (non-blocking).
  servicePumpsAndLED();

  // Advertising automatically resumes on disconnect (ServerCallbacks).
  // Heartbeat keeps the serial log alive without touching BLE timing.
  static uint32_t last = 0;
  if (millis() - last >= 10000) {
    last = millis();
    Serial.printf("[STATE] %s (connected=%d)\n", currentStateText().c_str(), deviceConnected);
  }
  delay(10);
}
