'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { Route as RouteIcon, MapPin, Compass, Plus, PlusCircle, AlertCircle } from 'lucide-react';
import { Route, RouteStop } from '@/types';

export default function AdminRoutesPage() {
  const { school } = useAppStore();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stopName, setStopName] = useState('');
  const [stopLat, setStopLat] = useState('');
  const [stopLng, setStopLng] = useState('');
  const [stopsList, setStopsList] = useState<Omit<RouteStop, 'id'>[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!school) return;

    const q = query(collection(db, 'routes'), where('schoolId', '==', school.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Route[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Route);
      });
      setRoutes(list);
      if (list.length > 0 && !selectedRoute) {
        setSelectedRoute(list[0]);
      }
    });

    return () => unsubscribe();
  }, [school, selectedRoute]);

  const handleAddStop = () => {
    if (!stopName || !stopLat || !stopLng) {
      setError('Please fill in all stop details');
      return;
    }
    const lat = parseFloat(stopLat);
    const lng = parseFloat(stopLng);
    if (isNaN(lat) || isNaN(lng)) {
      setError('Coordinates must be valid numbers');
      return;
    }

    setStopsList([
      ...stopsList,
      {
        name: stopName,
        order: stopsList.length + 1,
        lat,
        lng
      }
    ]);

    setStopName('');
    setStopLat('');
    setStopLng('');
    setError('');
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !school) return;
    setLoading(true);
    setError('');

    try {
      const stopsWithIds = stopsList.map((stop, index) => ({
        id: `stop-${Date.now()}-${index}`,
        ...stop
      }));

      // Coordinates path polyline
      const coordinates = stopsWithIds.map((stop) => ({
        lat: stop.lat,
        lng: stop.lng
      }));

      await addDoc(collection(db, 'routes'), {
        name,
        description,
        schoolId: school.id,
        stops: stopsWithIds,
        coordinates
      });

      setName('');
      setDescription('');
      setStopsList([]);
      setError('');
      alert('Route created successfully!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Route Planner & Stop Management</h1>
        <p className="text-xs text-slate-500 mt-1">Design routes, order pickup points, and view schedules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Left: Routes Selector List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-900">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <RouteIcon className="h-4 w-4 text-yellow-500" />
              Configured Routes
            </h3>
            <div className="space-y-2">
              {routes.length === 0 ? (
                <p className="text-xs text-slate-600 py-6 text-center">No routes mapped yet.</p>
              ) : (
                routes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => setSelectedRoute(route)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex flex-col gap-1 ${
                      selectedRoute?.id === route.id
                        ? 'bg-yellow-500/10 border-yellow-500 text-white'
                        : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold text-sm text-slate-200">{route.name}</span>
                    <span className="text-[11px] text-slate-500 truncate max-w-full">{route.description}</span>
                    <span className="text-[10px] text-yellow-500 font-mono mt-1 font-semibold">
                      {route.stops?.length || 0} stops configured
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Details of Selected Route Stops */}
          {selectedRoute && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-900 space-y-3">
              <h3 className="text-sm font-bold text-white border-b border-slate-900 pb-2">
                Stops Timeline — {selectedRoute.name}
              </h3>
              <div className="space-y-4 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
                {selectedRoute.stops?.map((stop) => (
                  <div key={stop.id} className="relative text-xs">
                    <span className="absolute -left-[19px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 bg-yellow-500 flex items-center justify-center text-[9px] text-slate-950 font-bold">
                      {stop.order}
                    </span>
                    <p className="font-bold text-slate-200">{stop.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      GPS: {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Route Designer Form */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-900">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-yellow-500" />
              Design New School Route
            </h3>

            {error && (
              <div className="p-3.5 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoute} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Route Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. South Campus Line"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Serves Central Avenue and Metro stop"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Add Stops Sub-section */}
              <div className="border border-slate-900 p-4 rounded-xl space-y-4 bg-slate-950/20">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Route Stops Configurator
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Stop Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Central Metro"
                      value={stopName}
                      onChange={(e) => setStopName(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Stop Latitude</label>
                    <input
                      type="text"
                      placeholder="e.g. 12.9784"
                      value={stopLat}
                      onChange={(e) => setStopLat(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Stop Longitude</label>
                    <input
                      type="text"
                      placeholder="e.g. 77.6408"
                      value={stopLng}
                      onChange={(e) => setStopLng(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddStop}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-800 hover:border-slate-700 hover:text-white rounded-lg text-slate-400 text-xs font-semibold bg-slate-950/40 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Stop to Sequence
                </button>

                {/* Scheduled Stops Preview */}
                {stopsList.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[10px] text-slate-500 font-mono">STOPS IN QUEUE ({stopsList.length})</p>
                    <div className="divide-y divide-slate-900 border border-slate-900 rounded-lg bg-slate-950/60">
                      {stopsList.map((stop, idx) => (
                        <div key={idx} className="flex justify-between items-center px-3 py-2 text-xs">
                          <span className="font-semibold text-slate-300">
                            {stop.order}. {stop.name}
                          </span>
                          <span className="font-mono text-slate-500">
                            {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || stopsList.length === 0}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-lg shadow-yellow-500/5 hover:shadow-yellow-500/15"
              >
                {loading ? 'Saving Route...' : 'Save & Publish Route'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
