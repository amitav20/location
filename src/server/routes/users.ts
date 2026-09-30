/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { FriendRequest, Report, User } from '../../types';
import { verifyPassword } from '../auth';
import {
  deleteUserCascade,
  findUserByEmail,
  findUserById,
  getAllUsers,
  getBusinesses,
  getComments,
  getCredential,
  getFollows,
  getFriendRequests,
  getBlocks,
  getPosts,
  getProducts,
  getReports,
  getStories,
  haversineDistance,
  removeWhere,
  saveDB,
  updateUser
} from '../db';
import {
  arrayOf,
  badRequest,
  blockedIdsFor,
  currentUser,
  currentUserId,
  email,
  isBlockedBetween,
  newId,
  notFound,
  notify,
  nowIso,
  oneOf,
  optMediaUrl,
  optStr,
  rangeKm,
  str,
  toPublicUser
} from '../http';

export const usersRouter = express.Router();

const distanceBetween = (a: User, b: User) =>
  Number(haversineDistance(a.location.latitude, a.location.longitude, b.location.latitude, b.location.longitude).toFixed(2));

function friendshipBetween(a: string, b: string): FriendRequest | undefined {
  return getFriendRequests().find(
    (r) => (r.senderId === a && r.receiverId === b) || (r.senderId === b && r.receiverId === a)
  );
}

// Everything that should disappear between two people when one blocks the other
function severRelationship(a: string, b: string) {
  removeWhere(getFriendRequests(), (r) => (r.senderId === a && r.receiverId === b) || (r.senderId === b && r.receiverId === a));
  removeWhere(getFollows(), (f) => (f.followerId === a && f.followingId === b) || (f.followerId === b && f.followingId === a));
}

// ---------- My account ----------

usersRouter.get('/users/me', (req, res) => {
  res.json(currentUser(req));
});

usersRouter.put('/users/profile', (req, res) => {
  const user = currentUser(req);
  const body = req.body || {};

  const updates: Partial<User> = {
    name: body.name === undefined ? undefined : str(body.name, 'Name', { max: 60, required: true }),
    bio: optStr(body.bio, 'Bio', 500),
    profession: optStr(body.profession, 'Profession', 60),
    website: optStr(body.website, 'Website', 200),
    mobile: optStr(body.mobile, 'Mobile number', 20),
    profilePhoto: optMediaUrl(body.profilePhoto, 'Profile photo'),
    coverImage: optMediaUrl(body.coverImage, 'Cover image'),
    interests:
      body.interests === undefined
        ? undefined
        : arrayOf(body.interests, 'Interests', 20, (i) => str(i, 'Interest', { max: 30, required: true }))
  };

  if (body.email !== undefined) {
    const newEmail = email(body.email);
    const owner = findUserByEmail(newEmail);
    if (owner && owner.id !== user.id) throw badRequest('An account with that email already exists.');
    updates.email = newEmail;
  }
  if (updates.profilePhoto === '') delete updates.profilePhoto; // keep the current photo rather than blanking it

  res.json({ user: updateUser(user.id, updates) });
});

usersRouter.delete('/users/me', (req, res) => {
  const user = currentUser(req);
  const credential = getCredential(user.id);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!credential || !verifyPassword(password, credential.passwordHash)) {
    throw badRequest('Password is incorrect.');
  }
  if (user.isAdmin && getAllUsers().filter((u) => u.isAdmin).length === 1) {
    throw badRequest('You are the only administrator, so this account cannot be deleted.');
  }
  deleteUserCascade(user.id);
  res.json({ success: true });
});

// ---------- Friends, follows, blocks ----------

usersRouter.get('/users/social-relations', (req, res) => {
  const userId = currentUserId(req);
  res.json({
    friendRequests: getFriendRequests().filter((r) => r.senderId === userId || r.receiverId === userId),
    following: getFollows().filter((f) => f.followerId === userId),
    blocked: getBlocks().filter((b) => b.blockerId === userId)
  });
});

