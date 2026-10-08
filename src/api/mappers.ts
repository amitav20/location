/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Converts the Laravel API's JSON (snake_case, numeric ids, decimal strings) into the types in
// src/types.ts that the screens use. Keeping this in one place means a change in the API only
// needs a change here.

import {
  AdCampaign,
  AdminStats,
  AdminUserRow,
  Analytics,
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
  CartLine,
  CartShop,
  ChatGroup,
  Comment,
  CourierDispatch,
  CourierQuote,
  CustomerRow,
  DeliveryQuote,
  DeliveryZone,
  FinanceSummary,
  FlashSale,
  Fulfilment,
  KitchenTicket,
  LocalEvent,
  LoyaltyCard,
  LoyaltyProgram,
  MemberSummary,
  Message,
  Notification,
  Order,
  OrderStatus,
  PaymentIntent,
  PaymentMethod,
  PaymentStatus,
  PayoutAccount,
  Post,
  Product,
  ProductVariant,
  Receipt,
  Report,
  Review,
  ScanResult,
  Service,
  ShopSettings,
  ShopStory,
  ShopTable,
  ShopTip,
  SocialRelations,
  Specialist,
  StaffInvite,
  StaffMember,
  StaffRole,
  Story,
  StoryGroup,
  TimeSlot,
  Tracking,
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
  const ord = b?.ordering;
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
    whatsapp: text(b.whatsapp),
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
    activeOffers: Array.isArray(b.active_offers) ? b.active_offers.map(mapOffer) : undefined,
    timezone: text(b.timezone) || 'UTC',
    isOpenNow: b.is_open_now !== undefined ? !!b.is_open_now : undefined,
    ordering: ord
      ? {
          fulfilment: {
            delivery: !!ord.fulfilment?.delivery,
            pickup: !!ord.fulfilment?.pickup,
            dineIn: !!ord.fulfilment?.dine_in,
          },
          scheduling: !!ord.scheduling,
          asap: !!ord.asap,
          payments: {
            cash: !!ord.payments?.cash,
            online: !!ord.payments?.online,
          },
        }
      : undefined,
    loyalty: b.loyalty ? { type: text(b.loyalty.type), summary: text(b.loyalty.summary) } : null,
    hasBookings: b.has_bookings !== undefined ? !!b.has_bookings : undefined,
    myRole: (b.my_role as StaffRole) || null,
    myPermissions: Array.isArray(b.my_permissions) ? b.my_permissions : [],
  };
}

export function mapProduct(p: any): Product {
  const stock = num(p.stock);
  return {
    id: id(p.id),
    businessId: id(p.business_id),
    businessName: text(p.business?.name),
    businessSlug: text(p.business?.slug),
    name: text(p.name),
    description: text(p.description),
    price: num(p.price),
    priceRange: p.price_range ? { min: num(p.price_range.min), max: num(p.price_range.max) } : null,
    compareAtPrice: p.compare_at_price === null || p.compare_at_price === undefined ? null : num(p.compare_at_price),
    discountPercent: p.discount_percent === null || p.discount_percent === undefined ? null : num(p.discount_percent),
    brand: text(p.brand),
    sku: text(p.sku),
    barcode: p.barcode ? text(p.barcode) : undefined,
    fits: Array.isArray(p.fits) ? p.fits.map(text).filter(Boolean) : [],
    images: (p.images || []).map((m: any) => text(m.url)),
    imageIds: (p.images || []).map((m: any) => id(m.id)),
    category: text(p.category) || 'General',
    stock,
    inStock: p.in_stock !== undefined ? !!p.in_stock : stock > 0,
    soldOut: p.sold_out !== undefined ? !!p.sold_out : stock === 0,
    lowStockThreshold: p.low_stock_threshold !== undefined && p.low_stock_threshold !== null ? num(p.low_stock_threshold) : null,
    soldOutBehavior: p.sold_out_behavior || undefined,
    hasVariants: !!p.has_variants || (Array.isArray(p.variants) && p.variants.length > 0),
    options: Array.isArray(p.options)
      ? p.options.map((o: any) => ({
          name: text(o.name),
          values: Array.isArray(o.values) ? o.values.map(text) : [],
        }))
      : [],
    variants: Array.isArray(p.variants)
      ? p.variants.map((v: any) => ({
          id: id(v.id),
          name: text(v.name),
          options: v.options && typeof v.options === 'object' ? v.options : {},
          sku: v.sku ? text(v.sku) : undefined,
          barcode: v.barcode ? text(v.barcode) : undefined,
          price: num(v.price ?? p.price),
          stock: num(v.stock),
          inStock: v.in_stock !== undefined ? !!v.in_stock : num(v.stock) > 0,
          isActive: v.is_active !== false,
        }))
      : [],
    modifierGroups: Array.isArray(p.modifier_groups)
      ? p.modifier_groups.map((g: any) => ({
          id: id(g.id),
          name: text(g.name),
          minSelect: num(g.min_select),
          maxSelect: num(g.max_select),
          required: !!g.required || num(g.min_select) > 0,
          modifiers: Array.isArray(g.modifiers)
            ? g.modifiers.map((m: any) => ({
                id: id(m.id),
                name: text(m.name),
                price: num(m.price),
                isActive: m.is_active !== false,
              }))
            : [],
        }))
      : [],
    notifyMe: !!p.notify_me,
    isActive: p.is_active !== false,
    createdAt: text(p.created_at),
    distanceKm: optionalNum(p.distance_km),
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
    isVerified: !!r.is_verified,
    reply: r.reply ? { body: text(r.reply.body), repliedAt: text(r.reply.replied_at || r.reply.created_at) } : null,
    isMine: !!r.is_mine,
    createdAt: text(r.created_at),
  };
}

