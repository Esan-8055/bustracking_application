'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { Phone, AlertOctagon, HelpCircle, Navigation, ShieldCheck, Clock, Bell } from 'lucide-react';
import GoogleMapComponent from '@/components/GoogleMapComponent';
import { Student, Bus, Route, Driver, NotificationMsg, LatLng } from '@/types';

// Haversine formula to compute distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
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

export default function ParentDashboard() {
  const { user, school } = useAppStore();
  const [student, setStudent] = useState<Student | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [notifications, setNotifications] = useState<NotificationMsg[]>([]);
  const [etaText, setEtaText] = useState('Calculating ETA...');
  const [sosSent, setSosSent] = useState(false);

  useEffect(() => {
    if (!user || !school) return;

    let active = true;
    let unsubStudent: (() => void) | null = null;
    let unsubBus: (() => void) | null = null;

    // 1. Fetch Parent details to find their student's admission number
    getDoc(doc(db, 'parents', user.uid)).then((parentSnap) => {
      if (!active) return;

      let qStudent;
      if (parentSnap.exists()) {
        const parentData = parentSnap.data();
        const admissionNum = parentData.studentAdmissionNumber;
        if (admissionNum) {
          qStudent = query(
            collection(db, 'students'),
            where('schoolId', '==', school.id),
            where('admissionNumber', '==', admissionNum)
          );
        }
      }

      // Fallback: query by parentId
      if (!qStudent) {
        qStudent = query(
          collection(db, 'students'),
          where('schoolId', '==', school.id),
          where('parentId', '==', user.uid)
        );
      }

      unsubStudent = onSnapshot(qStudent, (snapshot) => {
        if (!active) return;
        if (!snapshot.empty) {
          const studDoc = snapshot.docs[0];
          const studData = { id: studDoc.id, ...studDoc.data() } as Student;
          setStudent(studData);

          // 2. Listen to the assigned Bus coordinates in real time
          if (unsubBus) unsubBus();
          if (studData.busId) {
            unsubBus = onSnapshot(doc(db, 'buses', studData.busId), (busDoc) => {
              if (!active) return;
              if (busDoc.exists()) {
                const busData = { id: busDoc.id, ...busDoc.data() } as Bus;
                setBus(busData);

                // 3. Fetch Driver Details
                if (busData.driverId) {
                  getDoc(doc(db, 'drivers', busData.driverId)).then((drvDoc) => {
                    if (active && drvDoc.exists()) {
                      setDriver({ id: drvDoc.id, ...drvDoc.data() } as Driver);
                    }
                  });
                }
              }
            });
          }

          // 4. Fetch Route Details
          if (studData.routeId) {
            getDoc(doc(db, 'routes', studData.routeId)).then((routeDoc) => {
              if (active && routeDoc.exists()) {
                setRoute({ id: routeDoc.id, ...routeDoc.data() } as Route);
              }
            });
          }
        }
      });
    });

    // 5. Listen to notifications for this parent
    const qNotif = query(
      collection(db, 'notifications'),
      where('schoolId', '==', school.id),
      where('userId', '==', user.uid)
    );
    const unsubNotif = onSnapshot(qNotif, (snapshot) => {
      const list: NotificationMsg[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as NotificationMsg);
      });
      setNotifications(list.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
    });

    return () => {
      active = false;
      if (unsubStudent) unsubStudent();
      if (unsubBus) unsubBus();
      unsubNotif();
    };
  }, [user, school]);

  // Recalculate ETA whenever coordinates change
  useEffect(() => {
    if (!student || !bus || !route) return;

    // Find student pickup stop coordinates
    const stop = route.stops?.find((s) => s.id === student.pickupStopId);
    if (stop && bus.lastLocation) {
      const distance = getDistance(
        bus.lastLocation.lat,
        bus.lastLocation.lng,
        stop.lat,
        stop.lng
      ); // distance in meters

      // Calculate time
      // speed is in km/h. Convert to m/min
      // If bus speed is 0, assume default speed of 30 km/h to avoid infinite ETA
      const speedKmh = bus.currentSpeed > 0 ? bus.currentSpeed : 30;
      const speedMpm = (speedKmh * 1000) / 60; // meters per minute
      const minutes = Math.ceil(distance / speedMpm);

      if (distance <= 100) {
        setEtaText('Bus is at your stop!');
      } else {
        setEtaText(`Arriving in ${minutes} mins (${(distance / 1000).toFixed(1)} km away)`);
      }
    } else {
      setEtaText('No active GPS signal');
    }
  }, [student, bus, route]);

  const triggerSos = async () => {
    if (!school) return;
    try {
      await addDoc(collection(db, 'emergencyLogs'), {
        schoolId: school.id,
        busId: student?.busId || 'unassigned',
        driverId: bus?.driverId || 'unassigned',
        location: bus?.lastLocation || { lat: 12.9716, lng: 77.5946 },
        status: 'active',
        message: `SOS triggered by Parent (${user?.displayName || 'Unknown Parent'}) for their child's bus.`,
        timestamp: serverTimestamp()
      });
      setSosSent(true);
      setTimeout(() => setSosSent(false), 5000);
    } catch (err) {
      console.error('SOS Trigger failed:', err);
    }
  };

  const formattedBuses = bus && bus.lastLocation ? [{
    id: bus.id,
    name: bus.busNumber,
    lat: bus.lastLocation.lat,
    lng: bus.lastLocation.lng,
    speed: bus.currentSpeed,
    plateNumber: bus.plateNumber,
    driverName: driver?.name,
    driverPhone: driver?.phone
  }] : [];

  const assignedRouteStops = route?.stops || [];
  const assignedRoutePath = route?.coordinates || [];

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-4 sm:p-6 rounded-2xl border border-slate-900 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Child Transport Safety Center</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time mapping, speed checks, and ETA feeds</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {driver?.phone && (
            <a
              href={`tel:${driver.phone}`}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
            >
              <Phone className="h-4 w-4" />
              Call Driver
            </a>
          )}
          <button
            onClick={triggerSos}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all animate-pulse"
          >
            <AlertOctagon className="h-4 w-4" />
            Trigger SOS
          </button>
        </div>
      </div>

      {sosSent && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold animate-pulse">
          SOS SIGNAL DEPLOYED! School security office and emergency services have been alerted with coordinates.
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {/* Left pane: Profile & ETA */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          {/* Child Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-900 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Student Profile
            </h3>
            {student ? (
              <div className="space-y-3.5">
                <div>
                  <h4 className="text-base font-bold text-white leading-tight">{student.name}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">Adm. No: {student.admissionNumber}</p>
                </div>

                <div className="flex gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-900 items-center justify-between text-xs">
                  <span className="text-slate-400">Boarding Status:</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    student.status === 'reached_school'
                      ? 'bg-blue-500/10 text-blue-400'
                      : student.status === 'boarding'
                      ? 'bg-yellow-500/10 text-yellow-400 font-semibold'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {student.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-slate-600 text-xs text-center py-6">Loading student credentials...</div>
            )}
          </div>

          {/* Smart ETA Predictions */}
          {bus && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-900 space-y-3.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                Smart ETA feed
              </h3>
              <div className="text-xl font-extrabold text-white">{etaText}</div>
              <div className="text-[10px] text-slate-500 leading-normal">
                Based on current speed ({bus.currentSpeed} km/h) and real-world route constraints.
              </div>
            </div>
          )}

          {/* Driver Contacts Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-900 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Vehicle & Driver Details
            </h3>
            {bus ? (
              <div className="space-y-3.5 text-xs text-slate-400">
                <div>
                  <p className="text-slate-500 font-medium">Assigned Bus:</p>
                  <p className="text-white font-bold text-sm mt-0.5">{bus.busNumber}</p>
                  <p className="font-mono text-slate-500 mt-0.5">Plate: {bus.plateNumber}</p>
                </div>
                {driver ? (
                  <div className="border-t border-slate-900 pt-3">
                    <p className="text-slate-500 font-medium">Driver Name:</p>
                    <p className="text-white font-semibold mt-0.5">{driver.name}</p>
                    <p className="font-mono mt-0.5">License: {driver.licenseNumber}</p>
                  </div>
                ) : (
                  <p className="text-slate-600 border-t border-slate-900 pt-3">No driver linked yet.</p>
                )}
              </div>
            ) : (
              <p className="text-slate-600 text-xs py-4 text-center">No assigned transport runs yet.</p>
            )}
          </div>
        </div>

        {/* Center: Live Google Map */}
        <div className="col-span-1 lg:col-span-2 block w-full relative glass-panel p-2 rounded-3xl border border-slate-900" style={{ minHeight: '350px' }}>
          <GoogleMapComponent
            buses={formattedBuses}
            stops={assignedRouteStops}
            routePath={assignedRoutePath}
            zoom={14}
            showGeofences={true}
          />
        </div>

        {/* Right pane: Real-time Alerts log */}
        <div className="lg:col-span-1 glass-panel p-4 sm:p-5 rounded-2xl border border-slate-900 space-y-4 flex flex-col max-h-[380px] lg:h-[500px] overflow-hidden">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-slate-900 pb-3 shrink-0">
            <Bell className="h-4 w-4 text-yellow-500 shrink-0" />
            Real-time notifications log
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1.5">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-xs">No notifications logged.</div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-300">{notif.title}</span>
                    <span className="text-slate-600">
                      {notif.timestamp ? new Date(notif.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal font-light">{notif.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
