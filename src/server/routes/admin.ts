/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { Report } from '../../types';
import {
  deleteBusinessCascade,
  deletePostCascade,
  findUserById,
  getAllUsers,
  getBusinesses,
  getComments,
  getPosts,
  getProducts,
  getReports,
  getSessions,
  getStories,
  removeWhere,
  saveDB
} from '../db';
import { badRequest, notFound, notify, requireAdmin } from '../http';

export const adminRouter = express.Router();

const excerpt = (text: string, max = 140) => (text.length > max ? `${text.slice(0, max)}…` : text);

// What the reported thing is, so moderators can judge without hunting for it
function describeTarget(r: Report): { targetName?: string; targetPreview?: string; targetExists: boolean } {
  switch (r.targetType) {
    case 'post': {
      const post = getPosts().find((p) => p.id === r.targetId);
      const author = post && findUserById(post.userId);
      return post
        ? { targetName: `Post by ${author?.name || 'deleted user'}`, targetPreview: excerpt(post.content || '(media only)'), targetExists: true }
        : { targetExists: false };
    }
    case 'comment': {
      const comment = getComments().find((c) => c.id === r.targetId);
      const author = comment && findUserById(comment.userId);
      return comment
        ? { targetName: `Comment by ${author?.name || 'deleted user'}`, targetPreview: excerpt(comment.content), targetExists: true }
        : { targetExists: false };
    }
    case 'user': {
      const user = findUserById(r.targetId);
      return user
        ? { targetName: `${user.name} (@${user.username})`, targetPreview: excerpt(user.bio || ''), targetExists: true }
        : { targetExists: false };
    }
    case 'business': {
      const biz = getBusinesses().find((b) => b.id === r.targetId);
      return biz ? { targetName: biz.name, targetPreview: excerpt(biz.description), targetExists: true } : { targetExists: false };
    }
    case 'product': {
      const product = getProducts().find((p) => p.id === r.targetId);
      return product
        ? { targetName: product.name, targetPreview: excerpt(product.description), targetExists: true }
        : { targetExists: false };
    }
    case 'story': {
      const story = getStories().find((s) => s.id === r.targetId);
      const author = story && findUserById(story.userId);
      return story ? { targetName: `Story by ${author?.name || 'deleted user'}`, targetPreview: story.mediaUrl, targetExists: true } : { targetExists: false };
    }
  }
}

adminRouter.get('/admin/metrics', (req, res) => {
  requireAdmin(req);
  const users = getAllUsers();
  const businesses = getBusinesses();
  const reports = getReports();

  res.json({
    metrics: {
      activeUsers: users.filter((u) => !u.isBanned).length,
      bannedCount: users.filter((u) => u.isBanned).length,
      verifiedBiz: businesses.filter((b) => b.isVerified).length,
      unverifiedBiz: businesses.filter((b) => !b.isVerified).length,
      totalPosts: getPosts().length,
      pendingReports: reports.filter((r) => r.status === 'pending').length
    },
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      isBanned: !!u.isBanned,
      isAdmin: !!u.isAdmin
    })),
    businesses: businesses.map((b) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      isVerified: !!b.isVerified,
      ownerName: findUserById(b.ownerId)?.name || 'Unknown'
    })),
    reports: reports
      .map((r) => ({ ...r, reporterName: findUserById(r.reporterId)?.name || 'Deleted user', ...describeTarget(r) }))
      .sort((a, b) => Number(a.status === 'resolved') - Number(b.status === 'resolved') || b.createdAt.localeCompare(a.createdAt))
  });
});

adminRouter.post('/admin/users/:id/ban', (req, res) => {
  const admin = requireAdmin(req);
  const target = findUserById(req.params.id);
  if (!target) throw notFound('User not found.');
  if (target.id === admin.id) throw badRequest('You cannot ban yourself.');
  if (target.isAdmin) throw badRequest('Administrators cannot be banned.');

  target.isBanned = !target.isBanned;
  if (target.isBanned) removeWhere(getSessions(), (s) => s.userId === target.id); // sign them out everywhere
  saveDB();
  res.json({ success: true, banned: target.isBanned });
});

adminRouter.post('/admin/businesses/:id/verify', (req, res) => {
  const admin = requireAdmin(req);
  const biz = getBusinesses().find((b) => b.id === req.params.id);
  if (!biz) throw notFound('Business not found.');

  biz.isVerified = !biz.isVerified;
  notify({
    userId: biz.ownerId,
    senderId: admin.id,
    type: 'business_update',
    title: biz.isVerified ? 'Business Verified' : 'Verification Removed',
    message: biz.isVerified ? `${biz.name} is now visible to everyone.` : `${biz.name} is hidden until it is verified again.`,
    link: 'business:dashboard'
  });
  saveDB();
  res.json({ success: true, verified: biz.isVerified });
});

adminRouter.post('/admin/reports/:id/resolve', (req, res) => {
  requireAdmin(req);
  const report = getReports().find((r) => r.id === req.params.id);
  if (!report) throw notFound('Report not found.');
  report.status = 'resolved';
  saveDB();
  res.json({ success: true, report });
});

// Remove the reported content (for a user: ban them) and resolve every report about it
adminRouter.post('/admin/reports/:id/remove-content', (req, res) => {
  const admin = requireAdmin(req);
  const report = getReports().find((r) => r.id === req.params.id);
  if (!report) throw notFound('Report not found.');

  switch (report.targetType) {
    case 'post':
      deletePostCascade(report.targetId);
      break;
    case 'comment':
      removeWhere(getComments(), (c) => c.id === report.targetId || c.parentId === report.targetId);
      break;
    case 'story':
      removeWhere(getStories(), (s) => s.id === report.targetId);
      break;
    case 'product':
      removeWhere(getProducts(), (p) => p.id === report.targetId);
      break;
    case 'business':
      deleteBusinessCascade(report.targetId);
      break;
    case 'user': {
      const user = findUserById(report.targetId);
      if (user && !user.isAdmin && user.id !== admin.id) {
        user.isBanned = true;
        removeWhere(getSessions(), (s) => s.userId === user.id);
      }
      break;
    }
  }

  getReports()
    .filter((r) => r.targetId === report.targetId)
    .forEach((r) => (r.status = 'resolved'));
  saveDB();
  res.json({ success: true });
});
