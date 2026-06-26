import { NextResponse } from 'next/server';
import { collection, doc, getDoc, getDocs, query, where, updateDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

// Haversine formula to compute distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { busId, latitude, longitude, speed, apiKey } = body;

    // 1. Basic validation
    if (!busId || latitude === undefined || longitude === undefined || speed === undefined || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: busId, latitude, longitude, speed, apiKey' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const busSpeed = parseFloat(speed);

    if (isNaN(lat) || isNaN(lng) || isNaN(busSpeed)) {
      return NextResponse.json({ error: 'Invalid coordinate or speed values' }, { status: 400 });
    }

    // 2. Fetch the bus document
    const busDocRef = doc(db, 'buses', busId);
    const busSnap = await getDoc(busDocRef);

    if (!busSnap.exists()) {
      return NextResponse.json({ error: 'Bus not found' }, { status: 404 });
    }

    const busData = busSnap.data();

    // 3. Verify API Key (Against either the bus's specific key or the system secret key)
    const masterSecret = process.env.GPS_UPDATE_SECRET;
    if (apiKey !== busData.apiKey && apiKey !== masterSecret) {
      return NextResponse.json({ error: 'Unauthorized GPS API Key' }, { status: 401 });
    }

    // 4. Update the bus document in real time
    await updateDoc(busDocRef, {
      currentSpeed: busSpeed,
      lastLocation: { lat, lng },
      lastUpdated: serverTimestamp()
    });

    // 5. Log history in gpsTracking for auditing
    await addDoc(collection(db, 'gpsTracking'), {
      busId,
      schoolId: busData.schoolId,
      latitude: lat,
      longitude: lng,
      speed: busSpeed,
      timestamp: serverTimestamp()
    });

    // 6. Geofencing check: check if the bus is near any stops on its route
    if (busData.routeId) {
      const routeDocRef = doc(db, 'routes', busData.routeId);
      const routeSnap = await getDoc(routeDocRef);

      if (routeSnap.exists()) {
        const routeData = routeSnap.data();
        const stops = routeData.stops || [];

        for (const stop of stops) {
          const distance = getDistance(lat, lng, stop.lat, stop.lng);

          // If bus is within 200m of the stop
          if (distance <= 200) {
            // Check if we already notified for this stop recently (avoid duplicate alerts)
            const notificationQuery = query(
              collection(db, 'notifications'),
              where('schoolId', '==', busData.schoolId),
              where('type', '==', 'bus_near'),
              where('body', '>=', `Bus ${busData.busNumber} is approaching ${stop.name}`),
              where('timestamp', '>=', Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 1000))) // last 10 mins
            );
            const duplicateCheck = await getDocs(notificationQuery);

            if (duplicateCheck.empty) {
              // Retrieve students assigned to this stop and bus
              const studentsQuery = query(
                collection(db, 'students'),
                where('schoolId', '==', busData.schoolId),
                where('busId', '==', busId),
                where('pickupStopId', '==', stop.id)
              );
              const studentsSnap = await getDocs(studentsQuery);

              // Broadcast alerts to students and parents
              for (const studentDoc of studentsSnap.docs) {
                const student = studentDoc.data();

                // Alert the Student
                await addDoc(collection(db, 'notifications'), {
                  userId: studentDoc.id,
                  schoolId: busData.schoolId,
                  title: 'Bus Approaching Stop',
                  body: `Bus ${busData.busNumber} is approaching your stop ${stop.name}. Please get ready!`,
                  read: false,
                  type: 'bus_near',
                  timestamp: serverTimestamp()
                });

                // Alert the Parent
                if (student.parentId) {
                  await addDoc(collection(db, 'notifications'), {
                    userId: student.parentId,
                    schoolId: busData.schoolId,
                    title: 'Bus Approaching Pickup Point',
                    body: `Bus ${busData.busNumber} is approaching ${student.name}'s stop (${stop.name}). ETA: ~2 minutes.`,
                    read: false,
                    type: 'bus_near',
                    timestamp: serverTimestamp()
                  });
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error updating GPS coordinate:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
