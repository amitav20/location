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
  AdCampaign,
  Announcement,
  AnnouncementComment,
  AppConfig,
  AreaInsights,
  Booking,
  BookingSlot,
  Business,
  BusinessCategoryItem,
  BusinessOffer,
  BusinessStats,
  CannedResponse,
  Cart,
  ChatGroup,
  Comment,
  CourierDispatch,
  CourierQuote,
  CustomerRow,
  CustomerTier,
  DeliveryQuote,
  DeliveryZone,
  FinanceSummary,
  FlashSale,
  FriendsOverview,
  Fulfilment,
  KitchenTicket,
  LocalEvent,
  LoyaltyCard,
  LoyaltyProgram,
  MemberSummary,
  Message,
  ModifierGroup,
  Notification,
  OpeningHours,
  Order,
  OrderArrival,
  OrderStatus,
  Page,
  PaymentIntent,
  PaymentMethod,
  PayoutAccount,
  Post,
  ProfileData,
  Product,
  ProductVariant,
  Reaction,
  Receipt,
  Report,
  ReportTargetType,
  RetentionStats,
  Review,
  ScanResult,
  Service,
  ShopSettings,
  ShopStory,
  ShopTable,
  ShopTip,
  SocialRelations,
  Specialist,
  SponsoredItem,
  StaffInvite,
  StaffMember,
  StaffRole,
  StoryGroup,
  ThemeVibe,
  TimeSlot,
  Tracking,
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

export interface CheckoutInput {
  deliveryAddress?: string;
  notes?: string;
  promoCode?: string;
  fulfilment?: Fulfilment;
  latitude?: number;
  longitude?: number;
  contactPhone?: string;
  paymentMethod?: PaymentMethod;
  scheduledFor?: string;
  tableCode?: string;
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
  async getCart(promoOrParams?: string | { fulfilment?: Fulfilment; latitude?: number; longitude?: number; promoCode?: string }): Promise<Cart> {
    const query: Record<string, any> = {};
    if (typeof promoOrParams === 'string') {
      if (promoOrParams) query.promo_code = promoOrParams;
    } else if (promoOrParams) {
      if (promoOrParams.fulfilment) query.fulfilment = promoOrParams.fulfilment;
      if (promoOrParams.latitude !== undefined) query.latitude = promoOrParams.latitude;
      if (promoOrParams.longitude !== undefined) query.longitude = promoOrParams.longitude;
      if (promoOrParams.promoCode) query.promo_code = promoOrParams.promoCode;
    }
    return M.mapCart(await getData('cart', { query: Object.keys(query).length ? query : undefined }));
  },

  /** Sets a product's quantity in the bag (0 removes it). Returns the updated bag. */
  async setCartQuantity(productId: string, quantity: number, promoCode?: string): Promise<Cart> {
    if (quantity <= 0) await request(`cart/items/${productId}`, { method: 'DELETE' });
    else await request(`cart/items/${productId}`, { method: 'PUT', body: { quantity } });
    return api.getCart(promoCode);
  },

  async addCartItem(
    productId: string,
    quantity: number,
    options?: { variantId?: string; modifierIds?: string[] },
    promoCode?: string,
  ): Promise<Cart> {
    const body: Record<string, any> = { quantity };
    if (options?.variantId) body.variant_id = Number(options.variantId) || options.variantId;
    if (options?.modifierIds && options.modifierIds.length > 0) {
      body.modifier_ids = options.modifierIds.map(id => Number(id) || id);
    }
    await request(`cart/items/${productId}`, { method: 'PUT', body });
    return api.getCart(promoCode);
  },

  async updateCartLine(lineId: string, quantity: number, promoCode?: string): Promise<Cart> {
    if (quantity <= 0) {
      await request(`cart/lines/${lineId}`, { method: 'DELETE' });
    } else {
      await request(`cart/lines/${lineId}`, { method: 'PATCH', body: { quantity } });
    }
    return api.getCart(promoCode);
  },

  async removeCartLine(lineId: string, promoCode?: string): Promise<Cart> {
    await request(`cart/lines/${lineId}`, { method: 'DELETE' });
    return api.getCart(promoCode);
  },

  async clearCart(): Promise<Cart> {
    return M.mapCart(await getData('cart', { method: 'DELETE' }));
  },

  async checkout(address: string, notes?: string, promoCode?: string): Promise<Order[]>;
  async checkout(input: CheckoutInput): Promise<{ orders: Order[]; payment?: PaymentIntent | null }>;
  async checkout(
    inputOrAddress: string | CheckoutInput,
    notes?: string,
    promoCode?: string,
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (typeof inputOrAddress === 'string') {
      body = {
        delivery_address: inputOrAddress,
        notes: notes || null,
        promo_code: promoCode || null,
      };
    } else {
      body = {
        delivery_address: inputOrAddress.deliveryAddress || null,
        notes: inputOrAddress.notes || null,
        promo_code: inputOrAddress.promoCode || null,
        fulfilment: inputOrAddress.fulfilment || 'delivery',
        latitude: inputOrAddress.latitude ?? null,
        longitude: inputOrAddress.longitude ?? null,
        contact_phone: inputOrAddress.contactPhone || null,
        payment_method: inputOrAddress.paymentMethod || 'cash',
        scheduled_for: inputOrAddress.scheduledFor || null,
        table_code: inputOrAddress.tableCode || null,
      };
    }
    const json = await request('checkout', { method: 'POST', body });
    const orders = Array.isArray(json.data) ? json.data.map(M.mapOrder) : (json.data ? [M.mapOrder(json.data)] : []);
    const payment = json.meta?.payment ? (json.meta.payment as PaymentIntent) : null;
    if (typeof inputOrAddress === 'string') {
      return orders;
    }
    return { orders, payment };
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
  },

