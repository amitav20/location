/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { Comment, Post } from '../../types';
import { deletePostCascade, findUserById, getComments, getPosts, haversineDistance, removeWhere, saveDB } from '../db';
import {
  arrayOf,
  badRequest,
  blockedIdsFor,
  currentUser,
  currentUserId,
  DEFAULT_AVATAR,
  forbidden,
  mediaUrl,
  newId,
  notFound,
  notify,
  nowIso,
  oneOf,
  rangeKm,
  str
} from '../http';

export const postsRouter = express.Router();

const POST_TYPES = ['text', 'image', 'video', 'poll', 'shared'] as const;

function findPost(id: string): Post {
  const post = getPosts().find((p) => p.id === id);
  if (!post) throw notFound('Post not found.');
  return post;
}

function withAuthor<T extends { userId: string }>(item: T) {
  const author = findUserById(item.userId);
  return {
    authorName: author?.name || 'Deleted user',
    authorUsername: author?.username || 'deleted_user',
    authorPhoto: author?.profilePhoto || DEFAULT_AVATAR
  };
}

postsRouter.post('/posts', (req, res) => {
  const creator = currentUser(req);
  const body = req.body || {};
  const type = body.type ? oneOf(body.type, 'Post type', POST_TYPES) : 'text';
  const content = str(body.content, 'Post text', { max: 2000 });
  const mediaUrls = arrayOf(body.mediaUrls, 'Media', 4, (u) => mediaUrl(u, 'Media link', true));
  const pollOptions = arrayOf(body.pollOptions, 'Poll options', 6, (o) => str(o, 'Poll option', { max: 100, required: true }));
  const sharedPostId = body.sharedPostId ? str(body.sharedPostId, 'Shared post', { max: 100 }) : undefined;

  if ((type === 'image' || type === 'video') && mediaUrls.length === 0) throw badRequest(`Please add a ${type} link or upload.`);
  if (type === 'poll' && pollOptions.length < 2) throw badRequest('A poll needs at least 2 options.');
  if (type === 'poll' && !content) throw badRequest('Please write a question for your poll.');
  if (sharedPostId) findPost(sharedPostId);
  if (!content && mediaUrls.length === 0 && !sharedPostId) throw badRequest('Your post is empty.');

  const newPost: Post = {
    id: newId('post'),
    userId: creator.id,
    type,
    content,
    mediaUrls: type === 'image' || type === 'video' ? mediaUrls : [],
    pollOptions: type === 'poll' ? pollOptions.map((text, i) => ({ id: `opt_${i}`, text, votes: [] })) : undefined,
    sharedPostId,
    latitude: creator.location.latitude,
    longitude: creator.location.longitude,
    city: creator.location.city,
    country: creator.location.country,
    likes: [],
    loves: [],
    createdAt: nowIso()
  };

  getPosts().push(newPost);
  saveDB();
  res.status(201).json(newPost);
});

// Location feed with Haversine distances
postsRouter.get('/posts/feed', (req, res) => {
  const user = currentUser(req);
  const range = rangeKm(req.query.range, 25);
  const blocked = blockedIdsFor(user.id);

  const feed = getPosts()
    .filter((p) => {
      const author = findUserById(p.userId);
      return author && !author.isBanned && !blocked.has(p.userId);
    })
    .map((p) => {
      const distanceKm = Number(haversineDistance(user.location.latitude, user.location.longitude, p.latitude, p.longitude).toFixed(2));
      const original = p.sharedPostId ? getPosts().find((op) => op.id === p.sharedPostId) : undefined;
      return {
        ...p,
        ...withAuthor(p),
        distanceKm,
        commentCount: getComments().filter((c) => c.postId === p.id && !blocked.has(c.userId)).length,
        sharedPost: original && !blocked.has(original.userId) ? { ...original, ...withAuthor(original) } : undefined
      };
    })
    .filter((p) => p.distanceKm <= range)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(feed);
});

postsRouter.put('/posts/:id', (req, res) => {
  const userId = currentUserId(req);
  const post = findPost(req.params.id);
  if (post.userId !== userId) throw forbidden('You can only edit your own posts.');
  const content = str(req.body?.content, 'Post text', { max: 2000 });
  if (!content && !post.mediaUrls?.length && !post.sharedPostId) throw badRequest('Your post is empty.');
  post.content = content;
  post.editedAt = nowIso();
  saveDB();
  res.json(post);
});

postsRouter.delete('/posts/:id', (req, res) => {
  const user = currentUser(req);
  const post = findPost(req.params.id);
  if (post.userId !== user.id && !user.isAdmin) throw forbidden('You can only delete your own posts.');
  deletePostCascade(post.id);
  saveDB();
  res.json({ success: true });
});

