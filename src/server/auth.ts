/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// Password hashing with Node's built-in scrypt: "scrypt:<salt hex>:<hash hex>"
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Session tokens are random; only their SHA-256 is stored, so a leaked database can't be replayed as logins
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 days
