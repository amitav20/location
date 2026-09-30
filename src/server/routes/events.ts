/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { LocalEvent, User } from '../../types';
import { findUserById, getAllUsers, getEvents, haversineDistance, removeWhere, saveDB } from '../db';
import {
  badRequest,
  blockedIdsFor,
  currentUser,
  dateYmd,
  forbidden,
  latitude,
  longitude,
  mediaUrl,
  newId,
  notFound,
  notify,
  nowIso,
  rangeKm,
  str,
  todayYmd,
  toMemberSummary
} from '../http';

export const eventsRouter = express.Router();

const DEFAULT_EVENT_IMAGE = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&h=250&fit=crop';
const INVITE_RADIUS_KM = 15;

function findEvent(id: string): LocalEvent {
  const event = getEvents().find((e) => e.id === id);
  if (!event) throw notFound('Event not found.');
  return event;
}

function assertCanManage(user: User, event: LocalEvent) {
  if (event.creatorId !== user.id && !user.isAdmin) throw forbidden('Only the organizer can change this event.');
}

// Shared by create + edit; `partial` allows omitted fields on edit
function readEventFields(body: any, user: User, partial: boolean) {
  const fields: Partial<LocalEvent> = {};
  const has = (k: string) => !partial || body[k] !== undefined;

  if (has('name')) fields.name = str(body.name, 'Event name', { max: 100, required: true });
  if (has('description')) fields.description = str(body.description, 'Description', { max: 2000, required: true });
  if (has('locationName')) fields.locationName = str(body.locationName, 'Location', { max: 150, required: true });
  if (has('date')) {
    fields.date = dateYmd(body.date, 'Date');
    if (fields.date < todayYmd()) throw badRequest('The event date is in the past.');
  }
  if (has('time')) fields.time = str(body.time, 'Time', { max: 40, required: true });
  if (has('image')) fields.image = mediaUrl(body.image, 'Cover image') || DEFAULT_EVENT_IMAGE;
  if (body.latitude !== undefined && body.longitude !== undefined && body.latitude !== null) {
    fields.latitude = latitude(body.latitude);
    fields.longitude = longitude(body.longitude);
  } else if (!partial) {
    fields.latitude = user.location.latitude;
    fields.longitude = user.location.longitude;
  }
  return fields;
}

eventsRouter.get('/events', (req, res) => {
  const user = currentUser(req);
  const range = rangeKm(req.query.range, 50);
  const includePast = req.query.includePast === '1';
  const today = todayYmd();
  const blocked = blockedIdsFor(user.id);

  const result = getEvents()
    .filter((e) => !blocked.has(e.creatorId) && (includePast || e.date >= today))
    .map((e) => {
      const host = findUserById(e.creatorId);
      return {
        ...e,
        creatorName: host?.name || 'Local organizer',
        distanceKm: Number(haversineDistance(user.location.latitude, user.location.longitude, e.latitude, e.longitude).toFixed(2)),
        participantsInfo: e.participants.slice(0, 8).map((id) => toMemberSummary(findUserById(id), id)),
        isPast: e.date < today
      };
    })
    .filter((e) => e.distanceKm <= range)
    // Soonest first, then closest
    .sort((a, b) => a.date.localeCompare(b.date) || a.distanceKm - b.distanceKm);

  res.json(result);
});

eventsRouter.post('/events', (req, res) => {
  const user = currentUser(req);
  const fields = readEventFields(req.body || {}, user, false);
  const event: LocalEvent = {
    ...(fields as Omit<LocalEvent, 'id' | 'creatorId' | 'participants' | 'createdAt'>),
    id: newId('event'),
    creatorId: user.id,
    participants: [user.id],
    createdAt: nowIso()
  };
  getEvents().push(event);

  // Let people nearby know
  const blocked = blockedIdsFor(user.id);
  getAllUsers()
    .filter((u) => u.id !== user.id && !u.isBanned && !blocked.has(u.id))
    .forEach((u) => {
      const d = haversineDistance(event.latitude, event.longitude, u.location.latitude, u.location.longitude);
      if (d <= INVITE_RADIUS_KM) {
        notify({
          userId: u.id,
          senderId: user.id,
          type: 'event_invite',
          title: 'Event Near You',
          message: `${user.name} is hosting "${event.name}" ${d.toFixed(1)} km away.`,
          link: 'events'
        });
      }
    });

  saveDB();
  res.status(201).json(event);
});

eventsRouter.put('/events/:id', (req, res) => {
  const user = currentUser(req);
  const event = findEvent(req.params.id);
  assertCanManage(user, event);
  Object.assign(event, readEventFields(req.body || {}, user, true));

  event.participants
    .filter((id) => id !== user.id)
    .forEach((id) =>
      notify({
        userId: id,
        senderId: user.id,
        type: 'announcement',
        title: 'Event Updated',
        message: `"${event.name}" was updated. Check the new details.`,
        link: 'events'
      })
    );

  saveDB();
  res.json(event);
});

eventsRouter.delete('/events/:id', (req, res) => {
  const user = currentUser(req);
  const event = findEvent(req.params.id);
  assertCanManage(user, event);

  event.participants
    .filter((id) => id !== user.id)
    .forEach((id) =>
      notify({
        userId: id,
        senderId: user.id,
        type: 'announcement',
        title: 'Event Cancelled',
        message: `"${event.name}" on ${event.date} has been cancelled.`,
        link: 'events'
      })
    );

  removeWhere(getEvents(), (e) => e.id === event.id);
  saveDB();
  res.json({ success: true });
});

eventsRouter.post('/events/:id/join', (req, res) => {
  const user = currentUser(req);
  const event = findEvent(req.params.id);
  if (event.date < todayYmd()) throw badRequest('This event has already happened.');

  const idx = event.participants.indexOf(user.id);
  if (idx !== -1) {
    if (event.creatorId === user.id) throw badRequest('You are the organizer. Delete the event instead of leaving it.');
    event.participants.splice(idx, 1);
  } else {
    event.participants.push(user.id);
  }
  saveDB();
  res.json({
    success: true,
    joined: idx === -1,
    event: { ...event, participantsInfo: event.participants.slice(0, 8).map((id) => toMemberSummary(findUserById(id), id)) }
  });
});
