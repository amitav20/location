/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api';
import { toast } from './Toaster';
import { User } from '../types';
import { getCurrentPlace } from '../utils/geolocation';
import { distanceLabel } from './common/ui';
import { Calendar, Compass, Crosshair, MapPin, Navigation, Store, Users, X } from 'lucide-react';

type PinType = 'me' | 'user' | 'business' | 'event';

interface MapItem {
  id: string;
  name: string;
  type: PinType;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  category?: string;
  details?: string;
}

interface InteractiveMapProps {
  currentUser: User;
  onRelocate: (lat: number, lng: number, city: string, state: string, country?: string) => void;
  setAppView: (view: string, targetId?: string) => void;
}

const PIN_COLORS: Record<PinType, string> = {
  me: '#0d9488',
  user: '#0ea5e9',
  business: '#f43f5e',
  event: '#f59e0b'
};

const DATA_RADIUS_KM = '50';

const demoCities = [
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194, state: 'California', country: 'United States' },
  { name: 'New York', lat: 40.7128, lng: -74.006, state: 'New York', country: 'United States' },
  { name: 'London', lat: 51.5074, lng: -0.1278, state: 'England', country: 'United Kingdom' },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, state: 'Tokyo', country: 'Japan' }
];

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function ClickHandler({ enabled, onPick }: { enabled: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (enabled) onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export function InteractiveMap({ currentUser, onRelocate, setAppView }: InteractiveMapProps) {
  const [mapItems, setMapItems] = useState<MapItem[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapItem | null>(null);
  const [isRelocating, setIsRelocating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [visible, setVisible] = useState<Record<'user' | 'business' | 'event', boolean>>({ user: true, business: true, event: true });

  const userLat = currentUser.location.latitude;
  const userLng = currentUser.location.longitude;
  const placeName = [currentUser.location.city, currentUser.location.state].filter(Boolean).join(', ') || 'Unknown place';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [people, shops, events] = await Promise.allSettled([
        api.discoverPeople({ range: DATA_RADIUS_KM }),
        api.getBusinesses({ range: DATA_RADIUS_KM }),
        api.getEvents(DATA_RADIUS_KM)
      ]);
      if (cancelled) return;
      const items: MapItem[] = [];
      if (people.status === 'fulfilled') {
        // Other people's positions are rounded to about 1 km by the API, for privacy
        people.value.items
          .filter((u) => Number.isFinite(u.location.latitude) && Number.isFinite(u.location.longitude))
          .forEach((u) =>
            items.push({ id: u.id, name: u.name, type: 'user', latitude: u.location.latitude, longitude: u.location.longitude, distanceKm: u.distanceKm, details: u.profession || 'Neighbor' })
          );
      }
      if (shops.status === 'fulfilled') {
        shops.value.forEach((b) =>
          items.push({ id: b.slug, name: b.name, type: 'business', latitude: b.latitude, longitude: b.longitude, distanceKm: b.distanceKm, category: b.category, details: b.address })
        );
      }
      if (events.status === 'fulfilled') {
        events.value.forEach((e) =>
          items.push({
            id: e.id,
            name: e.name,
            type: 'event',
            latitude: e.latitude,
            longitude: e.longitude,
            distanceKm: e.distanceKm,
            details: new Date(e.startsAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          })
        );
      }
      const failed = [people, shops, events].filter((r) => r.status === 'rejected').length;
      if (failed) toast.error('Some places could not be loaded. Try again in a moment.');
      setMapItems(items);
    })();
    return () => {
      cancelled = true;
    };
  }, [userLat, userLng]);

  const relocateTo = async (lat: number, lng: number) => {
    setIsRelocating(false);
    const latitude = Number(lat.toFixed(5));
    const longitude = Number(lng.toFixed(5));
    try {
      const place = await api.reverseGeocode(latitude, longitude);
      onRelocate(latitude, longitude, place.city || place.name, place.state, place.country);
    } catch {
      onRelocate(latitude, longitude, 'Pinned location', '');
    }
  };

  const useGps = async () => {
    setIsLocating(true);
    try {
      const place = await getCurrentPlace();
      onRelocate(place.latitude, place.longitude, place.city || place.name, place.state, place.country);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not get your location.');
    } finally {
      setIsLocating(false);
    }
  };

  const openPin = (pin: MapItem) => {
    if (pin.type === 'user') setAppView('profile', pin.id);
    if (pin.type === 'business') setAppView('business', pin.id);
    if (pin.type === 'event') setAppView('events', pin.id);
  };

  const me: MapItem = { id: 'me', name: 'You are here', type: 'me', latitude: userLat, longitude: userLng, details: placeName };
  const shown = mapItems.filter((i) => i.type !== 'me' && visible[i.type as 'user' | 'business' | 'event']);

  return (
    <div className="space-y-3" id="interactive-map">
      {/* Controls */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
            <MapPin size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-semibold">Your location</p>
            <h3 className="font-semibold text-gray-800 text-sm truncate">
              {placeName}
              <span className="ml-2 font-mono text-[11px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md">
                {userLat.toFixed(4)}, {userLng.toFixed(4)}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={useGps}
            disabled={isLocating}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white flex items-center gap-1.5"
          >
            <Crosshair size={14} /> {isLocating ? 'Locating...' : 'Use my GPS'}
          </button>
          <button
            onClick={() => setIsRelocating(!isRelocating)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              isRelocating ? 'bg-amber-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <Compass size={14} /> {isRelocating ? 'Click the map to set location' : 'Move my location'}
          </button>
          {demoCities.map((city) => (
            <button
              key={city.name}
              onClick={() => onRelocate(city.lat, city.lng, city.name, city.state, city.country)}
              className={`px-2.5 py-2 rounded-xl text-xs font-medium ${
                Math.abs(userLat - city.lat) < 0.05 && Math.abs(userLng - city.lng) < 0.05
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className={`relative rounded-3xl overflow-hidden border border-gray-200 shadow-sm h-[60vh] min-h-[360px] ${isRelocating ? 'cursor-crosshair' : ''}`}>
        <MapContainer center={[userLat, userLng]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter lat={userLat} lng={userLng} />
          <ClickHandler enabled={isRelocating} onPick={relocateTo} />

          {[5, 15, 50].map((km) => (
            <Circle
              key={km}
              center={[userLat, userLng]}
              radius={km * 1000}
              pathOptions={{ color: '#0d9488', weight: 1, opacity: 0.35, fillOpacity: km === 5 ? 0.04 : 0, dashArray: '4 6' }}
            >
              <Tooltip direction="top" opacity={0.8}>{km} km</Tooltip>
            </Circle>
          ))}

          {shown.map((item) => (
            <CircleMarker
              key={`${item.type}-${item.id}`}
              center={[item.latitude, item.longitude]}
              radius={8}
              pathOptions={{ color: '#fff', weight: 2, fillColor: PIN_COLORS[item.type], fillOpacity: 1 }}
              eventHandlers={{ click: () => setSelectedPin(item) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>{item.name}</Tooltip>
            </CircleMarker>
          ))}

          <CircleMarker
            center={[userLat, userLng]}
            radius={11}
            pathOptions={{ color: '#fff', weight: 3, fillColor: PIN_COLORS.me, fillOpacity: 1 }}
            eventHandlers={{ click: () => setSelectedPin(me) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>You are here</Tooltip>
          </CircleMarker>
        </MapContainer>

        {/* Selected pin card */}
        {selectedPin && (
          <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-lg flex gap-3 items-center animate-fade-in">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: PIN_COLORS[selectedPin.type] }}>
              {selectedPin.type === 'business' ? <Store size={22} /> : selectedPin.type === 'event' ? <Calendar size={22} /> : selectedPin.type === 'me' ? <Compass size={22} /> : <Users size={22} />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 text-sm truncate">{selectedPin.name}</h4>
              <p className="text-xs text-gray-500 truncate">
                {selectedPin.category ? `${selectedPin.category} · ` : ''}
                {selectedPin.details}
              </p>
              {selectedPin.distanceKm !== undefined && (
                <p className="text-xs text-teal-700 font-semibold flex items-center gap-1 mt-0.5">
                  <Navigation size={11} /> {selectedPin.type === 'user' ? 'About ' : ''}
                  {distanceLabel(selectedPin.distanceKm)} away
                </p>
              )}
            </div>
            {selectedPin.type !== 'me' && (
              <button onClick={() => openPin(selectedPin)} className="px-3.5 py-2 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 shrink-0">
                View details
              </button>
            )}
            <button onClick={() => setSelectedPin(null)} className="p-1.5 text-gray-400 hover:text-gray-700" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Legend + layer toggles */}
      <div className="bg-white rounded-2xl border border-gray-200 px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-gray-700">
          <span className="w-3 h-3 rounded-full" style={{ background: PIN_COLORS.me }} /> You
        </span>
        {(
          [
            ['user', 'Neighbors'],
            ['business', 'Shops'],
            ['event', 'Events']
          ] as const
        ).map(([type, label]) => (
          <label key={type} className="flex items-center gap-1.5 font-semibold text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visible[type]}
              onChange={() => setVisible({ ...visible, [type]: !visible[type] })}
              className="accent-teal-600"
            />
            <span className="w-3 h-3 rounded-full" style={{ background: PIN_COLORS[type] }} /> {label} ({mapItems.filter((i) => i.type === type).length})
          </label>
        ))}
        <span className="text-gray-400 ml-auto hidden sm:inline">Rings show 5, 15 and 50 km</span>
      </div>
    </div>
  );
}