  // ---------- App Config ----------
  async getAppConfig(): Promise<AppConfig> {
    return M.mapAppConfig(await getData('app-config'));
  },

  // ---------- Staff ----------
  async getShopStaff(businessId: string): Promise<{
    owner: StaffMember | null;
    staff: StaffMember[];
    pendingInvites: StaffInvite[];
    roleDescriptions: Record<string, string>;
  }> {
    const data = await getData(`businesses/${businessId}/staff`);
    return {
      owner: data.owner ? M.mapStaffMember(data.owner) : null,
      staff: Array.isArray(data.staff) ? data.staff.map(M.mapStaffMember) : [],
      pendingInvites: Array.isArray(data.pending_invites) ? data.pending_invites.map(M.mapStaffInvite) : [],
      roleDescriptions: data.role_descriptions || {},
    };
  },

  async inviteStaff(
    businessId: string,
    input: { role: StaffRole; email?: string; phone?: string },
  ): Promise<{ inviteUrl: string; inviteToken: string; staffInvite: StaffInvite }> {
    const res = await request(`businesses/${businessId}/staff`, {
      method: 'POST',
      body: {
        role: input.role,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
      },
    });
    return {
      inviteUrl: res.invite_url || '',
      inviteToken: res.invite_token || '',
      staffInvite: M.mapStaffInvite(res.data),
    };
  },

  async updateStaffRole(businessId: string, staffId: string, role: StaffRole): Promise<StaffMember> {
    return M.mapStaffMember(
      await getData(`businesses/${businessId}/staff/${staffId}`, {
        method: 'PATCH',
        body: { role },
      }),
    );
  },

  async removeStaff(businessId: string, staffId: string): Promise<void> {
    await request(`businesses/${businessId}/staff/${staffId}`, { method: 'DELETE' });
  },

  async getMyStaffInvites(): Promise<StaffInvite[]> {
    return (await getData('me/staff-invites')).map(M.mapStaffInvite);
  },

  async acceptStaffInvite(input: { token?: string; inviteId?: string }): Promise<void> {
    await request('staff-invites/accept', {
      method: 'POST',
      body: {
        token: input.token || undefined,
        invite_id: input.inviteId ? Number(input.inviteId) : undefined,
      },
    });
  },

  async leaveShopStaff(businessId: string): Promise<void> {
    await request(`businesses/${businessId}/staff/leave`, { method: 'POST' });
  },

  // ---------- Shop Settings & Timezone ----------
  async getShopSettings(businessId: string): Promise<ShopSettings> {
    return M.mapShopSettings(await getData(`businesses/${businessId}/settings`));
  },

  async updateShopSettings(businessId: string, settings: Partial<ShopSettings>): Promise<ShopSettings> {
    const body: Record<string, any> = {};
    if (settings.fulfilment) body.fulfilment = settings.fulfilment;
    if (settings.payments) body.payments = settings.payments;
    if (settings.taxes) body.taxes = settings.taxes;
    if (settings.taxInclusive !== undefined) body.tax_inclusive = settings.taxInclusive;
    if (settings.packagingFee !== undefined) body.packaging_fee = settings.packagingFee;
    if (settings.scheduling) {
      body.scheduling = {
        asap: settings.scheduling.asap,
        slot_minutes: settings.scheduling.slotMinutes,
        days_ahead: settings.scheduling.daysAhead,
        max_orders_per_slot: settings.scheduling.maxOrdersPerSlot,
      };
    }
    if (settings.lowStockThreshold !== undefined) body.low_stock_threshold = settings.lowStockThreshold;
    if (settings.chat) {
      body.chat = {
        away_enabled: settings.chat.awayEnabled,
        away_message: settings.chat.awayMessage,
      };
    }
    if (settings.crm) {
      body.crm = {
        win_back_enabled: settings.crm.winBackEnabled,
        win_back_days: settings.crm.winBackDays,
        win_back_discount: settings.crm.winBackDiscount,
        birthday_enabled: settings.crm.birthdayEnabled,
        birthday_discount: settings.crm.birthdayDiscount,
      };
    }
    return M.mapShopSettings(
      await getData(`businesses/${businessId}/settings`, { method: 'PATCH', body }),
    );
  },

  async updateShopTimezone(businessId: string, timezone: string): Promise<Business> {
    return M.mapBusiness(
      await getData(`businesses/${businessId}`, { method: 'PATCH', body: { timezone } }),
    );
  },

  // ---------- Catalog (Variants, Modifiers, Stock & Import/Export) ----------
  async setProductVariants(
    productId: string,
    input: {
      options: Array<{ name: string; values: string[] }>;
      variants: Array<{
        id?: string;
        options: Record<string, string>;
        price?: number;
        stock: number;
        sku?: string;
        barcode?: string;
        isActive?: boolean;
      }>;
    },
  ): Promise<Product> {
    const body = {
      options: input.options,
      variants: input.variants.map(v => ({
        id: v.id ? Number(v.id) || v.id : undefined,
        options: v.options,
        price: v.price !== undefined ? Math.round(v.price * 100) / 100 : undefined,
        stock: v.stock,
        sku: v.sku?.trim() || null,
        barcode: v.barcode?.trim() || null,
        is_active: v.isActive !== undefined ? v.isActive : true,
      })),
    };
    return M.mapProduct(await getData(`products/${productId}/variants`, { method: 'PUT', body }));
  },

