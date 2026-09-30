/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { Business, BusinessCategory, BusinessOffer, Order, Product, Review, User } from '../../types';
import {
  findUserById,
  getAllUsers,
  getBusinesses,
  getFollows,
  getOffers,
  getOrders,
  getProducts,
  getReviews,
  haversineDistance,
  removeWhere,
  saveDB
} from '../db';
import {
  arrayOf,
  badRequest,
  currentUser,
  dateYmd,
  DEFAULT_AVATAR,
  email,
  forbidden,
  int,
  latitude,
  longitude,
  mediaUrl,
  newId,
  notFound,
  notify,
  num,
  nowIso,
  oneOf,
  optStr,
  rangeKm,
  str,
  todayYmd
} from '../http';
import { customerName, isBusinessVisible, isOfferActive, PLATFORM_PROMOS, restoreStock } from './marketplace';

export const businessesRouter = express.Router();

const CATEGORIES: readonly BusinessCategory[] = [
  'Restaurant',
  'Grocery',
  'Fashion',
  'Electronics',
  'Pharmacy',
  'Hotel',
  'Cafe',
  'Service Provider',
  'Local Vendor'
];
const THEME_VIBES = ['minimal', 'vintage', 'neon', 'organic'] as const;
const ORDER_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'] as const;
const PROMO_CODE_RE = /^[A-Z0-9]{3,20}$/;

function ownedBusiness(user: User, businessId: unknown): Business {
  const biz = getBusinesses().find((b) => b.id === businessId);
  if (!biz) throw notFound('Business not found.');
  if (biz.ownerId !== user.id) throw forbidden('You do not own this business.');
  return biz;
}

function ownedProduct(user: User, productId: string): Product {
  const product = getProducts().find((p) => p.id === productId);
  if (!product) throw notFound('Product not found.');
  ownedBusiness(user, product.businessId);
  return product;
}

function averageRating(targetId: string) {
  const list = getReviews().filter((r) => r.targetId === targetId);
  return list.length ? Number((list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1)) : 0;
}

const followersOf = (bizId: string) => getFollows().filter((f) => f.followingId === bizId && f.targetType === 'business').length;

// Shared by create + edit; `partial` allows omitted fields on edit
function readBusinessFields(body: any, partial: boolean): Partial<Business> {
  const has = (k: string) => !partial || body[k] !== undefined;
  const fields: Partial<Business> = {};
  if (has('name')) fields.name = str(body.name, 'Shop name', { max: 80, required: true });
  if (has('category')) fields.category = oneOf(body.category, 'Category', CATEGORIES);
  if (has('address')) fields.address = str(body.address, 'Address', { max: 200, required: true });
  if (has('phone')) fields.phone = str(body.phone, 'Phone', { max: 30, required: true });
  if (has('email')) fields.email = email(body.email, 'Business email');
  fields.description = optStr(body.description, 'Description', 2000);
  fields.website = optStr(body.website, 'Website', 200);
  fields.tagline = optStr(body.tagline, 'Tagline', 120);
  fields.instagramUrl = optStr(body.instagramUrl, 'Instagram', 200);
  fields.twitterUrl = optStr(body.twitterUrl, 'Twitter', 200);
  fields.openingHours = optStr(body.openingHours, 'Opening hours', 200);
  if (body.themeVibe !== undefined) fields.themeVibe = oneOf(body.themeVibe, 'Theme', THEME_VIBES);
  if (body.logo !== undefined) fields.logo = mediaUrl(body.logo, 'Logo') || undefined;
  if (body.coverImage !== undefined) fields.coverImage = mediaUrl(body.coverImage, 'Cover image') || undefined;
  if (body.latitude !== undefined && body.longitude !== undefined && body.latitude !== null) {
    fields.latitude = latitude(body.latitude);
    fields.longitude = longitude(body.longitude);
  }
  // Drop keys that weren't provided so partial updates don't overwrite with undefined
  Object.keys(fields).forEach((k) => (fields as any)[k] === undefined && delete (fields as any)[k]);
  return fields;
}

function readProductFields(body: any, partial: boolean): Partial<Product> {
  const has = (k: string) => !partial || body[k] !== undefined;
  const fields: Partial<Product> = {};
  if (has('name')) fields.name = str(body.name, 'Product name', { max: 100, required: true });
  if (has('price')) fields.price = Math.round(num(body.price, 'Price', 0, 1_000_000) * 100) / 100;
  if (has('stock')) fields.stock = int(body.stock, 'Stock', 0, 100_000);
  if (body.description !== undefined) fields.description = str(body.description, 'Description', { max: 1000 });
  if (body.category !== undefined) fields.category = str(body.category, 'Category', { max: 40 }) || 'General';
  if (body.images !== undefined) {
    const images = arrayOf(body.images, 'Images', 5, (u) => mediaUrl(u, 'Image link')).filter(Boolean);
    if (images.length) fields.images = images;
  }
  return fields;
}

// ---------- Directory ----------

