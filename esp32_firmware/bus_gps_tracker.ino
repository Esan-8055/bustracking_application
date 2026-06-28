/*
 * ============================================================
 *  LINGA School Bus – ESP32 + NEO-6M GPS Tracker
 * ============================================================
 *  Hardware wiring (single TX/RX pair):
 *    NEO-6M TX  →  ESP32 GPIO 16 (RX2)
 *    NEO-6M RX  →  ESP32 GPIO 17 (TX2)
 *    NEO-6M VCC →  ESP32 3.3 V
 *    NEO-6M GND →  ESP32 GND
 *
 *  Libraries required (install via Arduino Library Manager):
 *    • TinyGPSPlus  by Mikal Hart
 *    • ArduinoJson  by Benoit Blanchon  (v6.x or v7.x)
 *    • HTTPClient   — built-in with ESP32 Arduino core
 *
 *  Fill in the config section below before flashing.
 * ============================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>

// ─── USER CONFIG ──────────────────────────────────────────────
// Wi-Fi credentials
const char* WIFI_SSID     = "loq";
const char* WIFI_PASSWORD = "12345678";

// Your deployed Next.js app URL (no trailing slash)
// Example for local testing:  "http://192.168.1.100:3000"
// Example for production    :  "https://your-app.vercel.app"
const char* SERVER_URL = "https://bustracking-application.vercel.app";

// Bus identity – copy from Firestore > buses > [document id]
const char* BUS_ID  = "bus-01"; // Firestore document ID from buses collection

// API key – copy from the bus document's apiKey field in Firestore
// OR use the master secret from .env.local: GPS_UPDATE_SECRET
const char* API_KEY = "smartbus_secret_esp32_2026";

// How often to send a location update (milliseconds)
const unsigned long UPDATE_INTERVAL_MS = 8000; // 8 seconds
// ──────────────────────────────────────────────────────────────

// GPS UART pins on ESP32
#define GPS_RX_PIN 16   // ESP32 RX2 ← NEO-6M TX
#define GPS_TX_PIN 17   // ESP32 TX2 → NEO-6M RX
#define GPS_BAUD   9600

// Built-in LED
#define LED_PIN    2

// ─── Objects ──────────────────────────────────────────────────
TinyGPSPlus gps;
HardwareSerial gpsSerial(2); // UART2

unsigned long lastUpdateMs = 0;
bool wifiConnected = false;

// ─── Helper: blink LED ────────────────────────────────────────
void blinkLED(int times, int delayMs = 120) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

// ─── Connect to Wi-Fi ─────────────────────────────────────────
void connectWiFi() {
  Serial.printf("\n[WiFi] Connecting to: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    blinkLED(3); // 3 blinks = Wi-Fi OK
  } else {
    wifiConnected = false;
    Serial.println("\n[WiFi] Connection FAILED. Will retry later.");
    blinkLED(6, 60); // 6 rapid blinks = Wi-Fi error
  }
}

// ─── POST GPS data to the Next.js API ─────────────────────────
void sendGPSUpdate(double lat, double lng, double speedKmh) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] No WiFi – skipping update.");
    connectWiFi(); // try to reconnect
    return;
  }

  // Build endpoint URL
  String url = String(SERVER_URL) + "/api/gps/update";

  // Build JSON payload matching the API contract:
  //   { busId, latitude, longitude, speed, apiKey }
  StaticJsonDocument<256> doc;
  doc["busId"]     = BUS_ID;
  doc["latitude"]  = lat;
  doc["longitude"] = lng;
  doc["speed"]     = speedKmh;
  doc["apiKey"]    = API_KEY;

  String payload;
  serializeJson(doc, payload);

  Serial.printf("[HTTP] POST → %s\n", url.c_str());
  Serial.printf("[HTTP] Body → %s\n", payload.c_str());

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10s timeout

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Response %d: %s\n", httpCode, response.c_str());

    if (httpCode == 200) {
      blinkLED(2); // 2 blinks = success
    } else {
      blinkLED(4, 80); // 4 blinks = server error
    }
  } else {
    Serial.printf("[HTTP] Request FAILED: %s\n", http.errorToString(httpCode).c_str());
    blinkLED(6, 60);
  }

  http.end();
}

// ─── Arduino Setup ────────────────────────────────────────────
void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Debug serial
  Serial.begin(115200);
  delay(500);
  Serial.println("\n========================================");
  Serial.println("  LINGA School Bus – GPS Tracker v1.0");
  Serial.println("========================================");

  // Start GPS UART
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.printf("[GPS] Serial started on RX=%d TX=%d @%d baud\n",
                GPS_RX_PIN, GPS_TX_PIN, GPS_BAUD);

  // Connect to Wi-Fi
  connectWiFi();

  Serial.println("[SYS] Waiting for GPS fix...");
}

// ─── Arduino Loop ─────────────────────────────────────────────
void loop() {
  // Feed all available GPS bytes into TinyGPSPlus
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    gps.encode(c);
  }

  // Check if it's time to send an update
  unsigned long now = millis();
  if ((now - lastUpdateMs) >= UPDATE_INTERVAL_MS) {
    lastUpdateMs = now;

    if (gps.location.isValid() && gps.location.age() < 2000) {
      // GPS fix available
      double lat      = gps.location.lat();
      double lng      = gps.location.lng();
      double speedKph = gps.speed.isValid() ? gps.speed.kmph() : 0.0;

      Serial.println("──────────────────────────────────");
      Serial.printf("[GPS] Lat: %.6f | Lng: %.6f | Speed: %.1f km/h\n",
                    lat, lng, speedKph);
      Serial.printf("[GPS] Satellites: %d | HDOP: %.1f | Age: %lu ms\n",
                    gps.satellites.value(),
                    gps.hdop.isValid() ? gps.hdop.hdop() : 0.0,
                    gps.location.age());

      sendGPSUpdate(lat, lng, speedKph);

    } else {
      // No GPS fix yet
      Serial.printf("[GPS] Waiting for fix... Chars processed: %lu | Sentences: %lu | Checksum fails: %lu\n",
                    gps.charsProcessed(),
                    gps.sentencesWithFix(),
                    gps.failedChecksum());

      // If receiving no characters at all after 10 seconds, something is wired wrong
      if (gps.charsProcessed() < 10 && millis() > 10000) {
        Serial.println("[GPS] WARNING: No NMEA data received. Check TX/RX wiring!");
      }

      // Pulse LED slowly to show we are alive but waiting for fix
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
    }
  }

  // Keep Wi-Fi alive
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    static unsigned long lastWifiRetry = 0;
    if ((now - lastWifiRetry) > 30000) { // retry every 30 s
      lastWifiRetry = now;
      Serial.println("[WiFi] Disconnected – reconnecting...");
      connectWiFi();
    }
  }
}