// ---------- Cart & orders ----------

export function mapCart(c: any): Cart {
  return {
    fulfilment: (c.fulfilment as Fulfilment) || 'delivery',
    shops: (c.shops || []).map((s: any) => ({
      business: {
        id: id(s.business?.id),
        slug: text(s.business?.slug),
        name: text(s.business?.name),
        fulfilment: s.business?.fulfilment
          ? {
              delivery: !!s.business.fulfilment.delivery,
              pickup: !!s.business.fulfilment.pickup,
              dineIn: !!s.business.fulfilment.dine_in,
            }
          : undefined,
        payments: s.business?.payments
          ? {
              cash: !!s.business.payments.cash,
              online: !!s.business.payments.online,
            }
          : undefined,
        scheduling: !!s.business?.scheduling,
      },
      items: (s.items || []).map((line: any) => ({
        id: line.id ? id(line.id) : undefined,
        product: mapProduct(line.product),
        variant: line.variant
          ? {
              id: id(line.variant.id),
              name: text(line.variant.name),
              options: line.variant.options && typeof line.variant.options === 'object' ? line.variant.options : {},
            }
          : null,
        modifiers: Array.isArray(line.modifiers)
          ? line.modifiers.map((m: any) => ({
              id: id(m.id),
              group: m.group ? text(m.group) : undefined,
              name: text(m.name),
              price: num(m.price),
            }))
          : [],
        quantity: num(line.quantity),
        unitPrice: line.unit_price !== undefined ? num(line.unit_price) : undefined,
        lineTotal: num(line.line_total),
        problem: line.problem || null,
      })),
      subtotal: num(s.subtotal),
      discountPercent: num(s.discount_percent),
      discount: num(s.discount),
      charges: Array.isArray(s.charges)
        ? s.charges.map((ch: any) => ({
            type: text(ch.type),
            label: text(ch.label),
            amount: num(ch.amount),
            isIncluded: !!ch.is_included,
          }))
        : [],
      chargesTotal: num(s.charges_total),
      total: num(s.total),
      delivery: s.delivery
        ? {
            available: !!s.delivery.available,
            reason: s.delivery.reason ? text(s.delivery.reason) : undefined,
            zone: s.delivery.zone ? text(s.delivery.zone) : undefined,
            fee: num(s.delivery.fee),
            minOrder: num(s.delivery.min_order),
            distanceKm: optionalNum(s.delivery.distance_km),
          }
        : null,
      problem: s.problem ? text(s.problem) : null,
      problemMessage: s.problem_message ? text(s.problem_message) : null,
    })),
    itemsCount: num(c.items_count),
    subtotal: num(c.subtotal),
    discount: num(c.discount),
    chargesTotal: num(c.charges_total),
    total: num(c.total),
    canCheckout: !!c.can_checkout,
    onlinePaymentAvailable: !!c.online_payment_available,
    promo: c.promo
      ? { code: text(c.promo.code), valid: !!c.promo.valid, discountPercent: c.promo.discount_percent ?? null, message: text(c.promo.message) }
      : null,
  };
}