businessesRouter.get('/businesses', (req, res) => {
  const user = currentUser(req);
  const range = rangeKm(req.query.range, 50);
  const category = String(req.query.category || '');
  const search = String(req.query.search || '').toLowerCase().trim();

  const results = getBusinesses()
    .filter((b) => isBusinessVisible(b, user))
    .map((b) => ({
      ...b,
      distanceKm: Number(haversineDistance(user.location.latitude, user.location.longitude, b.latitude, b.longitude).toFixed(2)),
      averageRating: averageRating(b.id),
      followersCount: followersOf(b.id),
      isFollowing: getFollows().some((f) => f.followerId === user.id && f.followingId === b.id)
    }))
    .filter((b) => {
      if (b.distanceKm > range) return false;
      if (category && b.category !== category) return false;
      if (search && !b.name.toLowerCase().includes(search) && !b.description.toLowerCase().includes(search)) return false;
      return true;
    })
    .sort((a, b) => b.averageRating - a.averageRating || a.distanceKm - b.distanceKm);

  res.json(results);
});

businessesRouter.post('/businesses', (req, res) => {
  const user = currentUser(req);
  const fields = readBusinessFields(req.body || {}, false);
  const biz: Business = {
    logo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=120&h=120&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=300&fit=crop',
    description: '',
    themeVibe: 'minimal',
    latitude: user.location.latitude,
    longitude: user.location.longitude,
    ...(fields as Business),
    id: newId('biz'),
    ownerId: user.id,
    isVerified: false, // Must be verified by an admin before the public can see it
    createdAt: nowIso()
  };
  getBusinesses().push(biz);

  getAllUsers()
    .filter((u) => u.isAdmin)
    .forEach((admin) =>
      notify({
        userId: admin.id,
        senderId: user.id,
        type: 'announcement',
        title: 'Business Awaiting Verification',
        message: `${user.name} registered "${biz.name}". Please review it.`,
        link: 'admin'
      })
    );

  saveDB();
  res.status(201).json(biz);
});

businessesRouter.put('/businesses/:id', (req, res) => {
  const user = currentUser(req);
  const biz = ownedBusiness(user, req.params.id);
  Object.assign(biz, readBusinessFields(req.body || {}, true));
  saveDB();
  res.json({ success: true, business: biz });
});

// Active offers of a (visible) business
businessesRouter.get('/businesses/:id/offers', (req, res) => {
  const user = currentUser(req);
  const biz = getBusinesses().find((b) => b.id === req.params.id);
  if (!biz || !isBusinessVisible(biz, user)) throw notFound('Business not found.');
  res.json(getOffers().filter((o) => o.businessId === biz.id && isOfferActive(o.expiresAt)));
});

// ---------- Owner dashboard (supports several businesses per owner) ----------