  async setProductModifierGroups(
    productId: string,
    groups: Array<{
      id?: string;
      name: string;
      minSelect: number;
      maxSelect: number;
      modifiers: Array<{
        id?: string;
        name: string;
        price: number;
        isActive?: boolean;
      }>;
    }>,
  ): Promise<Product> {
    const body = {
      groups: groups.map(g => ({
        id: g.id ? Number(g.id) || g.id : undefined,
        name: g.name,
        min_select: g.minSelect,
        max_select: g.maxSelect,
        modifiers: g.modifiers.map(m => ({
          id: m.id ? Number(m.id) || m.id : undefined,
          name: m.name,
          price: Math.round(m.price * 100) / 100,
          is_active: m.isActive !== undefined ? m.isActive : true,
        })),
      })),
    };
    return M.mapProduct(await getData(`products/${productId}/modifier-groups`, { method: 'PUT', body }));
  },

  async updateProductSettings(
    productId: string,
    input: {
      barcode?: string | null;
      lowStockThreshold?: number | null;
      soldOutBehavior?: 'disable' | 'hide';
    },
  ): Promise<Product> {
    const body: Record<string, any> = {};
    if (input.barcode !== undefined) body.barcode = input.barcode ? input.barcode.trim() : null;
    if (input.lowStockThreshold !== undefined) body.low_stock_threshold = input.lowStockThreshold;
    if (input.soldOutBehavior !== undefined) body.sold_out_behavior = input.soldOutBehavior;
    return M.mapProduct(await getData(`products/${productId}`, { method: 'PATCH', body }));
  },

  async subscribeStockNotification(productId: string, variantId?: string): Promise<{ subscribed: boolean }> {
    return getData(`products/${productId}/notify-me`, {
      method: 'POST',
      body: { variant_id: variantId ? Number(variantId) || variantId : null },
    });
  },

  async unsubscribeStockNotification(productId: string): Promise<void> {
    await request(`products/${productId}/notify-me`, { method: 'DELETE' });
  },

  getProductImportTemplateUrl(businessId: string): string {
    return `businesses/${businessId}/products/import-template`;
  },

  getProductExportUrl(businessId: string): string {
    return `businesses/${businessId}/products/export`;
  },

  async bulkUpsertProducts(
    businessId: string,
    products: any[],
    commit: boolean = false,
  ): Promise<{ rowsCount: number; validCount: number; errors: Array<{ row: number; errors: string[] }> }> {
    const res = await request(`businesses/${businessId}/products/bulk`, {
      method: 'POST',
      body: { products, commit: commit ? 1 : 0 },
    });
    return {
      rowsCount: Number(res.rows_count) || 0,
      validCount: Number(res.valid_count) || 0,
      errors: Array.isArray(res.errors) ? res.errors : [],
    };
  },

  async draftProductsFromPhoto(
    businessId: string,
    mediaId: string,
  ): Promise<{ products: any[]; warnings: string[] }> {
    const res = await request(`businesses/${businessId}/products/from-photo`, {
      method: 'POST',
      body: { media_id: Number(mediaId) || mediaId },
    });
    return {
      products: res.products || [],
      warnings: res.warnings || [],
    };
  },

  // ---------- Delivery Zones, Quotes & Time Slots ----------
  async getDeliveryZones(businessId: string): Promise<DeliveryZone[]> {
    return (await getData(`businesses/${businessId}/delivery-zones`)).map(M.mapDeliveryZone);
  },

  async setDeliveryZones(businessId: string, zones: DeliveryZone[]): Promise<DeliveryZone[]> {
    const body = {
      zones: zones.map(z => ({
        name: z.name,
        type: z.type,
        min_km: z.minKm,
        max_km: z.maxKm,
        polygon: z.polygon,
        fee: Math.round(z.fee * 100) / 100,
        min_order: Math.round(z.minOrder * 100) / 100,
      })),
    };
    return (await getData(`businesses/${businessId}/delivery-zones`, { method: 'PUT', body })).map(M.mapDeliveryZone);
  },

  async getDeliveryQuote(
    businessId: string,
    params: { latitude: number; longitude: number; subtotal: number },
  ): Promise<DeliveryQuote> {
    return M.mapDeliveryQuote(
      await getData(`businesses/${businessId}/delivery-quote`, {
        query: { latitude: params.latitude, longitude: params.longitude, subtotal: params.subtotal },
      }),
    );
  },

  async getTimeSlots(businessId: string, date: string): Promise<TimeSlot[]> {
    return (await getData(`businesses/${businessId}/slots`, { query: { date } })).map(M.mapTimeSlot);
  },

  // ---------- Payments, Refunds & Finance ----------
  async getPayment(paymentId: string): Promise<PaymentIntent> {
    return getData(`payments/${paymentId}`);
  },

  async confirmPayment(paymentId: string, payload: Record<string, unknown>): Promise<PaymentIntent> {
    return getData(`payments/${paymentId}/confirm`, { method: 'POST', body: payload });
  },