usersRouter.get('/users/friends', (req, res) => {
  const me = currentUser(req);
  const blocked = blockedIdsFor(me.id);
  const visible = (id: string) => {
    const u = findUserById(id);
    return u && !u.isBanned && !blocked.has(id) ? u : undefined;
  };

  const mine = getFriendRequests().filter((r) => r.senderId === me.id || r.receiverId === me.id);
  const friends = mine
    .filter((r) => r.status === 'accepted')
    .map((r) => visible(r.senderId === me.id ? r.receiverId : r.senderId))
    .filter((u): u is User => !!u)
    .map((u) => ({ ...toPublicUser(u), distanceKm: distanceBetween(me, u) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const withUser = (r: FriendRequest, otherId: string) => {
    const u = visible(otherId);
    return u ? { request: r, user: toPublicUser(u) } : null;
  };

  res.json({
    friends,
    incoming: mine.filter((r) => r.status === 'pending' && r.receiverId === me.id).map((r) => withUser(r, r.senderId)).filter(Boolean),
    outgoing: mine.filter((r) => r.status === 'pending' && r.senderId === me.id).map((r) => withUser(r, r.receiverId)).filter(Boolean)
  });
});

// Unfriend, or cancel a request you sent
usersRouter.delete('/users/friends/:userId', (req, res) => {
  const me = currentUserId(req);
  const other = req.params.userId;
  const removed = removeWhere(
    getFriendRequests(),
    (r) => (r.senderId === me && r.receiverId === other) || (r.senderId === other && r.receiverId === me)
  );
  if (!removed) throw notFound('You are not friends with this person.');
  saveDB();
  res.json({ success: true });
});

usersRouter.post('/users/friend-request', (req, res) => {
  const me = currentUser(req);
  const receiverId = str(req.body?.receiverId, 'Receiver', { max: 100, required: true });
  const receiver = findUserById(receiverId);
  if (!receiver || receiver.isBanned || receiverId === me.id) throw badRequest('You cannot send a friend request to this person.');
  if (isBlockedBetween(me.id, receiverId)) throw badRequest('You cannot send a friend request to this person.');

  const existing = friendshipBetween(me.id, receiverId);
  if (existing && existing.status !== 'declined') {
    res.json({ success: true, request: existing });
    return;
  }

  let request: FriendRequest;
  if (existing) {
    // A declined request can be sent again
    Object.assign(existing, { senderId: me.id, receiverId, status: 'pending', createdAt: nowIso() });
    request = existing;
  } else {
    request = { id: newId('fr_req'), senderId: me.id, receiverId, status: 'pending', createdAt: nowIso() };
    getFriendRequests().push(request);
  }

  notify({
    userId: receiverId,
    senderId: me.id,
    type: 'friend_request',
    title: 'New Friend Request',
    message: `${me.name} sent you a friend request.`,
    link: `profile:${me.id}`
  });

  saveDB();
  res.json({ success: true, request });
});

usersRouter.post('/users/friend-respond', (req, res) => {
  const me = currentUser(req);
  const respond = oneOf(req.body?.respond, 'Response', ['accepted', 'declined'] as const);
  const request = getFriendRequests().find((r) => r.id === req.body?.requestId && r.receiverId === me.id);
  if (!request || request.status !== 'pending') throw notFound('Friend request not found.');

  request.status = respond;
  if (respond === 'accepted') {
    notify({
      userId: request.senderId,
      senderId: me.id,
      type: 'friend_accept',
      title: 'Friend Request Accepted',
      message: `${me.name} accepted your friend request!`,
      link: `profile:${me.id}`
    });
  }

  saveDB();
  res.json({ success: true, request });
});

usersRouter.post('/users/follow', (req, res) => {
  const me = currentUser(req);
  const targetType = oneOf(req.body?.targetType, 'Target type', ['user', 'business'] as const);
  const targetId = str(req.body?.targetId, 'Target', { max: 100, required: true });

  if (targetType === 'user') {
    const target = findUserById(targetId);
    if (!target || target.isBanned || targetId === me.id || isBlockedBetween(me.id, targetId)) {
      throw badRequest('You cannot follow this person.');
    }
  } else if (!getBusinesses().some((b) => b.id === targetId)) {
    throw notFound('Business not found.');
  }

  const follows = getFollows();
  const existing = follows.findIndex((f) => f.followerId === me.id && f.followingId === targetId);
  if (existing !== -1) {
    follows.splice(existing, 1);
    saveDB();
    res.json({ success: true, following: false });
    return;
  }

  follows.push({ id: newId('flw'), followerId: me.id, followingId: targetId, targetType, createdAt: nowIso() });
  if (targetType === 'user') {
    notify({
      userId: targetId,
      senderId: me.id,
      type: 'follow',
      title: 'New Follower',
      message: `${me.name} started following you.`,
      link: `profile:${me.id}`
    });
  }
  saveDB();
  res.json({ success: true, following: true });
});

usersRouter.post('/users/block', (req, res) => {
  const me = currentUserId(req);
  const blockedId = str(req.body?.blockedId, 'User', { max: 100, required: true });
  if (blockedId === me || !findUserById(blockedId)) throw badRequest('You cannot block this person.');

  if (!getBlocks().some((b) => b.blockerId === me && b.blockedId === blockedId)) {
    getBlocks().push({ id: newId('blk'), blockerId: me, blockedId, createdAt: nowIso() });
    severRelationship(me, blockedId);
    saveDB();
  }
  res.json({ success: true, blocked: true });
});

usersRouter.post('/users/unblock', (req, res) => {
  const me = currentUserId(req);
  const blockedId = str(req.body?.blockedId, 'User', { max: 100, required: true });
  removeWhere(getBlocks(), (b) => b.blockerId === me && b.blockedId === blockedId);
  saveDB();
  res.json({ success: true, blocked: false });
});

usersRouter.get('/users/blocked', (req, res) => {
  const me = currentUserId(req);
  const list = getBlocks()
    .filter((b) => b.blockerId === me)
    .map((b) => findUserById(b.blockedId))
    .filter((u): u is User => !!u)
    .map(toPublicUser);
  res.json(list);
});

// ---------- Discovery & profiles ----------

usersRouter.get('/users/discover', (req, res) => {
  const me = currentUser(req);
  const range = rangeKm(req.query.range, 50);
  const interest = String(req.query.interest || '').toLowerCase().trim();
  const profession = String(req.query.profession || '').toLowerCase().trim();
  const gender = String(req.query.gender || '');
  const search = String(req.query.search || '').toLowerCase().trim();
  const blocked = blockedIdsFor(me.id);

  const results = getAllUsers()
    .filter((u) => u.id !== me.id && !u.isBanned && !u.isAdmin && !blocked.has(u.id))
    .map((u) => ({ ...toPublicUser(u), distanceKm: distanceBetween(me, u) }))
    .filter((u) => {
      if (u.distanceKm > range) return false;
      if (interest && !u.interests.some((i) => i.toLowerCase().includes(interest))) return false;
      if (profession && !(u.profession || '').toLowerCase().includes(profession)) return false;
      if (gender && u.gender !== gender) return false;
      if (search && !u.name.toLowerCase().includes(search) && !u.username.toLowerCase().includes(search)) return false;
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json(results);
});

// Public profile of a single user (registered after the fixed /users/* paths so :id doesn't shadow them)
usersRouter.get('/users/:id', (req, res) => {
  const viewer = currentUser(req);
  const target = findUserById(req.params.id);
  if (!target || target.isBanned || isBlockedBetween(viewer.id, target.id)) throw notFound('Profile not found.');

  const posts = getPosts()
    .filter((p) => p.userId === target.id)
    .map((p) => ({
      ...p,
      authorName: target.name,
      authorUsername: target.username,
      authorPhoto: target.profilePhoto,
      commentCount: getComments().filter((c) => c.postId === p.id).length,
      distanceKm: Number(haversineDistance(viewer.location.latitude, viewer.location.longitude, p.latitude, p.longitude).toFixed(2))
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    // Private contact fields (email, mobile, dob) are only returned for your own profile
    user: target.id === viewer.id ? target : toPublicUser(target),
    distanceKm: distanceBetween(viewer, target),
    followersCount: getFollows().filter((f) => f.followingId === target.id && f.targetType === 'user').length,
    friendsCount: getFriendRequests().filter(
      (r) => r.status === 'accepted' && (r.senderId === target.id || r.receiverId === target.id)
    ).length,
    posts
  });
});

// ---------- Reports ----------

const REPORT_TARGETS = ['post', 'comment', 'user', 'business', 'product', 'story'] as const;

function reportTargetExists(type: Report['targetType'], id: string): boolean {
  switch (type) {
    case 'post':
      return getPosts().some((p) => p.id === id);
    case 'comment':
      return getComments().some((c) => c.id === id);
    case 'user':
      return !!findUserById(id);
    case 'business':
      return getBusinesses().some((b) => b.id === id);
    case 'product':
      return getProducts().some((p) => p.id === id);
    case 'story':
      return getStories().some((s) => s.id === id);
  }
}

usersRouter.post('/reports', (req, res) => {
  const reporterId = currentUserId(req);
  const targetType = oneOf(req.body?.targetType, 'Target type', REPORT_TARGETS);
  const targetId = str(req.body?.targetId, 'Target', { max: 150, required: true });
  const reason = str(req.body?.reason, 'Reason', { min: 3, max: 500 });
  if (!reportTargetExists(targetType, targetId)) throw notFound('The reported content no longer exists.');

  const duplicate = getReports().find(
    (r) => r.reporterId === reporterId && r.targetId === targetId && r.status === 'pending'
  );
  if (duplicate) {
    res.json({ success: true, report: duplicate });
    return;
  }

  const report: Report = { id: newId('rep'), reporterId, targetId, targetType, reason, status: 'pending', createdAt: nowIso() };
  getReports().push(report);
  saveDB();
  res.json({ success: true, report });
});
