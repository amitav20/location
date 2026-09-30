/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared User Types
export interface UserLocation {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  mobile: string;
  profilePhoto: string;
  coverImage?: string;
  dob: string;
  gender: string;
  bio?: string;
  interests: string[];
  profession?: string;
  website?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  location: UserLocation;
  isBanned?: boolean;
  isAdmin?: boolean;
  createdAt: string;
}

// Friendship and Follows
export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string; // can be a user_id or business_id
  targetType: 'user' | 'business';
  createdAt: string;
}

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

// Everything the current user has sent/received/followed/blocked
export interface SocialRelations {
  friendRequests: FriendRequest[];
  following: Follow[];
  blocked: UserBlock[];
}

// Social Feed: Posts
export type PostType = 'text' | 'image' | 'video' | 'poll' | 'shared';

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array of userIds
}

export interface Post {
  id: string;
  userId: string;
  type: PostType;
  content: string;
  mediaUrls?: string[]; // images or videos
  pollOptions?: PollOption[];
  sharedPostId?: string; // ID of the post being shared
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  likes: string[]; // array of userIds
  loves: string[]; // array of userIds
  createdAt: string;
  // Join helpers (not stored raw but populated)
  authorName?: string;
  authorUsername?: string;
  authorPhoto?: string;
  distanceKm?: number;
  sharedPost?: Post; // Populated shared post details
  commentCount?: number;
  editedAt?: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentId?: string; // For replies
  content: string;
  createdAt: string;
  editedAt?: string;
  // Join helpers
  userName?: string;
  userPhoto?: string;
}

// Instagram-style Stories
export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: string;
  expiresAt: string;
  views: { userId: string; viewedAt: string }[];
  reactions: { userId: string; reaction: string; createdAt: string }[];
  // Join helpers
  userName?: string;
  userPhoto?: string;
  distanceKm?: number;
}

// Messaging System
export interface Message {
  id: string;
  groupId: string; // Unique chat/thread ID: can be "one-to-one:${userA}:${userB}" or a custom UUID for group
  senderId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'voice';
  readBy: string[]; // array of userIds
  createdAt: string;
  // Join helpers
  senderName?: string;
  senderPhoto?: string;
}

export interface ChatGroup {
  id: string; // group id or one-to-one identifier
  isGroup: boolean;
  name?: string; // used for group chats
  coverPhoto?: string;
  creatorId?: string;
  memberIds: string[];
  typingUserIds?: string[]; // runtime only
  lastMessageContent?: string;
  lastMessageAt?: string;
  unreadCount?: number; // computed per user
  members?: MemberSummary[]; // computed: who is in the conversation
  otherUserId?: string; // computed: the other person in a one-to-one chat
}

// Small user card used in lists (event attendees, chat members)
export interface MemberSummary {
  id: string;
  name: string;
  profilePhoto: string;
}

// Local Events
export interface LocalEvent {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  date: string;
  time: string;
  image?: string;
  participants: string[]; // array of userIds who joined
  createdAt: string;
  // Join helpers
  creatorName?: string;
  distanceKm?: number;
  participantsInfo?: MemberSummary[];
  isPast?: boolean;
}

// Local Business Module
export type BusinessCategory =
  | 'Restaurant'
  | 'Grocery'
  | 'Fashion'
  | 'Electronics'
  | 'Pharmacy'
  | 'Hotel'
  | 'Cafe'
  | 'Service Provider'
  | 'Local Vendor';

export interface Business {
  id: string;
  ownerId: string;
  category: BusinessCategory;
  name: string;
  logo: string;
  coverImage: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  website?: string;
  isVerified?: boolean;
  createdAt: string;
  // Computed helpers
  distanceKm?: number;
  averageRating?: number;
  followersCount?: number;
  isFollowing?: boolean;
  // Custom brand micro-site parameters
  themeVibe?: string; // 'minimal' | 'vintage' | 'neon' | 'organic'
  tagline?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  openingHours?: string; // free text, e.g. "Mon-Fri 9:00-18:00, Sat 10:00-14:00"
}

// Products & Offers (Marketplace)
export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  createdAt: string;
  // Helpers
  businessName?: string;
  distanceKm?: number;
}

export interface BusinessOffer {
  id: string;
  businessId: string;
  title: string;
  description: string;
  discountPercent: number;
  promoCode?: string;
  expiresAt: string;
  createdAt: string;
}

export interface Review {
  id: string;
  targetId: string; // businessId or productId
  userId: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  // Helpers
  userName?: string;
  userPhoto?: string;
}

// Cart & Orders
export interface CartItem {
  productId: string;
  quantity: number;
  product?: Product;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number; // captured price at purchase
  productName?: string;
}

export interface Order {
  id: string;
  userId: string;
  businessId: string;
  items: OrderItem[];
  subtotalAmount?: number; // before promo discount
  discountPercent?: number;
  promoCode?: string;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  address: string;
  createdAt: string;
  // Helpers
  businessName?: string;
  customerName?: string;
}

// Real-Time Notifications
export type NotificationType =
  | 'message'
  | 'friend_request'
  | 'friend_accept'
  | 'comment'
  | 'like'
  | 'love'
  | 'business_update'
  | 'event_invite'
  | 'announcement'
  | 'follow'
  | 'story_reaction';

export interface Notification {
  id: string;
  userId: string; // recipient
  senderId: string; // initiator
  type: NotificationType;
  title: string;
  message: string;
  link?: string; // App link for navigation
  isRead: boolean;
  createdAt: string;
  // Helpers
  senderName?: string;
  senderPhoto?: string;
}

// Moderation / Reports
export interface Report {
  id: string;
  reporterId: string;
  targetId: string; //postId, commentId, userId, businessId
  targetType: 'post' | 'comment' | 'user' | 'business' | 'product' | 'story';
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
  // Helpers
  reporterName?: string;
  targetName?: string; // Username, Title, etc.
  targetPreview?: string; // Short excerpt of the reported content
  targetExists?: boolean;
}

// Friends page data
export interface FriendsOverview {
  friends: (User & { distanceKm?: number })[];
  incoming: { request: FriendRequest; user: User }[];
  outgoing: { request: FriendRequest; user: User }[];
}