  async refundOrder(
    orderId: string,
    input: {
      amount?: number;
      reason?: string;
      restock?: Array<{ itemId: string; quantity: number }>;
    },
  ): Promise<Order> {
    const body: Record<string, any> = {};
    if (input.amount !== undefined) body.amount = Math.round(input.amount * 100) / 100;
    if (input.reason) body.reason = input.reason.trim();
    if (input.restock && input.restock.length > 0) {
      body.restock = input.restock.map(r => ({ item_id: Number(r.itemId) || r.itemId, quantity: r.quantity }));
    }
    return M.mapOrder(await getData(`orders/${orderId}/refunds`, { method: 'POST', body }));
  },

  async getPayoutAccount(businessId: string): Promise<PayoutAccount | null> {
    const data = await getData(`businesses/${businessId}/payout-account`);
    return data ? M.mapPayoutAccount(data) : null;
  },

  async setPayoutAccount(
    businessId: string,
    input: {
      type: 'bank' | 'upi';
      bankName?: string;
      accountNumber?: string;
      ifsc?: string;
      accountHolder?: string;
      upiId?: string;
    },
  ): Promise<PayoutAccount> {
    const body = {
      type: input.type,
      bank_name: input.bankName || null,
      account_number: input.accountNumber || null,
      ifsc: input.ifsc || null,
      holder_name: input.accountHolder || null,
      upi_id: input.upiId || null,
    };
    return M.mapPayoutAccount(await getData(`businesses/${businessId}/payout-account`, { method: 'PUT', body: pick(body) }));
  },

  async getShopFinance(businessId: string): Promise<FinanceSummary> {
    return M.mapFinanceSummary(await getData(`businesses/${businessId}/finance`));
  },

  getShopStatementsUrl(businessId: string, month: string, format: 'csv' | 'pdf' = 'csv'): string {
    return `businesses/${businessId}/statements?month=${month}&format=${format}`;
  },

  async getAdminPayoutsDue(): Promise<any[]> {
    return getData('admin/payouts/due');
  },

  async recordAdminPayout(businessId: string, input: { amount: number; reference?: string; notes?: string }): Promise<void> {
    await request(`admin/businesses/${businessId}/payouts`, {
      method: 'POST',
      body: {
        amount: Math.round(input.amount * 100) / 100,
        reference: input.reference || null,
        notes: input.notes || null,
      },
    });
  },

  async setAdminShopCommission(businessId: string, commissionPercent: number): Promise<void> {
    await request(`admin/businesses/${businessId}/commission`, {
      method: 'PATCH',
      body: { commission_percent: commissionPercent },
    });
  },

  // ---------- Reviews & Disputes ----------
  async replyToReview(reviewId: string, body: string): Promise<Review> {
    return M.mapReview(await getData(`reviews/${reviewId}/reply`, { method: 'PUT', body: { body } }));
  },

  async deleteReviewReply(reviewId: string): Promise<void> {
    await request(`reviews/${reviewId}/reply`, { method: 'DELETE' });
  },

  async disputeReview(reviewId: string, reason: string): Promise<void> {
    await request(`reviews/${reviewId}/dispute`, { method: 'POST', body: { reason } });
  },

  async suggestReviewReply(reviewId: string, tone: 'professional' | 'warm' | 'apologetic'): Promise<string> {
    const res = await request(`reviews/${reviewId}/suggest-reply`, { method: 'POST', body: { tone } });
    return res.reply || res.suggestion || '';
  },

  // ---------- Shop Chat & Canned Responses ----------
  async openShopChat(businessId: string, orderId?: string): Promise<ChatGroup> {
    const body = orderId ? { order_id: Number(orderId) || orderId } : {};
    return M.mapChatGroup(await getData(`businesses/${businessId}/chat`, { method: 'POST', body }));
  },

  async getShopConversations(businessId: string, unreadOnly: boolean = false): Promise<ChatGroup[]> {
    const query = unreadOnly ? { unread: 1 } : undefined;
    return (await getData(`businesses/${businessId}/conversations`, { query })).map(M.mapChatGroup);
  },

  async getCannedResponses(businessId: string): Promise<CannedResponse[]> {
    return (await getData(`businesses/${businessId}/canned-responses`)).map(M.mapCannedResponse);
  },

  async createCannedResponse(businessId: string, input: { shortcut: string; title: string; content: string }): Promise<CannedResponse> {
    return M.mapCannedResponse(
      await getData(`businesses/${businessId}/canned-responses`, { method: 'POST', body: input }),
    );
  },

  async updateCannedResponse(
    businessId: string,
    responseId: string,
    input: Partial<{ shortcut: string; title: string; content: string }>,
  ): Promise<CannedResponse> {
    return M.mapCannedResponse(
      await getData(`businesses/${businessId}/canned-responses/${responseId}`, { method: 'PATCH', body: input }),
    );
  },

  async deleteCannedResponse(businessId: string, responseId: string): Promise<void> {
    await request(`businesses/${businessId}/canned-responses/${responseId}`, { method: 'DELETE' });
  },

  // ---------- Announcements & Broadcasts ----------
  async getShopAnnouncements(businessId: string): Promise<Announcement[]> {
    return (await getData(`businesses/${businessId}/announcements`)).map(M.mapAnnouncement);
  },

  async createAnnouncement(
    businessId: string,
    input: {
      type: 'news' | 'restock' | 'seasonal' | 'offer';
      body: string;
      isPriority?: boolean;
      mediaIds?: string[];
    },
  ): Promise<Announcement> {
    const payload = {
      type: input.type,
      body: input.body,
      is_priority: !!input.isPriority,
      media_ids: input.mediaIds?.map(id => Number(id) || id) || [],
    };
    return M.mapAnnouncement(await getData(`businesses/${businessId}/announcements`, { method: 'POST', body: payload }));
  },

