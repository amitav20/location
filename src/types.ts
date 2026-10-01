/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// The shapes the screens work with. `src/api/mappers.ts` builds them from the Laravel API's JSON,
// so the screens never deal with snake_case or the API's paging format. IDs are strings in the UI.

export interface UserLocation {
  /** Exact for yourself; rounded to ~1 km for other people (enough for a map pin). */
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  updatedAt?: string;
}

export type Gender = 'male' | 'female' | 'other';

export interface User {
  id: string;
  name: string;
  username: string;
  /** Photo URL, or '' when the person has none (the Avatar component then shows initials). */
  profilePhoto: string;
  coverImage: string;
  bio: string;
  profession: string;
  website: string;
  gender: Gender | '';
  interests: string[];
  socialLinks: { facebook?: string; instagram?: string; twitter?: string; linkedin?: string };
  location: UserLocation;
  /** Kilometres from you (other people only). */
  distanceKm?: number;
  // Only present on your own account (and for admins)
  email?: string;
  mobile?: string;
  dob?: string;
  isAdmin: boolean;
  isBanned?: boolean;
  createdAt: string;
}

/** Small user card used in lists (comments, chat members, attendees, notifications). */
export interface MemberSummary {
  id: string;
  name: string;
  username: string;
  profilePhoto: string;
}

// ---------- Relationships ----------

/** Everything that decides which buttons to show next to a person. */
export interface SocialRelations {
  friendIds: string[];
  incoming: { requestId: string; userId: string }[];
  outgoing: { requestId: string; userId: string }[];
  followingUserIds: string[];
  followingBusinessIds: string[];
  blockedIds: string[];
}

export interface FriendRequestItem {
  requestId: string;
  user: MemberSummary;
  createdAt: string;
}

export interface FriendsOverview {
  friends: User[];
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
}

export interface ProfileData {
  user: User;
  counts: { posts: number; friends: number; followers: number; following: number };
  relationship: {
    friendship: { id: string; status: 'pending' | 'accepted'; direction: 'incoming' | 'outgoing' } | null;
    isFriend: boolean;
    isFollowing: boolean;
    followsYou: boolean;
    blockedByYou: boolean;
  } | null;
  posts: Post[];
}

// ---------- Feed ----------

export type PostType = 'text' | 'image' | 'video' | 'poll' | 'shared';
export type Reaction = 'like' | 'love';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percent: number;
}

export interface Post {
  id: string;
  userId: string;
  type: PostType;
  content: string;
  mediaUrls: string[];
  pollOptions?: PollOption[];
  totalVotes: number;
  myVoteOptionId: string | null;
  sharedPostId?: string;
  /** For reposts: the original, or null if it was deleted or you can't see it. */
  sharedPost?: Post | null;
  city: string;
  country: string;
  likesCount: number;
  lovesCount: number;
  commentCount: number;
  shareCount: number;
  myReaction: Reaction | null;
  isMine: boolean;
  createdAt: string;
  editedAt?: string;
  authorName: string;
  authorUsername: string;
  authorPhoto: string;
  distanceKm?: number;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentId?: string;
  content: string;
  isMine: boolean;
  createdAt: string;
  editedAt?: string;
  userName: string;
  userPhoto: string;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  seen: boolean;
  myReaction: string | null;
  isMine: boolean;
  viewsCount?: number;
  reactionsCount?: number;
  createdAt: string;
  expiresAt: string;
}

export interface StoryGroup {
  userId: string;
  userName: string;
  userPhoto: string;
  allSeen: boolean;
  stories: Story[];
}

// ---------- Messaging ----------

export interface Message {
  id: string;
  groupId: string;
  senderId: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'system';
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'voice';
  isMine: boolean;
  createdAt: string;
  senderName: string;
  senderPhoto: string;
}

export interface ChatGroup {
  id: string;
  isGroup: boolean;
  name: string;
  coverPhoto: string;
  members: MemberSummary[];
  memberIds: string[];
  myRole?: 'admin' | 'member';
  otherUserId?: string;
  lastMessageContent: string;
  lastMessageAt?: string;
  unreadCount: number;
}

// ---------- Events ----------

export interface LocalEvent {
  id: string;
  creatorId: string;
  creatorName: string;
  name: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  endsAt?: string;
  /** Local date (YYYY-MM-DD) and time (HH:MM) of startsAt, for forms and display */
  date: string;
  time: string;
  image: string;
  attendeesCount: number;
  participantsInfo: MemberSummary[];
  myStatus: 'going' | 'interested' | null;
  isOrganizer: boolean;
  isCancelled: boolean;
  isPast: boolean;
  distanceKm?: number;
  createdAt: string;
}

