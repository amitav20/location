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

export type StaffRole = 'owner' | 'manager' | 'cashier' | 'kitchen' | 'driver';

export type Permission =
  | 'manage'
  | 'staff'
  | 'finance'
  | 'ads'
  | 'settings'
  | 'catalog'
  | 'offers'
  | 'marketing'
  | 'chat'
  | 'reviews'
  | 'orders'
  | 'refunds'
  | 'kitchen'
  | 'scan'
  | 'deliveries'
  | 'deliver'
  | 'bookings'
  | 'customers'
  | 'analytics';

export interface StaffMember {
  id: string;
  role: StaffRole;
  status: 'active' | 'invited';
  user?: MemberSummary;
  invitedEmail?: string;
  invitedPhone?: string;
  inviteUrl?: string;
  createdAt: string;
}

export interface StaffInvite {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  role: StaffRole;
  invitedBy?: string;
  token?: string;
  inviteUrl?: string;
  createdAt: string;
}

export interface TaxRate {
  label: string;
  ratePercent: number;
}

export interface ShopSettings {
  fulfilment: {
    delivery: boolean;
    pickup: boolean;
    dineIn: boolean;
  };
  payments: {
    cash: boolean;
    online: boolean;
  };
  taxes: TaxRate[];
  taxInclusive: boolean;
  packagingFee: {
    delivery: number;
    pickup: number;
    dineIn: number;
  };
  scheduling: {
    enabled: boolean;
    slotMinutes: number;
    maxOrdersPerSlot: number;
    advanceDays: number;
    leadMinutes: number;
    asap: boolean;
  };
  lowStockThreshold: number;
  chat: {
    awayEnabled: boolean;
    awayMessage: string;
  };
  crm: {
    vipOrders: number;
    vipSpend: number;
    lapsedDays: number;
    winback: { enabled: boolean; discountPercent: number; validDays: number };
    birthday: { enabled: boolean; discountPercent: number; validDays: number };
    anniversary: { enabled: boolean; discountPercent: number; validDays: number };
  };
}

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
  whatsapp?: string;
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
  timezone?: string;
  isOpenNow?: boolean;
  ordering?: {
    fulfilment: { delivery: boolean; pickup: boolean; dineIn: boolean };
    scheduling: boolean;
    asap: boolean;
    payments: { cash: boolean; online: boolean };
  };
  loyalty?: { type: string; summary: string } | null;
  hasBookings?: boolean;
  myRole?: StaffRole | null;
  myPermissions?: Permission[];
}

export interface ProductVariant {
  id: string;
  name: string;
  options: Record<string, string>;
  sku?: string;
  barcode?: string;
  price: number;
  stock: number;
  inStock: boolean;
  isActive: boolean;
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  modifiers: Modifier[];
}

export interface Product {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  name: string;
  description: string;
  price: number;
  priceRange?: { min: number; max: number } | null;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  brand?: string;
  sku?: string;
  barcode?: string;
  fits?: string[];
  images: string[];
  imageIds?: string[];
  category: string;
  stock: number;
  inStock?: boolean;
  soldOut?: boolean;
  lowStockThreshold?: number | null;
  soldOutBehavior?: 'disable' | 'hide';
  hasVariants?: boolean;
  options?: { name: string; values: string[] }[];
  variants?: ProductVariant[];
  modifierGroups?: ModifierGroup[];
  notifyMe?: boolean;
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

export interface ReviewReply {
  body: string;
  repliedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  comment: string;
  isVerified?: boolean;
  reply?: ReviewReply | null;
  isMine: boolean;
  createdAt: string;
}

// ---------- Cart & orders ----------

export type Fulfilment = 'delivery' | 'pickup' | 'dine_in';
export type CartProblem = 'unavailable' | 'out_of_stock' | 'not_enough_stock' | 'choose_options';

export interface CartModifierChoice {
  id: string;
  group?: string;
  name: string;
  price: number;
}

export interface CartLine {
  id?: string;
  product: Product;
  variant?: { id: string; name: string; options: Record<string, string> } | null;
  modifiers?: CartModifierChoice[];
  quantity: number;
  unitPrice?: number;
  lineTotal: number;
  problem: CartProblem | null;
}

export interface OrderCharge {
  type: string;
  label: string;
  amount: number;
  isIncluded: boolean;
}

export interface CartShopDelivery {
  available: boolean;
  reason?: string;
  zone?: string;
  fee: number;
  minOrder: number;
  distanceKm?: number;
}

export interface CartShop {
  business: {
    id: string;
    slug: string;
    name: string;
    fulfilment?: { delivery: boolean; pickup: boolean; dineIn: boolean };
    payments?: { cash: boolean; online: boolean };
    scheduling?: boolean;
  };
  items: CartLine[];
  subtotal: number;
  discountPercent: number;
  discount: number;
  charges?: OrderCharge[];
  chargesTotal?: number;
  total: number;
  delivery?: CartShopDelivery | null;
  problem?: string | null;
  problemMessage?: string | null;
}

export interface Cart {
  fulfilment?: Fulfilment;
  shops: CartShop[];
  itemsCount: number;
  subtotal: number;
  discount: number;
  chargesTotal?: number;
  total: number;
  canCheckout: boolean;
  onlinePaymentAvailable?: boolean;
  promo: { code: string; valid: boolean; discountPercent: number | null; message: string } | null;
}

export type OrderStatus = 'pending' | 'processing' | 'ready' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id?: string;
  productId: string | null;
  variantId?: string | null;
  productName: string;
  variantName?: string;
  displayName?: string;
  sku?: string;
  modifiers?: { id: string; name: string; price: number }[];
  price: number;
  quantity: number;
  lineTotal: number;
}

