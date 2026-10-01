/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Converts the Laravel API's JSON (snake_case, numeric ids, decimal strings) into the types in
// src/types.ts that the screens use. Keeping this in one place means a change in the API only
// needs a change here.

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
  LocalEvent,
  MemberSummary,
  Message,
  Notification,
  Order,
  OrderStatus,
  Post,
  Product,
  Report,
  Review,
  SocialRelations,
  Story,
  StoryGroup,
  User
} from '../types';

const id = (value: unknown): string => (value === null || value === undefined ? '' : String(value));
const num = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : fallback;
};
const optionalNum = (value: unknown): number | undefined => (value === null || value === undefined ? undefined : num(value));
const text = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

const pad = (n: number) => String(n).padStart(2, '0');
/** Local calendar date (YYYY-MM-DD) of an ISO timestamp. */
export const localYmd = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** Local clock time (HH:MM) of an ISO timestamp. */
export const localHm = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ---------- People ----------

export function mapUser(u: any): User {
  const loc = u?.location || {};
  return {
    id: id(u.id),
    name: text(u.name),
    username: text(u.username),
    profilePhoto: text(u.avatar_url),
    coverImage: text(u.cover_image_url),
    bio: text(u.bio),
    profession: text(u.profession),
    website: text(u.website),
    gender: u.gender || '',
    interests: Array.isArray(u.interests) ? u.interests : [],
    socialLinks: u.social_links && !Array.isArray(u.social_links) ? u.social_links : {},
    location: {
      // Exact for yourself, rounded for others; NaN when no location has been set yet
      latitude: num(loc.latitude ?? loc.approx_latitude, NaN),
      longitude: num(loc.longitude ?? loc.approx_longitude, NaN),
      city: text(loc.city),
      state: text(loc.state),
      country: text(loc.country),
      updatedAt: loc.updated_at || undefined
    },
    distanceKm: optionalNum(u.distance_km),
    email: u.email ?? undefined,
    mobile: u.phone ?? undefined,
    dob: u.date_of_birth ?? undefined,
    isAdmin: u.role === 'admin',
    isBanned: u.is_banned ?? undefined,
    createdAt: text(u.created_at)
  };
}

export function mapSummary(u: any): MemberSummary {
  return { id: id(u?.id), name: text(u?.name) || 'Deleted user', username: text(u?.username), profilePhoto: text(u?.avatar_url) };
}

export function mapRelations(r: any): SocialRelations {
  return {
    friendIds: (r.friend_ids || []).map(id),
    incoming: (r.incoming_requests || []).map((x: any) => ({ requestId: id(x.id), userId: id(x.user_id) })),
    outgoing: (r.outgoing_requests || []).map((x: any) => ({ requestId: id(x.id), userId: id(x.user_id) })),
    followingUserIds: (r.following_user_ids || []).map(id),
    followingBusinessIds: (r.following_business_ids || []).map(id),
    blockedIds: (r.blocked_user_ids || []).map(id)
  };
}

// ---------- Feed ----------

export function mapPost(p: any): Post {
  const author = p.author || {};
  const shared = p.shared_post;
  return {
    id: id(p.id),
    userId: id(author.id),
    type: p.type,
    content: text(p.body),
    mediaUrls: (p.media || []).map((m: any) => m.url),
    pollOptions: p.poll
      ? p.poll.options.map((o: any) => ({ id: id(o.id), text: text(o.text), votes: num(o.votes), percent: num(o.percent) }))
      : undefined,
    totalVotes: num(p.poll?.total_votes),
    myVoteOptionId: p.poll?.my_vote_option_id ? id(p.poll.my_vote_option_id) : null,
    sharedPostId: shared ? id(shared.id) : undefined,
    sharedPost: p.type === 'shared' ? (shared ? mapPost(shared) : null) : undefined,
    city: text(p.location?.city),
    country: text(p.location?.country),
    likesCount: num(p.counts?.likes),
    lovesCount: num(p.counts?.loves),
    commentCount: num(p.counts?.comments),
    shareCount: num(p.counts?.shares),
    myReaction: p.my_reaction || null,
    isMine: !!p.is_mine,
    createdAt: text(p.created_at),
    editedAt: p.edited_at || undefined,
    authorName: text(author.name) || 'Deleted user',
    authorUsername: text(author.username),
    authorPhoto: text(author.avatar_url),
    distanceKm: optionalNum(p.distance_km)
  };
}

