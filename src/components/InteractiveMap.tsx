/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { MapPin, Navigation, Store, Calendar, Users, Compass, RefreshCw } from 'lucide-react';

interface MapItem {
  id: string;
  name: string;
  type: 'me' | 'user' | 'business' | 'event';
  latitude: number;
  longitude: number;
  distanceKm?: number;
  category?: string;
  details?: string;
}

interface InteractiveMapProps {
  currentUser: any;
  onRelocate: (lat: number, lng: number, city: string, state: string) => void;
  setAppView: (view: string, targetId?: string) => void;
}

export function InteractiveMap({
  currentUser,
  onRelocate,
  setAppView
}: InteractiveMapProps) {
  const [zoom, setZoom] = useState<number>(350); // Scale factor for coordinate conversion
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isRelocating, setIsRelocating] = useState<boolean>(false);
  
  // Plotted elements lists
  const [mapItems, setMapItems] = useState<MapItem[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fallback defaults if GPS is empty
  const userLat = currentUser?.location?.latitude || 40.7128;
  const userLng = currentUser?.location?.longitude || -74.0060;
  const userCity = currentUser?.city || 'New York';
  const userState = currentUser?.state || 'NY';

  const demoCities = [
    { name: 'San Francisco, CA', lat: 37.7749, lng: -122.4194, city: 'San Francisco', state: 'CA' },
    { name: 'New York, NY', lat: 40.7128, lng: -74.0060, city: 'New York', state: 'NY' },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278, city: 'London', state: 'ENG' },
    { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, city: 'Tokyo', state: 'TYO' }
  ];

  const fetchPlottedPins = async () => {
    setIsLoading(true);
    try {
      const items: MapItem[] = [];

      // Add "Me" anchor
      items.push({
        id: 'me',
        name: 'My GPS Location',
        type: 'me',
        latitude: userLat,
        longitude: userLng,
        details: 'You are anchored here'
      });

      // 1. Fetch people
      try {
        const users = await api.discoverPeople({ range: '50' });
        users.forEach((u: any) => {
          if (u.id !== currentUser?.id) {
            items.push({
              id: u.id,
              name: u.name,
              type: 'user',
              latitude: u.location?.latitude || 37.7749,
              longitude: u.location?.longitude || -122.4194,
              distanceKm: u.distanceKm,
              details: u.profession || 'Neighboring Resident'
            });
          }
        });
      } catch (e) {
        console.error(e);
      }

      // 2. Fetch businesses
      try {
        const bizs = await api.getBusinesses({ range: '50' });
        bizs.forEach((b: any) => {
          items.push({
            id: b.id,
            name: b.name,
            type: 'business',
            latitude: b.latitude || 37.7749,
            longitude: b.longitude || -122.4194,
            distanceKm: b.distanceKm,
            category: b.category,
            details: b.description
          });
        });
      } catch (e) {
        console.error(e);
      }

      // 3. Fetch events
      try {
        const evts = await api.getEvents('50');
        evts.forEach((e: any) => {
          items.push({
            id: e.id,
            name: e.name,
            type: 'event',
            latitude: e.latitude || 37.7749,
            longitude: e.longitude || -122.4194,
            distanceKm: e.distanceKm,
            details: `${e.date} at ${e.time}`
          });
        });
      } catch (err) {
        console.error(err);
      }

      setMapItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlottedPins();
  }, [userLat, userLng]);

  // Formula to derive relative coordinates on SVG map board
  const getRelativeXY = (itemLat: number, itemLng: number) => {
    const x = (itemLng - userLng) * zoom + 300 + dragOffset.x;
    const y = -(itemLat - userLat) * zoom + 200 + dragOffset.y;
    return { x, y };
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert pixels to coordinates back
    const targetLng = (clickX - 300 - dragOffset.x) / zoom + userLng;
    const targetLat = -(clickY - 200 - dragOffset.y) / zoom + userLat;

    if (isRelocating) {
      onRelocate(
        Number(targetLat.toFixed(5)),
        Number(targetLng.toFixed(5)),
        'Custom Anchor Location',
        'SIM'
      );
      setIsRelocating(false);
    }
  };

  const handleQuickInquiry = (pin: MapItem) => {
    if (pin.type === 'user') setAppView('people', pin.id);
    if (pin.type === 'business') setAppView('business', pin.id);
    if (pin.type === 'event') setAppView('events', pin.id);
  };

  return (
    <div className="relative bg-teal-50/40 rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-[520px] w-full" id="interactive-map">
      
      {/* Top Banner Control Panel */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col sm:flex-row gap-2">
        {/* Active position card */}
        <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 animate-pulse">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Real-time Center Location</p>
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2 mt-1">
                {userCity}, {userState}
                <span className="font-mono text-[9px] bg-teal-100/60 text-teal-700 px-1.5 py-0.5 rounded-md">
                  {userLat.toFixed(4)}, {userLng.toFixed(4)}
                </span>
              </h3>
            </div>
          </div>
          
          <button
            onClick={() => setIsRelocating(!isRelocating)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              isRelocating
                ? 'bg-amber-500 text-white animate-bounce'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            <Compass size={14} className={isRelocating ? 'animate-spin' : ''} />
            {isRelocating ? 'Click on Map Canvas to Drop Pin' : 'Relocate Sim GPS Point'}
          </button>
        </div>

        {/* Quick presets list */}
        <div className="bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-1 overflow-x-auto overflow-y-hidden max-w-full shrink-0">
          <span className="text-[10px] text-gray-400 font-bold px-2 uppercase tracking-wider">Presets:</span>
          {demoCities.map((city) => (
            <button
              key={city.name}
              onClick={() => onRelocate(city.lat, city.lng, city.city, city.state)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] whitespace-nowrap font-medium transition-all ${
                Math.abs(userLat - city.lat) < 0.01
                  ? 'bg-teal-50 text-teal-700 font-bold border border-teal-200'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {city.name.split(',')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Map visual stage canvas */}
      <div className="relative flex-1 bg-gradient-to-b from-blue-50/50 via-teal-50/20 to-emerald-50/50 flex items-center justify-center">
        
        {/* Concentric distance helper scale rings */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[120px] h-[120px] rounded-full border border-teal-200/40 bg-teal-100/5 flex items-center justify-center">
            <span className="text-[8.5px] text-teal-400 font-mono font-bold mt-14">5 KM</span>
          </div>
          <div className="absolute w-[260px] h-[260px] rounded-full border border-teal-300/20 bg-teal-200/2 flex items-center justify-center text-center">
            <span className="text-[8.5px] text-teal-400/80 font-mono font-bold mt-48">15 KM</span>
          </div>
          <div className="absolute w-[460px] h-[460px] rounded-full border border-teal-300/10 flex items-center justify-center">
            <span className="text-[8.5px] text-teal-300/60 font-mono font-bold mt-84">50 KM</span>
          </div>
        </div>

        <svg
          className="w-full h-full absolute inset-0 cursor-crosshair select-none"
          onClick={handleMapClick}
        >
          {/* Active SVG lines to create coordinate system mesh */}
          <line x1="0" y1="200" x2="600" y2="200" stroke="#0d9488" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.3" />
          <line x1="300" y1="0" x2="300" y2="400" stroke="#0d9488" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.3" />

          {/* Render individual items as beautifully customized coordinate nodes */}
          {mapItems.map((item) => {
            const { x, y } = getRelativeXY(item.latitude, item.longitude);
            
            // Filter out of bounds coordinates
            if (x < 15 || x > 585 || y < 15 || y > 385) return null;

            const isMe = item.type === 'me';
            const colorClass = 
              isMe ? '#0d9488' : 
              item.type === 'business' ? '#f43f5e' : 
              item.type === 'event' ? '#f59e0b' : 
              '#0ea5e9';

            return (
              <g
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPin(item);
                }}
                className="cursor-pointer group"
                id={`map-pin-${item.id}`}
              >
                {/* Dynamic radial pulsing glow effect */}
                <circle
                  cx={x}
                  cy={y}
                  r={isMe ? 12 : 9}
                  fill={colorClass}
                  fillOpacity="0.25"
                  className={isMe ? 'animate-ping' : 'group-hover:scale-125 transition-transform'}
                />

                {/* Pin Head */}
                <circle
                  cx={x}
                  cy={y}
                  r={isMe ? 6 : 4.5}
                  fill={colorClass}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Tooltip on Hover */}
                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fill="#1f2937"
                  fontSize="9px"
                  fontWeight="bold"
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 pointers-event-none pointer-events-none font-sans"
                >
                  {item.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Map Pin details bottom drawer slider */}
        {selectedPin && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-gray-150 shadow-lg flex gap-4 items-center animate-fade-in z-10 text-left">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white ${
              selectedPin.type === 'business'
                ? 'bg-rose-500'
                : selectedPin.type === 'event'
                ? 'bg-amber-500'
                : selectedPin.type === 'me'
                ? 'bg-teal-600'
                : 'bg-sky-500'
            }`}>
              {selectedPin.type === 'business' ? (
                <Store size={22} />
              ) : selectedPin.type === 'event' ? (
                <Calendar size={22} />
              ) : selectedPin.type === 'me' ? (
                <Compass size={22} />
              ) : (
                <Users size={22} strokeWidth={2.5} />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <span className={`text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                selectedPin.type === 'business'
                  ? 'bg-rose-50 text-rose-700'
                  : selectedPin.type === 'event'
                  ? 'bg-amber-50 text-amber-700'
                  : selectedPin.type === 'me'
                  ? 'bg-teal-50 text-teal-700'
                  : 'bg-sky-50 text-sky-700'
              }`}>
                {selectedPin.type} {selectedPin.category ? `• ${selectedPin.category}` : ''}
              </span>
              <h4 className="font-bold text-gray-800 text-xs sm:text-sm mt-1 truncate">{selectedPin.name}</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 truncate leading-none">{selectedPin.details}</p>
              
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 font-mono font-bold">
                <span className="flex items-center gap-1 text-teal-600">
                  <Navigation size={10} />
                  {selectedPin.type === 'me' ? 'Center Point' : selectedPin.distanceKm !== undefined ? `${selectedPin.distanceKm.toFixed(1)} km away` : 'Within 1km'}
                </span>
                <span className="hidden sm:inline">Lat: {selectedPin.latitude.toFixed(4)}</span>
                <span className="hidden sm:inline">Lng: {selectedPin.longitude.toFixed(4)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 shrink-0">
              {selectedPin.type !== 'me' && (
                <button
                  onClick={() => handleQuickInquiry(selectedPin)}
                  className="px-3.5 py-1.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 transition-all shadow-sm whitespace-nowrap"
                >
                  Inspect Portal
                </button>
              )}
              <button
                onClick={() => setSelectedPin(null)}
                className="text-[10px] text-gray-400 hover:text-gray-600 font-bold uppercase"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control scale helpers */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-1 z-10 bg-white/95 backdrop-blur-md p-1.5 rounded-xl shadow-sm border border-gray-100">
        <button
          onClick={() => setZoom(Math.min(zoom + 100, 750))}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100 transition-all text-sm"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(zoom - 100, 150))}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100 transition-all text-sm"
          title="Zoom Out"
        >
          −
        </button>
      </div>

      {/* Map Legend */}
      <div className="bg-gray-50/90 border-t border-gray-100 px-4 py-2.5 flex items-center justify-between text-xs text-gray-500 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
            <span className="font-semibold text-gray-700">You (GPS)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span className="font-semibold text-gray-700">Neighbors</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="font-semibold text-gray-700">Shops</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="font-semibold text-gray-700">Local Events</span>
          </div>
        </div>

        <div className="hidden sm:block text-[11px] font-mono text-gray-400">
          Scale: approx 100px = {(400 / zoom).toFixed(1)}KM
        </div>
      </div>
    </div>
  );
}