export type PaymentMethod = 'cash' | 'online';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';

export interface OrderPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  paymentId?: string;
  paidAt?: string;
  refundedAmount?: number;
}

export interface OrderRefund {
  id: string;
  amount: number;
  reason: string;
  method: string;
  status: string;
  restocked: boolean;
  createdAt: string;
}

export interface OrderArrival {
  status: 'on_my_way' | 'arrived';
  etaAt?: string;
  arrivedAt?: string;
  vehicle?: { color?: string; model?: string; plate?: string };
}

export interface Order {
  id: string;
  number: string;
  businessId: string;
  businessName: string;
  businessSlug?: string;
  businessPhone?: string;
  businessAddress?: string;
  businessLocation?: { latitude: number; longitude: number } | null;
  customerId?: string;
  customerName?: string;
  contactPhone?: string;
  items: OrderItem[];
  itemsCount?: number;
  subtotalAmount: number;
  discountPercent: number;
  discountAmount: number;
  charges: OrderCharge[];
  chargesTotal?: number;
  promoCode: string;
  totalAmount: number;
  status: OrderStatus;
  fulfilment: Fulfilment;
  payment: OrderPayment;
  refunds?: OrderRefund[];
  commissionAmount?: number;
  address: string;
  deliveryLocation?: { latitude: number; longitude: number } | null;
  scheduledFor?: string;
  tableLabel?: string;
  handoverCode?: string;
  handoverQr?: string;
  driver?: MemberSummary | null;
  driverLocation?: { latitude: number; longitude: number; at?: string } | null;
  deliveryProof?: any;
  arrival?: OrderArrival | null;
  notes: string;
  canCancel: boolean;
  nextStatuses: OrderStatus[];
  history: { status: OrderStatus; note: string; at: string }[];
  cancelledAt?: string;
  createdAt: string;
}

// ---------- Shop Features: Extras ----------

export interface PaymentIntent {
  id: string;
  gateway: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  checkout: Record<string, any>;
  expiresAt?: string;
}

export interface DeliveryZone {
  id?: string;
  name: string;
  type: 'radius' | 'polygon';
  minKm?: number;
  maxKm?: number;
  polygon?: [number, number][];
  fee: number;
  minOrder: number;
  isActive?: boolean;
}

export interface DeliveryQuote {
  available: boolean;
  fee: number;
  minOrder: number;
  reason?: string;
  message?: string;
  pickupAvailable: boolean;
}

export interface TimeSlot {
  start: string;
  end: string;
  remaining: number;
  isAvailable: boolean;
}

export interface TrackingMilestone {
  status: OrderStatus;
  label: string;
  at?: string;
  isDone: boolean;
}

export interface Tracking {
  orderId: string;
  status: OrderStatus;
  milestones: TrackingMilestone[];
  shop: { name: string; address: string; phone?: string; latitude: number; longitude: number };
  destination?: { address: string; latitude?: number; longitude?: number };
  driver?: MemberSummary | null;
  driverLocation?: { latitude: number; longitude: number; at?: string } | null;
  etaMinutes?: number | null;
  courier?: { name: string; trackingUrl?: string } | null;
  realtimeChannel?: string;
}

export interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  content: string;
}

export interface Announcement {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  type: 'news' | 'restock' | 'seasonal' | 'offer';
  body: string;
  isPriority: boolean;
  mediaUrls: string[];
  likesCount: number;
  commentsCount: number;
  hasLiked?: boolean;
  createdAt: string;
}

export interface AnnouncementComment {
  id: string;
  announcementId: string;
  user: MemberSummary;
  content: string;
  createdAt: string;
}

export interface LoyaltyProgram {
  isActive: boolean;
  type: 'stamps' | 'spend';
  targetStamps?: number;
  targetSpend?: number;
  rewardText: string;
  rewardDiscountPercent?: number;
  rewardDiscountAmount?: number;
  minOrder?: number;
  validityDays?: number;
  summary: string;
}

export interface LoyaltyRewardCode {
  code: string;
  label: string;
  expiresAt: string;
}

export interface LoyaltyCard {
  businessId: string;
  businessName: string;
  businessLogo?: string;
  currentStamps: number;
  targetStamps: number;
  currentSpend: number;
  targetSpend: number;
  progressPercent: number;
  qrPayload: string;
  unusedRewards: LoyaltyRewardCode[];
}

export type CustomerTier = 'new' | 'regular' | 'vip' | 'lapsed';

