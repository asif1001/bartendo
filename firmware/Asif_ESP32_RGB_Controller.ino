/**
 * Asif_ESP32_RGB_Controller.ino
 * =============================
 * BLE RGB LED firmware for the ESP32-S3 WROOM (onboard WS2812 LED, GPIO 48).
 *
 * This firmware pairs with the ASIF RGB CONTROLLER app. The BLE protocol is
 * the single source of truth shared with src/services/bluetooth/BLEConstants.ts.
 *
 * --------------------------- PROTOCOL (do not change) ----------------------
 *   BLE device name           : Asif_ESP32_RGB
 *   Service UUID              : 12345678-1234-1234-1234-123456789001
 *   Characteristic UUID       : 12345678-1234-1234-1234-123456789002
 *   Characteristic properties : READ | WRITE
 *   Payload type              : UTF-8 text
 *
 *   Commands received by the ESP32:
 *     ON                 - turn the LED on
 *     OFF                - turn the LED off
 *     RGB:255,0,0        - set colour (R,G,B each 0-255)
 *     BRIGHTNESS:100     - set brightness 0-100 (percent)
 *     (unknown commands return the text "ERR:UNKNOWN")
 *
 *   READ on the characteristic returns the current state text, e.g.
 *   "ON|RGB:255,0,0|BRIGHTNESS:50".
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

// ------------------------------- Config ------------------------------------
static const char* DEVICE_NAME = "Asif_ESP32_RGB";
static const char* SERVICE_UUID = "12345678-1234-1234-1234-123456789001";
static const char* CHARACTERISTIC_UUID = "12345678-1234-1234-1234-123456789002";

static const uint8_t LED_PIN = 48;   // Onboard WS2812 RGB LED on ESP32-S3 DevKit
static const uint8_t LED_COUNT = 1;  // Single onboard addressable LED

// ------------------------------- State -------------------------------------
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

bool ledOn = true;
uint8_t ledBrightness = 50;          // percent 0-100
uint8_t ledRGB[3] = { 255, 0, 0 };   // stored at full value, scaled by brightness

BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected = false;

// --------------------------- Rendering helper ------------------------------
static void renderLED() {
  uint8_t scaled = ledOn ? map(ledBrightness, 0, 100, 0, 255) : 0;
  strip.setBrightness(scaled);
  strip.setPixelColor(0, strip.Color(ledRGB[0], ledRGB[1], ledRGB[2]));
  strip.show();
}

static String currentStateText() {
  String s = ledOn ? "ON" : "OFF";
  s += "|RGB:";
  s += String(ledRGB[0]) + "," + String(ledRGB[1]) + "," + String(ledRGB[2]);
  s += "|BRIGHTNESS:";
  s += String(ledBrightness);
  return s;
}

// --------------------------- Command executor ------------------------------
static void handleCommand(const String& raw) {
  String cmd = raw;
  cmd.trim();
  cmd.toUpperCase();

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
    Serial.println("[BLE] Device disconnected - restarting advertising");
    server->getAdvertising()->start();  // allow silent reconnect
  }
};

// -------------------------------- Setup ------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Asif ESP32 RGB Controller (BLE) ===");

  strip.begin();
  strip.clear();
  renderLED();

  BLEDevice::init(DEVICE_NAME);
  BLEDevice::setMTU(128);

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
}

// --------------------------------- Loop ------------------------------------
void loop() {
  // Advertising automatically resumes on disconnect (ServerCallbacks).
  // Heartbeat keeps the serial log alive without touching BLE timing.
  static uint32_t last = 0;
  if (millis() - last >= 10000) {
    last = millis();
    Serial.printf("[STATE] %s (connected=%d)\n", currentStateText().c_str(), deviceConnected);
  }
  delay(10);
}
