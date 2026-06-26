'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { BarChart3, AlertOctagon, RefreshCw, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { Bus, EmergencyLog } from '@/types';

interface GpsPacket {
  id: string;
  busId: string;
  schoolId: string;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: any;
}

export default function AdminReportsPage() {
  const { school } = useAppStore();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [gpsLogs, setGpsLogs] = useState<GpsPacket[]>([]);
  const [resolvedAlarms, setResolvedAlarms] = useState<EmergencyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!school) return;

    // Fetch Buses
    const qBuses = query(collection(db, 'buses'), where('schoolId', '==', school.id));
    onSnapshot(qBuses, (snap) => {
      const list: Bus[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Bus));
      setBuses(list);
    });

    // Listen to recent GPS packets
    const qGps = query(
      collection(db, 'gpsTracking'),
      where('schoolId', '==', school.id)
    );
    const unsubGps = onSnapshot(qGps, (snap) => {
      const list: GpsPacket[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as GpsPacket);
      });
      // Sort client-side: descending by timestamp.seconds
      const sorted = list
        .sort((a, b) => {
          const tA = a.timestamp?.seconds || (a.timestamp instanceof Date ? a.timestamp.getTime() / 1000 : 0);
          const tB = b.timestamp?.seconds || (b.timestamp instanceof Date ? b.timestamp.getTime() / 1000 : 0);
          return tB - tA;
        })
        .slice(0, 15);
      setGpsLogs(sorted);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    // Fetch Resolved Alarms
    const qResolved = query(
      collection(db, 'emergencyLogs'),
      where('schoolId', '==', school.id),
      where('status', '==', 'resolved')
    );
    const unsubRes = onSnapshot(qResolved, (snap) => {
      const list: EmergencyLog[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as EmergencyLog);
      });
      // Sort client-side: descending by timestamp.seconds
      const sorted = list
        .sort((a, b) => {
          const tA = a.timestamp?.seconds || (a.timestamp instanceof Date ? a.timestamp.getTime() / 1000 : 0);
          const tB = b.timestamp?.seconds || (b.timestamp instanceof Date ? b.timestamp.getTime() / 1000 : 0);
          return tB - tA;
        })
        .slice(0, 10);
      setResolvedAlarms(sorted);
    });

    return () => {
      unsubGps();
      unsubRes();
    };
  }, [school]);

  // Compute speed stats
  const totalLogs = gpsLogs.length;
  const speedLimitViolations = gpsLogs.filter((log) => log.speed > 50).length; // Speed limit 50 km/h
  const maxRecordedSpeed = gpsLogs.length > 0 ? Math.max(...gpsLogs.map((log) => log.speed)) : 0;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Reports & Telemetry Logs</h1>
        <p className="text-xs text-slate-500 mt-1">Audit historical GPS coordinates, speed violations, and resolved SOS logs</p>
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
        <div className="glass-panel p-3 sm:p-6 rounded-2xl flex items-center gap-3 sm:gap-5">
          <div className="p-2 sm:p-3 bg-yellow-500/10 rounded-xl text-yellow-500 border border-yellow-500/20 shrink-0">
            <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Signals</p>
            <h3 className="text-lg sm:text-2xl font-extrabold text-white mt-0.5">{totalLogs}</h3>
          </div>
        </div>

        <div className="glass-panel p-3 sm:p-6 rounded-2xl flex items-center gap-3 sm:gap-5">
          <div className="p-2 sm:p-3 bg-rose-500/10 rounded-xl text-rose-500 border border-rose-500/20 shrink-0">
            <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Violations</p>
            <h3 className="text-lg sm:text-2xl font-extrabold text-rose-500 mt-0.5">{speedLimitViolations}</h3>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 glass-panel p-3 sm:p-6 rounded-2xl flex items-center gap-3 sm:gap-5">
          <div className="p-2 sm:p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20 shrink-0">
            <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Peak Speed</p>
            <h3 className="text-lg sm:text-2xl font-extrabold text-white mt-0.5">{maxRecordedSpeed.toFixed(1)} km/h</h3>
          </div>
        </div>
      </div>

      {/* Tables Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {/* GPS Stream */}
        <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-900 space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin shrink-0" />
            GPS Telemetry Log
          </h3>

          {/* Mobile card view */}
          <div className="lg:hidden space-y-2">
            {loading ? (
              <p className="text-center py-8 text-xs text-slate-600">Syncing telemetry...</p>
            ) : gpsLogs.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-600">No telemetry logged yet.</p>
            ) : (
              gpsLogs.map((log) => {
                const busObj = buses.find((b) => b.id === log.busId);
                const isSpeeding = log.speed > 50;
                return (
                  <div key={log.id} className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{busObj ? busObj.busNumber : log.busId}</span>
                      <span className={`font-semibold ${isSpeeding ? 'text-rose-500' : 'text-slate-300'}`}>{log.speed} km/h {isSpeeding && '⚠️'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">{log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString() : 'Now'}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 uppercase font-semibold font-mono tracking-wider">
                  <th className="pb-3">Bus ID</th>
                  <th className="pb-3">Coordinates</th>
                  <th className="pb-3">Speed</th>
                  <th className="pb-3">Received Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-600">
                      Syncing telemetry feeds...
                    </td>
                  </tr>
                ) : gpsLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-600">
                      No telemetry logged. Start `gps_simulator.js` to see entries.
                    </td>
                  </tr>
                ) : (
                  gpsLogs.map((log) => {
                    const busObj = buses.find((b) => b.id === log.busId);
                    const isSpeeding = log.speed > 50;

                    return (
                      <tr key={log.id} className="hover:bg-slate-900/20">
                        <td className="py-3 font-bold text-slate-200">{busObj ? busObj.busNumber : log.busId}</td>
                        <td className="py-3 font-mono text-slate-400">
                          {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                        </td>
                        <td className={`py-3 font-semibold ${isSpeeding ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>
                          {log.speed} km/h {isSpeeding && '⚠️'}
                        </td>
                        <td className="py-3 text-slate-500 font-mono">
                          {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString() : 'Now'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resolved SOS logs */}
        <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-900 space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-yellow-500 shrink-0" />
            Resolved SOS Logs
          </h3>

          {/* Mobile card view */}
          <div className="lg:hidden space-y-2">
            {resolvedAlarms.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-600">No resolved emergency alerts found.</p>
            ) : (
              resolvedAlarms.map((alarm) => {
                const busObj = buses.find((b) => b.id === alarm.busId);
                return (
                  <div key={alarm.id} className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold text-white">{busObj ? busObj.busNumber : alarm.busId}</span>
                      <span className="text-slate-500 font-mono">{alarm.timestamp ? new Date(alarm.timestamp.seconds * 1000).toLocaleDateString() : 'Today'}</span>
                    </div>
                    <p className="text-rose-300 italic">"{alarm.message}"</p>
                    <p className="text-slate-400">By: <span className="font-semibold text-white">{alarm.resolvedBy || 'System'}</span></p>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 uppercase font-semibold font-mono tracking-wider">
                  <th className="pb-3">Bus ID</th>
                  <th className="pb-3">Trigger Message</th>
                  <th className="pb-3">Resolution Details</th>
                  <th className="pb-3">Log Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {resolvedAlarms.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-600">
                      No resolved emergency alerts found.
                    </td>
                  </tr>
                ) : (
                  resolvedAlarms.map((alarm) => {
                    const busObj = buses.find((b) => b.id === alarm.busId);
                    return (
                      <tr key={alarm.id} className="hover:bg-slate-900/20">
                        <td className="py-3 font-bold text-slate-200">{busObj ? busObj.busNumber : alarm.busId}</td>
                        <td className="py-3 text-rose-300 italic">"{alarm.message}"</td>
                        <td className="py-3 text-slate-400">
                          Resolved by: <span className="font-semibold text-white">{alarm.resolvedBy || 'System'}</span>
                        </td>
                        <td className="py-3 text-slate-500 font-mono">
                          {alarm.timestamp ? new Date(alarm.timestamp.seconds * 1000).toLocaleDateString() : 'Today'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