export function mapOrder(o: any): Order {
  const status = (o.status as OrderStatus) || 'pending';
  return {
    id: id(o.id),
    number: text(o.number),
    businessId: id(o.business?.id),
    businessName: text(o.business?.name),
    businessSlug: o.business?.slug || undefined,
    businessPhone: o.business?.phone ? text(o.business.phone) : undefined,
    businessAddress: o.business?.address ? text(o.business.address) : undefined,
    businessLocation: o.business?.location
      ? { latitude: num(o.business.location.latitude), longitude: num(o.business.location.longitude) }
      : null,
    customerId: o.customer ? id(o.customer.id) : undefined,
    customerName: o.customer?.name,
    contactPhone: o.contact_phone ? text(o.contact_phone) : undefined,
    items: (o.items || []).map((i: any) => ({
      id: i.id ? id(i.id) : undefined,
      productId: i.product_id ? id(i.product_id) : null,
      variantId: i.variant_id ? id(i.variant_id) : (i.product_variant_id ? id(i.product_variant_id) : null),
      productName: text(i.name || i.product_name),
      variantName: i.variant_name ? text(i.variant_name) : undefined,
      displayName: i.display_name ? text(i.display_name) : text(i.name || i.product_name),
      sku: i.sku ? text(i.sku) : undefined,
      modifiers: Array.isArray(i.modifiers)
        ? i.modifiers.map((m: any) => ({ id: id(m.id), name: text(m.name), price: num(m.price) }))
        : [],
      price: num(i.unit_price ?? i.price),
      quantity: num(i.quantity),
      lineTotal: num(i.line_total),
    })),
    itemsCount: o.items_count !== undefined ? num(o.items_count) : undefined,
    subtotalAmount: num(o.subtotal),
    discountPercent: num(o.discount_percent),
    discountAmount: num(o.discount_amount),
    charges: Array.isArray(o.charges)
      ? o.charges.map((ch: any) => ({
          type: text(ch.type),
          label: text(ch.label),
          amount: num(ch.amount),
          isIncluded: !!ch.is_included,
        }))
      : [],
    chargesTotal: num(o.charges_total),
    promoCode: text(o.promo_code),
    totalAmount: num(o.total),
    status,
    fulfilment: (o.fulfilment as Fulfilment) || 'delivery',
    payment: {
      method: (o.payment?.method as PaymentMethod) || (o.payment_method as PaymentMethod) || 'cash',
      status: (o.payment?.status as PaymentStatus) || (o.payment_status as PaymentStatus) || 'pending',
      paymentId: o.payment?.payment_id ? text(o.payment.payment_id) : undefined,
      paidAt: o.payment?.paid_at ? text(o.payment.paid_at) : (o.paid_at ? text(o.paid_at) : undefined),
      refundedAmount: num(o.payment?.refunded_amount ?? o.refunded_amount),
    },
    refunds: Array.isArray(o.refunds)
      ? o.refunds.map((r: any) => ({
          id: id(r.id),
          amount: num(r.amount),
          reason: text(r.reason),
          method: text(r.method),
          status: text(r.status),
          restocked: !!r.restocked,
          createdAt: text(r.created_at),
        }))
      : [],
    commissionAmount: o.commission_amount !== undefined ? num(o.commission_amount) : undefined,
    address: text(o.delivery_address),
    deliveryLocation: o.delivery_location
      ? { latitude: num(o.delivery_location.latitude), longitude: num(o.delivery_location.longitude) }
      : null,
    scheduledFor: o.scheduled_for ? text(o.scheduled_for) : undefined,
    tableLabel: o.table_label ? text(o.table_label) : undefined,
    handoverCode: o.handover_code ? text(o.handover_code) : undefined,
    handoverQr: o.handover_qr ? text(o.handover_qr) : undefined,
    driver: o.driver ? mapSummary(o.driver) : null,
    driverLocation: o.driver_location
      ? { latitude: num(o.driver_location.latitude), longitude: num(o.driver_location.longitude), at: o.driver_location.at ? text(o.driver_location.at) : undefined }
      : null,
    deliveryProof: o.delivery_proof || undefined,
    arrival: o.arrival
      ? {
          status: o.arrival.status,
          etaAt: o.arrival.eta_at ? text(o.arrival.eta_at) : undefined,
          arrivedAt: o.arrival.arrived_at ? text(o.arrival.arrived_at) : undefined,
          vehicle: o.arrival.vehicle,
        }
      : null,
    notes: text(o.notes),
    canCancel: !!o.can_cancel,
    nextStatuses: (o.next_statuses || []) as OrderStatus[],
    history: (o.history || []).map((h: any) => ({ status: h.status as OrderStatus, note: text(h.note), at: text(h.at || h.created_at) })),
    cancelledAt: o.cancelled_at ? text(o.cancelled_at) : undefined,
    createdAt: text(o.created_at),
  };
}

