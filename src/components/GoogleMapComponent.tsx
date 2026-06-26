'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, Circle, InfoWindow } from '@react-google-maps/api';
import { LatLng, RouteStop } from '@/types';

// Sleek dark-mode theme JSON for Google Maps
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f59e0b' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0f172a' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#020617' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3b82f6' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#020617' }]
  }
];

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem'
};

const defaultCenter = {
  lat: 12.9716, // Default to a central city coordinate (e.g. Bangalore/Chennai coordinates)
  lng: 77.5946
};

interface MapBus {
  id: string;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  plateNumber: string;
  driverName?: string;
  driverPhone?: string;
  routeId?: string;
  isEmergency?: boolean;
}

interface GoogleMapComponentProps {
  buses?: MapBus[];
  stops?: RouteStop[];
  routePath?: LatLng[];
  center?: LatLng;
  zoom?: number;
  showGeofences?: boolean;
  onMarkerClick?: (busId: string) => void;
}

export default function GoogleMapComponent({
  buses = [],
  stops = [],
  routePath = [],
  center,
  zoom = 13,
  showGeofences = false,
  onMarkerClick
}: GoogleMapComponentProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedBus, setSelectedBus] = useState<MapBus | null>(null);

  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  // Determine actual center coordinate
  let mapCenter = center || defaultCenter;
  if (!center && buses.length > 0) {
    mapCenter = { lat: buses[0].lat, lng: buses[0].lng };
  } else if (!center && stops.length > 0) {
    mapCenter = { lat: stops[0].lat, lng: stops[0].lng };
  }

  // Key validation check to help user debug setup issues
  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-amber-50 border border-amber-200 rounded-xl text-amber-800 p-4 text-center">
        <div>
          <p className="font-bold text-sm">⚠️ Google Maps API Key Missing</p>
          <p className="text-xs mt-1 text-amber-700">Please define NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local and restart your dev server.</p>
        </div>
      </div>
    );
  }

  if (!mounted || !isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent mx-auto"></div>
          <p className="mt-2 text-sm">Loading Live Map Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ minHeight: '350px', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', minHeight: '350px' }}
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: [],
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true
        }}
      >
        {/* 1. Draw Route Path Polyline */}
        {routePath.length > 0 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 0.8,
              strokeWeight: 4,
              geodesic: true
            }}
          />
        )}

        {/* 2. Render Bus Stops */}
        {stops.map((stop) => (
          <React.Fragment key={stop.id}>
            {/* Geofence boundary circle (e.g. 200m radius) */}
            {showGeofences && (
              <Circle
                center={{ lat: stop.lat, lng: stop.lng }}
                radius={200}
                options={{
                  strokeColor: '#3b82f6',
                  strokeOpacity: 0.4,
                  strokeWeight: 1,
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1
                }}
              />
            )}
            {/* Stop Pin Marker */}
            <Marker
              position={{ lat: stop.lat, lng: stop.lng }}
              label={{
                text: stop.order.toString(),
                color: '#000000',
                fontWeight: 'bold',
                fontSize: '11px'
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 12
              }}
              title={`${stop.name} (Stop #${stop.order})`}
            />
          </React.Fragment>
        ))}

        {/* 3. Render Active Fleet Buses */}
        {buses.map((bus) => {
          // Red color for Emergency alert, yellow for standard active bus
          const markerColor = bus.isEmergency ? '#ef4444' : '#eab308';
          
          return (
            <React.Fragment key={bus.id}>
              <Marker
                position={{ lat: bus.lat, lng: bus.lng }}
                onClick={() => {
                  setSelectedBus(bus);
                  if (onMarkerClick) onMarkerClick(bus.id);
                }}
                icon={{
                  path: 'M20 21c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v2c0 .6.4 1 1 1h14c.6 0 1-.4 1-1v-2zm-1-8V6c0-3.3-2.7-6-6-6S7 2.7 7 6v7H4c-.6 0-1 .4-1 1v4c0 .6.4 1 1 1h16c.6 0 1-.4 1-1v-4c0-.6-.4-1-1-1h-3zm-9.3-8.8c.2-.5.8-.7 1.3-.5.5.2.7.8.5 1.3C12.1 8 11.1 8 10.1 7.8c-.4-.1-.7-.5-.4-1zm5.1 4c.3-.5.9-.6 1.4-.3.5.3.6.9.3 1.4C16.8 9.5 15.6 9 14.8 8.1c-.2-.4-.2-.9.2-1.3z',
                  fillColor: markerColor,
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 1.5,
                  scale: 1.1,
                  anchor: new google.maps.Point(12, 12)
                }}
                title={bus.name}
              />

              {/* Emergency alert pulse circle */}
              {bus.isEmergency && (
                <Circle
                  center={{ lat: bus.lat, lng: bus.lng }}
                  radius={400}
                  options={{
                    strokeColor: '#ef4444',
                    strokeOpacity: 0.8,
                    strokeWeight: 1,
                    fillColor: '#ef4444',
                    fillOpacity: 0.15
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* 4. Info Window for Selected Bus */}
        {selectedBus && (
          <InfoWindow
            position={{ lat: selectedBus.lat, lng: selectedBus.lng }}
            onCloseClick={() => setSelectedBus(null)}
          >
            <div className="text-slate-900 p-2 min-w-[200px]">
              <div className="flex items-center justify-between border-b pb-1.5 mb-1.5">
                <span className="font-bold text-sm text-slate-800">{selectedBus.name}</span>
                {selectedBus.isEmergency && (
                  <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase animate-pulse">
                    SOS
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mb-1">
                Plate: <strong className="text-slate-700">{selectedBus.plateNumber}</strong>
              </p>
              <p className="text-xs text-slate-600 mb-1">
                Current Speed: <strong className="text-slate-800">{selectedBus.speed} km/h</strong>
              </p>
              {selectedBus.driverName && (
                <div className="mt-2 border-t pt-1.5 text-xs">
                  <p className="font-semibold text-slate-700">Driver: {selectedBus.driverName}</p>
                  {selectedBus.driverPhone && (
                    <a href={`tel:${selectedBus.driverPhone}`} className="text-yellow-600 hover:underline">
                      📞 {selectedBus.driverPhone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
