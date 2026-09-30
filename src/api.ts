/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FriendsOverview, SocialRelations, User } from './types';

// API client for the Express server. Signed-in requests carry "Authorization: Bearer <session token>".
const TOKEN_KEY = 'geoconnect_session';

function readToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('geoconnect_userid'); // left over from the old header-based "login"
  } catch {
    // Storage unavailable: the session just won't survive a reload
  }
}

// App registers this so an expired/revoked session drops the user back to the sign-in screen
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T = any>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = readToken();
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Empty or non-JSON body
  }

  if (res.status === 401 && token) {
    writeToken(null);
    onUnauthorized?.();
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface Place {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
}

export interface UploadResult {
  url: string;
  kind: 'image' | 'video' | 'audio';
  mime: string;
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

const enc = encodeURIComponent;

export const api = {
  hasSession: () => !!readToken(),

  // ---------- Auth ----------
  async register(data: any) {
    const result = await request<{ user: User; token: string }>('/api/auth/register', { method: 'POST', body: data });
    writeToken(result.token);
    return result;
  },

  async login(username: string, password: string) {
    const result = await request<{ user: User; token: string }>('/api/auth/login', { method: 'POST', body: { username, password } });
    writeToken(result.token);
    return result;
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Already signed out on the server
    }
    writeToken(null);
  },

  changePassword(currentPassword: string, newPassword: string) {
    return request('/api/auth/password', { method: 'PUT', body: { currentPassword, newPassword } });
  },

  updateLocation(latitude: number, longitude: number, city?: string, state?: string, country?: string) {
    return request<{ user: User }>('/api/auth/location', { method: 'POST', body: { latitude, longitude, city, state, country } });
  },

  // ---------- Location lookup ----------
  reverseGeocode(lat: number, lng: number) {
    return request<Place>(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
  },

  searchPlaces(query: string) {
    return request<Place[]>(`/api/geo/search?q=${enc(query)}`);
  },

  // ---------- Uploads ----------
  async uploadFile(file: Blob): Promise<UploadResult> {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error('Files must be 8 MB or smaller.');
    const dataUrl = await readAsDataUrl(file);
    return request<UploadResult>('/api/uploads', { method: 'POST', body: { dataUrl } });
  },

  // ---------- Users ----------
  async getMe() {
    if (!readToken()) return null;
    return request<User>('/api/users/me');
  },

  getUserProfile(id: string) {
    return request(`/api/users/${enc(id)}`);
  },

  updateProfile(profileData: any) {
    return request<{ user: User }>('/api/users/profile', { method: 'PUT', body: profileData });
  },

  async deleteAccount(password: string) {
    await request('/api/users/me', { method: 'DELETE', body: { password } });
    writeToken(null);
  },

  getSocialRelations() {
    return request<SocialRelations>('/api/users/social-relations');
  },

  getFriends() {
    return request<FriendsOverview>('/api/users/friends');
  },

  removeFriend(userId: string) {
    return request(`/api/users/friends/${enc(userId)}`, { method: 'DELETE' });
  },

  sendFriendRequest(receiverId: string) {
    return request('/api/users/friend-request', { method: 'POST', body: { receiverId } });
  },

  respondFriendRequest(requestId: string, respond: 'accepted' | 'declined') {
    return request('/api/users/friend-respond', { method: 'POST', body: { requestId, respond } });
  },

  toggleFollow(targetId: string, targetType: 'user' | 'business') {
    return request<{ following: boolean }>('/api/users/follow', { method: 'POST', body: { targetId, targetType } });
  },

  blockUser(blockedId: string) {
    return request('/api/users/block', { method: 'POST', body: { blockedId } });
  },

  unblockUser(blockedId: string) {
    return request('/api/users/unblock', { method: 'POST', body: { blockedId } });
  },

  getBlockedUsers() {
    return request<User[]>('/api/users/blocked');
  },

  submitReport(targetId: string, targetType: string, reason: string) {
    return request('/api/reports', { method: 'POST', body: { targetId, targetType, reason } });
  },

  discoverPeople(filters: { range?: string; interest?: string; profession?: string; gender?: string; search?: string }) {
    const params = new URLSearchParams(filters as any);
    return request(`/api/users/discover?${params.toString()}`);
  },

  // ---------- Posts & comments ----------
  createPost(postData: { type: string; content: string; mediaUrls?: string[]; pollOptions?: string[]; sharedPostId?: string }) {
    return request('/api/posts', { method: 'POST', body: postData });
  },

  getFeed(range: string = '25') {
    return request(`/api/posts/feed?range=${enc(range)}`);
  },

  editPost(id: string, content: string) {
    return request(`/api/posts/${enc(id)}`, { method: 'PUT', body: { content } });
  },

  deletePost(id: string) {
    return request(`/api/posts/${enc(id)}`, { method: 'DELETE' });
  },

  togglePostReact(id: string, reaction: 'like' | 'love') {
    return request(`/api/posts/${enc(id)}/react`, { method: 'POST', body: { reaction } });
  },

  votePoll(postId: string, optionId: string) {
    return request(`/api/posts/${enc(postId)}/vote`, { method: 'POST', body: { optionId } });
  },

  getComments(postId: string) {
    return request(`/api/posts/${enc(postId)}/comments`);
  },

  submitComment(postId: string, content: string, parentId?: string) {
    return request(`/api/posts/${enc(postId)}/comments`, { method: 'POST', body: { content, parentId } });
  },

  editComment(id: string, content: string) {
    return request(`/api/comments/${enc(id)}`, { method: 'PUT', body: { content } });
  },

  deleteComment(id: string) {
    return request(`/api/comments/${enc(id)}`, { method: 'DELETE' });
  },

  // ---------- Stories ----------
  getStories() {
    return request('/api/stories');
  },

  createStory(storyData: { mediaUrl: string; mediaType: string }) {
    return request('/api/stories', { method: 'POST', body: storyData });
  },

  viewStory(storyId: string) {
    return request(`/api/stories/${enc(storyId)}/view`, { method: 'POST' });
  },

  reactToStory(storyId: string, reaction: string) {
    return request(`/api/stories/${enc(storyId)}/react`, { method: 'POST', body: { reaction } });
  },

  deleteStory(storyId: string) {
    return request(`/api/stories/${enc(storyId)}`, { method: 'DELETE' });
  },

  // ---------- Messaging ----------
  getThreads() {
    return request('/api/messaging/threads');
  },

  getMessages(threadId: string) {
    return request(`/api/messaging/threads/${enc(threadId)}/messages`);
  },

  sendMessage(threadId: string, content: string, file?: { mediaUrl: string; mediaType: string }) {
    return request(`/api/messaging/threads/${enc(threadId)}/messages`, {
      method: 'POST',
      body: { content, ...(file || {}) }
    });
  },

  startPrivateChat(recipientId: string) {
    return request<{ id: string }>('/api/messaging/start', { method: 'POST', body: { recipientId } });
  },

  startGroupChat(name: string, memberIds: string[]) {
    return request('/api/messaging/group', { method: 'POST', body: { name, memberIds } });
  },

  leaveGroup(threadId: string) {
    return request(`/api/messaging/threads/${enc(threadId)}/leave`, { method: 'POST' });
  },

  // ---------- Events ----------
  getEvents(range: string = '50', includePast = false) {
    return request(`/api/events?range=${enc(range)}${includePast ? '&includePast=1' : ''}`);
  },

  createEvent(eventData: any) {
    return request('/api/events', { method: 'POST', body: eventData });
  },

  updateEvent(id: string, eventData: any) {
    return request(`/api/events/${enc(id)}`, { method: 'PUT', body: eventData });
  },

  deleteEvent(id: string) {
    return request(`/api/events/${enc(id)}`, { method: 'DELETE' });
  },

  toggleEventJoin(id: string) {
    return request(`/api/events/${enc(id)}/join`, { method: 'POST' });
  },

  // ---------- Businesses ----------
  getBusinesses(filters: { range?: string; category?: string; search?: string }) {
    const params = new URLSearchParams(filters as any);
    return request(`/api/businesses?${params.toString()}`);
  },

  createBusiness(bizData: any) {
    return request('/api/businesses', { method: 'POST', body: bizData });
  },

  getBusinessDashboard(businessId?: string) {
    return request(`/api/businesses/dashboard${businessId ? `?businessId=${enc(businessId)}` : ''}`);
  },

  getBusinessOffers(id: string) {
    return request(`/api/businesses/${enc(id)}/offers`);
  },

  addBusinessProduct(productData: any) {
    return request('/api/businesses/products', { method: 'POST', body: productData });
  },

  updateBusiness(id: string, bizData: any) {
    return request(`/api/businesses/${enc(id)}`, { method: 'PUT', body: bizData });
  },

  updateBusinessProduct(id: string, productData: any) {
    return request(`/api/businesses/products/${enc(id)}`, { method: 'PUT', body: productData });
  },

  deleteBusinessProduct(id: string) {
    return request(`/api/businesses/products/${enc(id)}`, { method: 'DELETE' });
  },

  addBusinessOffer(offerData: any) {
    return request('/api/businesses/offers', { method: 'POST', body: offerData });
  },

  deleteBusinessOffer(id: string) {
    return request(`/api/businesses/offers/${enc(id)}`, { method: 'DELETE' });
  },

  getReviews(targetId: string) {
    return request(`/api/reviews/${enc(targetId)}`);
  },

  submitReview(targetId: string, rating: number, comment: string) {
    return request('/api/reviews', { method: 'POST', body: { targetId, rating, comment } });
  },

  // ---------- Marketplace ----------
  getMarketplaceProducts(filters: { category?: string; search?: string; range?: string }) {
    const params = new URLSearchParams(filters as any);
    return request(`/api/marketplace/products?${params.toString()}`);
  },

  validatePromo(code: string, businessId?: string) {
    const params = new URLSearchParams({ code, ...(businessId ? { businessId } : {}) });
    return request<{ code: string; discountPercent: number; businessId: string | null }>(
      `/api/marketplace/promo?${params.toString()}`
    );
  },

  checkoutCart(items: { productId: string; quantity: number }[], address: string, promoCode?: string) {
    return request('/api/marketplace/checkout', { method: 'POST', body: { items, address, promoCode } });
  },

  getOrders() {
    return request('/api/marketplace/orders');
  },

  cancelOrder(id: string) {
    return request(`/api/marketplace/orders/${enc(id)}/cancel`, { method: 'POST' });
  },

  updateOrderStatus(id: string, status: string) {
    return request(`/api/businesses/orders/${enc(id)}`, { method: 'PUT', body: { status } });
  },

  // ---------- Notifications ----------
  getNotifications() {
    return request('/api/notifications');
  },

  markAllNotificationsRead() {
    return request('/api/notifications/read-all', { method: 'POST' });
  },

  markNotificationRead(id: string) {
    return request(`/api/notifications/${enc(id)}/read`, { method: 'POST' });
  },

  dismissNotification(id: string) {
    return request(`/api/notifications/${enc(id)}`, { method: 'DELETE' });
  },

  // ---------- Admin ----------
  getAdminMetrics() {
    return request('/api/admin/metrics');
  },

  banUser(id: string) {
    return request(`/api/admin/users/${enc(id)}/ban`, { method: 'POST' });
  },

  verifyBusiness(id: string) {
    return request(`/api/admin/businesses/${enc(id)}/verify`, { method: 'POST' });
  },

  resolveReport(id: string) {
    return request(`/api/admin/reports/${enc(id)}/resolve`, { method: 'POST' });
  },

  removeReportedContent(id: string) {
    return request(`/api/admin/reports/${enc(id)}/remove-content`, { method: 'POST' });
  }
};
