/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// API Clients for interacting with the Express full-stack server
const getSessionUserId = (): string => {
  return localStorage.getItem('geoconnect_userid') || 'user_mock_1';
};

const getHeaders = (): HeadersInit => {
  return {
    'Content-Type': 'application/json',
    'x-session-userid': getSessionUserId()
  };
};

export const api = {
  // Auth API
  async register(data: any) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Registration failed');
    return res.json();
  },

  async login(username: string, password?: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
    const data = await res.json();
    localStorage.setItem('geoconnect_userid', data.user.id);
    return data;
  },

  logout() {
    localStorage.removeItem('geoconnect_userid');
    return Promise.resolve();
  },

  async updateLocation(latitude: number, longitude: number, city?: string, state?: string, country?: string) {
    const res = await fetch('/api/auth/location', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ latitude, longitude, city, state, country })
    });
    return res.json();
  },

  // Users profiles
  async getMe() {
    const res = await fetch('/api/users/me', { headers: getHeaders() });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  async updateProfile(profileData: any) {
    const res = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData)
    });
    return res.json();
  },

  // Friend / follow states
  async getSocialRelations() {
    const res = await fetch('/api/users/social-relations', { headers: getHeaders() });
    return res.json();
  },

  async sendFriendRequest(receiverId: string) {
    const res = await fetch('/api/users/friend-request', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ receiverId })
    });
    return res.json();
  },

  async respondFriendRequest(requestId: string, respond: 'accepted' | 'declined') {
    const res = await fetch('/api/users/friend-respond', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ requestId, respond })
    });
    return res.json();
  },

  async toggleFollow(targetId: string, targetType: 'user' | 'business') {
    const res = await fetch('/api/users/follow', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetId, targetType })
    });
    return res.json();
  },

  async blockUser(blockedId: string) {
    const res = await fetch('/api/users/block', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ blockedId })
    });
    return res.json();
  },

  // Submit Content Report
  async submitReport(targetId: string, targetType: string, reason: string) {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetId, targetType, reason })
    });
    return res.json();
  },

  // Social Posts
  async createPost(postData: { type: string; content: string; mediaUrls?: string[]; pollOptions?: string[]; sharedPostId?: string }) {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(postData)
    });
    return res.json();
  },

  async getFeed(range: string = '25') {
    const res = await fetch(`/api/posts/feed?range=${range}`, { headers: getHeaders() });
    return res.json();
  },

  async togglePostReact(id: string, reaction: 'like' | 'love') {
    const res = await fetch(`/api/posts/${id}/react`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reaction })
    });
    return res.json();
  },

  async votePoll(postId: string, optionId: string) {
    const res = await fetch(`/api/posts/${postId}/vote`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ optionId })
    });
    return res.json();
  },

  async getComments(postId: string) {
    const res = await fetch(`/api/posts/${postId}/comments`, { headers: getHeaders() });
    return res.json();
  },

  async submitComment(postId: string, content: string, parentId?: string) {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content, parentId })
    });
    return res.json();
  },

  // Stories
  async getStories() {
    const res = await fetch('/api/stories', { headers: getHeaders() });
    return res.json();
  },

  async createStory(storyData: { mediaUrl: string; mediaType: string }) {
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(storyData)
    });
    return res.json();
  },

  async viewStory(storyId: string) {
    const res = await fetch(`/api/stories/${storyId}/view`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Discover People
  async discoverPeople(filters: { range?: string; interest?: string; profession?: string; gender?: string; search?: string }) {
    const params = new URLSearchParams(filters as any);
    const res = await fetch(`/api/users/discover?${params.toString()}`, { headers: getHeaders() });
    return res.json();
  },

  // Messaging / Chat Threads
  async getThreads() {
    const res = await fetch('/api/messaging/threads', { headers: getHeaders() });
    return res.json();
  },

  async getMessages(threadId: string) {
    const res = await fetch(`/api/messaging/threads/${threadId}/messages`, { headers: getHeaders() });
    return res.json();
  },

  async sendMessage(threadId: string, content: string, file?: { mediaUrl: string; mediaType: string }) {
    const body: any = { content };
    if (file) {
      body.mediaUrl = file.mediaUrl;
      body.mediaType = file.mediaType;
    }
    const res = await fetch(`/api/messaging/threads/${threadId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    return res.json();
  },

  async startPrivateChat(recipientId: string) {
    const res = await fetch('/api/messaging/start', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ recipientId })
    });
    return res.json();
  },

  async startGroupChat(name: string, memberIds: string[]) {
    const res = await fetch('/api/messaging/group', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, memberIds })
    });
    return res.json();
  },

  // Local Events
  async getEvents(range: string = '50') {
    const res = await fetch(`/api/events?range=${range}`, { headers: getHeaders() });
    return res.json();
  },

  async createEvent(eventData: any) {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(eventData)
    });
    return res.json();
  },

  async toggleEventJoin(id: string) {
    const res = await fetch(`/api/events/${id}/join`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Business Directory
  async getBusinesses(filters: { range?: string; category?: string; search?: string }) {
    const params = new URLSearchParams(filters as any);
    const res = await fetch(`/api/businesses?${params.toString()}`, { headers: getHeaders() });
    return res.json();
  },

  async createBusiness(bizData: any) {
    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bizData)
    });
    return res.json();
  },

  async getBusinessDashboard() {
    const res = await fetch('/api/businesses/dashboard', { headers: getHeaders() });
    return res.json();
  },

  async getBusinessOffers(id: string) {
    const res = await fetch(`/api/businesses/${id}/offers`, { headers: getHeaders() });
    return res.json();
  },

  async addBusinessProduct(productData: any) {
    const res = await fetch('/api/businesses/products', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(productData)
    });
    return res.json();
  },

  async updateBusiness(id: string, bizData: any) {
    const res = await fetch(`/api/businesses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(bizData)
    });
    return res.json();
  },

  async updateBusinessProduct(id: string, productData: any) {
    const res = await fetch(`/api/businesses/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(productData)
    });
    return res.json();
  },

  async deleteBusinessProduct(id: string) {
    const res = await fetch(`/api/businesses/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  async addBusinessOffer(offerData: any) {
    const res = await fetch('/api/businesses/offers', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(offerData)
    });
    return res.json();
  },

  async getReviews(targetId: string) {
    const res = await fetch(`/api/reviews/${targetId}`, { headers: getHeaders() });
    return res.json();
  },

  async submitReview(targetId: string, rating: number, comment: string) {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetId, rating, comment })
    });
    return res.json();
  },

  // Marketplace
  async getMarketplaceProducts(filters: { category?: string; search?: string }) {
    const params = new URLSearchParams(filters as any);
    const res = await fetch(`/api/marketplace/products?${params.toString()}`, { headers: getHeaders() });
    return res.json();
  },

  async checkoutCart(items: { productId: string; quantity: number }[], address: string) {
    const res = await fetch('/api/marketplace/checkout', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ items, address })
    });
    return res.json();
  },

  async getOrders() {
    const res = await fetch('/api/marketplace/orders', { headers: getHeaders() });
    return res.json();
  },

  async updateOrderStatus(id: string, status: string) {
    const res = await fetch(`/api/businesses/orders/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  // Notifications
  async getNotifications() {
    const res = await fetch('/api/notifications', { headers: getHeaders() });
    return res.json();
  },

  async markAllNotificationsRead() {
    const res = await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Super Admin API
  async getAdminMetrics() {
    const res = await fetch('/api/admin/metrics', { headers: getHeaders() });
    if (!res.ok) throw new Error('Unauthorized or not an admin.');
    return res.json();
  },

  async banUser(id: string) {
    const res = await fetch(`/api/admin/users/${id}/ban`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  async verifyBusiness(id: string) {
    const res = await fetch(`/api/admin/businesses/${id}/verify`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  async resolveReport(id: string) {
    const res = await fetch(`/api/admin/reports/${id}/resolve`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  }
};
