/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { api, Place } from '../api';

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser cannot share your location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}

/**
 * Asks the browser for the device's GPS position and looks up the city for it.
 * If the city lookup fails, the coordinates are still returned (with empty place names).
 */
export async function getCurrentPlace(): Promise<Place> {
  let position: GeolocationPosition;
  try {
    position = await currentPosition();
  } catch (err: any) {
    if (err?.code === 1) throw new Error('Location permission was denied. Allow it in your browser settings and try again.');
    if (err?.code === 3) throw new Error('Finding your location took too long. Please try again.');
    throw new Error(err?.message || 'Could not get your location.');
  }

  const latitude = Number(position.coords.latitude.toFixed(5));
  const longitude = Number(position.coords.longitude.toFixed(5));
  try {
    const place = await api.reverseGeocode(latitude, longitude);
    return { ...place, latitude, longitude };
  } catch {
    return { name: 'Current location', displayName: '', latitude, longitude, city: '', state: '', country: '' };
  }
}