businessesRouter.get('/businesses/dashboard', (req, res) => {
  const user = currentUser(req);
  const owned = getBusinesses().filter((b) => b.ownerId === user.id);
  if (owned.length === 0) {
    res.json({ owned: false });
    return;
  }

  const biz = owned.find((b) => b.id === req.query.businessId) || owned[0];
  const reviews = getReviews()
    .filter((r) => r.targetId === biz.id)
    .map((r) => {
      const author = findUserById(r.userId);
      return { ...r, userName: author?.name || 'Anonymous', userPhoto: author?.profilePhoto || DEFAULT_AVATAR };
    });
  const orders = getOrders()
    .filter((o) => o.businessId === biz.id)
    .map((o) => ({ ...o, customerName: customerName(o.userId) }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalSales = orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.totalAmount, 0);

  res.json({
    owned: true,
    businesses: owned.map((b) => ({ id: b.id, name: b.name, isVerified: !!b.isVerified })),
    business: biz,
    products: getProducts().filter((p) => p.businessId === biz.id),
    offers: getOffers()
      .filter((o) => o.businessId === biz.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    reviews,
    orders,
    analytics: {
      followersCount: followersOf(biz.id),
      reviewsCount: reviews.length,
      ordersCount: orders.length,
      totalSales: Number(totalSales.toFixed(2))
    }
  });
});

businessesRouter.post('/businesses/products', (req, res) => {
  const user = currentUser(req);
  const biz = ownedBusiness(user, req.body?.businessId);
  const fields = readProductFields(req.body || {}, false);
  const product: Product = {
    description: '',
    category: 'General',
    images: ['https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=300&h=300&fit=crop'],
    ...(fields as Product),
    id: newId('prod'),
    businessId: biz.id,
    createdAt: nowIso()
  };
  getProducts().push(product);
  saveDB();
  res.status(201).json(product);
});

businessesRouter.put('/businesses/products/:id', (req, res) => {
  const user = currentUser(req);
  const product = ownedProduct(user, req.params.id);
  Object.assign(product, readProductFields(req.body || {}, true));
  saveDB();
  res.json({ success: true, product });
});

businessesRouter.delete('/businesses/products/:id', (req, res) => {
  const user = currentUser(req);
  const product = ownedProduct(user, req.params.id);
  removeWhere(getProducts(), (p) => p.id === product.id);
  saveDB();
  res.json({ success: true });
});

// ---------- Offers ----------

businessesRouter.post('/businesses/offers', (req, res) => {
  const user = currentUser(req);
  const biz = ownedBusiness(user, req.body?.businessId);
  const body = req.body || {};

  const title = str(body.title, 'Offer title', { max: 100, required: true });
  const description = str(body.description, 'Description', { max: 500 });
  const discountPercent = int(body.discountPercent, 'Discount', 1, 100);
  const promoCode = str(body.promoCode, 'Promo code', { max: 20 }).toUpperCase();
  if (promoCode && !PROMO_CODE_RE.test(promoCode)) throw badRequest('Promo code must be 3-20 letters or numbers.');
  if (promoCode && (PLATFORM_PROMOS[promoCode] || getOffers().some((o) => o.promoCode === promoCode && isOfferActive(o.expiresAt)))) {
    throw badRequest('That promo code is already in use. Please pick another.');
  }

  // Offers run until the end of the chosen day (default: one week)
  let expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  if (body.expiresOn) {
    const day = dateYmd(body.expiresOn, 'Expiry date');
    if (day < todayYmd()) throw badRequest('The expiry date is in the past.');
    expiresAt = new Date(`${day}T23:59:59`).toISOString();
  }

  const offer: BusinessOffer = {
    id: newId('off'),
    businessId: biz.id,
    title,
    description,
    discountPercent,
    promoCode,
    expiresAt,
    createdAt: nowIso()
  };
  getOffers().push(offer);

  getFollows()
    .filter((f) => f.followingId === biz.id && f.targetType === 'business')
    .forEach((f) =>
      notify({
        userId: f.followerId,
        senderId: user.id,
        type: 'business_update',
        title: `New offer from ${biz.name}`,
        message: `${title}: ${discountPercent}% off${promoCode ? ` with code ${promoCode}` : ''}.`,
        link: 'business'
      })
    );

  saveDB();
  res.status(201).json(offer);
});

businessesRouter.delete('/businesses/offers/:id', (req, res) => {
  const user = currentUser(req);
  const offer = getOffers().find((o) => o.id === req.params.id);
  if (!offer) throw notFound('Offer not found.');
  ownedBusiness(user, offer.businessId);
  removeWhere(getOffers(), (o) => o.id === offer.id);
  saveDB();
  res.json({ success: true });
});

// ---------- Orders (shop side) ----------

businessesRouter.put('/businesses/orders/:id', (req, res) => {
  const user = currentUser(req);
  const order = getOrders().find((o) => o.id === req.params.id);
  if (!order) throw notFound('Order not found.');
  const biz = ownedBusiness(user, order.businessId);
  const status = oneOf(req.body?.status, 'Status', ORDER_STATUSES) as Order['status'];

  if (order.status === 'cancelled' || order.status === 'delivered') {
    throw badRequest(`This order is already ${order.status} and can't be changed.`);
  }
  if (status === order.status) {
    res.json({ success: true, order });
    return;
  }

  order.status = status;
  if (status === 'cancelled') restoreStock(order);

  notify({
    userId: order.userId,
    senderId: user.id,
    type: 'business_update',
    title: `Order ${status}`,
    message: `Your $${order.totalAmount} order from ${biz.name} is now ${status}.`,
    link: 'business:orders'
  });

  saveDB();
  res.json({ success: true, order });
});

// ---------- Reviews ----------

businessesRouter.get('/reviews/:targetId', (req, res) => {
  currentUser(req);
  const list = getReviews()
    .filter((r) => r.targetId === req.params.targetId)
    .map((r) => {
      const author = findUserById(r.userId);
      return { ...r, userName: author?.name || 'Anonymous', userPhoto: author?.profilePhoto || DEFAULT_AVATAR };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(list);
});

// One review per person per shop/product; submitting again updates it
businessesRouter.post('/reviews', (req, res) => {
  const user = currentUser(req);
  const targetId = str(req.body?.targetId, 'Target', { max: 100, required: true });
  const rating = int(req.body?.rating, 'Rating', 1, 5);
  const comment = str(req.body?.comment, 'Review', { max: 1000 });

  const biz =
    getBusinesses().find((b) => b.id === targetId) ||
    getBusinesses().find((b) => b.id === getProducts().find((p) => p.id === targetId)?.businessId);
  if (!biz || !isBusinessVisible(biz, user)) throw notFound('Nothing to review here.');
  if (biz.ownerId === user.id) throw badRequest('You cannot review your own business.');

  let review = getReviews().find((r) => r.targetId === targetId && r.userId === user.id);
  if (review) {
    Object.assign(review, { rating, comment, createdAt: nowIso() });
  } else {
    review = { id: newId('rev'), targetId, userId: user.id, rating, comment, createdAt: nowIso() } as Review;
    getReviews().push(review);
    notify({
      userId: biz.ownerId,
      senderId: user.id,
      type: 'business_update',
      title: 'New Review',
      message: `${user.name} rated ${biz.name} ${rating}/5.`,
      link: 'business:dashboard'
    });
  }

  saveDB();
  res.json({ ...review, userName: user.name, userPhoto: user.profilePhoto });
});