/** Comments arrive as top-level comments with their replies inside; the screen wants one flat list. */
export function mapComments(list: any[]): Comment[] {
  const out: Comment[] = [];
  list.forEach((c) => {
    out.push(mapComment(c));
    (c.replies || []).forEach((r: any) => out.push(mapComment(r)));
  });
  return out;
}

export function mapComment(c: any): Comment {
  return {
    id: id(c.id),
    postId: id(c.post_id),
    userId: id(c.author?.id),
    parentId: c.parent_id ? id(c.parent_id) : undefined,
    content: text(c.body),
    isMine: !!c.is_mine,
    createdAt: text(c.created_at),
    editedAt: c.edited_at || undefined,
    userName: text(c.author?.name) || 'Deleted user',
    userPhoto: text(c.author?.avatar_url)
  };
}

export function mapStoryGroups(groups: any[]): StoryGroup[] {
  return groups.map((g) => {
    const author = mapSummary(g.author);
    return {
      userId: author.id,
      userName: author.name,
      userPhoto: author.profilePhoto,
      allSeen: !!g.all_seen,
      stories: (g.stories || []).map(
        (s: any): Story => ({
          id: id(s.id),
          userId: author.id,
          userName: author.name,
          userPhoto: author.profilePhoto,
          mediaUrl: text(s.media?.url),
          mediaType: s.media?.type === 'video' ? 'video' : 'image',
          seen: !!s.seen,
          myReaction: s.my_reaction || null,
          isMine: !!s.is_mine,
          viewsCount: optionalNum(s.views_count),
          reactionsCount: optionalNum(s.reactions_count),
          createdAt: text(s.created_at),
          expiresAt: text(s.expires_at)
        })
      )
    };
  });
}

// ---------- Messaging ----------

export function mapMessage(m: any): Message {
  const type = m.type || 'text';
  return {
    id: id(m.id),
    groupId: id(m.conversation_id),
    senderId: id(m.sender?.id),
    type,
    content: text(m.body),
    mediaUrl: m.attachment?.url || undefined,
    mediaType: type === 'image' || type === 'video' || type === 'voice' ? type : undefined,
    isMine: !!m.is_mine,
    createdAt: text(m.created_at),
    senderName: text(m.sender?.name),
    senderPhoto: text(m.sender?.avatar_url)
  };
}

/** One line describing a message, for conversation lists and notifications. */
export function messagePreview(m: any): string {
  if (!m) return 'No messages yet';
  if (m.body) return m.body;
  return { image: '📷 Photo', video: '🎬 Video', voice: '🎤 Voice message' }[m.type as string] || '';
}

export function mapConversation(c: any): ChatGroup {
  const members = (c.members || []).map(mapSummary);
  return {
    id: id(c.id),
    isGroup: c.type === 'group',
    name: text(c.name) || 'Conversation',
    coverPhoto: text(c.avatar_url),
    members,
    memberIds: members.map((m: MemberSummary) => m.id),
    myRole: c.my_role || undefined,
    otherUserId: c.other_user ? id(c.other_user.id) : undefined,
    lastMessageContent: messagePreview(c.last_message),
    lastMessageAt: c.last_message_at || undefined,
    unreadCount: num(c.unread_count)
  };
}

// ---------- Events ----------

export function mapEvent(e: any): LocalEvent {
  return {
    id: id(e.id),
    creatorId: id(e.organizer?.id),
    creatorName: text(e.organizer?.name) || 'Deleted user',
    name: text(e.title),
    description: text(e.description),
    locationName: text(e.location?.name),
    latitude: num(e.location?.latitude),
    longitude: num(e.location?.longitude),
    startsAt: text(e.starts_at),
    endsAt: e.ends_at || undefined,
    date: localYmd(e.starts_at),
    time: localHm(e.starts_at),
    image: text(e.cover_image_url),
    attendeesCount: num(e.attendees_count),
    participantsInfo: (e.attendees_preview || []).map(mapSummary),
    myStatus: e.my_status || null,
    isOrganizer: !!e.is_organizer,
    isCancelled: !!e.is_cancelled,
    isPast: !!e.is_past,
    distanceKm: optionalNum(e.distance_km),
    createdAt: text(e.created_at)
  };
}

