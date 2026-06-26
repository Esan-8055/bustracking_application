'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { HelpCircle, AlertTriangle, ShieldCheck, Compass, MessageSquare, Megaphone, Bell } from 'lucide-react';
import GoogleMapComponent from '@/components/GoogleMapComponent';
import { Student, Bus, Route, Driver, Announcement } from '@/types';

export default function StudentDashboard() {
  const { user, school } = useAppStore();
  const [student, setStudent] = useState<Student | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [sosSent, setSosSent] = useState(false);

  useEffect(() => {
    if (!user || !school) return;

    let active = true;
    let unsubStudent: (() => void) | null = null;
    let unsubBus: (() => void) | null = null;

    // 1. Listen to Student Details (using student.id as user.uid)
    unsubStudent = onSnapshot(doc(db, 'students', user.uid), (studDoc) => {
      if (!active) return;

      if (studDoc.exists()) {
        const studData = { id: studDoc.id, ...studDoc.data() } as Student;
        setStudent(studData);

        // 2. Listen to assigned Bus in real time
        if (unsubBus) {
          unsubBus();
          unsubBus = null;
        }

        if (studData.busId) {
          unsubBus = onSnapshot(doc(db, 'buses', studData.busId), (busDoc) => {
            if (!active) return;
            if (busDoc.exists()) {
              const busData = { id: busDoc.id, ...busDoc.data() } as Bus;
              setBus(busData);

              // 3. Fetch Driver
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

        // 4. Fetch Route Details (outside the busId block so route map renders even if bus is unassigned)
        if (studData.routeId) {
          getDoc(doc(db, 'routes', studData.routeId)).then((routeDoc) => {
            if (active && routeDoc.exists()) {
              setRoute({ id: routeDoc.id, ...routeDoc.data() } as Route);
            }
          });
        }
      } else {
        // Fallback check: query by student email
        const qStud = query(
          collection(db, 'students'),
          where('schoolId', '==', school.id),
          where('email', '==', user.email)
        );
        getDocs(qStud).then((snap) => {
          if (!active) return;
          if (!snap.empty) {
            const first = snap.docs[0];
            const studData = { id: first.id, ...first.data() } as Student;
            setStudent(studData);

            // Fetch Route Details for fallback student
            if (studData.routeId) {
              getDoc(doc(db, 'routes', studData.routeId)).then((routeDoc) => {
                if (active && routeDoc.exists()) {
                  setRoute({ id: routeDoc.id, ...routeDoc.data() } as Route);
                }
              });
            }

            // Listen to assigned Bus in real time for fallback student
            if (unsubBus) {
              unsubBus();
              unsubBus = null;
            }
            if (studData.busId) {
              unsubBus = onSnapshot(doc(db, 'buses', studData.busId), (busDoc) => {
                if (!active) return;
                if (busDoc.exists()) {
                  const busData = { id: busDoc.id, ...busDoc.data() } as Bus;
                  setBus(busData);

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
          }
        });
      }
    });

    // 5. Fetch Announcements
    const qAnn = query(
      collection(db, 'announcements'),
      where('schoolId', '==', school.id)
    );
    const unsubAnn = onSnapshot(qAnn, (snapshot) => {
      if (!active) return;
      const list: Announcement[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Announcement);
      });
      setAnnouncements(list);
    });

    return () => {
      active = false;
      if (unsubStudent) unsubStudent();
      if (unsubBus) unsubBus();
      unsubAnn();
    };
  }, [user, school]);



  const triggerSos = async () => {
    if (!school) return;
    try {
      await addDoc(collection(db, 'emergencyLogs'), {
        schoolId: school.id,
        busId: student?.busId || 'unassigned',
        driverId: bus?.driverId || 'unassigned',
        location: bus?.lastLocation || { lat: 12.9716, lng: 77.5946 },
        status: 'active',
        message: `SOS Triggered by Student (${user?.displayName || 'Unknown Student'}) from student app.`,
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
    plateNumber: bus.plateNumber
  }] : [];

  const assignedRouteStops = route?.stops || [];
  const assignedRoutePath = route?.coordinates || [];

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-4 sm:p-6 rounded-2xl border border-slate-900 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Student Transport Portal</h1>
          <p className="text-xs text-slate-500 mt-1">Live mapping tracking for school buses and route timetables</p>
        </div>
        <button
          onClick={triggerSos}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold transition-all animate-pulse shadow-lg shadow-rose-600/10"
        >
          <AlertTriangle className="h-4 w-4" />
          EMERGENCY SOS BUTTON
        </button>
      </div>

      {sosSent && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold animate-bounce">
          SOS SIGNAL TRANSMITTED! Administrative office and bus crew have been notified of your location.
        </div>
      )}

      {/* Main Grid Layout - single column on mobile, 4-col on large */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {/* Left: Bus Info & Stops */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-900 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Assigned Bus Info
            </h3>
            {student && bus ? (
              <div className="space-y-3 text-xs text-slate-400">
                <div>
                  <p className="text-slate-500 font-medium">Bus Service:</p>
                  <p className="text-white font-bold text-sm mt-0.5">{bus.busNumber}</p>
                  <p className="font-mono text-slate-500 mt-0.5">Plate: {bus.plateNumber}</p>
                </div>
                {driver && (
                  <div className="border-t border-slate-900 pt-3">
                    <p className="text-slate-500 font-medium">Crew Leader (Driver):</p>
                    <p className="text-white font-semibold mt-0.5">{driver.name}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-600 py-6 text-center">Unassigned. Contact admin office.</p>
            )}
          </div>

          {/* Stops Timeline */}
          {route && (
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-900 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                Route Stops Sequence
              </h3>
              <div className="space-y-4 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
                {assignedRouteStops.map((stop) => {
                  const isPickup = student?.pickupStopId === stop.id;
                  return (
                    <div key={stop.id} className="relative text-xs">
                      <span className={`absolute -left-[19px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 flex items-center justify-center text-[9px] font-bold ${
                        isPickup ? 'bg-yellow-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {stop.order}
                      </span>
                      <p className={`font-bold ${isPickup ? 'text-yellow-500' : 'text-slate-200'}`}>
                        {stop.name} {isPickup && '(Your stop)'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Center: Live Google Map */}
        <div className="col-span-1 lg:col-span-2 block w-full relative glass-panel p-2 rounded-3xl border border-slate-900" style={{ minHeight: '350px' }}>
          <GoogleMapComponent
            buses={formattedBuses}
            stops={assignedRouteStops}
            routePath={assignedRoutePath}
            zoom={14}
            showGeofences={false}
          />
        </div>

        {/* Right: Broadcast Notices & Helplines */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          {/* Noticeboard */}
          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-900 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-slate-900 pb-3">
              <Megaphone className="h-4 w-4 text-yellow-500 shrink-0" />
              School noticeboard
            </h3>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {announcements.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-xs">No active notices.</div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="font-bold text-slate-200 truncate max-w-[120px]">{ann.title}</span>
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded font-mono ${
                        ann.type === 'emergency' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {ann.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal font-light">{ann.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Emergency contacts card */}
          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-900 space-y-3 text-xs">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Emergency Hotlines
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-slate-950/40 p-2.5 border border-slate-900 rounded-lg">
                <span className="text-slate-400 font-medium">School Security:</span>
                <a href="tel:+15550199" className="text-yellow-500 font-mono font-bold hover:underline">
                  +1-555-0199
                </a>
              </div>
              <div className="flex justify-between items-center bg-slate-950/40 p-2.5 border border-slate-900 rounded-lg">
                <span className="text-slate-400 font-medium">Police Dispatch:</span>
                <a href="tel:911" className="text-yellow-500 font-mono font-bold hover:underline">
                  911 / 100
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