// ---------- Businesses ----------

export interface BusinessCategoryItem {
  id: string;
  name: string;
  slug: string;
}

/** Opening hours per day: a list of [from, to] times; an empty list means closed. */
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type OpeningHours = Partial<Record<DayKey, [string, string][]>>;

export type ThemeVibe = 'minimal' | 'vintage' | 'neon' | 'organic';

export interface Business {
  id: string;
  slug: string;
  ownerId: string;
  ownerName?: string;
  category: string;
  categoryId: string;
  categorySlug: string;
  name: string;
  logo: string;
  coverImage: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  website: string;
  isVerified: boolean;
  isOwner: boolean;
  createdAt: string;
  distanceKm?: number;
  averageRating: number;
  reviewsCount: number;
  followersCount: number;
  isFollowing: boolean;
  themeVibe: ThemeVibe;
  tagline: string;
  instagramUrl: string;
  twitterUrl: string;
  openingHours: OpeningHours | null;
  activeOffers?: BusinessOffer[];
}

export interface Product {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  distanceKm?: number;
}

export interface BusinessOffer {
  id: string;
  businessId: string | null;
  title: string;
  description: string;
  discountPercent: number;
  promoCode: string;
  startsAt?: string;
  expiresAt: string;
  isActive: boolean;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  comment: string;
  isMine: boolean;
  createdAt: string;
}

// ---------- Cart & orders ----------

export type CartProblem = 'unavailable' | 'out_of_stock' | 'not_enough_stock';

export interface CartLine {
  product: Product;
  quantity: number;
  lineTotal: number;
  problem: CartProblem | null;
}

export interface CartShop {
  business: { id: string; slug: string; name: string };
  items: CartLine[];
  subtotal: number;
  discountPercent: number;
  discount: number;
  total: number;
}

export interface Cart {
  shops: CartShop[];
  itemsCount: number;
  subtotal: number;
  discount: number;
  total: number;
  canCheckout: boolean;
  promo: { code: string; valid: boolean; discountPercent: number | null; message: string } | null;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string | null;
  productName: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  number: string;
  businessId: string;
  businessName: string;
  businessSlug?: string;
  customerId?: string;
  customerName?: string;
  items: OrderItem[];
  subtotalAmount: number;
  discountPercent: number;
  discountAmount: number;
  promoCode: string;
  totalAmount: number;
  status: OrderStatus;
  address: string;
  notes: string;
  canCancel: boolean;
  nextStatuses: OrderStatus[];
  history: { status: OrderStatus; note: string; at: string }[];
  createdAt: string;
}

export interface BusinessStats {
  orders: Record<OrderStatus, number> & { total: number; today: number; needsAction: number };
  revenueAllTime: number;
  revenueLast30Days: number;
  topProducts: { productId: string; name: string; quantity: number }[];
  lowStock: { id: string; name: string; stock: number }[];
  ratingAvg: number;
  reviewsCount: number;
  followersCount: number;
  activeOffers: number;
}

// ---------- Notifications ----------

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  /** Deep link shared with the mobile app, e.g. "posts/12", "users/sarah_j", "conversations/5" */
  link: string;
  isRead: boolean;
  createdAt: string;
  senderId?: string;
  senderName?: string;
  senderPhoto?: string;
}

// ---------- Moderation ----------

export type ReportTargetType = 'post' | 'comment' | 'story' | 'user' | 'business' | 'product' | 'message';

export interface Report {
  id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  resolution: string | null;
  reporterName: string;
  targetType: ReportTargetType;
  targetId: string;
  targetPreview: string;
  targetAuthorId?: string;
  targetExists: boolean;
  openReportsOnTarget: number;
  createdAt: string;
}

export interface AdminStats {
  users: { total: number; newLast7Days: number; banned: number };
  posts: { total: number; today: number };
  businesses: { total: number; pendingVerification: number };
  orders: { total: number; deliveredRevenue: number };
  reports: { pending: number };
}

export interface AdminUserRow {
  id: string;
  name: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isBanned: boolean;
  postsCount: number;
  openReportsCount: number;
  profilePhoto: string;
  createdAt: string;
}

/** One page of a list, plus how to ask for the next one (null when there is no more). */
export interface Page<T> {
  items: T[];
  next: string | null;
}
