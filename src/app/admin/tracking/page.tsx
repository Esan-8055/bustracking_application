'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { Navigation, Compass, AlertCircle, RefreshCw, Radio } from 'lucide-react';
import GoogleMapComponent from '@/components/GoogleMapComponent';
import { Bus, LatLng, Route } from '@/types';

export default function AdminTrackingPage() {
  const { school } = useAppStore();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [mapCenter, setMapCenter] = useState<LatLng | undefined>(undefined);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);

  useEffect(() => {
    if (!school) return;

    const qBuses = query(
      collection(db, 'buses'),
      where('schoolId', '==', school.id)
    );

    const unsubBuses = onSnapshot(qBuses, (snapshot) => {
      const list: Bus[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Bus);
      });
      setBuses(list);

      // If mapCenter is not set yet, center on the first bus
      if (list.length > 0 && !mapCenter) {
        const activeBus = list.find((b) => b.lastLocation);
        if (activeBus && activeBus.lastLocation) {
          setMapCenter({
            lat: activeBus.lastLocation.lat,
            lng: activeBus.lastLocation.lng
          });
        }
      }
    });

    const qRoutes = query(
      collection(db, 'routes'),
      where('schoolId', '==', school.id)
    );

    const unsubRoutes = onSnapshot(qRoutes, (snapshot) => {
      const list: Route[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Route);
      });
      setRoutes(list);
    });

    return () => {
      unsubBuses();
      unsubRoutes();
    };
  }, [school, mapCenter]);

  const handleSelectBus = (bus: Bus) => {
    if (bus.lastLocation) {
      setSelectedBusId(bus.id);
      setMapCenter({
        lat: bus.lastLocation.lat,
        lng: bus.lastLocation.lng
      });
    }
  };

  const formattedBuses = buses
    .filter((b) => b.lastLocation)
    .map((b) => ({
      id: b.id,
      name: b.busNumber,
      lat: b.lastLocation!.lat,
      lng: b.lastLocation!.lng,
      speed: b.currentSpeed,
      plateNumber: b.plateNumber,
      isEmergency: false // we can wire this up if we listen to SOS collections
    }));

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      {/* Fleet list - horizontal scrollable on mobile, sidebar on desktop */}
      <div className="w-full lg:w-80 flex flex-col gap-3 sm:gap-4">
        <div className="glass-panel p-3 sm:p-5 rounded-2xl flex flex-col justify-between border border-slate-900">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="h-4 w-4 text-yellow-500 animate-pulse" />
              Active Fleet
            </h3>
            <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono font-bold text-slate-400">
              {buses.length} buses
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">Live signals received from cellular modules</p>
        </div>

        {/* Bus list - horizontal scroll on mobile, vertical on desktop */}
        <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto pb-2 lg:pb-0 glass-panel rounded-2xl p-3 sm:p-4 border border-slate-900">
          {buses.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-600 w-full">
              No active buses transmitting GPS telemetry.
            </div>
          ) : (
            buses.map((bus) => {
              const isSelected = selectedBusId === bus.id;
              const hasGps = !!bus.lastLocation;
              const isMoving = bus.currentSpeed > 0;
              
              return (
                <button
                  key={bus.id}
                  onClick={() => handleSelectBus(bus)}
                  disabled={!hasGps}
                  className={`shrink-0 w-48 lg:w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-yellow-500/10 border-yellow-500 text-white'
                      : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 text-slate-300'
                  } ${!hasGps ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-sm truncate">{bus.busNumber}</span>
                    <span className={`h-2 w-2 rounded-full shrink-0 ${isMoving ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`}></span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between gap-2">
                    <span className="truncate">{bus.plateNumber}</span>
                    <span className="shrink-0">{hasGps ? `${bus.currentSpeed} km/h` : 'No Signal'}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Map Box */}
      <div className="flex-1 glass-panel p-2 rounded-3xl border border-slate-900 relative overflow-hidden" style={{ minHeight: '320px', height: '100%' }}>
        <GoogleMapComponent
          buses={formattedBuses}
          routes={routes}
          center={mapCenter}
          zoom={14}
          showGeofences={true}
          onMarkerClick={(id) => setSelectedBusId(id)}
        />
      </div>
    </div>
  );
}
