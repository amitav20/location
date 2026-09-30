/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { HttpError, latitude, longitude, str } from '../http';

// Place lookups via OpenStreetMap Nominatim (free, no key). Its usage policy asks for an identifying
// User-Agent, at most 1 request per second, and caching, so all three are done here on the server.
export const geoRouter = express.Router();

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'GeoConnect/0.1 (local social app)';
const MIN_INTERVAL_MS = 1100;
const cache = new Map<string, { at: number; data: unknown }>();
const CACHE_TTL_MS = 24 * 3600 * 1000;
let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

export interface Place {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
}

async function nominatim(path: string): Promise<any> {
  const cached = cache.get(path);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  // Serialize upstream calls so we never exceed 1 request/second
  const run = queue.then(async () => {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
    const res = await fetch(`${NOMINATIM}${path}`, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    return res.json();
  });
  queue = run.catch(() => undefined);

  try {
    const data = await run;
    cache.set(path, { at: Date.now(), data });
    return data;
  } catch {
    throw new HttpError(502, 'Location lookup is unavailable right now. Please try again.');
  }
}

function toPlace(item: any): Place {
  const a = item.address || {};
  const city = a.city || a.town || a.village || a.suburb || a.municipality || a.county || '';
  return {
    name: item.name || city || String(item.display_name || '').split(',')[0],
    displayName: item.display_name || '',
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    city,
    state: a.state || a.region || a.province || '',
    country: a.country || ''
  };
}

// Coordinates -> city / state / country
geoRouter.get('/geo/reverse', async (req, res, next) => {
  try {
    const lat = latitude(req.query.lat);
    const lng = longitude(req.query.lng);
    // Round to ~100 m so nearby lookups share the cache
    const data = await nominatim(
      `/reverse?format=jsonv2&addressdetails=1&zoom=14&lat=${lat.toFixed(3)}&lon=${lng.toFixed(3)}`
    );
    if (!data || data.error) throw new HttpError(404, 'No place found at that location.');
    res.json({ ...toPlace(data), latitude: lat, longitude: lng });
  } catch (err) {
    next(err);
  }
});

// Place name / address -> up to 5 matches
geoRouter.get('/geo/search', async (req, res, next) => {
  try {
    const q = str(req.query.q, 'Search', { min: 2, max: 150 });
    const data = await nominatim(`/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`);
    res.json(Array.isArray(data) ? data.map(toPlace) : []);
  } catch (err) {
    next(err);
  }
});
