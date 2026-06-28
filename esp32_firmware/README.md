# ESP32 + NEO-6M GPS Tracker Firmware

Firmware for the **LINGA School Bus** tracking hardware unit.

---

## Hardware Wiring

| NEO-6M Pin | ESP32 Pin | Note |
|-----------|-----------|------|
| VCC | 3.3 V | Do NOT use 5 V — fries the module |
| GND | GND | Common ground |
| TX | GPIO 16 (RX2) | NEO-6M sends NMEA → ESP32 receives |
| RX | GPIO 17 (TX2) | ESP32 sends commands → NEO-6M |

> The NEO-6M TX goes to ESP32 RX, and NEO-6M RX goes to ESP32 TX — this is the standard cross-wiring for UART serial.

---

## Required Libraries (Arduino IDE)

Install via **Sketch → Include Library → Manage Libraries**:

| Library | Author | Version |
|---------|--------|---------|
| **TinyGPSPlus** | Mikal Hart | latest |
| **ArduinoJson** | Benoit Blanchon | 6.x or 7.x |

`HTTPClient` and `WiFi` are built-in with the ESP32 Arduino core.

---

## Arduino IDE Board Setup

1. Add ESP32 board manager URL in **File → Preferences → Additional Boards Manager URLs**:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
2. Go to **Tools → Board → Boards Manager**, search `esp32`, install **esp32 by Espressif Systems**.
3. Select **Tools → Board → ESP32 Dev Module** (or your specific variant).
4. Set **Upload Speed** to `115200`.

---

## Configuration (edit top of `.ino` file)

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "https://your-app.vercel.app";  // or local IP for testing
const char* BUS_ID        = "YOUR_BUS_DOCUMENT_ID";         // from Firestore buses collection
const char* API_KEY       = "smartbus_secret_esp32_2026";   // master key or bus-specific key
```

### How to get BUS_ID
1. Open Firebase Console → Firestore → `buses` collection.
2. Click the bus document. The **document ID** in the URL is your `BUS_ID`.

### API Key options
- **Master key** (works for all buses): `smartbus_secret_esp32_2026` (from `.env.local → GPS_UPDATE_SECRET`)
- **Bus-specific key**: use the `apiKey` field inside that bus's Firestore document.

---

## What the firmware does

```
┌──────────────┐  NMEA UART   ┌─────────────────────────┐
│  NEO-6M GPS  │ ──────────► │  ESP32 (TinyGPSPlus)     │
│  (9600 baud) │              │  parses lat/lng/speed     │
└──────────────┘              └────────────┬────────────┘
                                           │ every 8 s (WiFi)
                                           ▼
                              POST /api/gps/update
                              { busId, latitude, longitude, speed, apiKey }
                                           │
                                           ▼
                              Next.js API → Firestore
                              buses/{id}.lastLocation
                              buses/{id}.currentSpeed
                              buses/{id}.lastUpdated
                                           │
                                           ▼
                              Real-time map updates + geofence alerts
```

---

## LED Status Codes (built-in LED on GPIO 2)

| Pattern | Meaning |
|---------|---------|
| 3 slow blinks | Wi-Fi connected successfully |
| 6 rapid blinks | Wi-Fi connection failed |
| 1 fast pulse every 8 s | Waiting for GPS fix |
| 2 blinks | GPS data sent successfully (HTTP 200) |
| 4 blinks | Server returned error (4xx/5xx) |
| 6 rapid blinks | HTTP request failed (no network) |

---

## Serial Monitor Output (115200 baud)

```
========================================
  LINGA School Bus – GPS Tracker v1.0
========================================
[GPS] Serial started on RX=16 TX=17 @9600 baud
[WiFi] Connecting to: MyWiFi
..........
[WiFi] Connected! IP: 192.168.1.42
[SYS] Waiting for GPS fix...
──────────────────────────────────
[GPS] Lat: 16.443182 | Lng: 80.621498 | Speed: 23.4 km/h
[GPS] Satellites: 7 | HDOP: 1.2 | Age: 312 ms
[HTTP] POST → https://your-app.vercel.app/api/gps/update
[HTTP] Body → {"busId":"abc123","latitude":16.443182,"longitude":80.621498,"speed":23.4,"apiKey":"..."}
[HTTP] Response 200: {"success":true,"timestamp":"2026-06-28T13:10:00.000Z"}
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `No NMEA data received` | Swap TX/RX wires. NEO-6M TX → ESP32 GPIO 16 |
| GPS never gets fix indoors | Move near a window or outside. NEO-6M needs sky view |
| HTTP 401 Unauthorized | Check `API_KEY` matches Firestore or `.env.local` |
| HTTP 404 Bus not found | Check `BUS_ID` matches a real Firestore document ID |
| Wi-Fi keeps disconnecting | Move ESP32 closer to router; use 2.4 GHz not 5 GHz |
| `charsProcessed: 0` | GPS module not powered; check VCC/GND connections |
