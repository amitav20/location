/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// One function per thing the screens need from the Laravel API (/api/v1).
// Screens import `api` from here and get back the types in src/types.ts.

import { ApiError, getData, isSignedIn, request, setSignedIn, startSession, upload } from './client';
import * as M from './mappers';
import {
  AdminStats,
  AdminUserRow,
  Business,
  BusinessCategoryItem,
  BusinessOffer,
  BusinessStats,
  Cart,
  ChatGroup,
  Comment,
  FriendsOverview,
  LocalEvent,
  MemberSummary,
  Message,
  Notification,
  OpeningHours,
  Order,
  OrderStatus,
  Page,
  Post,
  ProfileData,
  Product,
  Reaction,
  Report,
  ReportTargetType,
  Review,
  SocialRelations,
  StoryGroup,
  ThemeVibe,
  User
} from '../types';

export { ApiError, setUnauthorizedHandler } from './client';
export { localYmd, localHm } from './mappers';

export interface Place {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
}

export type MediaKind = 'image' | 'video' | 'audio';

export interface UploadResult {
  id: string;
  url: string;
  kind: MediaKind;
}

/** Fields of the shop form (register and edit). */
export interface ShopInput {
  name: string;
  categoryId: string;
  tagline: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  twitter: string;
  theme: ThemeVibe;
  openingHours: OpeningHours;
  logo: string;
  coverImage: string;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  isActive: boolean;
  image: string;
}

export interface EventInput {
  name: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  date: string;
  time: string;
  image: string;
}

const MAX_UPLOAD_BYTES = { image: 10, video: 50, audio: 10 };

// ---------- helpers ----------

/** 'global' (or nothing) means no distance limit. */
const radius = (range?: string) => (!range || range === 'global' ? 'any' : range);

function cursorNext(json: any): string | null {
  return json?.meta?.next_cursor ?? null;
}

function pageNext(json: any): string | null {
  const meta = json?.meta;
  return meta && meta.current_page < meta.last_page ? String(meta.current_page + 1) : null;
}

/**
 * Files uploaded in this session, by URL. Forms keep the URL (for the preview); the API attaches files by id.
 * Content can only use files uploaded here, never pasted links.
 */
const uploads = new Map<string, UploadResult>();

function mediaIdFor(url: string): number {
  const found = uploads.get(url);
  if (!found) throw new ApiError('Please upload the file from your device. Links to other websites can only be used for profile photos.', 422);
  return Number(found.id);
}

/** For edits: undefined = unchanged (don't send), null = removed, number = newly uploaded file. */
function changedMediaId(url: string, original: string): number | null | undefined {
  if (url === original) return undefined;
  if (!url) return null;
  return mediaIdFor(url);
}

function kindOf(file: Blob): MediaKind {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'image';
}

const pick = <T extends Record<string, any>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;

let categoriesCache: Promise<BusinessCategoryItem[]> | null = null;

// ---------- API ----------

