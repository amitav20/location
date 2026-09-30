/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { ChatGroup, Message } from '../../types';
import { findUserById, getGroups, getMessages, getNotifications, removeWhere, saveDB } from '../db';
import {
  arrayOf,
  badRequest,
  currentUser,
  currentUserId,
  DEFAULT_AVATAR,
  forbidden,
  isBlockedBetween,
  mediaUrl,
  newId,
  nowIso,
  oneOf,
  str,
  toMemberSummary
} from '../http';

export const messagingRouter = express.Router();

const GROUP_PHOTO = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=120&h=120&fit=crop';
const MEDIA_TYPES = ['image', 'video', 'voice'] as const;

function threadFor(userId: string, threadId: string): ChatGroup {
  const group = getGroups().find((g) => g.id === threadId && g.memberIds.includes(userId));
  if (!group) throw forbidden('You are not a member of this conversation.');
  return group;
}

const chatLink = (threadId: string) => `chat:${threadId}`;

// Thread as seen by one member: 1:1 chats take the other person's name and photo
function presentThread(g: ChatGroup, userId: string) {
  const threadMsgs = getMessages().filter((m) => m.groupId === g.id);
  const last = threadMsgs[threadMsgs.length - 1];
  const otherUserId = g.isGroup ? undefined : g.memberIds.find((id) => id !== userId);
  const other = otherUserId ? findUserById(otherUserId) : undefined;

  return {
    ...g,
    name: g.isGroup ? g.name || 'Group chat' : other?.name || 'Deleted user',
    coverPhoto: g.isGroup ? g.coverPhoto || GROUP_PHOTO : other?.profilePhoto || DEFAULT_AVATAR,
    otherUserId,
    members: g.memberIds.map((id) => toMemberSummary(findUserById(id), id)),
    lastMessageContent: last ? last.content || `Sent a ${last.mediaType === 'voice' ? 'voice note' : last.mediaType || 'file'}` : 'No messages yet',
    lastMessageAt: last?.createdAt || g.lastMessageAt || nowIso(),
    unreadCount: threadMsgs.filter((m) => m.senderId !== userId && !m.readBy.includes(userId)).length
  };
}

messagingRouter.get('/messaging/threads', (req, res) => {
  const userId = currentUserId(req);
  const threads = getGroups()
    .filter((g) => g.memberIds.includes(userId))
    .map((g) => presentThread(g, userId))
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  res.json(threads);
});

messagingRouter.get('/messaging/threads/:id/messages', (req, res) => {
  const userId = currentUserId(req);
  const group = threadFor(userId, req.params.id);

  let changed = false;
  const list = getMessages()
    .filter((m) => m.groupId === group.id)
    .map((m) => {
      if (m.senderId !== userId && !m.readBy.includes(userId)) {
        m.readBy.push(userId);
        changed = true;
      }
      const sender = findUserById(m.senderId);
      return { ...m, senderName: sender?.name || 'Deleted user', senderPhoto: sender?.profilePhoto || DEFAULT_AVATAR };
    });

  // Opening the conversation also clears its message notification
  getNotifications().forEach((n) => {
    if (n.userId === userId && n.link === chatLink(group.id) && !n.isRead) {
      n.isRead = true;
      changed = true;
    }
  });

  if (changed) saveDB();
  res.json(list);
});

