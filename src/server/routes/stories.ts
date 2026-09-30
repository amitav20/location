/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { Story } from '../../types';
import { findUserById, getStories, haversineDistance, removeWhere, saveDB } from '../db';
import {
  blockedIdsFor,
  currentUser,
  currentUserId,
  forbidden,
  mediaUrl,
  newId,
  notFound,
  notify,
  nowIso,
  oneOf
} from '../http';

export const storiesRouter = express.Router();

export const STORY_REACTIONS = ['🔥', '❤️', '😂', '😮', '😢', '👏'] as const;
const STORY_RADIUS_KM = 50;

function findStory(id: string): Story {
  const story = getStories().find((s) => s.id === id && new Date(s.expiresAt).getTime() > Date.now());
  if (!story) throw notFound('This story has expired.');
  return story;
}

// Active (< 24h) stories from people nearby, plus your own
storiesRouter.get('/stories', (req, res) => {
  const user = currentUser(req);
  const blocked = blockedIdsFor(user.id);

  const active = getStories()
    .filter((s) => new Date(s.expiresAt).getTime() > Date.now() && !blocked.has(s.userId))
    .map((s) => {
      const author = findUserById(s.userId);
      if (!author || author.isBanned) return null;
      const distanceKm = Number(
        haversineDistance(user.location.latitude, user.location.longitude, author.location.latitude, author.location.longitude).toFixed(2)
      );
      return { ...s, userName: author.name, userPhoto: author.profilePhoto, distanceKm };
    })
    .filter((s): s is NonNullable<typeof s> => !!s && (s.distanceKm <= STORY_RADIUS_KM || s.userId === user.id))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  res.json(active);
});

storiesRouter.post('/stories', (req, res) => {
  const userId = currentUserId(req);
  const story: Story = {
    id: newId('story'),
    userId,
    mediaUrl: mediaUrl(req.body?.mediaUrl, 'Story media', true),
    mediaType: req.body?.mediaType ? oneOf(req.body.mediaType, 'Media type', ['image', 'video'] as const) : 'image',
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    views: [],
    reactions: []
  };
  getStories().push(story);
  saveDB();
  res.status(201).json(story);
});

storiesRouter.post('/stories/:id/view', (req, res) => {
  const userId = currentUserId(req);
  const story = findStory(req.params.id);
  if (story.userId !== userId && !story.views.some((v) => v.userId === userId)) {
    story.views.push({ userId, viewedAt: nowIso() });
    saveDB();
  }
  res.json({ success: true, story });
});

// One reaction per viewer; reacting again replaces it
storiesRouter.post('/stories/:id/react', (req, res) => {
  const user = currentUser(req);
  const story = findStory(req.params.id);
  const reaction = oneOf(req.body?.reaction, 'Reaction', STORY_REACTIONS);

  removeWhere(story.reactions, (r) => r.userId === user.id);
  story.reactions.push({ userId: user.id, reaction, createdAt: nowIso() });
  notify({
    userId: story.userId,
    senderId: user.id,
    type: 'story_reaction',
    title: 'Story Reaction',
    message: `${user.name} reacted ${reaction} to your story.`,
    link: 'feed'
  });

  saveDB();
  res.json({ success: true, story });
});

storiesRouter.delete('/stories/:id', (req, res) => {
  const user = currentUser(req);
  const story = getStories().find((s) => s.id === req.params.id);
  if (!story) throw notFound('Story not found.');
  if (story.userId !== user.id && !user.isAdmin) throw forbidden('You can only delete your own stories.');
  removeWhere(getStories(), (s) => s.id === story.id);
  saveDB();
  res.json({ success: true });
});