export function mapBusinessStats(d: any): BusinessStats {
  return {
    orders: {
      pending: num(d.orders?.pending),
      processing: num(d.orders?.processing),
      ready: num(d.orders?.ready),
      shipped: num(d.orders?.shipped),
      delivered: num(d.orders?.delivered),
      cancelled: num(d.orders?.cancelled),
      total: num(d.orders?.total),
      today: num(d.orders?.today),
      needsAction: num(d.orders?.needs_action),
    },
    revenueAllTime: num(d.revenue?.all_time),
    revenueLast30Days: num(d.revenue?.last_30_days),
    topProducts: (d.top_products || []).map((p: any) => ({ productId: id(p.product_id), name: text(p.name), quantity: num(p.quantity) })),
    lowStock: (d.low_stock || []).map((p: any) => ({ id: id(p.id), name: text(p.name), stock: num(p.stock) })),
    ratingAvg: num(d.rating_avg),
    reviewsCount: num(d.reviews_count),
    followersCount: num(d.followers_count),
    activeOffers: num(d.active_offers),
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

// ---------- Advanced Shop Features (Roadmap 1 - 34) ----------

export function mapStaffMember(m: any): StaffMember {
  return {
    id: id(m.id),
    role: (m.role as StaffRole) || 'cashier',
    status: m.status === 'invited' ? 'invited' : 'active',
    user: m.user ? mapSummary(m.user) : undefined,
    invitedEmail: m.invited_email ? text(m.invited_email) : undefined,
    invitedPhone: m.invited_phone ? text(m.invited_phone) : undefined,
    inviteUrl: m.invite_url ? text(m.invite_url) : undefined,
    createdAt: text(m.created_at),
  };
}

export function mapStaffInvite(i: any): StaffInvite {
  return {
    id: id(i.id),
    businessId: id(i.business?.id ?? i.business_id),
    businessName: text(i.business?.name),
    businessLogo: i.business?.logo_url ? text(i.business.logo_url) : undefined,
    role: (i.role as StaffRole) || 'cashier',
    invitedBy: text(i.invited_by?.name ?? i.invited_by),
    token: i.token ? text(i.token) : undefined,
    inviteUrl: i.invite_url ? text(i.invite_url) : undefined,
    createdAt: text(i.created_at),
  };
}

export function mapShopSettings(s: any): ShopSettings {
  return {
    fulfilment: {
      delivery: s?.fulfilment?.delivery !== false,
      pickup: s?.fulfilment?.pickup !== false,
      dineIn: !!s?.fulfilment?.dine_in,
    },
    payments: {
      cash: s?.payments?.cash !== false,
      online: !!s?.payments?.online,
    },
    taxes: Array.isArray(s?.taxes)
      ? s.taxes.map((t: any) => ({
          label: text(t.label),
          ratePercent: num(t.rate_percent),
        }))
      : [],
    taxInclusive: !!s?.tax_inclusive,
    packagingFee: {
      delivery: num(s?.packaging_fee?.delivery),
      pickup: num(s?.packaging_fee?.pickup),
      dineIn: num(s?.packaging_fee?.dine_in),
    },
    scheduling: {
      enabled: !!s?.scheduling?.enabled,
      slotMinutes: num(s?.scheduling?.slot_minutes, 30),
      maxOrdersPerSlot: num(s?.scheduling?.max_orders_per_slot, 10),
      advanceDays: num(s?.scheduling?.advance_days, 3),
      leadMinutes: num(s?.scheduling?.lead_minutes, 30),
      asap: s?.scheduling?.asap !== false,
    },
    lowStockThreshold: num(s?.low_stock_threshold, 5),
    chat: {
      awayEnabled: !!s?.chat?.away_enabled,
      awayMessage: text(s?.chat?.away_message) || "Thanks for your message! We're closed right now and will reply when we open.",
    },
    crm: {
      vipOrders: num(s?.crm?.vip_orders, 5),
      vipSpend: num(s?.crm?.vip_spend, 0),
      lapsedDays: num(s?.crm?.lapsed_days, 30),
      winback: {
        enabled: !!s?.crm?.winback?.enabled,
        discountPercent: num(s?.crm?.winback?.discount_percent, 10),
        validDays: num(s?.crm?.winback?.valid_days, 14),
      },
      birthday: {
        enabled: !!s?.crm?.birthday?.enabled,
        discountPercent: num(s?.crm?.birthday?.discount_percent, 15),
        validDays: num(s?.crm?.birthday?.valid_days, 7),
      },
      anniversary: {
        enabled: !!s?.crm?.anniversary?.enabled,
        discountPercent: num(s?.crm?.anniversary?.discount_percent, 10),
        validDays: num(s?.crm?.anniversary?.valid_days, 7),
      },
    },
  };
}

export function mapDeliveryZone(z: any): DeliveryZone {
  return {
    id: z.id ? id(z.id) : undefined,
    name: text(z.name),
    type: z.type === 'polygon' ? 'polygon' : 'radius',
    minKm: optionalNum(z.min_km),
    maxKm: optionalNum(z.max_km),
    polygon: Array.isArray(z.polygon) ? z.polygon : undefined,
    fee: num(z.fee),
    minOrder: num(z.min_order),
    isActive: z.is_active !== false,
  };
}

export function mapDeliveryQuote(q: any): DeliveryQuote {
  return {
    available: !!q.available,
    fee: num(q.fee),
    minOrder: num(q.min_order),
    reason: q.reason ? text(q.reason) : undefined,
    message: q.message ? text(q.message) : undefined,
    pickupAvailable: !!q.pickup_available,
  };
}

export function mapTimeSlot(s: any): TimeSlot {
  return {
    start: text(s.start),
    end: text(s.end),
    remaining: num(s.remaining),
    isAvailable: s.remaining === undefined ? true : num(s.remaining) > 0,
  };
}

export function mapTracking(t: any): Tracking {
  return {
    orderId: id(t.order_id ?? t.id),
    status: (t.status as OrderStatus) || 'pending',
    milestones: Array.isArray(t.milestones)
      ? t.milestones.map((m: any) => ({
          status: m.status as OrderStatus,
          label: text(m.label),
          at: m.at ? text(m.at) : undefined,
          isDone: !!m.is_done,
        }))
      : [],
    shop: {
      name: text(t.shop?.name),
      address: text(t.shop?.address),
      phone: t.shop?.phone ? text(t.shop.phone) : undefined,
      latitude: num(t.shop?.latitude ?? t.shop?.location?.latitude),
      longitude: num(t.shop?.longitude ?? t.shop?.location?.longitude),
    },
    destination: t.destination
      ? {
          address: text(t.destination.address),
          latitude: optionalNum(t.destination.latitude),
          longitude: optionalNum(t.destination.longitude),
        }
      : undefined,
    driver: t.driver ? mapSummary(t.driver) : null,
    driverLocation: t.driver_location
      ? {
          latitude: num(t.driver_location.latitude),
          longitude: num(t.driver_location.longitude),
          at: t.driver_location.at ? text(t.driver_location.at) : undefined,
        }
      : null,
    etaMinutes: t.eta_minutes !== undefined && t.eta_minutes !== null ? num(t.eta_minutes) : null,
    courier: t.courier
      ? {
          name: text(t.courier.name),
          trackingUrl: t.courier.tracking_url ? text(t.courier.tracking_url) : undefined,
        }
      : null,
    realtimeChannel: t.realtime_channel ? text(t.realtime_channel) : undefined,
  };
}

export function mapCannedResponse(r: any): CannedResponse {
  return {
    id: id(r.id),
    shortcut: text(r.shortcut),
    title: text(r.title),
    content: text(r.content),
  };
}

export function mapAnnouncement(a: any): Announcement {
  return {
    id: id(a.id),
    businessId: id(a.business_id),
    businessName: text(a.business?.name),
    businessLogo: a.business?.logo_url ? text(a.business.logo_url) : undefined,
    type: a.type || 'news',
    body: text(a.body),
    isPriority: !!a.is_priority,
    mediaUrls: Array.isArray(a.media) ? a.media.map((m: any) => text(m.url)) : [],
    likesCount: num(a.likes_count),
    commentsCount: num(a.comments_count),
    hasLiked: !!a.has_liked,
    createdAt: text(a.created_at),
  };
}

export function mapAnnouncementComment(c: any): AnnouncementComment {
  return {
    id: id(c.id),
    announcementId: id(c.announcement_id),
    user: mapSummary(c.author ?? c.user),
    content: text(c.body ?? c.content),
    createdAt: text(c.created_at),
  };
}

export function mapLoyaltyProgram(p: any): LoyaltyProgram {
  return {
    isActive: p?.is_active !== false,
    type: p?.type === 'spend' ? 'spend' : 'stamps',
    targetStamps: optionalNum(p?.target_stamps),
    targetSpend: optionalNum(p?.target_spend),
    rewardText: text(p?.reward_text),
    rewardDiscountPercent: optionalNum(p?.reward_discount_percent),
    rewardDiscountAmount: optionalNum(p?.reward_discount_amount),
    minOrder: optionalNum(p?.min_order),
    validityDays: optionalNum(p?.validity_days),
    summary: text(p?.summary),
  };
}

export function mapLoyaltyCard(c: any): LoyaltyCard {
  return {
    businessId: id(c.business_id ?? c.business?.id),
    businessName: text(c.business?.name),
    businessLogo: c.business?.logo_url ? text(c.business.logo_url) : undefined,
    currentStamps: num(c.stamps),
    targetStamps: num(c.target_stamps, 10),
    currentSpend: num(c.spend),
    targetSpend: num(c.target_spend, 100),
    progressPercent: num(c.progress_percent),
    qrPayload: text(c.qr_payload ?? `GCL:${c.id}`),
    unusedRewards: Array.isArray(c.unused_rewards)
      ? c.unused_rewards.map((r: any) => ({
          code: text(r.code),
          label: text(r.label),
          expiresAt: text(r.expires_at),
        }))
      : [],
  };
}

export function mapCustomerRow(c: any): CustomerRow {
  return {
    id: id(c.id),
    name: text(c.name),
    username: c.username ? text(c.username) : undefined,
    profilePhoto: c.avatar_url ? text(c.avatar_url) : undefined,
    tier: (c.tier as CustomerTier) || 'new',
    ordersCount: num(c.orders_count),
    totalSpent: num(c.total_spent),
    firstOrderAt: c.first_order_at ? text(c.first_order_at) : undefined,
    lastOrderAt: c.last_order_at ? text(c.last_order_at) : undefined,
  };
}

export function mapShopTable(t: any): ShopTable {
  return {
    id: id(t.id),
    label: text(t.label),
    type: t.type === 'counter' ? 'counter' : 'table',
    code: text(t.code),
    qrUrl: text(t.qr_url),
    isActive: t.is_active !== false,
  };
}

export function mapScanResult(r: any): ScanResult {
  return {
    type: r.type || 'unknown',
    product: r.product ? mapProduct(r.product) : undefined,
    order: r.order ? mapOrder(r.order) : undefined,
    loyaltyCard: r.loyalty_card ? mapLoyaltyCard(r.loyalty_card) : undefined,
    rawCode: text(r.code ?? r.raw_code),
  };
}

export function mapReceipt(r: any): Receipt {
  return {
    orderNumber: text(r.number ?? r.order_number),
    data: r.data || {},
    links: {
      html: text(r.links?.html),
      pdf: text(r.links?.pdf),
    },
  };
}

export function mapKitchenTicket(t: any): KitchenTicket {
  return {
    orderId: id(t.order_id ?? t.id),
    orderNumber: text(t.number ?? t.order_number),
    status: (t.status as OrderStatus) || 'pending',
    tableLabel: t.table_label ? text(t.table_label) : undefined,
    scheduledFor: t.scheduled_for ? text(t.scheduled_for) : undefined,
    items: Array.isArray(t.items)
      ? t.items.map((i: any) => ({
          id: id(i.id),
          name: text(i.name),
          variantName: i.variant_name ? text(i.variant_name) : undefined,
          modifiers: Array.isArray(i.modifiers) ? i.modifiers.map(text) : [],
          quantity: num(i.quantity, 1),
        }))
      : [],
    waitingMinutes: num(t.waiting_minutes),
    arrivalAlert: !!t.arrival_alert,
    createdAt: text(t.created_at),
  };
}

export function mapFlashSale(f: any): FlashSale {
  return {
    id: id(f.id),
    businessId: id(f.business_id),
    businessName: text(f.business?.name),
    title: text(f.title),
    discountPercent: num(f.discount_percent),
    radiusM: num(f.radius_m),
    endsAt: text(f.ends_at),
    maxClaims: optionalNum(f.max_claims),
    claimsCount: num(f.claims_count),
    isClaimed: !!f.is_claimed,
    discountAmount: optionalNum(f.discount_amount),
  };
}

export function mapShopStory(s: any): ShopStory {
  return {
    id: id(s.id),
    businessId: id(s.business_id),
    businessName: text(s.business?.name),
    businessLogo: s.business?.logo_url ? text(s.business.logo_url) : undefined,
    mediaUrl: text(s.media_url),
    tags: Array.isArray(s.tags)
      ? s.tags.map((t: any) => ({
          productId: id(t.product_id),
          productName: t.product_name ? text(t.product_name) : undefined,
          price: optionalNum(t.price),
          x: num(t.x),
          y: num(t.y),
        }))
      : [],
    isHighlight: !!s.is_highlight,
    highlightTitle: s.highlight_title ? text(s.highlight_title) : undefined,
    createdAt: text(s.created_at),
  };
}

export function mapAdCampaign(c: any): AdCampaign {
  return {
    id: id(c.id),
    placement: c.placement || 'both',
    radiusKm: num(c.radius_km),
    dailyBudget: num(c.daily_budget),
    days: num(c.days),
    status: c.status || 'active',
    impressions: num(c.impressions),
    clicks: num(c.clicks),
    conversions: num(c.conversions),
    spend: num(c.spend),
    dailyStats: Array.isArray(c.daily_stats)
      ? c.daily_stats.map((d: any) => ({
          date: text(d.date),
          impressions: num(d.impressions),
          clicks: num(d.clicks),
          spend: num(d.spend),
        }))
      : undefined,
    createdAt: text(c.created_at),
  };
}

export function mapAreaInsights(i: any): AreaInsights {
  return {
    busyHours: Array.isArray(i.busy_hours) ? i.busy_hours.map((h: any) => ({ hour: num(h.hour), count: num(h.count) })) : [],
    weekdayActivity: Array.isArray(i.weekday_activity) ? i.weekday_activity.map((w: any) => ({ day: text(w.day), count: num(w.count) })) : [],
    topSearches: Array.isArray(i.top_searches) ? i.top_searches.map((s: any) => ({ query: text(s.query), count: num(s.count) })) : [],
    hasEnoughData: !!i.has_enough_data,
  };
}

export function mapShopTip(t: any): ShopTip {
  return {
    id: id(t.id),
    kind: t.kind || 'general',
    title: text(t.title),
    body: text(t.body),
    forDate: t.for_date ? text(t.for_date) : undefined,
    isDismissed: !!t.is_dismissed,
  };
}

export function mapService(s: any): Service {
  return {
    id: id(s.id),
    businessId: id(s.business_id),
    name: text(s.name),
    durationMinutes: num(s.duration_minutes),
    bufferMinutes: num(s.buffer_minutes),
    price: num(s.price),
    depositType: s.deposit_type || 'none',
    depositValue: num(s.deposit_value),
    cancelHours: num(s.cancel_hours, 24),
    lateCancelRefundPercent: num(s.late_cancel_refund_percent, 50),
    specialists: Array.isArray(s.specialists) ? s.specialists.map(mapSpecialist) : [],
  };
}

export function mapSpecialist(sp: any): Specialist {
  return {
    id: id(sp.id),
    name: text(sp.name),
    title: sp.title ? text(sp.title) : undefined,
    avatarUrl: sp.avatar_url ? text(sp.avatar_url) : undefined,
    workingHours: sp.working_hours && typeof sp.working_hours === 'object' ? sp.working_hours : null,
    timeOff: Array.isArray(sp.time_off)
      ? sp.time_off.map((to: any) => ({
          id: id(to.id),
          startsAt: text(to.starts_at),
          endsAt: text(to.ends_at),
          reason: to.reason ? text(to.reason) : undefined,
        }))
      : [],
  };
}

export function mapBookingSlot(b: any): BookingSlot {
  return {
    time: text(b.time),
    specialists: Array.isArray(b.specialists) ? b.specialists.map((s: any) => ({ id: id(s.id), name: text(s.name) })) : [],
    isAvailable: b.is_available !== false,
  };
}

export function mapBooking(b: any): Booking {
  return {
    id: id(b.id),
    number: text(b.number),
    businessId: id(b.business_id ?? b.business?.id),
    businessName: text(b.business?.name),
    service: {
      id: id(b.service?.id),
      name: text(b.service?.name),
      durationMinutes: num(b.service?.duration_minutes),
      price: num(b.service?.price),
    },
    specialist: b.specialist ? { id: id(b.specialist.id), name: text(b.specialist.name) } : null,
    startsAt: text(b.starts_at),
    endsAt: text(b.ends_at),
    status: b.status || 'confirmed',
    depositAmount: num(b.deposit_amount),
    totalAmount: num(b.total_amount),
    freeCancellationUntil: b.free_cancellation_until ? text(b.free_cancellation_until) : undefined,
    canCancel: !!b.can_cancel,
    canReschedule: !!b.can_reschedule,
    createdAt: text(b.created_at),
  };
}

export function mapAnalytics(a: any): Analytics {
  return {
    gmv: num(a.gmv),
    netSales: num(a.net_sales),
    aov: num(a.aov),
    repeatCustomerRate: num(a.repeat_customer_rate),
    cancellationRate: num(a.cancellation_rate),
    revenueSeries: Array.isArray(a.revenue_series)
      ? a.revenue_series.map((r: any) => ({ date: text(r.date), revenue: num(r.revenue) }))
      : [],
    topProducts: Array.isArray(a.top_products)
      ? a.top_products.map((p: any) => ({
          productId: id(p.product_id),
          name: text(p.name),
          quantity: num(p.quantity),
          revenue: num(p.revenue),
        }))
      : [],
    orderTypeSplit: a.order_type_split || {},
    paymentMethodSplit: a.payment_method_split || {},
    compareChange: a.compare_change
      ? {
          gmvPercent: num(a.compare_change.gmv_percent),
          netSalesPercent: num(a.compare_change.net_sales_percent),
          aovPercent: num(a.compare_change.aov_percent),
        }
      : undefined,
  };
}

export function mapFinanceSummary(f: any): FinanceSummary {
  return {
    availableBalance: num(f.available_balance),
    pendingBalance: num(f.pending_balance),
    commissionPercent: num(f.commission_percent),
    totalPaidOut: num(f.total_paid_out),
    payouts: Array.isArray(f.payouts)
      ? f.payouts.map((p: any) => ({
          id: id(p.id),
          amount: num(p.amount),
          reference: p.reference ? text(p.reference) : undefined,
          status: text(p.status),
          paidAt: text(p.paid_at),
        }))
      : [],
  };
}

export function mapPayoutAccount(p: any): PayoutAccount {
  return {
    id: p.id ? id(p.id) : undefined,
    type: p.type === 'upi' ? 'upi' : 'bank',
    holderName: text(p.holder_name),
    maskedAccount: text(p.masked_account),
    ifscOrVpa: text(p.ifsc_or_vpa),
    isVerified: !!p.is_verified,
  };
}

export function mapCourierQuote(q: any): CourierQuote {
  return {
    quoteId: id(q.quote_id ?? q.id),
    provider: text(q.provider),
    fee: num(q.fee),
    estimatedMinutes: num(q.estimated_minutes),
  };
}

export function mapCourierDispatch(d: any): CourierDispatch {
  return {
    dispatchId: id(d.dispatch_id ?? d.id),
    provider: text(d.provider),
    trackingUrl: d.tracking_url ? text(d.tracking_url) : undefined,
    riderName: d.rider_name ? text(d.rider_name) : undefined,
    riderPhone: d.rider_phone ? text(d.rider_phone) : undefined,
    status: text(d.status),
  };
}

export function mapAppConfig(c: any): AppConfig {
  return {
    minAppVersion: text(c?.min_app_version || '1.0.0'),
    latestAppVersion: text(c?.latest_app_version || '1.0.0'),
    storeUrls: {
      android: text(c?.store_urls?.android || 'https://play.google.com/store/apps/details?id=com.myloaction'),
      ios: text(c?.store_urls?.ios || 'https://apps.apple.com/app/id000000000'),
    },
  };
}

