'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { Bus as BusIcon, PlusCircle, Trash2, Edit2, AlertCircle, Key, Cpu } from 'lucide-react';
import { Bus, Driver, Route } from '@/types';

export default function AdminBusesPage() {
  const { school } = useAppStore();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);

  // Form State
  const [busNumber, setBusNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [driverId, setDriverId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [capacity, setCapacity] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!school) return;

    const qBuses = query(collection(db, 'buses'), where('schoolId', '==', school.id));
    const unsubBuses = onSnapshot(qBuses, (snap) => {
      const list: Bus[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Bus));
      setBuses(list);
    });

    const qDrivers = query(collection(db, 'drivers'), where('schoolId', '==', school.id));
    const unsubDrivers = onSnapshot(qDrivers, (snap) => {
      const list: Driver[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Driver));
      setDrivers(list);
    });

    const qRoutes = query(collection(db, 'routes'), where('schoolId', '==', school.id));
    const unsubRoutes = onSnapshot(qRoutes, (snap) => {
      const list: Route[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Route));
      setRoutes(list);
    });

    return () => {
      unsubBuses();
      unsubDrivers();
      unsubRoutes();
    };
  }, [school]);

  const handleGenerateKey = () => {
    // Generate secure looking client API key for ESP32
    const key = 'bus_key_' + Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
    setApiKey(key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    setLoading(true);
    setError('');

    try {
      const capNum = parseInt(capacity);
      if (isNaN(capNum)) {
        setError('Capacity must be a number');
        return;
      }

      const payload = {
        busNumber,
        plateNumber,
        schoolId: school.id,
        driverId,
        routeId,
        capacity: capNum,
        apiKey: apiKey || 'bus_key_default_2026',
        status: 'inactive' as const,
        currentSpeed: 0
      };

      if (editingBus) {
        await updateDoc(doc(db, 'buses', editingBus.id), payload);
        setEditingBus(null);
      } else {
        await addDoc(collection(db, 'buses'), payload);
      }

      setBusNumber('');
      setPlateNumber('');
      setDriverId('');
      setRouteId('');
      setCapacity('');
      setApiKey('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save bus details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bus: Bus) => {
    setEditingBus(bus);
    setBusNumber(bus.busNumber);
    setPlateNumber(bus.plateNumber);
    setDriverId(bus.driverId || '');
    setRouteId(bus.routeId || '');
    setCapacity(bus.capacity.toString());
    setApiKey(bus.apiKey || '');
  };

  const handleDelete = async (busId: string) => {
    if (!confirm('Are you sure you want to delete this bus?')) return;
    try {
      await deleteDoc(doc(db, 'buses', busId));
    } catch (err) {
      console.error('Error deleting bus:', err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Bus Fleet Management</h1>
        <p className="text-xs text-slate-500 mt-1">Manage vehicles, assign drivers, and check ESP32 API credentials</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Fleet List */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-900 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <BusIcon className="h-4 w-4 text-yellow-500 shrink-0" />
              Registered Fleet Buses ({buses.length})
            </h3>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {buses.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-600">No fleet buses found.</p>
              ) : (
                buses.map((bus) => {
                  const assignedDriver = drivers.find((d) => d.id === bus.driverId);
                  return (
                    <div key={bus.id} className="p-3 sm:p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-white text-sm">{bus.busNumber}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{bus.plateNumber}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(bus)} className="p-1.5 hover:text-yellow-500 text-slate-500 transition-all">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(bus.id)} className="p-1.5 hover:text-rose-500 text-slate-500 transition-all">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div>
                          <span className="text-slate-500">Driver:</span>
                          <span className="text-slate-300 ml-1">{assignedDriver ? assignedDriver.name : '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Capacity:</span>
                          <span className="text-slate-300 ml-1">{bus.capacity} seats</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500">API Key:</span>
                          <span className="text-yellow-500 font-mono text-[10px] ml-1 break-all">{bus.apiKey}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 uppercase font-semibold font-mono tracking-wider">
                    <th className="pb-3">Bus Name</th>
                    <th className="pb-3">Plate No.</th>
                    <th className="pb-3">Driver</th>
                    <th className="pb-3">Capacity</th>
                    <th className="pb-3">API Security Key</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {buses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-600">
                        No fleet buses found. Add a vehicle using the form.
                      </td>
                    </tr>
                  ) : (
                    buses.map((bus) => {
                      const assignedDriver = drivers.find((d) => d.id === bus.driverId);
                      return (
                        <tr key={bus.id} className="hover:bg-slate-900/20">
                          <td className="py-3.5 font-bold text-slate-200">{bus.busNumber}</td>
                          <td className="py-3.5 font-mono text-slate-400">{bus.plateNumber}</td>
                          <td className="py-3.5 text-slate-400">{assignedDriver ? assignedDriver.name : 'Unassigned'}</td>
                          <td className="py-3.5 text-slate-400 font-semibold">{bus.capacity} seats</td>
                          <td className="py-3.5 font-mono text-[10px] text-yellow-500 font-bold flex items-center gap-1 mt-1">
                            <Key className="h-3 w-3 shrink-0" />
                            {bus.apiKey}
                          </td>
                          <td className="py-3.5 text-right space-x-2">
                            <button
                              onClick={() => handleEdit(bus)}
                              className="p-1 hover:text-yellow-500 text-slate-500 transition-all inline-block"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(bus.id)}
                              className="p-1 hover:text-rose-500 text-slate-500 transition-all inline-block"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ESP32 Arduino Integration Guide */}
          {buses.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-900 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="h-4 w-4 text-yellow-500 animate-pulse" />
                ESP32 Telemetry POST Schema
              </h3>
              <p className="text-xs text-slate-400">
                To sync real-time coordinates, configure your ESP32 Arduino code to make a `POST` request to:
              </p>
              <div className="bg-slate-950 p-4 rounded-xl font-mono text-[10px] text-blue-400 select-all border border-slate-900">
                POST http://localhost:3000/api/gps/update
              </div>
              <p className="text-xs text-slate-500">Headers: <code className="text-white">Content-Type: application/json</code></p>
              <p className="text-xs text-slate-400">JSON Body Payload:</p>
              <pre className="bg-slate-950 p-4 rounded-xl font-mono text-[10px] text-slate-300 border border-slate-900 overflow-x-auto">
{`{
  "busId": "${buses[0].id}",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "speed": 42.5,
  "apiKey": "${buses[0].apiKey}"
}`}
              </pre>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-900">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-yellow-500" />
              {editingBus ? 'Edit Bus Properties' : 'Add New Vehicle'}
            </h3>

            {error && (
              <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Bus Identifier Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bus 10A Route"
                  value={busNumber}
                  onChange={(e) => setBusNumber(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">License Plate Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TN-01-AX-1234"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Seat Capacity</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 40"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Assign Driver</label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                >
                  <option value="">Select Driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Assign Route</label>
                <select
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                >
                  <option value="">Select Route</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hardware API key configurator */}
              <div className="space-y-1.5 border border-slate-900 p-3 rounded-xl bg-slate-950/40">
                <label className="text-[10px] text-slate-500 font-mono block">ESP32 SECURITY API KEY</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. bus_key_10a_99"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-grow bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateKey}
                    className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs border border-slate-800 transition-all font-semibold shrink-0"
                  >
                    Gen
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                {editingBus && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBus(null);
                      setBusNumber('');
                      setPlateNumber('');
                      setDriverId('');
                      setRouteId('');
                      setCapacity('');
                      setApiKey('');
                    }}
                    className="flex-1 py-3 border border-slate-800 hover:border-slate-700 hover:text-white rounded-xl text-slate-400 font-bold transition-all text-xs"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-grow py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl disabled:opacity-50 transition-all text-xs"
                >
                  {loading ? 'Please wait...' : editingBus ? 'Update Vehicle' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