postsRouter.post('/posts/:id/react', (req, res) => {
  const user = currentUser(req);
  const post = findPost(req.params.id);
  const reaction = oneOf(req.body?.reaction, 'Reaction', ['like', 'love'] as const);

  const [list, other] = reaction === 'love' ? [post.loves, post.likes] : [post.likes, post.loves];
  const idx = list.indexOf(user.id);
  if (idx !== -1) {
    list.splice(idx, 1);
  } else {
    list.push(user.id);
    removeWhere(other, (id) => id === user.id);
    notify({
      userId: post.userId,
      senderId: user.id,
      type: reaction,
      title: reaction === 'love' ? 'Love Reaction' : 'Liked Post',
      message: `${user.name} ${reaction === 'love' ? 'loved' : 'liked'} your post.`,
      link: `post:${post.id}`
    });
  }

  saveDB();
  res.json({ success: true, likes: post.likes, loves: post.loves });
});

postsRouter.post('/posts/:id/vote', (req, res) => {
  const userId = currentUserId(req);
  const post = findPost(req.params.id);
  if (!post.pollOptions) throw badRequest('This post is not a poll.');
  const selected = post.pollOptions.find((o) => o.id === req.body?.optionId);
  if (!selected) throw badRequest('That poll option does not exist.');

  post.pollOptions.forEach((opt) => removeWhere(opt.votes, (id) => id === userId));
  selected.votes.push(userId);

  saveDB();
  res.json({ success: true, pollOptions: post.pollOptions });
});

// ---------- Comments ----------

function withCommenter(c: Comment) {
  const u = findUserById(c.userId);
  return { ...c, userName: u?.name || 'Deleted user', userPhoto: u?.profilePhoto || DEFAULT_AVATAR };
}

postsRouter.get('/posts/:id/comments', (req, res) => {
  const userId = currentUserId(req);
  findPost(req.params.id);
  const blocked = blockedIdsFor(userId);
  const list = getComments()
    .filter((c) => c.postId === req.params.id && !blocked.has(c.userId))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(withCommenter);
  res.json(list);
});

postsRouter.post('/posts/:id/comments', (req, res) => {
  const user = currentUser(req);
  const post = findPost(req.params.id);
  const content = str(req.body?.content, 'Comment', { max: 1000, required: true });

  // Replies are one level deep: replying to a reply attaches to the same top-level comment
  let parentId: string | undefined;
  let parent: Comment | undefined;
  if (req.body?.parentId) {
    parent = getComments().find((c) => c.id === req.body.parentId && c.postId === post.id);
    if (!parent) throw badRequest('The comment you replied to no longer exists.');
    parentId = parent.parentId || parent.id;
  }

  const comment: Comment = { id: newId('cmt'), postId: post.id, userId: user.id, parentId, content, createdAt: nowIso() };
  getComments().push(comment);

  notify({
    userId: post.userId,
    senderId: user.id,
    type: 'comment',
    title: 'New Comment',
    message: `${user.name} commented on your post.`,
    link: `post:${post.id}`
  });
  if (parent && parent.userId !== post.userId) {
    notify({
      userId: parent.userId,
      senderId: user.id,
      type: 'comment',
      title: 'New Reply',
      message: `${user.name} replied to your comment.`,
      link: `post:${post.id}`
    });
  }

  saveDB();
  res.status(201).json(withCommenter(comment));
});

postsRouter.put('/comments/:id', (req, res) => {
  const userId = currentUserId(req);
  const comment = getComments().find((c) => c.id === req.params.id);
  if (!comment) throw notFound('Comment not found.');
  if (comment.userId !== userId) throw forbidden('You can only edit your own comments.');
  comment.content = str(req.body?.content, 'Comment', { max: 1000, required: true });
  comment.editedAt = nowIso();
  saveDB();
  res.json(withCommenter(comment));
});

// The comment's author, the post's author, or an admin can delete a comment (its replies go with it)
postsRouter.delete('/comments/:id', (req, res) => {
  const user = currentUser(req);
  const comment = getComments().find((c) => c.id === req.params.id);
  if (!comment) throw notFound('Comment not found.');
  const post = getPosts().find((p) => p.id === comment.postId);
  if (comment.userId !== user.id && post?.userId !== user.id && !user.isAdmin) {
    throw forbidden('You cannot delete this comment.');
  }
  removeWhere(getComments(), (c) => c.id === comment.id || c.parentId === comment.id);
  saveDB();
  res.json({ success: true });
});
