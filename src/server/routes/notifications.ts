/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { findUserById, getNotifications, removeWhere, saveDB } from '../db';
import { blockedIdsFor, currentUserId, DEFAULT_AVATAR, notFound } from '../http';

export const notificationsRouter = express.Router();

const MAX_RETURNED = 100;

notificationsRouter.get('/notifications', (req, res) => {
  const userId = currentUserId(req);
  const blocked = blockedIdsFor(userId);
  const list = getNotifications()
    .filter((n) => n.userId === userId && !blocked.has(n.senderId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_RETURNED)
    .map((n) => {
      const sender = findUserById(n.senderId);
      return { ...n, senderName: sender?.name || 'GeoConnect', senderPhoto: sender?.profilePhoto || DEFAULT_AVATAR };
    });
  res.json(list);
});

notificationsRouter.post('/notifications/read-all', (req, res) => {
  const userId = currentUserId(req);
  getNotifications()
    .filter((n) => n.userId === userId)
    .forEach((n) => (n.isRead = true));
  saveDB();
  res.json({ success: true });
});

notificationsRouter.post('/notifications/:id/read', (req, res) => {
  const userId = currentUserId(req);
  const notification = getNotifications().find((n) => n.id === req.params.id && n.userId === userId);
  if (!notification) throw notFound('Notification not found.');
  notification.isRead = true;
  saveDB();
  res.json({ success: true });
});

notificationsRouter.delete('/notifications/:id', (req, res) => {
  const userId = currentUserId(req);
  removeWhere(getNotifications(), (n) => n.id === req.params.id && n.userId === userId);
  saveDB();
  res.json({ success: true });
});
