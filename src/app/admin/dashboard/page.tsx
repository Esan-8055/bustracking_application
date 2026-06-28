'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { Users, UserCheck, ShieldCheck, Bus as BusIcon, AlertOctagon, Megaphone, Bell, Sparkles, Navigation } from 'lucide-react';
import { Student, Parent, Driver, Bus, EmergencyLog, Announcement, Route } from '@/types';
import GoogleMapComponent from '@/components/GoogleMapComponent';

export default function AdminDashboard() {
  const { school } = useAppStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [sosLogs, setSosLogs] = useState<EmergencyLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!school) return;

    // Listeners for collections filtered by schoolId
    const qStudents = query(collection(db, 'students'), where('schoolId', '==', school.id));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      const list: Student[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Student));
      setStudents(list);
    });

    const qParents = query(collection(db, 'parents'), where('schoolId', '==', school.id));
    const unsubParents = onSnapshot(qParents, (snap) => {
      const list: Parent[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Parent));
      setParents(list);
    });

    const qDrivers = query(collection(db, 'drivers'), where('schoolId', '==', school.id));
    const unsubDrivers = onSnapshot(qDrivers, (snap) => {
      const list: Driver[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Driver));
      setDrivers(list);
    });

    const qBuses = query(collection(db, 'buses'), where('schoolId', '==', school.id));
    const unsubBuses = onSnapshot(qBuses, (snap) => {
      const list: Bus[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Bus));
      setBuses(list);
    });

    const qSos = query(collection(db, 'emergencyLogs'), where('schoolId', '==', school.id), where('status', '==', 'active'));
    const unsubSos = onSnapshot(qSos, (snap) => {
      const list: EmergencyLog[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as EmergencyLog));
      setSosLogs(list);
    });

    const qAnnouncements = query(collection(db, 'announcements'), where('schoolId', '==', school.id));
    const unsubAnn = onSnapshot(qAnnouncements, (snap) => {
      const list: Announcement[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(list);
    });

    const qRoutes = query(collection(db, 'routes'), where('schoolId', '==', school.id));
    const unsubRoutes = onSnapshot(qRoutes, (snap) => {
      const list: Route[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Route));
      setRoutes(list);
    });

    return () => {
      unsubStudents();
      unsubParents();
      unsubDrivers();
      unsubBuses();
      unsubSos();
      unsubAnn();
      unsubRoutes();
    };
  }, [school]);

  const handleResolveSos = async (logId: string) => {
    try {
      await updateDoc(doc(db, 'emergencyLogs', logId), {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedBy: 'Admin Console'
      });
    } catch (err) {
      console.error('Error resolving SOS:', err);
    }
  };

  // Seeding tool to easily populate the blank database
  const handleSeedData = async () => {
    if (!school) return;
    setSeeding(true);
    setError('');

    try {
      const batch = writeBatch(db);

      // 1. Seed Demo Drivers
      const testDrivers = [
        { id: 'driver-01', name: 'Jeganathan G', email: 'jegan@smartbus.ai', phone: '+91-9876543210', schoolId: school.id, licenseNumber: 'DL-TN01-2026', photoUrl: '', busId: 'bus-01', status: 'active' },
        { id: 'driver-02', name: 'David Miller', email: 'david@smartbus.ai', phone: '+1-555-0144', schoolId: school.id, licenseNumber: 'DL-CA-4001', photoUrl: '', busId: 'bus-02', status: 'active' }
      ];
      testDrivers.forEach((drv) => {
        batch.set(doc(db, 'drivers', drv.id), drv);
      });

      // 2. Seed Demo Buses
      const testBuses = [
        { id: 'bus-01', busNumber: '10A Route', plateNumber: 'TN-01-AX-1234', schoolId: school.id, driverId: 'driver-01', routeId: 'route-01', capacity: 40, status: 'active', apiKey: 'bus_key_10a_9988', currentSpeed: 45, lastLocation: { lat: 12.9716, lng: 77.5946 }, lastUpdated: serverTimestamp() },
        { id: 'bus-02', busNumber: '12B Express', plateNumber: 'TN-01-BY-5678', schoolId: school.id, driverId: 'driver-02', routeId: 'route-02', capacity: 35, status: 'active', apiKey: 'bus_key_12b_4432', currentSpeed: 0, lastLocation: { lat: 12.9616, lng: 77.5846 }, lastUpdated: serverTimestamp() }
      ];
      testBuses.forEach((b) => {
        batch.set(doc(db, 'buses', b.id), b);
      });

      // 3. Seed Demo Routes & Stops
      const testRoutes = [
        {
          id: 'route-01',
          name: 'North Bangalore Line',
          schoolId: school.id,
          description: 'Serves Hebbal, Yelahanka, and Kalyan Nagar',
          stops: [
            { id: 'stop-01', name: 'Hebbal Flyover Junction', order: 1, lat: 13.0354, lng: 77.5978 },
            { id: 'stop-02', name: 'Kalyan Nagar Bus Depot', order: 2, lat: 13.0223, lng: 77.6412 },
            { id: 'stop-03', name: 'Hennur Ring Road Stop', order: 3, lat: 13.0298, lng: 77.6299 },
            { id: 'stop-04', name: 'Linga Campus Main Gate', order: 4, lat: 13.0455, lng: 77.6122 }
          ],
          coordinates: [
            { lat: 13.0354, lng: 77.5978 },
            { lat: 13.0298, lng: 77.6299 },
            { lat: 13.0223, lng: 77.6412 },
            { lat: 13.0455, lng: 77.6122 }
          ]
        },
        {
          id: 'route-02',
          name: 'East Bangalore Line',
          schoolId: school.id,
          description: 'Serves Indiranagar and Whitefield',
          stops: [
            { id: 'stop-11', name: 'Indiranagar Metro Station', order: 1, lat: 12.9784, lng: 77.6408 },
            { id: 'stop-12', name: 'Whitefield Honda Signal', order: 2, lat: 12.9698, lng: 77.7499 }
          ],
          coordinates: [
            { lat: 12.9784, lng: 77.6408 },
            { lat: 12.9698, lng: 77.7499 }
          ]
        }
      ];
      testRoutes.forEach((r) => {
        batch.set(doc(db, 'routes', r.id), r);
      });

      // 4. Seed Demo Parents & Students
      const testParents = [
        { id: 'parent-demo-uid', name: 'Stephen King', email: 'parent@smartbus.ai', phone: '+91-9988776655', schoolId: school.id, studentIds: ['student-01'], emergencyContact: '+91-9999999999' }
      ];
      testParents.forEach((p) => {
        batch.set(doc(db, 'parents', p.id), p);
      });

      const testStudents = [
        { id: 'student-01', name: 'Tabitha King', email: 'student@smartbus.ai', admissionNumber: 'ADM-2026-004', schoolId: school.id, parentId: 'parent-demo-uid', busId: 'bus-01', routeId: 'route-01', pickupStopId: 'stop-02', status: 'idle', lastUpdated: serverTimestamp() }
      ];
      testStudents.forEach((s) => {
        batch.set(doc(db, 'students', s.id), s);
      });

      // 5. Seed Announcements
      const testAnn = [
        { id: 'ann-01', schoolId: school.id, title: 'Route 10A Maintenance Delay', content: 'Bus 10A is undergoing routine safety maintenance. Delayed by 15 mins today.', type: 'maintenance', targetRoles: ['parent', 'student'], createdAt: serverTimestamp(), createdBy: 'Admin Office' },
        { id: 'ann-02', schoolId: school.id, title: 'Heavy Rainfall Warning', content: 'Due to severe weather conditions, all routes may expect a 20-30 min ETA inflation. Please track live maps.', type: 'emergency', targetRoles: ['parent', 'student'], createdAt: serverTimestamp(), createdBy: 'Safety Board' }
      ];
      testAnn.forEach((a) => {
        batch.set(doc(db, 'announcements', a.id), a);
      });

      await batch.commit();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const activeBusesCount = buses.filter(b => b.status === 'active' && b.currentSpeed > 0).length;

  const formattedBuses = buses
    .filter((b) => b.lastLocation)
    .map((b) => ({
      id: b.id,
      name: b.busNumber,
      lat: b.lastLocation!.lat,
      lng: b.lastLocation!.lng,
      speed: b.currentSpeed,
      plateNumber: b.plateNumber,
      isEmergency: sosLogs.some((log) => log.busId === b.id)
    }));

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* 1. Header with Seed Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/40 p-4 sm:p-6 rounded-2xl border border-slate-900">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Fleet Overview Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time status of transport networks and fleet metrics</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-sm font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-yellow-500/5 hover:shadow-yellow-500/15"
          >
            <Sparkles className="h-4 w-4" />
            {seeding ? 'Seeding...' : 'Seed Demo Data'}
          </button>
        </div>
      </div>

      {seedSuccess && (
        <div className="p-4 bg-blue-950/40 border border-blue-800 text-blue-300 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>Firestore databases seeded successfully! Demo users, drivers, buses, and routes are now active.</span>
        </div>
      )}

      {/* 2. SOS Urgent Alarm Alerts Widget */}
      {sosLogs.length > 0 && (
        <div className="border border-rose-900/60 bg-rose-950/20 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertOctagon className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500 animate-bounce shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Active Distress Signals ({sosLogs.length})</h2>
              <p className="text-xs text-rose-300">A driver has activated an emergency SOS alert. Immediate attention required.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {sosLogs.map((log) => (
              <div key={log.id} className="bg-slate-950/80 border border-rose-900/40 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-[10px] text-slate-500 font-mono">SIGNAL LOG ID: {log.id}</div>
                  <div className="text-sm font-semibold text-white mt-1">Bus ID: {log.busId} — Driver ID: {log.driverId}</div>
                  <div className="text-xs text-rose-300 mt-0.5">Message: "{log.message}"</div>
                  <div className="text-xs text-slate-500 font-mono mt-1">Location: {log.location.lat.toFixed(5)}, {log.location.lng.toFixed(5)}</div>
                </div>
                <button
                  onClick={() => handleResolveSos(log.id)}
                  className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-all text-center"
                >
                  Resolve Alert
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Metric Cards Grid - 2 col on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="glass-panel p-3 sm:p-6 rounded-2xl flex items-center gap-3 sm:gap-5">
          <div className="p-2 sm:p-3 bg-yellow-500/10 rounded-xl text-yellow-500 border border-yellow-500/20 shrink-0">
            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Students</p>
            <h3 className="text-lg sm:text-2xl font-extrabold text-white mt-0.5">{students.length}</h3>
          </div>
        </div>

        <div className="glass-panel p-3 sm:p-6 rounded-2xl flex items-center gap-3 sm:gap-5">
          <div className="p-2 sm:p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20 shrink-0">
            <UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Parents</p>
            <h3 className="text-lg sm:text-2xl font-extrabold text-white mt-0.5">{parents.length}</h3>
          </div>
        </div>

        <div className="glass-panel p-3 sm:p-6 rounded-2xl flex items-center gap-3 sm:gap-5">
          <div className="p-2 sm:p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20 shrink-0">
            <BusIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Buses</p>
            <h3 className="text-lg sm:text-2xl font-extrabold text-white mt-0.5">{buses.length}</h3>
          </div>
        </div>

        <div className="glass-panel p-3 sm:p-6 rounded-2xl flex items-center gap-3 sm:gap-5">
          <div className="p-2 sm:p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20 shrink-0">
            <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</p>
            <h3 className="text-lg sm:text-2xl font-extrabold text-white mt-0.5">{activeBusesCount}</h3>
          </div>
        </div>
      </div>

      {/* 4. Secondary Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Active Bus Fleet Status */}
        <div className="glass-panel rounded-2xl p-4 sm:p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Navigation className="h-4 w-4 text-yellow-500" />
              Live Fleet Status
            </h3>
          </div>

          {/* Mobile: card view */}
          <div className="lg:hidden space-y-3">
            {buses.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-600">No fleet buses found. Click "Seed Demo Data" to add buses.</p>
            ) : (
              buses.map((bus) => {
                const isMoving = bus.currentSpeed > 0;
                return (
                  <div key={bus.id} className="p-3 bg-white/60 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-sm">{bus.busNumber}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isMoving ? 'bg-blue-500/10 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isMoving ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        {isMoving ? 'Active' : 'Parked'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span className="font-mono">{bus.plateNumber}</span>
                      <span className="font-semibold">{bus.currentSpeed} km/h</span>
                    </div>
                    {bus.lastLocation && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        📍 {bus.lastLocation.lat.toFixed(4)}, {bus.lastLocation.lng.toFixed(4)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: table view */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 uppercase font-semibold font-mono tracking-wider">
                  <th className="pb-3">Bus Name</th>
                  <th className="pb-3">Plate No.</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Speed</th>
                  <th className="pb-3">Last Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {buses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-600">
                      No fleet buses found. Click "Seed Live Demo Data" above to add buses.
                    </td>
                  </tr>
                ) : (
                  buses.map((bus) => {
                    const isMoving = bus.currentSpeed > 0;
                    return (
                      <tr key={bus.id} className="hover:bg-slate-900/20">
                        <td className="py-3.5 font-bold text-slate-200">{bus.busNumber}</td>
                        <td className="py-3.5 font-mono text-slate-400">{bus.plateNumber}</td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isMoving ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isMoving ? 'bg-blue-500 animate-pulse' : 'bg-slate-500'}`}></span>
                            {isMoving ? 'Active Run' : 'Parked'}
                          </span>
                        </td>
                        <td className="py-3.5 font-semibold text-slate-300">{bus.currentSpeed} km/h</td>
                        <td className="py-3.5 text-slate-500 font-mono">
                          {bus.lastLocation ? `${bus.lastLocation.lat.toFixed(4)}, ${bus.lastLocation.lng.toFixed(4)}` : 'No GPS Sync'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notices & Broadcasts */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-yellow-500" />
              Notices Board
            </h3>
          </div>

          <div className="space-y-3.5">
            {announcements.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-600">No active noticeboard announcements.</p>
            ) : (
              announcements.slice(0, 3).map((ann) => (
                <div key={ann.id} className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[120px]">{ann.title}</span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono ${ann.type === 'emergency' ? 'bg-rose-500/10 text-rose-400' : ann.type === 'maintenance' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {ann.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">{ann.content}</p>
                  <div className="text-[9px] text-slate-600 font-mono mt-2">Posted by {ann.createdBy}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Live Fleet Map Preview */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-900 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Navigation className="h-4 w-4 text-yellow-500 animate-pulse" />
            Live Fleet Location Map
          </h3>
        </div>
        <div className="block w-full relative rounded-2xl overflow-hidden border border-slate-800 p-1" style={{ minHeight: '350px' }}>
          <GoogleMapComponent
            buses={formattedBuses}
            routes={routes}
            zoom={12}
            showGeofences={false}
          />
        </div>
      </div>
    </div>
  );
}