export const api = {
  isSignedIn,

  // ---------- Auth ----------
  async getMe(): Promise<User | null> {
    try {
      const user = M.mapUser(await getData('me'));
      setSignedIn(true);
      return user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },

  async login(login: string, password: string): Promise<User> {
    await startSession();
    const data = await getData('auth/login', { method: 'POST', body: { login: login.trim(), password, remember: true } });
    setSignedIn(true);
    return M.mapUser(data.user);
  },

  async register(input: {
    name: string;
    username: string;
    email: string;
    password: string;
    phone?: string;
    dob?: string;
    gender?: string;
    avatar?: string;
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
    country?: string;
  }): Promise<User> {
    await startSession();
    const data = await getData('auth/register', {
      method: 'POST',
      body: {
        name: input.name,
        username: input.username,
        email: input.email,
        password: input.password,
        password_confirmation: input.password,
        phone: input.phone || null,
        date_of_birth: input.dob || null,
        gender: input.gender || null,
        avatar: input.avatar || null,
        latitude: input.latitude,
        longitude: input.longitude,
        city: input.city || null,
        state: input.state || null,
        country: input.country || null
      }
    });
    setSignedIn(true);
    return M.mapUser(data.user);
  },

  async logout() {
    try {
      await request('auth/logout', { method: 'POST' });
    } finally {
      setSignedIn(false);
    }
  },

  async forgotPassword(email: string): Promise<string> {
    await startSession();
    return (await request('auth/forgot-password', { method: 'POST', body: { email } }))?.message || 'Check your email for a reset link.';
  },

  async resetPassword(token: string, email: string, password: string): Promise<string> {
    await startSession();
    const res = await request('auth/reset-password', { method: 'POST', body: { token, email, password, password_confirmation: password } });
    return res?.message || 'Your password has been reset.';
  },

  changePassword(currentPassword: string, newPassword: string) {
    return request('auth/password', {
      method: 'PUT',
      body: { current_password: currentPassword, password: newPassword, password_confirmation: newPassword }
    });
  },

  // ---------- My account ----------
  async updateLocation(latitude: number, longitude: number, city?: string, state?: string, country?: string): Promise<User> {
    return M.mapUser(await getData('me/location', { method: 'PUT', body: { latitude, longitude, city: city || null, state: state || null, country: country || null } }));
  },

  /** Only the fields you pass are changed. */
  async updateProfile(changes: {
    name?: string;
    email?: string;
    mobile?: string;
    bio?: string;
    profession?: string;
    website?: string;
    interests?: string[];
    profilePhoto?: string;
    coverImage?: string;
  }): Promise<User> {
    const body = pick({
      name: changes.name,
      email: changes.email,
      phone: changes.mobile === undefined ? undefined : changes.mobile || null,
      bio: changes.bio === undefined ? undefined : changes.bio || null,
      profession: changes.profession === undefined ? undefined : changes.profession || null,
      website: changes.website === undefined ? undefined : changes.website || null,
      interests: changes.interests,
      ...photoField('avatar', changes.profilePhoto),
      ...photoField('cover', changes.coverImage)
    });
    return M.mapUser(await getData('me', { method: 'PATCH', body }));
  },

  async deleteAccount(password: string) {
    await request('me', { method: 'DELETE', body: { password } });
    setSignedIn(false);
  },

  // ---------- Place lookup ----------
  async reverseGeocode(lat: number, lng: number): Promise<Place> {
    return toPlace(await getData('geo/reverse', { query: { lat, lng } }));
  },

  async searchPlaces(query: string): Promise<Place[]> {
    return ((await getData('geo/search', { query: { q: query } })) || []).map(toPlace);
  },

  // ---------- Uploads ----------
  async uploadFile(file: Blob, filename?: string): Promise<UploadResult> {
    const kind = kindOf(file);
    if (file.size > MAX_UPLOAD_BYTES[kind] * 1024 * 1024) {
      throw new ApiError(`${kind === 'video' ? 'Videos' : kind === 'audio' ? 'Voice notes' : 'Images'} must be ${MAX_UPLOAD_BYTES[kind]} MB or smaller.`, 413);
    }
    const form = new FormData();
    const name = filename || (file instanceof File ? file.name : `${kind}.${(file.type.split('/')[1] || 'bin').split(';')[0]}`);
    form.append('file', file, name);
    if (kind === 'audio') form.append('type', 'audio');
    const media = (await upload('media', form)).data;
    const result: UploadResult = { id: String(media.id), url: media.url, kind: media.type };
    uploads.set(result.url, result);
    return result;
  },

  // ---------- People ----------
  async discoverPeople(filters: { range?: string; interest?: string; profession?: string; gender?: string; search?: string; page?: string }): Promise<Page<User>> {
    const json = await request('users', {
      query: {
        radius_km: radius(filters.range),
        interest: filters.interest,
        profession: filters.profession,
        gender: filters.gender,
        q: filters.search,
        page: filters.page,
        per_page: 24
      }
    });
    return { items: json.data.map(M.mapUser), next: pageNext(json) };
  },

  async getUserProfile(userId: string): Promise<ProfileData> {
    const [profile, posts] = await Promise.all([request(`users/${encodeURIComponent(userId)}`), request(`users/${encodeURIComponent(userId)}/posts`, { query: { per_page: 20 } })]);
    const rel = profile.meta?.relationship;
    return {
      user: M.mapUser(profile.data),
      counts: profile.meta?.counts || { posts: 0, friends: 0, followers: 0, following: 0 },
      relationship: rel
        ? {
            friendship: rel.friendship ? { id: String(rel.friendship.id), status: rel.friendship.status, direction: rel.friendship.direction } : null,
            isFriend: !!rel.is_friend,
            isFollowing: !!rel.is_following,
            followsYou: !!rel.follows_you,
            blockedByYou: !!rel.blocked_by_you
          }
        : null,
      posts: posts.data.map(M.mapPost)
    };
  },

  async getRelations(): Promise<SocialRelations> {
    return M.mapRelations(await getData('me/relations'));
  },

  async getFriends(): Promise<FriendsOverview> {
    const [friends, incoming, outgoing] = await Promise.all([
      request('me/friends', { query: { per_page: 50 } }),
      getData('me/friend-requests', { query: { direction: 'incoming' } }),
      getData('me/friend-requests', { query: { direction: 'outgoing' } })
    ]);
    const requestItem = (r: any) => ({ requestId: String(r.id), user: M.mapSummary(r.user), createdAt: r.created_at });
    return { friends: friends.data.map(M.mapUser), incoming: incoming.map(requestItem), outgoing: outgoing.map(requestItem) };
  },

  sendFriendRequest(userId: string) {
    return request(`users/${userId}/friend-request`, { method: 'POST' });
  },

  respondFriendRequest(requestId: string, answer: 'accepted' | 'declined') {
    return request(`friend-requests/${requestId}/${answer === 'accepted' ? 'accept' : 'decline'}`, { method: 'POST' });
  },

  /** Unfriend, or cancel a request you sent. */
  removeFriend(userId: string) {
    return request(`users/${userId}/friendship`, { method: 'DELETE' });
  },

  async setFollowUser(userId: string, follow: boolean): Promise<boolean> {
    return (await getData(`users/${userId}/follow`, { method: follow ? 'POST' : 'DELETE' })).following;
  },

  async setFollowBusiness(businessId: string, follow: boolean): Promise<{ following: boolean; followersCount: number }> {
    const data = await getData(`businesses/${businessId}/follow`, { method: follow ? 'POST' : 'DELETE' });
    return { following: data.following, followersCount: data.followers_count };
  },

  blockUser(userId: string) {
    return request(`users/${userId}/block`, { method: 'POST' });
  },

  unblockUser(userId: string) {
    return request(`users/${userId}/block`, { method: 'DELETE' });
  },

  async getBlockedUsers(): Promise<MemberSummary[]> {
    return (await getData('me/blocks')).map(M.mapSummary);
  },

  submitReport(type: ReportTargetType, targetId: string, reason: string) {
    return request('reports', { method: 'POST', body: { type, id: Number(targetId), reason } });
  },

  // ---------- Feed ----------
  async getFeed(range: string, cursor?: string | null): Promise<Page<Post>> {
    const json = await request('feed', { query: { radius_km: radius(range), cursor: cursor || undefined, per_page: 15 } });
    return { items: json.data.map(M.mapPost), next: cursorNext(json) };
  },

  async getPost(id: string): Promise<Post> {
    return M.mapPost(await getData(`posts/${id}`));
  },

  async createPost(input: { type: 'text' | 'image' | 'video' | 'poll' | 'shared'; content: string; mediaUrls?: string[]; pollOptions?: string[]; sharedPostId?: string }): Promise<Post> {
    const body: Record<string, unknown> = { type: input.type, body: input.content || null };
    if (input.type === 'image' || input.type === 'video') body.media_ids = (input.mediaUrls || []).map(mediaIdFor);
    if (input.type === 'poll') body.poll_options = input.pollOptions;
    if (input.type === 'shared') body.shared_post_id = Number(input.sharedPostId);
    return M.mapPost(await getData('posts', { method: 'POST', body }));
  },

  async editPost(id: string, content: string): Promise<Post> {
    return M.mapPost(await getData(`posts/${id}`, { method: 'PATCH', body: { body: content } }));
  },

  deletePost(id: string) {
    return request(`posts/${id}`, { method: 'DELETE' });
  },

  /** Sets your reaction, or removes it when `reaction` is null. Returns the updated post. */
  async setReaction(postId: string, reaction: Reaction | null): Promise<Post> {
    const data = reaction
      ? await getData(`posts/${postId}/reaction`, { method: 'PUT', body: { type: reaction } })
      : await getData(`posts/${postId}/reaction`, { method: 'DELETE' });
    return M.mapPost(data);
  },

  async votePoll(postId: string, optionId: string): Promise<Post> {
    return M.mapPost(await getData(`posts/${postId}/vote`, { method: 'PUT', body: { option_id: Number(optionId) } }));
  },

  async getComments(postId: string): Promise<Comment[]> {
    return M.mapComments(await getData(`posts/${postId}/comments`, { query: { per_page: 50 } }));
  },

  async submitComment(postId: string, content: string, parentId?: string): Promise<Comment> {
    return M.mapComment(await getData(`posts/${postId}/comments`, { method: 'POST', body: { body: content, parent_id: parentId ? Number(parentId) : null } }));
  },

  async editComment(id: string, content: string): Promise<Comment> {
    return M.mapComment(await getData(`comments/${id}`, { method: 'PATCH', body: { body: content } }));
  },

  deleteComment(id: string) {
    return request(`comments/${id}`, { method: 'DELETE' });
  },

  // ---------- Stories ----------
  async getStories(): Promise<StoryGroup[]> {
    return M.mapStoryGroups(await getData('stories'));
  },

  createStory(mediaUrl: string) {
    return request('stories', { method: 'POST', body: { media_id: mediaIdFor(mediaUrl) } });
  },

  viewStory(storyId: string) {
    return request(`stories/${storyId}/view`, { method: 'POST' });
  },

  reactToStory(storyId: string, emoji: string) {
    return request(`stories/${storyId}/reaction`, { method: 'PUT', body: { emoji } });
  },

  async getStoryViewers(storyId: string): Promise<{ user: MemberSummary; viewedAt: string; reaction: string | null }[]> {
    return (await getData(`stories/${storyId}/viewers`)).map((v: any) => ({ user: M.mapSummary(v.user), viewedAt: v.viewed_at, reaction: v.reaction }));
  },

  deleteStory(storyId: string) {
    return request(`stories/${storyId}`, { method: 'DELETE' });
  },

  // ---------- Messaging ----------
  async getThreads(): Promise<ChatGroup[]> {
    return (await getData('conversations', { query: { per_page: 50 } })).map(M.mapConversation);
  },

  /** Newest page first; `next` loads older messages. Items are returned oldest → newest for display. */
  async getMessages(threadId: string, cursor?: string | null): Promise<Page<Message>> {
    const json = await request(`conversations/${threadId}/messages`, { query: { cursor: cursor || undefined, per_page: 30 } });
    return { items: json.data.map(M.mapMessage).reverse(), next: cursorNext(json) };
  },

  async sendMessage(threadId: string, content: string, mediaUrl?: string): Promise<Message> {
    const body = { body: content || null, media_id: mediaUrl ? mediaIdFor(mediaUrl) : null };
    return M.mapMessage(await getData(`conversations/${threadId}/messages`, { method: 'POST', body }));
  },

  markThreadRead(threadId: string) {
    return request(`conversations/${threadId}/read`, { method: 'POST' });
  },

  deleteMessage(messageId: string) {
    return request(`messages/${messageId}`, { method: 'DELETE' });
  },

  async startPrivateChat(userId: string): Promise<{ id: string }> {
    return { id: String((await getData('conversations/direct', { method: 'POST', body: { user_id: Number(userId) } })).id) };
  },

  async startGroupChat(name: string, memberIds: string[]): Promise<{ id: string }> {
    const data = await getData('conversations/group', { method: 'POST', body: { name, member_ids: memberIds.map(Number) } });
    return { id: String(data.id) };
  },

  leaveGroup(threadId: string) {
    return request(`conversations/${threadId}/leave`, { method: 'POST' });
  },

  // ---------- Events ----------
  async getEvents(range: string, includePast = false): Promise<LocalEvent[]> {
    return (await getData('events', { query: { radius_km: radius(range), include_past: includePast ? 1 : undefined, per_page: 50 } })).map(M.mapEvent);
  },

  async createEvent(input: EventInput): Promise<LocalEvent> {
    return M.mapEvent(await getData('events', { method: 'POST', body: { ...eventBody(input), cover_media_id: input.image ? mediaIdFor(input.image) : null } }));
  },

  async updateEvent(id: string, input: EventInput, originalImage: string): Promise<LocalEvent> {
    const body = pick({ ...eventBody(input), cover_media_id: changedMediaId(input.image, originalImage) });
    return M.mapEvent(await getData(`events/${id}`, { method: 'PATCH', body }));
  },

  /** Cancels the event (attendees are notified). */
  cancelEvent(id: string) {
    return request(`events/${id}`, { method: 'DELETE' });
  },

  async setAttendance(id: string, going: boolean): Promise<LocalEvent> {
    return M.mapEvent(await getData(`events/${id}/attendance`, going ? { method: 'PUT', body: { status: 'going' } } : { method: 'DELETE' }));
  },

  // ---------- Businesses ----------
  getCategories(): Promise<BusinessCategoryItem[]> {
    categoriesCache ??= getData('business-categories')
      .then((list: any[]) => list.map(M.mapCategory))
      .catch((err) => {
        categoriesCache = null;
        throw err;
      });
    return categoriesCache;
  },

  async getBusinesses(filters: { range?: string; category?: string; search?: string }): Promise<Business[]> {
    const data = await getData('businesses', { query: { radius_km: radius(filters.range), category: filters.category, q: filters.search, per_page: 50 } });
    return data.map(M.mapBusiness);
  },

  async getBusiness(slug: string): Promise<Business> {
    return M.mapBusiness(await getData(`businesses/${encodeURIComponent(slug)}`));
  },

  async getMyBusinesses(): Promise<Business[]> {
    return (await getData('me/businesses')).map(M.mapBusiness);
  },

  async createBusiness(input: ShopInput): Promise<Business> {
    const body = {
      ...shopBody(input),
      logo_media_id: input.logo ? mediaIdFor(input.logo) : undefined,
      cover_media_id: input.coverImage ? mediaIdFor(input.coverImage) : undefined
    };
    return M.mapBusiness(await getData('businesses', { method: 'POST', body: pick(body) }));
  },

  async updateBusiness(id: string, input: ShopInput, original: { logo: string; coverImage: string }): Promise<Business> {
    const body = {
      ...shopBody(input),
      logo_media_id: changedMediaId(input.logo, original.logo),
      cover_media_id: changedMediaId(input.coverImage, original.coverImage)
    };
    return M.mapBusiness(await getData(`businesses/${id}`, { method: 'PATCH', body: pick(body) }));
  },

  async getShopProducts(businessId: string): Promise<Product[]> {
    return (await getData(`businesses/${businessId}/products`, { query: { per_page: 50 } })).map(M.mapProduct);
  },

  async getMarketplaceProducts(filters: { search?: string; category?: string; range?: string }): Promise<Product[]> {
    return (await getData('products', { query: { q: filters.search, category: filters.category, radius_km: radius(filters.range), per_page: 48 } })).map(M.mapProduct);
  },

  async addProduct(businessId: string, input: ProductInput): Promise<Product> {
    const body = { ...productBody(input), media_ids: input.image ? [mediaIdFor(input.image)] : [] };
    return M.mapProduct(await getData(`businesses/${businessId}/products`, { method: 'POST', body }));
  },

  async updateProduct(id: string, input: ProductInput, originalImage: string): Promise<Product> {
    const changed = changedMediaId(input.image, originalImage);
    const body = pick({ ...productBody(input), media_ids: changed === undefined ? undefined : changed === null ? [] : [changed] });
    return M.mapProduct(await getData(`products/${id}`, { method: 'PATCH', body }));
  },

  deleteProduct(id: string) {
    return request(`products/${id}`, { method: 'DELETE' });
  },

  async getOffers(businessId: string): Promise<BusinessOffer[]> {
    return (await getData(`businesses/${businessId}/offers`)).map(M.mapOffer);
  },

  async addOffer(businessId: string, input: { title: string; description: string; discountPercent: number; promoCode: string; expiresOn?: string }) {
    // Valid until the end of the chosen day (local time); one week by default
    const expires = input.expiresOn ? new Date(`${input.expiresOn}T23:59:00`) : new Date(Date.now() + 7 * 24 * 3600 * 1000);
    return M.mapOffer(
      await getData(`businesses/${businessId}/offers`, {
        method: 'POST',
        body: {
          title: input.title,
          description: input.description || null,
          discount_percent: input.discountPercent,
          promo_code: input.promoCode || null,
          expires_at: expires.toISOString()
        }
      })
    );
  },

  deleteOffer(id: string) {
    return request(`offers/${id}`, { method: 'DELETE' });
  },

  async getReviews(businessId: string): Promise<Review[]> {
    return (await getData(`businesses/${businessId}/reviews`, { query: { per_page: 50 } })).map(M.mapReview);
  },

  /** Creates your review, or updates it if you already wrote one. */
  async saveReview(businessId: string, rating: number, comment: string): Promise<{ review: Review; averageRating: number; reviewsCount: number }> {
    const json = await request(`businesses/${businessId}/reviews`, { method: 'PUT', body: { rating, body: comment || null } });
    return { review: M.mapReview(json.data), averageRating: Number(json.meta?.rating_avg) || 0, reviewsCount: Number(json.meta?.reviews_count) || 0 };
  },

  deleteMyReview(businessId: string) {
    return request(`businesses/${businessId}/reviews/mine`, { method: 'DELETE' });
  },

  async getBusinessStats(businessId: string): Promise<BusinessStats> {
    return M.mapBusinessStats(await getData(`businesses/${businessId}/dashboard`));
  },

  async getBusinessOrders(businessId: string, status?: OrderStatus): Promise<Order[]> {
    return (await getData(`businesses/${businessId}/orders`, { query: { status, per_page: 50 } })).map(M.mapOrder);
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<Order> {
    return M.mapOrder(await getData(`orders/${orderId}/status`, { method: 'PATCH', body: { status, note: note || null } }));
  },

  // ---------- Cart & orders ----------
  async getCart(promoCode?: string): Promise<Cart> {
    return M.mapCart(await getData('cart', { query: { promo_code: promoCode || undefined } }));
  },

  /** Sets a product's quantity in the bag (0 removes it). Returns the updated bag. */
  async setCartQuantity(productId: string, quantity: number, promoCode?: string): Promise<Cart> {
    if (quantity <= 0) await request(`cart/items/${productId}`, { method: 'DELETE' });
    else await request(`cart/items/${productId}`, { method: 'PUT', body: { quantity } });
    return api.getCart(promoCode);
  },

  async clearCart(): Promise<Cart> {
    return M.mapCart(await getData('cart', { method: 'DELETE' }));
  },

  async checkout(address: string, notes: string, promoCode?: string): Promise<Order[]> {
    const data = await getData('checkout', { method: 'POST', body: { delivery_address: address, notes: notes || null, promo_code: promoCode || null } });
    return data.map(M.mapOrder);
  },

  async getOrders(): Promise<Order[]> {
    return (await getData('orders', { query: { per_page: 50 } })).map(M.mapOrder);
  },

  async getOrder(id: string): Promise<Order> {
    return M.mapOrder(await getData(`orders/${id}`));
  },

  async cancelOrder(id: string, reason?: string): Promise<Order> {
    return M.mapOrder(await getData(`orders/${id}/cancel`, { method: 'POST', body: { reason: reason || null } }));
  },

  // ---------- Notifications ----------
  async getNotifications(): Promise<{ items: Notification[]; unreadCount: number }> {
    const json = await request('notifications', { query: { per_page: 30 } });
    return { items: json.data.map(M.mapNotification), unreadCount: Number(json.meta?.unread_count) || 0 };
  },

  async getUnreadCount(): Promise<number> {
    return Number((await getData('notifications/unread-count')).unread_count) || 0;
  },

  markNotificationRead(id: string) {
    return request(`notifications/${id}/read`, { method: 'POST' });
  },

  markAllNotificationsRead() {
    return request('notifications/read-all', { method: 'POST' });
  },

  dismissNotification(id: string) {
    return request(`notifications/${id}`, { method: 'DELETE' });
  },

  // ---------- Admin ----------
  async getAdminStats(): Promise<AdminStats> {
    return M.mapAdminStats(await getData('admin/stats'));
  },

  async getReports(status: 'pending' | 'resolved' | 'dismissed' = 'pending'): Promise<Report[]> {
    return (await getData('admin/reports', { query: { status, per_page: 50 } })).map(M.mapReport);
  },

  resolveReport(id: string, action: 'remove_content' | 'ban_user' | 'dismiss') {
    return request(`admin/reports/${id}/resolve`, { method: 'POST', body: { action } });
  },

  async getAdminUsers(filters: { search?: string; banned?: boolean }): Promise<AdminUserRow[]> {
    const data = await getData('admin/users', { query: { q: filters.search, banned: filters.banned === undefined ? undefined : filters.banned ? 1 : 0, per_page: 50 } });
    return data.map(M.mapAdminUser);
  },

  banUser(id: string) {
    return request(`admin/users/${id}/ban`, { method: 'POST' });
  },

  unbanUser(id: string) {
    return request(`admin/users/${id}/ban`, { method: 'DELETE' });
  },

  async getAdminBusinesses(filters: { status?: 'pending' | 'verified'; search?: string }): Promise<Business[]> {
    return (await getData('admin/businesses', { query: { status: filters.status, q: filters.search, per_page: 50 } })).map(M.mapBusiness);
  },

  verifyBusiness(id: string) {
    return request(`admin/businesses/${id}/verify`, { method: 'POST' });
  },

  unverifyBusiness(id: string) {
    return request(`admin/businesses/${id}/verify`, { method: 'DELETE' });
  }
};

// ---------- request bodies ----------

function toPlace(p: any): Place {
  return {
    name: p.name || '',
    displayName: p.display_name || '',
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
    city: p.city || '',
    state: p.state || '',
    country: p.country || ''
  };
}

/**
 * Profile photo / cover: a file uploaded in this session is attached by id (so the server keeps it);
 * a pasted link is saved as a URL; '' removes the photo; undefined leaves it unchanged.
 */
function photoField(kind: 'avatar' | 'cover', url: string | undefined): Record<string, unknown> {
  const urlKey = kind === 'avatar' ? 'avatar' : 'cover_image';
  if (url === undefined) return {};
  if (!url) return { [urlKey]: null };
  const uploaded = uploads.get(url);
  if (uploaded) return { [`${kind}_media_id`]: Number(uploaded.id) };
  return { [urlKey]: url.startsWith('/') ? `${window.location.origin}${url}` : url };
}

function eventBody(input: EventInput) {
  return {
    title: input.name,
    description: input.description,
    location_name: input.locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    // The form has local date + time; the API stores an exact moment
    starts_at: new Date(`${input.date}T${input.time}`).toISOString()
  };
}

function shopBody(input: ShopInput) {
  return {
    business_category_id: Number(input.categoryId),
    name: input.name,
    tagline: input.tagline || null,
    description: input.description || null,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    phone: input.phone,
    email: input.email,
    website: input.website || null,
    instagram: input.instagram || null,
    twitter: input.twitter || null,
    theme: input.theme,
    opening_hours: input.openingHours
  };
}

function productBody(input: ProductInput) {
  return {
    name: input.name,
    description: input.description || null,
    price: Math.round(input.price * 100) / 100,
    category: input.category || 'General',
    stock: input.stock,
    is_active: input.isActive
  };
}