messagingRouter.post('/messaging/threads/:id/messages', (req, res) => {
  const user = currentUser(req);
  const group = threadFor(user.id, req.params.id);
  const content = str(req.body?.content, 'Message', { max: 2000 });
  const url = mediaUrl(req.body?.mediaUrl, 'Attachment');
  const mediaType = url ? oneOf(req.body?.mediaType || 'image', 'Attachment type', MEDIA_TYPES) : undefined;
  if (!content && !url) throw badRequest('Message is empty.');

  if (!group.isGroup) {
    const otherId = group.memberIds.find((id) => id !== user.id);
    if (otherId && isBlockedBetween(user.id, otherId)) throw forbidden('You cannot message this person.');
  }

  const msg: Message = {
    id: newId('msg'),
    groupId: group.id,
    senderId: user.id,
    content,
    mediaUrl: url || undefined,
    mediaType,
    readBy: [user.id],
    createdAt: nowIso()
  };
  getMessages().push(msg);
  group.lastMessageContent = content || `Sent a ${mediaType}`;
  group.lastMessageAt = msg.createdAt;

  // One notification per conversation: update the unread one instead of stacking a new one per message
  const preview = `${user.name}: ${content || (mediaType === 'voice' ? 'Sent a voice note' : `Sent a ${mediaType}`)}`;
  group.memberIds
    .filter((id) => id !== user.id)
    .forEach((memberId) => {
      const existing = getNotifications().find(
        (n) => n.userId === memberId && n.link === chatLink(group.id) && !n.isRead
      );
      if (existing) {
        Object.assign(existing, { senderId: user.id, message: preview, createdAt: msg.createdAt });
      } else {
        getNotifications().push({
          id: newId('notif'),
          userId: memberId,
          senderId: user.id,
          type: 'message',
          title: group.isGroup ? `Message in ${group.name}` : 'New Message',
          message: preview,
          link: chatLink(group.id),
          isRead: false,
          createdAt: msg.createdAt
        });
      }
    });

  saveDB();
  res.status(201).json({ ...msg, senderName: user.name, senderPhoto: user.profilePhoto });
});

// Open (or create) the one-to-one conversation with someone
messagingRouter.post('/messaging/start', (req, res) => {
  const userId = currentUserId(req);
  const recipientId = str(req.body?.recipientId, 'Recipient', { max: 100, required: true });
  const recipient = findUserById(recipientId);
  if (!recipient || recipient.isBanned || recipientId === userId || isBlockedBetween(userId, recipientId)) {
    throw badRequest('You cannot message this person.');
  }

  const threadId = ['one-to-one', userId, recipientId].sort().join(':');
  let group = getGroups().find((g) => g.id === threadId);
  if (!group) {
    group = { id: threadId, isGroup: false, memberIds: [userId, recipientId], lastMessageAt: nowIso() };
    getGroups().push(group);
    saveDB();
  }
  res.json(presentThread(group, userId));
});

messagingRouter.post('/messaging/group', (req, res) => {
  const userId = currentUserId(req);
  const name = str(req.body?.name, 'Group name', { max: 60, required: true });
  const memberIds = arrayOf(req.body?.memberIds, 'Members', 50, (id) => str(id, 'Member', { max: 100, required: true }));
  const members = Array.from(new Set(memberIds)).filter((id) => id !== userId);
  if (members.length === 0) throw badRequest('Pick at least one person for the group.');
  members.forEach((id) => {
    const u = findUserById(id);
    if (!u || u.isBanned || isBlockedBetween(userId, id)) throw badRequest('Some of the selected people cannot be added.');
  });

  const group: ChatGroup = {
    id: newId('group'),
    isGroup: true,
    name,
    creatorId: userId,
    memberIds: [userId, ...members],
    lastMessageContent: 'Group conversation started.',
    lastMessageAt: nowIso()
  };
  getGroups().push(group);
  saveDB();
  res.status(201).json(presentThread(group, userId));
});

messagingRouter.post('/messaging/threads/:id/leave', (req, res) => {
  const user = currentUser(req);
  const group = threadFor(user.id, req.params.id);
  if (!group.isGroup) throw badRequest('You can only leave group chats.');

  removeWhere(group.memberIds, (id) => id === user.id);
  if (group.memberIds.length === 0) {
    removeWhere(getGroups(), (g) => g.id === group.id);
    removeWhere(getMessages(), (m) => m.groupId === group.id);
  } else {
    getMessages().push({
      id: newId('msg'),
      groupId: group.id,
      senderId: user.id,
      content: `${user.name} left the group.`,
      readBy: [user.id],
      createdAt: nowIso()
    });
  }
  removeWhere(getNotifications(), (n) => n.userId === user.id && n.link === chatLink(group.id));
  saveDB();
  res.json({ success: true });
});
