/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Search } from 'lucide-react';
import { api, Place } from '../../api';
import { getCurrentPlace } from '../../utils/geolocation';
import { toast } from '../Toaster';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  label: string;
}

interface LocationPickerProps {
  value: PickedLocation;
  onChange: (location: PickedLocation) => void;
  height?: number;
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
  }, [lat, lng, map]);
  return null;
}

const placeLabel = (p: Place) => p.displayName.split(',').slice(0, 3).join(',').trim() || p.name;

/** Search for a place by name or click on the map to choose a spot. */
export function LocationPicker({ value, onChange, height = 200 }: LocationPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<number | undefined>(undefined);

  // Debounced place search (the server also rate-limits upstream lookups)
  useEffect(() => {
    window.clearTimeout(searchTimer.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    searchTimer.current = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        setResults(await api.searchPlaces(query.trim()));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Search failed.');
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => window.clearTimeout(searchTimer.current);
  }, [query]);

  const pickCoordinates = async (lat: number, lng: number) => {
    const latitude = Number(lat.toFixed(5));
    const longitude = Number(lng.toFixed(5));
    onChange({ latitude, longitude, label: 'Pinned location' });
    try {
      const place = await api.reverseGeocode(latitude, longitude);
      onChange({ latitude, longitude, label: placeLabel(place) });
    } catch {
      // Keep the coordinates even if the name lookup fails
    }
  };

  const useMyLocation = async () => {
    try {
      const place = await getCurrentPlace();
      onChange({ latitude: place.latitude, longitude: place.longitude, label: placeLabel(place) || 'My location' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not get your location.');
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a place or address..."
          className="w-full text-xs rounded-xl border border-gray-200 pl-8 pr-3 py-2.5 outline-none bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500"
        />
        {(results.length > 0 || isSearching) && (
          <ul className="absolute z-[1000] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto text-xs">
            {isSearching && <li className="px-3 py-2 text-gray-500">Searching...</li>}
            {results.map((p, i) => (
              <li key={`${p.latitude},${p.longitude},${i}`}>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ latitude: p.latitude, longitude: p.longitude, label: placeLabel(p) });
                    setQuery('');
                    setResults([]);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50"
                >
                  {p.displayName || p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height }}>
        <MapContainer center={[value.latitude, value.longitude]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter lat={value.latitude} lng={value.longitude} />
          <ClickToPick onPick={pickCoordinates} />
          <CircleMarker center={[value.latitude, value.longitude]} radius={9} pathOptions={{ color: '#fff', weight: 2, fillColor: '#0d9488', fillOpacity: 1 }} />
        </MapContainer>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-gray-600 truncate">
          📍 {value.label || `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`}
        </span>
        <button type="button" onClick={useMyLocation} className="shrink-0 text-teal-700 font-semibold flex items-center gap-1 hover:underline">
          <Crosshair size={13} /> Use my location
        </button>
      </div>
      <p className="text-[11px] text-gray-400">Tip: click anywhere on the map to move the pin.</p>
    </div>
  );
}
