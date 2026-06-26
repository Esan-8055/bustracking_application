/**
 * SmartBus AI - ESP32 NEO-6M GPS Telemetry Client
 * 
 * Hardware Connections:
 * - ESP32 RX2 (Pin 16) -> NEO-6M TX
 * - ESP32 TX2 (Pin 17) -> NEO-6M RX (Use 5V to 3.3V level converter if needed)
 * - ESP32 VCC (3.3V/5V depending on board) -> NEO-6M VCC
 * - ESP32 GND -> NEO-6M GND
 * 
 * Dependencies:
 * - TinyGPS++ (by Mikal Hart) - Install via Library Manager
 * - ArduinoJson (by Benoit Blanchon) - Install via Library Manager
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>
#include <TinyGPS++.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// SmartBus API Configuration
const char* serverName = "http://YOUR_SERVER_IP:3000/api/gps/update";
const char* busId = "bus-01"; // Replace with your registered Bus ID from Admin dashboard
const char* apiKey = "bus_key_10a_9988"; // Replace with your generated Bus API Security Key

// NEO-6M GPS Configuration (Serial2 pins on ESP32)
#define RXD2 16
#define TXD2 17
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

// Telemetry interval timer
unsigned long lastTime = 0;
const unsigned long timerDelay = 8000; // Send telemetry every 8 seconds

void setup() {
  Serial.begin(115200);
  
  // Initialize Serial2 for GPS communication at 9600 baud rate (NEO-6M default)
  gpsSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);
  
  Serial.println("NEO-6M GPS Serial Initialized.");

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.println("Connecting to WiFi...");
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Connected to WiFi network with IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Feed GPS serial data to TinyGPS++ parser
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // Periodic telemetry transmission
  if ((millis() - lastTime) > timerDelay) {
    if (WiFi.status() == WL_CONNECTED) {
      
      // Verify GPS lock and valid coordinates
      if (gps.location.isValid()) {
        float latitude = gps.location.lat();
        float longitude = gps.location.lng();
        float speedKmh = gps.speed.kmh(); // Retrieve speed in km/h

        Serial.print("GPS lock active. Location: ");
        Serial.print(latitude, 6);
        Serial.print(", ");
        Serial.print(longitude, 6);
        Serial.print(" | Speed: ");
        Serial.println(speedKmh);

        // Send telemetry payload
        sendTelemetry(latitude, longitude, speedKmh);
      } else {
        Serial.println("Waiting for NEO-6M GPS satellite lock...");
      }
    } else {
      Serial.println("WiFi Disconnected. Reconnecting...");
      WiFi.disconnect();
      WiFi.reconnect();
    }
    lastTime = millis();
  }
}

void sendTelemetry(float lat, float lng, float speedVal) {
  HTTPClient http;
  
  // Establish connection
  http.begin(serverName);
  
  // Specify JSON content header
  http.addHeader("Content-Type", "application/json");

  // Create JSON document
  StaticJsonDocument<200> doc;
  doc["busId"] = busId;
  doc["latitude"] = lat;
  doc["longitude"] = lng;
  doc["speed"] = speedVal;
  doc["apiKey"] = apiKey;

  String requestBody;
  serializeJson(doc, requestBody);

  // Send POST request
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    String payload = http.getString();
    Serial.println("Server Response: " + payload);
  } else {
    Serial.print("Error code on sending POST: ");
    Serial.println(httpResponseCode);
  }
  
  // Close connection
  http.end();
}
