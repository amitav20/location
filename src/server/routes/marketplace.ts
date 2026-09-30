/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { Business, Order, Product, User } from '../../types';
import { findUserById, getBusinesses, getOffers, getOrders, getProducts, haversineDistance, saveDB } from '../db';
import {
  arrayOf,
  badRequest,
  currentUser,
  currentUserId,
  forbidden,
  int,
  newId,
  notFound,
  notify,
  nowIso,
  rangeKm,
  str
} from '../http';

export const marketplaceRouter = express.Router();

// ---------- Shared business helpers ----------

/** Unverified shops are only visible to their owner and admins. */
export function isBusinessVisible(biz: Business, user: User): boolean {
  return !!biz.isVerified || biz.ownerId === user.id || !!user.isAdmin;
}

export function isOfferActive(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() > Date.now();
}

/** Puts an order's items back into stock (used when an order is cancelled). */
export function restoreStock(order: Order) {
  order.items.forEach((item) => {
    const product = getProducts().find((p) => p.id === item.productId);
    if (product) product.stock = (product.stock || 0) + item.quantity;
  });
}

// ---------- Promo codes ----------

// Platform-wide promo codes that work at every shop
export const PLATFORM_PROMOS: { [code: string]: number } = {
  WELCOME10: 10,
  LOCAL20: 20
};

interface ResolvedPromo {
  code: string;
  discountPercent: number;
  businessId: string | null; // null = applies to every shop
}

// Promo validation lives on the server so the discount the buyer sees is the one they're charged
function resolvePromo(rawCode: string, businessId?: string): ResolvedPromo | null {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return null;

  if (PLATFORM_PROMOS[code]) {
    return { code, discountPercent: PLATFORM_PROMOS[code], businessId: null };
  }

  const offer = getOffers().find(
    (o) =>
      (o.promoCode || '').toUpperCase() === code &&
      isOfferActive(o.expiresAt) &&
      (!businessId || o.businessId === businessId)
  );
  if (!offer) return null;

  const pct = Math.min(Math.max(Number(offer.discountPercent) || 0, 0), 100);
  return { code, discountPercent: pct, businessId: offer.businessId };
}

// ---------- Routes ----------