  async getFeedAnnouncements(): Promise<Announcement[]> {
    return (await getData('announcements')).map(M.mapAnnouncement);
  },

  async deleteAnnouncement(announcementId: string): Promise<void> {
    await request(`announcements/${announcementId}`, { method: 'DELETE' });
  },

  async reactToAnnouncement(announcementId: string, reaction: string): Promise<void> {
    await request(`announcements/${announcementId}/reaction`, { method: 'PUT', body: { reaction } });
  },

  async removeAnnouncementReaction(announcementId: string): Promise<void> {
    await request(`announcements/${announcementId}/reaction`, { method: 'DELETE' });
  },

  async getAnnouncementComments(announcementId: string): Promise<AnnouncementComment[]> {
    return (await getData(`announcements/${announcementId}/comments`)).map(M.mapAnnouncementComment);
  },

  async addAnnouncementComment(announcementId: string, body: string): Promise<AnnouncementComment> {
    return M.mapAnnouncementComment(
      await getData(`announcements/${announcementId}/comments`, { method: 'POST', body: { body } }),
    );
  },

  async deleteAnnouncementComment(commentId: string): Promise<void> {
    await request(`announcement-comments/${commentId}`, { method: 'DELETE' });
  },

  async setShopFollowNotification(businessId: string, notify: boolean): Promise<void> {
    await request(`businesses/${businessId}/follow`, { method: 'PATCH', body: { notify } });
  },

  // ---------- Loyalty & Customers ----------
  async getShopLoyaltyProgram(businessId: string): Promise<LoyaltyProgram> {
    return M.mapLoyaltyProgram(await getData(`businesses/${businessId}/loyalty`));
  },

  async setShopLoyaltyProgram(businessId: string, input: Partial<LoyaltyProgram>): Promise<LoyaltyProgram> {
    const body: Record<string, any> = {};
    if (input.type) body.type = input.type;
    if (input.stampsTarget !== undefined) body.stamps_target = input.stampsTarget;
    if (input.spendThreshold !== undefined) body.spend_threshold = input.spendThreshold;
    if (input.rewardDescription !== undefined) body.reward_description = input.rewardDescription;
    if (input.rewardDiscountPercent !== undefined) body.reward_discount_percent = input.rewardDiscountPercent;
    if (input.isActive !== undefined) body.is_active = input.isActive;
    return M.mapLoyaltyProgram(await getData(`businesses/${businessId}/loyalty`, { method: 'PUT', body }));
  },

  async stampLoyaltyCard(
    businessId: string,
    input: { code: string; stamps?: number; amount?: number },
  ): Promise<LoyaltyCard> {
    return M.mapLoyaltyCard(
      await getData(`businesses/${businessId}/loyalty/stamp`, { method: 'POST', body: input }),
    );
  },

  async getMyLoyaltyCards(): Promise<LoyaltyCard[]> {
    return (await getData('me/loyalty-cards')).map(M.mapLoyaltyCard);
  },

  async getShopCustomers(
    businessId: string,
    params?: { tier?: CustomerTier; q?: string; sort?: string },
  ): Promise<{ customers: CustomerRow[]; tiers: Record<CustomerTier, number> }> {
    const res = await request(`businesses/${businessId}/customers`, { query: params });
    return {
      customers: Array.isArray(res.data) ? res.data.map(M.mapCustomerRow) : [],
      tiers: res.meta?.tiers || { new: 0, regular: 0, vip: 0, lapsed: 0 },
    };
  },

  async getShopRetentionStats(businessId: string): Promise<RetentionStats> {
    return getData(`businesses/${businessId}/retention`);
  },

  // ---------- In-Store (Tables, Scanner, Handover, Receipts & Kitchen Display) ----------
  async getShopTables(businessId: string): Promise<ShopTable[]> {
    return (await getData(`businesses/${businessId}/tables`)).map(M.mapShopTable);
  },

  async createShopTable(businessId: string, input: { label: string; type: 'table' | 'counter' }): Promise<ShopTable> {
    return M.mapShopTable(await getData(`businesses/${businessId}/tables`, { method: 'POST', body: input }));
  },

  async updateShopTable(
    businessId: string,
    tableId: string,
    input: { label?: string; type?: 'table' | 'counter'; isActive?: boolean; newCode?: boolean },
  ): Promise<ShopTable> {
    const body: Record<string, any> = {};
    if (input.label !== undefined) body.label = input.label;
    if (input.type !== undefined) body.type = input.type;
    if (input.isActive !== undefined) body.is_active = input.isActive;
    if (input.newCode) body.new_code = true;
    return M.mapShopTable(await getData(`businesses/${businessId}/tables/${tableId}`, { method: 'PATCH', body }));
  },

  async deleteShopTable(businessId: string, tableId: string): Promise<void> {
    await request(`businesses/${businessId}/tables/${tableId}`, { method: 'DELETE' });
  },

  async getTableByCode(code: string): Promise<{ table: ShopTable; business: Business }> {
    const data = await getData(`tables/${encodeURIComponent(code)}`);
    return {
      table: M.mapShopTable(data.table || data),
      business: M.mapBusiness(data.business),
    };
  },

  async scanCode(businessId: string, code: string): Promise<ScanResult> {
    return M.mapScanResult(await getData(`businesses/${businessId}/scan`, { query: { code } }));
  },