// ---------- Businesses ----------

export function mapCategory(c: any): BusinessCategoryItem {
  return { id: id(c.id), name: text(c.name), slug: text(c.slug) };
}

export function mapOffer(o: any): BusinessOffer {
  return {
    id: id(o.id),
    businessId: o.business_id ? id(o.business_id) : null,
    title: text(o.title),
    description: text(o.description),
    discountPercent: num(o.discount_percent),
    promoCode: text(o.promo_code),
    startsAt: o.starts_at || undefined,
    expiresAt: text(o.expires_at),
    isActive: !!o.is_active
  };
}

export function mapBusiness(b: any): Business {
  return {
    id: id(b.id),
    slug: text(b.slug),
    ownerId: id(b.owner_id),
    ownerName: b.owner?.name,
    category: text(b.category?.name),
    categoryId: id(b.category?.id),
    categorySlug: text(b.category?.slug),
    name: text(b.name),
    logo: text(b.logo_url),
    coverImage: text(b.cover_image_url),
    description: text(b.description),
    address: text(b.address),
    latitude: num(b.location?.latitude),
    longitude: num(b.location?.longitude),
    phone: text(b.phone),
    email: text(b.email),
    website: text(b.website),
    isVerified: !!b.is_verified,
    isOwner: !!b.is_owner,
    createdAt: text(b.created_at),
    distanceKm: optionalNum(b.distance_km),
    averageRating: num(b.rating_avg),
    reviewsCount: num(b.reviews_count),
    followersCount: num(b.followers_count),
    isFollowing: !!b.is_following,
    themeVibe: b.theme || 'minimal',
    tagline: text(b.tagline),
    instagramUrl: text(b.instagram),
    twitterUrl: text(b.twitter),
    openingHours: b.opening_hours && !Array.isArray(b.opening_hours) ? b.opening_hours : null,
    activeOffers: Array.isArray(b.active_offers) ? b.active_offers.map(mapOffer) : undefined
  };
}

export function mapProduct(p: any): Product {
  return {
    id: id(p.id),
    businessId: id(p.business_id),
    businessName: text(p.business?.name),
    businessSlug: text(p.business?.slug),
    name: text(p.name),
    description: text(p.description),
    price: num(p.price),
    images: (p.images || []).map((m: any) => m.url),
    category: text(p.category) || 'General',
    stock: num(p.stock),
    isActive: p.is_active !== false,
    createdAt: text(p.created_at),
    distanceKm: optionalNum(p.distance_km)
  };
}

export function mapReview(r: any): Review {
  return {
    id: id(r.id),
    userId: id(r.author?.id),
    userName: text(r.author?.name) || 'Deleted user',
    userPhoto: text(r.author?.avatar_url),
    rating: num(r.rating),
    comment: text(r.body),
    isMine: !!r.is_mine,
    createdAt: text(r.created_at)
  };
}

// ---------- Cart & orders ----------

export function mapCart(c: any): Cart {
  return {
    shops: (c.shops || []).map((s: any) => ({
      business: { id: id(s.business.id), slug: text(s.business.slug), name: text(s.business.name) },
      items: (s.items || []).map((line: any) => ({
        product: mapProduct(line.product),
        quantity: num(line.quantity),
        lineTotal: num(line.line_total),
        problem: line.problem || null
      })),
      subtotal: num(s.subtotal),
      discountPercent: num(s.discount_percent),
      discount: num(s.discount),
      total: num(s.total)
    })),
    itemsCount: num(c.items_count),
    subtotal: num(c.subtotal),
    discount: num(c.discount),
    total: num(c.total),
    canCheckout: !!c.can_checkout,
    promo: c.promo
      ? { code: text(c.promo.code), valid: !!c.promo.valid, discountPercent: c.promo.discount_percent ?? null, message: text(c.promo.message) }
      : null
  };
}