export interface CustomerRow {
  id: string;
  name: string;
  username?: string;
  profilePhoto?: string;
  tier: CustomerTier;
  ordersCount: number;
  totalSpent: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
}

export interface RetentionStats {
  winbackSent: number;
  winbackUsed: number;
  birthdaySent: number;
  birthdayUsed: number;
  anniversarySent: number;
  anniversaryUsed: number;
}

export interface ShopTable {
  id: string;
  label: string;
  type: 'table' | 'counter';
  code: string;
  qrUrl: string;
  isActive: boolean;
}

export interface ScanResult {
  type: 'product' | 'order' | 'loyalty_card' | 'unknown';
  product?: Product;
  order?: Order;
  loyaltyCard?: LoyaltyCard;
  rawCode: string;
}

export interface Receipt {
  orderNumber: string;
  data: Record<string, any>;
  links: { html: string; pdf: string };
}

export interface KitchenTicketItem {
  id: string;
  name: string;
  variantName?: string;
  modifiers: string[];
  quantity: number;
}

export interface KitchenTicket {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  tableLabel?: string;
  scheduledFor?: string;
  items: KitchenTicketItem[];
  waitingMinutes: number;
  arrivalAlert?: boolean;
  createdAt: string;
}

export interface FlashSale {
  id: string;
  businessId: string;
  businessName: string;
  title: string;
  discountPercent: number;
  radiusM: number;
  endsAt: string;
  maxClaims?: number | null;
  claimsCount: number;
  isClaimed?: boolean;
  discountAmount?: number;
}

export interface StoryProductTag {
  productId: string;
  productName?: string;
  price?: number;
  x: number;
  y: number;
}

export interface ShopStory {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  mediaUrl: string;
  tags: StoryProductTag[];
  isHighlight: boolean;
  highlightTitle?: string;
  createdAt: string;
}

export interface AdCampaignDaily {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
}

export interface AdCampaign {
  id: string;
  placement: 'pin' | 'feed' | 'both';
  radiusKm: number;
  dailyBudget: number;
  days: number;
  status: 'active' | 'paused' | 'completed';
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  dailyStats?: AdCampaignDaily[];
  createdAt: string;
}

export interface SponsoredItem {
  campaignId: string;
  business: Business;
  placement: 'feed' | 'pin';
}

export interface AreaInsights {
  busyHours: { hour: number; count: number }[];
  weekdayActivity: { day: string; count: number }[];
  topSearches: { query: string; count: number }[];
  hasEnoughData: boolean;
}

export interface ShopTip {
  id: string;
  kind: 'rain' | 'heat' | 'cold' | 'event' | 'general';
  title: string;
  body: string;
  forDate?: string;
  isDismissed: boolean;
}

export interface SpecialistTimeOff {
  id: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
}

export interface Specialist {
  id: string;
  name: string;
  title?: string;
  avatarUrl?: string;
  workingHours?: OpeningHours | null;
  timeOff?: SpecialistTimeOff[];
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  durationMinutes: number;
  bufferMinutes: number;
  price: number;
  depositType: 'none' | 'percent' | 'full';
  depositValue: number;
  cancelHours: number;
  lateCancelRefundPercent: number;
  specialists: Specialist[];
}

export interface BookingSlot {
  time: string;
  specialists: { id: string; name: string }[];
  isAvailable: boolean;
}

export type BookingStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Booking {
  id: string;
  number: string;
  businessId: string;
  businessName: string;
  service: { id: string; name: string; durationMinutes: number; price: number };
  specialist?: { id: string; name: string } | null;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  depositAmount: number;
  totalAmount: number;
  freeCancellationUntil?: string;
  canCancel: boolean;
  canReschedule: boolean;
  createdAt: string;
}

export interface Analytics {
  gmv: number;
  netSales: number;
  aov: number;
  repeatCustomerRate: number;
  cancellationRate: number;
  revenueSeries: { date: string; revenue: number }[];
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
  orderTypeSplit: Record<string, number>;
  paymentMethodSplit: Record<string, number>;
  compareChange?: { gmvPercent: number; netSalesPercent: number; aovPercent: number };
}

export interface PayoutRecord {
  id: string;
  amount: number;
  reference?: string;
  status: string;
  paidAt: string;
}

export interface FinanceSummary {
  availableBalance: number;
  pendingBalance: number;
  commissionPercent: number;
  totalPaidOut: number;
  payouts: PayoutRecord[];
}

export interface PayoutAccount {
  id?: string;
  type: 'bank' | 'upi';
  holderName: string;
  maskedAccount: string;
  ifscOrVpa: string;
  isVerified: boolean;
}

export interface CourierQuote {
  quoteId: string;
  provider: string;
  fee: number;
  estimatedMinutes: number;
}

export interface CourierDispatch {
  dispatchId: string;
  provider: string;
  trackingUrl?: string;
  riderName?: string;
  riderPhone?: string;
  status: string;
}

export interface AppConfig {
  minAppVersion: string;
  latestAppVersion: string;
  storeUrls: {
    android: string;
    ios: string;
  };
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