  async handoverOrder(orderId: string, code: string): Promise<Order> {
    return M.mapOrder(await getData(`orders/${orderId}/handover`, { method: 'POST', body: { code } }));
  },

  async getOrderReceipt(orderId: string): Promise<Receipt> {
    return M.mapReceipt(await getData(`orders/${orderId}/receipt`));
  },

  async getOrderPrintBytes(orderId: string, type: 'receipt' | 'kitchen', width: 32 | 42 | 48 = 32): Promise<string> {
    const res = await request(`orders/${orderId}/print`, { query: { type, width } });
    return res.bytes || res.data || '';
  },

  async shareOrderReceipt(orderId: string, channel: 'chat' | 'sms' | 'whatsapp', phone?: string): Promise<{ openUrl?: string }> {
    const res = await request(`orders/${orderId}/receipt/share`, { method: 'POST', body: { channel, phone: phone || null } });
    return { openUrl: res.open_url || res.url };
  },

  async getKitchenTickets(businessId: string): Promise<KitchenTicket[]> {
    return (await getData(`businesses/${businessId}/kitchen`)).map(M.mapKitchenTicket);
  },

  async updateKitchenTicket(orderId: string, action: 'start' | 'ready'): Promise<KitchenTicket> {
    return M.mapKitchenTicket(await getData(`orders/${orderId}/kitchen`, { method: 'POST', body: { action } }));
  },

  // ---------- Delivery & Drivers ----------
  async getShopDrivers(businessId: string): Promise<StaffMember[]> {
    return (await getData(`businesses/${businessId}/drivers`)).map(M.mapStaffMember);
  },

  async assignOrderDriver(orderId: string, driverId: string | null): Promise<Order> {
    return M.mapOrder(
      await getData(`orders/${orderId}/assign`, {
        method: 'POST',
        body: { driver_id: driverId ? Number(driverId) || driverId : null },
      }),
    );
  },

  async getMyDeliveries(done: boolean = false): Promise<Order[]> {
    return (await getData('me/deliveries', { query: { done: done ? 1 : 0 } })).map(M.mapOrder);
  },

  async markOrderOutForDelivery(orderId: string): Promise<Order> {
    return M.mapOrder(await getData(`orders/${orderId}/out-for-delivery`, { method: 'POST' }));
  },