export function mapOrder(o: any): Order {
  return {
    id: id(o.id),
    number: text(o.number),
    businessId: id(o.business?.id),
    businessName: text(o.business?.name),
    businessSlug: o.business?.slug || undefined,
    customerId: o.customer ? id(o.customer.id) : undefined,
    customerName: o.customer?.name,
    items: (o.items || []).map((i: any) => ({
      productId: i.product_id ? id(i.product_id) : null,
      productName: text(i.name),
      price: num(i.unit_price),
      quantity: num(i.quantity),
      lineTotal: num(i.line_total)
    })),
    subtotalAmount: num(o.subtotal),
    discountPercent: num(o.discount_percent),
    discountAmount: num(o.discount_amount),
    promoCode: text(o.promo_code),
    totalAmount: num(o.total),
    status: o.status as OrderStatus,
    address: text(o.delivery_address),
    notes: text(o.notes),
    canCancel: !!o.can_cancel,
    nextStatuses: (o.next_statuses || []) as OrderStatus[],
    history: (o.history || []).map((h: any) => ({ status: h.status, note: text(h.note), at: text(h.at) })),
    createdAt: text(o.created_at)
  };
}

export function mapBusinessStats(d: any): BusinessStats {
  return {
    orders: {
      pending: num(d.orders?.pending),
      processing: num(d.orders?.processing),
      shipped: num(d.orders?.shipped),
      delivered: num(d.orders?.delivered),
      cancelled: num(d.orders?.cancelled),
      total: num(d.orders?.total),
      today: num(d.orders?.today),
      needsAction: num(d.orders?.needs_action)
    },
    revenueAllTime: num(d.revenue?.all_time),
    revenueLast30Days: num(d.revenue?.last_30_days),
    topProducts: (d.top_products || []).map((p: any) => ({ productId: id(p.product_id), name: text(p.name), quantity: num(p.quantity) })),
    lowStock: (d.low_stock || []).map((p: any) => ({ id: id(p.id), name: text(p.name), stock: num(p.stock) })),
    ratingAvg: num(d.rating_avg),
    reviewsCount: num(d.reviews_count),
    followersCount: num(d.followers_count),
    activeOffers: num(d.active_offers)
  };
}

// ---------- Notifications & admin ----------

export function mapNotification(n: any): Notification {
  return {
    id: id(n.id),
    type: text(n.kind),
    title: text(n.title),
    message: text(n.message),
    link: text(n.link),
    isRead: !!n.is_read,
    createdAt: text(n.created_at),
    senderId: n.sender ? id(n.sender.id) : undefined,
    senderName: n.sender?.name,
    senderPhoto: n.sender?.avatar_url || ''
  };
}

export function mapReport(r: any): Report {
  return {
    id: id(r.id),
    reason: text(r.reason),
    status: r.status,
    resolution: r.resolution || null,
    reporterName: text(r.reporter?.name) || 'Deleted user',
    targetType: r.target?.type,
    targetId: id(r.target?.id),
    targetPreview: text(r.target?.text),
    targetAuthorId: r.target?.author_id ? id(r.target.author_id) : undefined,
    targetExists: !r.target?.removed,
    openReportsOnTarget: num(r.open_reports_on_target),
    createdAt: text(r.created_at)
  };
}

export function mapAdminStats(d: any): AdminStats {
  return {
    users: { total: num(d.users?.total), newLast7Days: num(d.users?.new_last_7_days), banned: num(d.users?.banned) },
    posts: { total: num(d.posts?.total), today: num(d.posts?.today) },
    businesses: { total: num(d.businesses?.total), pendingVerification: num(d.businesses?.pending_verification) },
    orders: { total: num(d.orders?.total), deliveredRevenue: num(d.orders?.delivered_revenue) },
    reports: { pending: num(d.reports?.pending) }
  };
}

export function mapAdminUser(u: any): AdminUserRow {
  return {
    id: id(u.id),
    name: text(u.name),
    username: text(u.username),
    email: text(u.email),
    isAdmin: u.role === 'admin',
    isBanned: !!u.is_banned,
    postsCount: num(u.posts_count),
    openReportsCount: num(u.open_reports_count),
    profilePhoto: text(u.avatar_url),
    createdAt: text(u.created_at)
  };
}
