/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Date/time display helpers shared by feed, chat and notifications.

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function shortDate(date: Date) {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

function clock(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** "just now", "5m ago", "3h ago", "2d ago", then a short date ("Mar 4"). */
export function timeAgo(iso: string): string {
  const date = new Date(iso);
  const seconds = (Date.now() - date.getTime()) / 1000;
  if (!Number.isFinite(seconds)) return '';
  if (seconds < MINUTE) return 'just now';
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m ago`;
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h ago`;
  if (seconds < 7 * DAY) return `${Math.floor(seconds / DAY)}d ago`;
  return shortDate(date);
}

/** For conversation lists: time if today, "Yesterday", otherwise a short date. */
export function formatListTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (isSameDay(date, now)) return clock(date);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return shortDate(date);
}

/** For individual chat messages: time if today, otherwise date + time. */
export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return isSameDay(date, new Date()) ? clock(date) : `${shortDate(date)}, ${clock(date)}`;
}

/**
 * Event dates are stored as "YYYY-MM-DD". `new Date("YYYY-MM-DD")` parses that as UTC midnight,
 * which shows the previous day in timezones west of UTC, so build a local date instead.
 */
export function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date(ymd);
}