  async updateDeliveryLocation(
    orderId: string,
    coords: { latitude: number; longitude: number; speedKmh?: number },
  ): Promise<{ etaMinutes: number | null }> {
    const res = await request(`orders/${orderId}/location`, {
      method: 'PUT',
      body: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        speed_kmh: coords.speedKmh !== undefined ? coords.speedKmh : null,
      },
    });
    return { etaMinutes: res.eta_minutes !== undefined ? Number(res.eta_minutes) : null };
  },

  async completeDelivery(
    orderId: string,
    proof: { type: 'otp' | 'photo' | 'signature'; code?: string; mediaId?: string; receivedBy?: string },
  ): Promise<Order> {
    const body: Record<string, any> = {
      proof: proof.type,
      received_by: proof.receivedBy || null,
    };
    if (proof.type === 'otp') body.code = proof.code;
    if (proof.type === 'photo' || proof.type === 'signature') body.media_id = Number(proof.mediaId) || proof.mediaId;
    return M.mapOrder(await getData(`orders/${orderId}/deliver`, { method: 'POST', body }));
  },

  async getOrderTracking(orderId: string): Promise<Tracking> {
    return M.mapTracking(await getData(`orders/${orderId}/tracking`));
  },

  async reportCustomerArrival(
    orderId: string,
    input: {
      status: 'on_my_way' | 'arrived';
      latitude?: number;
      longitude?: number;
      vehicle?: { color: string; model: string; plate: string };
    },
  ): Promise<void> {
    await request(`orders/${orderId}/arrival`, {
      method: 'POST',
      body: {
        status: input.status,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        vehicle: input.vehicle || null,
      },
    });
  },

  async getShopCustomerArrivals(businessId: string): Promise<OrderArrival[]> {
    return (await getData(`businesses/${businessId}/arrivals`)).map((a: any) => ({
      status: a.status,
      etaAt: a.eta_at,
      arrivedAt: a.arrived_at,
      vehicle: a.vehicle,
    }));
  },

  async getCourierQuote(orderId: string): Promise<CourierQuote> {
    return M.mapCourierQuote(await getData(`orders/${orderId}/courier-quote`));
  },

  async bookCourier(orderId: string): Promise<CourierDispatch> {
    return M.mapCourierDispatch(await getData(`orders/${orderId}/courier`, { method: 'POST' }));
  },

  async cancelCourier(orderId: string): Promise<void> {
    await request(`orders/${orderId}/courier`, { method: 'DELETE' });
  },

  // ---------- Marketing (Flash Sales, Stories, Campaigns & Insights) ----------
  async createFlashSale(
    businessId: string,
    input: {
      title: string;
      discountPercent: number;
      radiusM: 500 | 1000 | 2000 | 5000;
      durationMinutes?: number;
      endsAt?: string;
      maxClaims?: number;
    },
  ): Promise<FlashSale> {
    const body = {
      title: input.title,
      discount_percent: input.discountPercent,
      radius_m: input.radiusM,
      duration_minutes: input.durationMinutes || null,
      ends_at: input.endsAt || null,
      max_claims: input.maxClaims || null,
    };
    return M.mapFlashSale(await getData(`businesses/${businessId}/flash-sales`, { method: 'POST', body: pick(body) }));
  },

  async getNearbyFlashSales(coords?: { latitude: number; longitude: number }): Promise<FlashSale[]> {
    const query = coords ? { latitude: coords.latitude, longitude: coords.longitude } : undefined;
    return (await getData('flash-sales/nearby', { query })).map(M.mapFlashSale);
  },

  async claimOffer(offerId: string): Promise<{ success: boolean; promoCode: string }> {
    const res = await request(`offers/${offerId}/claim`, { method: 'POST' });
    return { success: true, promoCode: res.promo_code || '' };
  },

  async updateNearbyOfferAlerts(enabled: boolean): Promise<void> {
    await request('me', { method: 'PATCH', body: { nearby_offer_alerts: enabled } });
  },

  async createShopStory(
    businessId: string,
    input: {
      mediaId: string;
      tags?: Array<{ productId: string; x: number; y: number }>;
      highlightTitle?: string;
    },
  ): Promise<ShopStory> {
    const body = {
      media_id: Number(input.mediaId) || input.mediaId,
      tags: input.tags?.map(t => ({ product_id: Number(t.productId) || t.productId, x: t.x, y: t.y })),
      highlight_title: input.highlightTitle || null,
    };
    return M.mapShopStory(await getData(`businesses/${businessId}/stories`, { method: 'POST', body: pick(body) }));
  },

  async getShopStories(businessId: string): Promise<ShopStory[]> {
    return (await getData(`businesses/${businessId}/stories`)).map(M.mapShopStory);
  },

  async getShopHighlights(businessId: string): Promise<ShopStory[]> {
    return (await getData(`businesses/${businessId}/highlights`)).map(M.mapShopStory);
  },

  async setStoryHighlight(storyId: string, title: string | null): Promise<void> {
    if (title) {
      await request(`stories/${storyId}/highlight`, { method: 'PUT', body: { title } });
    } else {
      await request(`stories/${storyId}/highlight`, { method: 'DELETE' });
    }
  },

  async getShopCampaigns(businessId: string): Promise<AdCampaign[]> {
    return (await getData(`businesses/${businessId}/campaigns`)).map(M.mapAdCampaign);
  },

  async createShopCampaign(
    businessId: string,
    input: {
      placement: 'pin' | 'feed' | 'both';
      radiusKm: number;
      dailyBudget: number;
      days: number;
    },
  ): Promise<{ campaign: AdCampaign; payment?: PaymentIntent | null }> {
    const body = {
      placement: input.placement,
      radius_km: input.radiusKm,
      daily_budget: Math.round(input.dailyBudget * 100) / 100,
      days: input.days,
    };
    const res = await request(`businesses/${businessId}/campaigns`, { method: 'POST', body });
    return {
      campaign: M.mapAdCampaign(res.data),
      payment: res.meta?.payment || null,
    };
  },

  async updateCampaignStatus(campaignId: string, status: 'active' | 'paused'): Promise<AdCampaign> {
    return M.mapAdCampaign(await getData(`campaigns/${campaignId}`, { method: 'PATCH', body: { status } }));
  },

  async getSponsoredItems(placement: 'feed' | 'pin', coords?: { latitude: number; longitude: number }): Promise<SponsoredItem[]> {
    const query: Record<string, any> = { placement };
    if (coords) {
      query.latitude = coords.latitude;
      query.longitude = coords.longitude;
    }
    const data = await getData('sponsored', { query });
    return Array.isArray(data)
      ? data.map((it: any) => ({
          campaignId: String(it.campaign_id ?? it.id),
          placement: it.placement,
          business: M.mapBusiness(it.business),
          adTitle: it.title,
          adDescription: it.description,
        }))
      : [];
  },

  async recordAdClick(campaignId: string): Promise<void> {
    await request(`ads/${campaignId}/click`, { method: 'POST' });
  },

  async activateAdminCampaign(campaignId: string): Promise<void> {
    await request(`admin/campaigns/${campaignId}/activate`, { method: 'POST' });
  },

  async getAreaInsights(businessId: string, params?: { days?: number; radiusKm?: number }): Promise<AreaInsights> {
    return M.mapAreaInsights(
      await getData(`businesses/${businessId}/insights/area`, {
        query: { days: params?.days || 30, radius_km: params?.radiusKm || 2 },
      }),
    );
  },

  async getShopTips(businessId: string): Promise<ShopTip[]> {
    return (await getData(`businesses/${businessId}/insights`)).map(M.mapShopTip);
  },

  async dismissShopTip(tipId: string): Promise<void> {
    await request(`insights/${tipId}/dismiss`, { method: 'POST' });
  },

  // ---------- Bookings ----------
  async getShopServices(businessId: string): Promise<Service[]> {
    return (await getData(`businesses/${businessId}/services`)).map(M.mapService);
  },

  async createShopService(businessId: string, input: Partial<Service>): Promise<Service> {
    const body = {
      name: input.name,
      duration_minutes: input.durationMinutes,
      buffer_minutes: input.bufferMinutes || 0,
      price: input.price !== undefined ? Math.round(input.price * 100) / 100 : 0,
      deposit_type: input.depositType || 'none',
      deposit_value: input.depositValue || 0,
      cancel_hours: input.cancelHours || 24,
      late_cancel_refund_percent: input.lateCancelRefundPercent || 0,
      specialist_ids: input.specialists?.map(s => Number(s.id) || s.id) || [],
    };
    return M.mapService(await getData(`businesses/${businessId}/services`, { method: 'POST', body: pick(body) }));
  },

  async updateShopService(serviceId: string, input: Partial<Service>): Promise<Service> {
    const body: Record<string, any> = {};
    if (input.name) body.name = input.name;
    if (input.durationMinutes !== undefined) body.duration_minutes = input.durationMinutes;
    if (input.bufferMinutes !== undefined) body.buffer_minutes = input.bufferMinutes;
    if (input.price !== undefined) body.price = Math.round(input.price * 100) / 100;
    if (input.depositType) body.deposit_type = input.depositType;
    if (input.depositValue !== undefined) body.deposit_value = input.depositValue;
    if (input.cancelHours !== undefined) body.cancel_hours = input.cancelHours;
    if (input.lateCancelRefundPercent !== undefined) body.late_cancel_refund_percent = input.lateCancelRefundPercent;
    if (input.specialists) body.specialist_ids = input.specialists.map(s => Number(s.id) || s.id);
    return M.mapService(await getData(`services/${serviceId}`, { method: 'PATCH', body }));
  },

  async deleteShopService(serviceId: string): Promise<void> {
    await request(`services/${serviceId}`, { method: 'DELETE' });
  },

  async getShopSpecialists(businessId: string): Promise<Specialist[]> {
    return (await getData(`businesses/${businessId}/specialists`)).map(M.mapSpecialist);
  },

  async createShopSpecialist(businessId: string, input: Partial<Specialist>): Promise<Specialist> {
    const body = {
      name: input.name,
      title: input.title || null,
      user_id: input.userId ? Number(input.userId) || input.userId : null,
      avatar_media_id: input.avatar ? Number(input.avatar) || undefined : undefined,
      working_hours: input.workingHours || null,
    };
    return M.mapSpecialist(await getData(`businesses/${businessId}/specialists`, { method: 'POST', body: pick(body) }));
  },

  async updateShopSpecialist(specialistId: string, input: Partial<Specialist>): Promise<Specialist> {
    const body: Record<string, any> = {};
    if (input.name) body.name = input.name;
    if (input.title !== undefined) body.title = input.title;
    if (input.userId !== undefined) body.user_id = input.userId ? Number(input.userId) || input.userId : null;
    if (input.workingHours !== undefined) body.working_hours = input.workingHours;
    return M.mapSpecialist(await getData(`specialists/${specialistId}`, { method: 'PATCH', body }));
  },

  async deleteShopSpecialist(specialistId: string): Promise<void> {
    await request(`specialists/${specialistId}`, { method: 'DELETE' });
  },

  async addSpecialistTimeOff(
    specialistId: string,
    input: { startsAt: string; endsAt: string; reason?: string },
  ): Promise<void> {
    await request(`specialists/${specialistId}/time-off`, {
      method: 'POST',
      body: {
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        reason: input.reason || null,
      },
    });
  },

  async deleteSpecialistTimeOff(specialistId: string, timeOffId: string): Promise<void> {
    await request(`specialists/${specialistId}/time-off/${timeOffId}`, { method: 'DELETE' });
  },

  async getServiceAvailability(serviceId: string, date: string, specialistId?: string): Promise<BookingSlot[]> {
    const query: Record<string, any> = { date };
    if (specialistId) query.specialist_id = specialistId;
    return (await getData(`services/${serviceId}/availability`, { query })).map(M.mapBookingSlot);
  },

  async createBooking(input: {
    serviceId: string;
    startsAt: string;
    specialistId?: string;
    notes?: string;
  }): Promise<{ booking: Booking; payment?: PaymentIntent | null }> {
    const body = {
      service_id: Number(input.serviceId) || input.serviceId,
      starts_at: input.startsAt,
      specialist_id: input.specialistId ? Number(input.specialistId) || input.specialistId : null,
      notes: input.notes || null,
    };
    const res = await request('bookings', { method: 'POST', body });
    return {
      booking: M.mapBooking(res.data),
      payment: res.meta?.payment || null,
    };
  },

  async getMyBookings(upcoming: boolean = true): Promise<Booking[]> {
    return (await getData('me/bookings', { query: { upcoming: upcoming ? 1 : 0 } })).map(M.mapBooking);
  },

  async getBooking(bookingId: string): Promise<Booking> {
    return M.mapBooking(await getData(`bookings/${bookingId}`));
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
    return M.mapBooking(await getData(`bookings/${bookingId}/cancel`, { method: 'POST', body: { reason: reason || null } }));
  },

  async rescheduleBooking(bookingId: string, startsAt: string): Promise<Booking> {
    return M.mapBooking(await getData(`bookings/${bookingId}/reschedule`, { method: 'POST', body: { starts_at: startsAt } }));
  },

  async getShopBookings(businessId: string, date: string): Promise<Booking[]> {
    return (await getData(`businesses/${businessId}/bookings`, { query: { date } })).map(M.mapBooking);
  },

  async updateBookingStatus(bookingId: string, status: 'completed' | 'no_show'): Promise<Booking> {
    return M.mapBooking(await getData(`bookings/${bookingId}/status`, { method: 'PATCH', body: { status } }));
  },

  // ---------- Analytics ----------
  async getShopAnalytics(
    businessId: string,
    params?: { from?: string; to?: string; compare?: 'previous' | 'year' | 'none' },
  ): Promise<Analytics> {
    return M.mapAnalytics(await getData(`businesses/${businessId}/analytics`, { query: params }));
  },
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
