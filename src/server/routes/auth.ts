/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { User } from '../../types';
import { hashToken, newSessionToken, SESSION_TTL_MS, verifyPassword } from '../auth';
import {
  addUser,
  findUserByEmail,
  findUserByUsername,
  getCredential,
  getSessions,
  removeWhere,
  saveDB,
  seedMockData,
  setPassword
} from '../db';
import {
  badRequest,
  currentUser,
  dateYmd,
  DEFAULT_AVATAR,
  email,
  HttpError,
  latitude,
  longitude,
  mediaUrl,
  newId,
  nowIso,
  oneOf,
  str
} from '../http';

export const authRouter = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;
const GENDERS = ['Male', 'Female', 'Other'] as const;

function createSession(userId: string): string {
  const token = newSessionToken();
  getSessions().push({
    tokenHash: hashToken(token),
    userId,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
  });
  saveDB();
  return token;
}

function newPassword(value: unknown, field = 'Password'): string {
  if (typeof value !== 'string') throw badRequest(`${field} is required.`);
  if (value.length < 8) throw badRequest(`${field} must be at least 8 characters.`);
  if (value.length > 128) throw badRequest(`${field} must be at most 128 characters.`);
  return value;
}

// ---------- Brute-force protection: 5 failed logins per IP+username per 15 minutes ----------
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const loginFailures = new Map<string, { count: number; firstAt: number }>();

function loginKey(req: express.Request, username: string) {
  return `${req.ip}|${username.toLowerCase()}`;
}

function assertNotLockedOut(key: string) {
  const entry = loginFailures.get(key);
  if (!entry) return;
  if (Date.now() - entry.firstAt > LOGIN_WINDOW_MS) {
    loginFailures.delete(key);
    return;
  }
  if (entry.count >= LOGIN_MAX_FAILURES) {
    const minutes = Math.ceil((entry.firstAt + LOGIN_WINDOW_MS - Date.now()) / 60000);
    throw new HttpError(429, `Too many failed sign-in attempts. Try again in ${minutes} minute(s).`);
  }
}

function recordLoginFailure(key: string) {
  const entry = loginFailures.get(key);
  if (!entry || Date.now() - entry.firstAt > LOGIN_WINDOW_MS) loginFailures.set(key, { count: 1, firstAt: Date.now() });
  else entry.count++;
}

// ---------- Routes ----------

authRouter.post('/auth/register', (req, res) => {
  const body = req.body || {};
  const name = str(body.name, 'Name', { max: 60, required: true });
  const username = str(body.username, 'Username', { max: 20, required: true });
  if (!USERNAME_RE.test(username)) {
    throw badRequest('Username must be 3-20 characters: letters, numbers, dots or underscores.');
  }
  const emailAddress = email(body.email);
  const password = newPassword(body.password);
  const mobile = str(body.mobile, 'Mobile number', { max: 20 });
  const dob = body.dob ? dateYmd(body.dob, 'Date of birth') : '';
  if (dob && dob > new Date().toISOString().slice(0, 10)) throw badRequest('Date of birth cannot be in the future.');
  const gender = body.gender ? oneOf(body.gender, 'Gender', GENDERS) : 'Other';
  const profilePhoto = mediaUrl(body.profilePhoto, 'Profile photo') || DEFAULT_AVATAR;

  const hasCoords = body.latitude !== undefined && body.longitude !== undefined;
  const lat = hasCoords ? latitude(body.latitude) : 37.7749;
  const lng = hasCoords ? longitude(body.longitude) : -122.4194;

  if (findUserByUsername(username)) throw badRequest('That username is already taken.');
  if (findUserByEmail(emailAddress)) throw badRequest('An account with that email already exists.');

  const newUser: User = {
    id: newId('user'),
    name,
    username,
    email: emailAddress,
    mobile,
    profilePhoto,
    dob,
    gender,
    location: {
      latitude: lat,
      longitude: lng,
      city: str(body.city, 'City', { max: 80 }) || (hasCoords ? '' : 'San Francisco'),
      state: str(body.state, 'State', { max: 80 }) || (hasCoords ? '' : 'California'),
      country: str(body.country, 'Country', { max: 80 }) || (hasCoords ? '' : 'United States'),
      updatedAt: nowIso()
    },
    interests: [],
    createdAt: nowIso()
  };

  addUser(newUser);
  setPassword(newUser.id, password);

  // Auto seed content centered around the new user's location
  seedMockData(newUser.location.latitude, newUser.location.longitude, newUser.location);

  res.status(201).json({ user: newUser, token: createSession(newUser.id) });
});

authRouter.post('/auth/login', (req, res) => {
  const username = str(req.body?.username, 'Username', { max: 60, required: true });
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  const key = loginKey(req, username);
  assertNotLockedOut(key);

  const user = findUserByUsername(username);
  const credential = user ? getCredential(user.id) : undefined;
  if (!user || !credential || !verifyPassword(password, credential.passwordHash)) {
    recordLoginFailure(key);
    throw new HttpError(401, 'Wrong username or password.');
  }
  loginFailures.delete(key);

  if (user.isBanned) throw new HttpError(403, 'This account has been banned by an administrator.');

  // Seeding around this user's last known location to ensure nearby widgets are dynamic
  seedMockData(user.location.latitude, user.location.longitude, user.location);

  res.json({ user, token: createSession(user.id) });
});

authRouter.post('/auth/logout', (req, res) => {
  if (req.sessionTokenHash) {
    removeWhere(getSessions(), (s) => s.tokenHash === req.sessionTokenHash);
    saveDB();
  }
  res.json({ success: true });
});

authRouter.put('/auth/password', (req, res) => {
  const user = currentUser(req);
  const credential = getCredential(user.id);
  const current = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  if (!credential || !verifyPassword(current, credential.passwordHash)) {
    throw badRequest('Your current password is incorrect.');
  }
  const next = newPassword(req.body?.newPassword, 'New password');
  setPassword(user.id, next, false);
  // Sign out every other device; keep this one
  removeWhere(getSessions(), (s) => s.userId === user.id && s.tokenHash !== req.sessionTokenHash);
  saveDB();
  res.json({ success: true });
});

// Update current location (GPS, a preset city, or a point picked on the map)
authRouter.post('/auth/location', (req, res) => {
  const user = currentUser(req);
  const body = req.body || {};
  user.location = {
    latitude: latitude(body.latitude),
    longitude: longitude(body.longitude),
    city: str(body.city, 'City', { max: 80 }) || user.location.city,
    state: str(body.state, 'State', { max: 80 }) || user.location.state,
    country: str(body.country, 'Country', { max: 80 }) || user.location.country,
    updatedAt: nowIso()
  };
  saveDB();

  // Generate a demo neighborhood the first time anyone visits this area
  seedMockData(user.location.latitude, user.location.longitude, user.location);

  res.json({ success: true, user, location: user.location });
});
