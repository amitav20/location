/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { MemberSummary, Notification, User } from '../types';
import { findUserById, getBlocks, getNotifications } from './db';

// The auth middleware sets req.userId for signed-in requests
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      sessionTokenHash?: string;
    }
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const forbidden = (message = 'You are not allowed to do that.') => new HttpError(403, message);
export const notFound = (message = 'Not found.') => new HttpError(404, message);

// Unique record ids; Date.now() alone collides when several records are created in the same millisecond
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export const nowIso = () => new Date().toISOString();

// ---------- Input validation (throws 400 with a readable message) ----------

export function str(value: unknown, field: string, opts: { max: number; min?: number; required?: boolean }): string {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') throw badRequest(`${field} must be text.`);
  const trimmed = value.trim();
  const min = opts.min ?? (opts.required ? 1 : 0);
  if (trimmed.length < min) {
    throw badRequest(min <= 1 ? `${field} is required.` : `${field} must be at least ${min} characters.`);
  }
  if (trimmed.length > opts.max) throw badRequest(`${field} must be at most ${opts.max} characters.`);
  return trimmed;
}

/** Like str() but returns undefined when the field wasn't sent (for partial updates). */
export function optStr(value: unknown, field: string, max: number): string | undefined {
  return value === undefined ? undefined : str(value, field, { max });
}

export function int(value: unknown, field: string, min: number, max: number): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) {
    throw badRequest(`${field} must be a whole number between ${min} and ${max}.`);
  }
  return n;
}

export function num(value: unknown, field: string, min: number, max: number): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) {
    throw badRequest(`${field} must be a number between ${min} and ${max}.`);
  }
  return n;
}

export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw badRequest(`${field} must be one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function email(value: unknown, field = 'Email'): string {
  const v = str(value, field, { max: 120, required: true });
  if (!EMAIL_RE.test(v)) throw badRequest(`${field} is not a valid email address.`);
  return v.toLowerCase();
}

/** Accepts http(s) URLs and files uploaded to this server (/uploads/...). Empty string allowed unless required. */
export function mediaUrl(value: unknown, field: string, required = false): string {
  const v = str(value, field, { max: 2000, required });
  if (!v) return v;
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(v)) return v;
  try {
    const url = new URL(v);
    if (url.protocol === 'http:' || url.protocol === 'https:') return v;
  } catch {
    // fall through
  }
  throw badRequest(`${field} must be a link starting with http:// or https://, or an uploaded file.`);
}

export function optMediaUrl(value: unknown, field: string): string | undefined {
  return value === undefined ? undefined : mediaUrl(value, field);
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
export function dateYmd(value: unknown, field: string): string {
  const v = str(value, field, { max: 10, required: true });
  const d = new Date(`${v}T00:00:00`);
  if (!YMD_RE.test(v) || Number.isNaN(d.getTime())) throw badRequest(`${field} must be a date (YYYY-MM-DD).`);
  return v;
}

/** Today's date as YYYY-MM-DD in the server's local timezone. */
export function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const latitude = (value: unknown) => num(value, 'Latitude', -90, 90);
export const longitude = (value: unknown) => num(value, 'Longitude', -180, 180);

export function arrayOf<T>(value: unknown, field: string, maxItems: number, each: (item: unknown) => T): T[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw badRequest(`${field} must be a list.`);
  if (value.length > maxItems) throw badRequest(`${field} can have at most ${maxItems} items.`);
  return value.map(each);
}

/** Parses a "range" query param: a number of km, or 'global'. */
export function rangeKm(value: unknown, fallback: number): number {
  if (value === 'global') return Infinity;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ---------- Current user / permissions ----------

export function currentUserId(req: Request): string {
  if (!req.userId) throw new HttpError(401, 'Please sign in.');
  return req.userId;
}

export function currentUser(req: Request): User {
  const user = findUserById(currentUserId(req));
  if (!user) throw new HttpError(401, 'Please sign in.');
  return user;
}

export function requireAdmin(req: Request): User {
  const user = currentUser(req);
  if (!user.isAdmin) throw forbidden('Requires admin rights.');
  return user;
}

/** User fields safe to show other people (no email, phone or date of birth). */
export function toPublicUser(user: User): User {
  const { email: _email, mobile: _mobile, dob: _dob, ...rest } = user;
  return rest as User;
}

export function toMemberSummary(user: User | undefined, fallbackId = ''): MemberSummary {
  return {
    id: user?.id || fallbackId,
    name: user?.name || 'Deleted user',
    profilePhoto: user?.profilePhoto || DEFAULT_AVATAR
  };
}

export const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';

/** Ids of everyone this user blocked or was blocked by. */
export function blockedIdsFor(userId: string): Set<string> {
  const ids = new Set<string>();
  getBlocks().forEach((b) => {
    if (b.blockerId === userId) ids.add(b.blockedId);
    if (b.blockedId === userId) ids.add(b.blockerId);
  });
  return ids;
}

export function isBlockedBetween(a: string, b: string): boolean {
  return getBlocks().some((x) => (x.blockerId === a && x.blockedId === b) || (x.blockerId === b && x.blockedId === a));
}

// ---------- Notifications ----------

export function notify(n: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) {
  if (n.userId === n.senderId) return;
  getNotifications().push({ ...n, id: newId('notif'), isRead: false, createdAt: nowIso() });
}
