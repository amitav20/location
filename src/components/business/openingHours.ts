/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayKey, OpeningHours } from '../../types';

export const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' }
];

export const DEFAULT_HOURS: OpeningHours = {
  mon: [['09:00', '18:00']],
  tue: [['09:00', '18:00']],
  wed: [['09:00', '18:00']],
  thu: [['09:00', '18:00']],
  fri: [['09:00', '18:00']],
  sat: [['10:00', '16:00']],
  sun: []
};

export function formatDayHours(ranges?: [string, string][]): string {
  if (!ranges || ranges.length === 0) return 'Closed';
  return ranges.map(([from, to]) => `${from} – ${to}`).join(', ');
}
