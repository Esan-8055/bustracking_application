/**
 * SmartBus AI - ESP32 GPS Telemetry Simulator
 * 
 * Simulates an ESP32 module reading coordinates from a NEO-6M GPS receiver
 * and firing HTTP POST payloads to the SmartBus local API.
 * 
 * Run using: node scratch/gps_simulator.js
 */

const http = require('http');

const API_URL = 'http://localhost:3000/api/gps/update';
const BUS_ID = 'bus-01'; // Matches seeded Demo Bus 10A
const API_KEY = 'bus_key_10a_9988'; // Matches seeded Demo Bus API key

// Coordinate sequence along the seeded route: North Bangalore Line
const routeCoordinates = [
  { lat: 13.0354, lng: 77.5978, speed: 30 }, // Stop 1: Hebbal Flyover Junction
  { lat: 13.0335, lng: 77.6105, speed: 45 }, 
  { lat: 13.0298, lng: 77.6299, speed: 40 }, // Stop 2: Hennur Ring Road Stop (Near student)
  { lat: 13.0245, lng: 77.6355, speed: 50 },
  { lat: 13.0223, lng: 77.6412, speed: 10 }, // Stop 3: Kalyan Nagar Bus Depot
  { lat: 13.0360, lng: 77.6255, speed: 55 },
  { lat: 13.0455, lng: 77.6122, speed: 0 }    // Stop 4: Greenwood Campus Main Gate (Arrived)
];

let currentIndex = 0;

function sendGpsPing() {
  const coord = routeCoordinates[currentIndex];
  
  const payload = JSON.stringify({
    busId: BUS_ID,
    latitude: coord.lat,
    longitude: coord.lng,
    speed: coord.speed,
    apiKey: API_KEY
  });

  const urlObj = new URL(API_URL);
  
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || 80,
    path: urlObj.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  console.log(`[ESP32 Sim] Transmitting coordinates: ${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)} at ${coord.speed} km/h...`);

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`[ESP32 Sim] Success Response: ${data}`);
      } else {
        console.error(`[ESP32 Sim] Server Error (${res.statusCode}): ${data}`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`[ESP32 Sim] Connection error: ${e.message}`);
    console.log(`Make sure the Next.js development server is running on ${urlObj.origin}`);
  });

  req.write(payload);
  req.end();

  // Increment index or loop back
  currentIndex = (currentIndex + 1) % routeCoordinates.length;
}

console.log('----------------------------------------------------');
console.log('SmartBus AI - ESP32 Telemetry Simulator Active');
console.log(`Targeting: ${API_URL}`);
console.log(`Interval: Pinging every 7 seconds`);
console.log('----------------------------------------------------');

// Trigger first ping, then set interval
sendGpsPing();
setInterval(sendGpsPing, 7000);