marketplaceRouter.get('/marketplace/products', (req, res) => {
  const user = currentUser(req);
  const search = String(req.query.search || '').toLowerCase().trim();
  const category = String(req.query.category || '').toLowerCase().trim();
  const range = rangeKm(req.query.range, Infinity);

  const results = getProducts()
    .map((p) => {
      const biz = getBusinesses().find((b) => b.id === p.businessId);
      if (!biz || !isBusinessVisible(biz, user)) return null;
      return {
        ...p,
        businessName: biz.name,
        distanceKm: Number(haversineDistance(user.location.latitude, user.location.longitude, biz.latitude, biz.longitude).toFixed(2))
      };
    })
    .filter((p): p is Product & { businessName: string; distanceKm: number } => {
      if (!p || p.distanceKm > range) return false;
      if (category && !p.category.toLowerCase().includes(category)) return false;
      if (search && !p.name.toLowerCase().includes(search) && !p.description.toLowerCase().includes(search)) return false;
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json(results);
});

marketplaceRouter.get('/marketplace/promo', (req, res) => {
  currentUserId(req);
  const promo = resolvePromo(String(req.query.code || ''), req.query.businessId ? String(req.query.businessId) : undefined);
  if (!promo) throw notFound('Invalid or expired coupon code.');
  res.json(promo);
});

marketplaceRouter.post('/marketplace/checkout', (req, res) => {
  const user = currentUser(req);
  const address = str(req.body?.address, 'Delivery address', { min: 5, max: 300 });
  const rawItems = arrayOf(req.body?.items, 'Items', 50, (item: any) => ({
    productId: str(item?.productId, 'Product', { max: 100, required: true }),
    quantity: int(item?.quantity, 'Quantity', 1, 99)
  }));
  if (rawItems.length === 0) throw badRequest('Your bag is empty.');

  // Merge duplicate lines for the same product
  const quantities = new Map<string, number>();
  rawItems.forEach((i) => quantities.set(i.productId, (quantities.get(i.productId) || 0) + i.quantity));

  const promo = req.body?.promoCode ? resolvePromo(req.body.promoCode) : null;
  if (req.body?.promoCode && !promo) throw badRequest('Invalid or expired coupon code.');

  // Verify every item before touching stock, so a failure never leaves a partial order
  const lines: { product: Product; quantity: number }[] = [];
  quantities.forEach((quantity, productId) => {
    const product = getProducts().find((p) => p.id === productId);
    const biz = product && getBusinesses().find((b) => b.id === product.businessId);
    if (!product || !biz || !isBusinessVisible(biz, user)) throw notFound('A product in your bag is no longer available.');
    if (biz.ownerId === user.id) throw badRequest(`You cannot buy from your own shop ("${biz.name}").`);
    if ((product.stock || 0) < quantity) {
      throw badRequest(`Not enough stock for "${product.name}". Only ${product.stock || 0} left.`);
    }
    lines.push({ product, quantity });
  });

  const byBusiness = new Map<string, typeof lines>();
  lines.forEach((line) => {
    line.product.stock -= line.quantity;
    byBusiness.set(line.product.businessId, [...(byBusiness.get(line.product.businessId) || []), line]);
  });

  const createdOrders: Order[] = [];
  byBusiness.forEach((bizLines, bizId) => {
    const items = bizLines.map(({ product, quantity }) => ({
      productId: product.id,
      quantity,
      price: product.price,
      productName: product.name
    }));
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discountPercent = promo && (promo.businessId === null || promo.businessId === bizId) ? promo.discountPercent : 0;
    const biz = getBusinesses().find((b) => b.id === bizId)!;

    const order: Order = {
      id: newId('ord'),
      userId: user.id,
      businessId: bizId,
      items,
      subtotalAmount: Number(subtotal.toFixed(2)),
      discountPercent: discountPercent || undefined,
      promoCode: discountPercent ? promo!.code : undefined,
      totalAmount: Number((subtotal * (1 - discountPercent / 100)).toFixed(2)),
      status: 'pending',
      address,
      createdAt: nowIso()
    };
    getOrders().push(order);
    createdOrders.push(order);

    notify({
      userId: biz.ownerId,
      senderId: user.id,
      type: 'business_update',
      title: 'New Order',
      message: `${user.name} placed a $${order.totalAmount} order at ${biz.name}.`,
      link: 'business:dashboard'
    });
  });

  saveDB();
  res.status(201).json({ success: true, orders: createdOrders });
});

marketplaceRouter.get('/marketplace/orders', (req, res) => {
  const userId = currentUserId(req);
  const list = getOrders()
    .filter((o) => o.userId === userId)
    .map((o) => ({ ...o, businessName: getBusinesses().find((b) => b.id === o.businessId)?.name || 'Closed shop' }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(list);
});

// Customers can cancel while the shop hasn't started on the order
marketplaceRouter.post('/marketplace/orders/:id/cancel', (req, res) => {
  const user = currentUser(req);
  const order = getOrders().find((o) => o.id === req.params.id);
  if (!order) throw notFound('Order not found.');
  if (order.userId !== user.id) throw forbidden('This is not your order.');
  if (order.status !== 'pending') throw badRequest('This order is already being processed and can no longer be cancelled.');

  order.status = 'cancelled';
  restoreStock(order);

  const biz = getBusinesses().find((b) => b.id === order.businessId);
  if (biz) {
    notify({
      userId: biz.ownerId,
      senderId: user.id,
      type: 'business_update',
      title: 'Order Cancelled',
      message: `${user.name} cancelled their $${order.totalAmount} order at ${biz.name}.`,
      link: 'business:dashboard'
    });
  }

  saveDB();
  res.json({ success: true, order: { ...order, businessName: biz?.name } });
});

export function customerName(userId: string) {
  return findUserById(userId)?.name || 'Customer';
}
