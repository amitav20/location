/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Search } from 'lucide-react';
import { api, Place } from '../../api';
import { getCurrentPlace } from '../../utils/geolocation';
import { toast } from '../Toaster';

interface LocationSearchProps {
  onSelect: (place: Place) => void;
  dark?: boolean;
  placeholder?: string;
}

/** City / address search plus a "use my current location" (GPS) button. */
export function LocationSearch({ onSelect, dark = false, placeholder = 'Search a city or address...' }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        setResults(await api.searchPlaces(query.trim()));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Search failed.');
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => window.clearTimeout(timer.current);
  }, [query]);

  const choose = (place: Place) => {
    setQuery('');
    setResults([]);
    onSelect(place);
  };

  const useGps = async () => {
    setIsLocating(true);
    try {
      choose(await getCurrentPlace());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not get your location.');
    } finally {
      setIsLocating(false);
    }
  };

  const inputClass = dark
    ? 'bg-slate-900/60 border-slate-800 text-white placeholder-slate-500'
    : 'bg-gray-50 border-gray-200 text-gray-700 placeholder-gray-400 focus:bg-white';

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={useGps}
        disabled={isLocating}
        className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2"
      >
        <Crosshair size={14} /> {isLocating ? 'Finding you...' : 'Use my current location'}
      </button>
      <div className="relative">
        <Search size={14} className={`absolute left-3 top-3 ${dark ? 'text-slate-500' : 'text-gray-400'}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={`w-full text-xs rounded-xl border pl-8 pr-3 py-2.5 outline-none focus:ring-1 focus:ring-teal-500 ${inputClass}`}
        />
        {(results.length > 0 || isSearching) && (
          <ul
            className={`absolute z-50 left-0 right-0 mt-1 rounded-xl shadow-lg max-h-56 overflow-y-auto text-xs border ${
              dark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            {isSearching && <li className="px-3 py-2 opacity-70">Searching...</li>}
            {results.map((p, i) => (
              <li key={`${p.latitude},${p.longitude},${i}`}>
                <button
                  type="button"
                  onClick={() => choose(p)}
                  className={`w-full text-left px-3 py-2 ${dark ? 'hover:bg-slate-800' : 'hover:bg-teal-50'}`}
                >
                  {p.displayName || p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
